package com.recipebuddy.android

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import androidx.room.withTransaction
import androidx.work.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.util.UUID
import java.time.Instant
import java.util.concurrent.TimeUnit

@Serializable data class KitchenHome(val me: Me, val recipes: RecipePage, val friends: List<Friend> = emptyList(), val blocked: List<FriendPerson> = emptyList(), val shared: List<Recipe> = emptyList())
@Serializable data class RemoteKitchen(val kind: String, val id: String, val payload: String, val updatedAt: String = "")
@Serializable data class PendingChange(val operationId: String, val path: String, val method: String, val payload: String,
    val entityId: String? = null, val baseVersion: String? = null, val occurredAt: String,
    val kind: String, val localId: String, val localPayload: String? = null, val failure: Int? = null) {
    fun request() = buildJsonObject {
        put("operationId", operationId); put("path", path); put("method", method); put("payload", payload); put("occurredAt", occurredAt)
        entityId?.let { put("entityId", it) }; baseVersion?.let { put("baseVersion", it) }
    }.toString()
}
fun stableRecipeId(): String = "c" + System.currentTimeMillis().toString(36).padStart(8, '0') + UUID.randomUUID().toString().replace("-", "").take(16)

// Local rows and their durable outbox are committed together. Network I/O never
// holds the write mutex, so a slow connection cannot block a local edit.
class OfflineKitchen(private val app: BuddyApp) {
    private val dao get() = app.database.entries()
    private val writes = Mutex()
    private val sync = Mutex()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var kick: Job? = null
    val connection = MutableStateFlow(true)
    val authenticationRequired = MutableStateFlow(false)
    private val connectivity = app.getSystemService(ConnectivityManager::class.java)
    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) { connection.value = true; requestSync() }
        override fun onLost(network: Network) { connection.value = connectivity.activeNetwork != null }
    }
    init {
        connection.value = connectivity.activeNetwork != null
        connectivity.registerDefaultNetworkCallback(callback)
        val periodic = PeriodicWorkRequestBuilder<KitchenSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build()
        WorkManager.getInstance(app).enqueueUniquePeriodicWork("kitchen-refresh", ExistingPeriodicWorkPolicy.KEEP, periodic)
    }
    fun schedule() {
        WorkManager.getInstance(app).enqueueUniqueWork("kitchen-sync", ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<KitchenSyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build())
    }
    @Synchronized private fun requestSync() {
        schedule(); kick?.cancel(); kick = scope.launch { delay(250); if(!sync.isLocked) runCatching { synchronize() } }
    }
    private fun account(): String = app.api.session?.userId ?: throw ApiFailure(401)
    private fun still(account: String) = app.api.session?.userId == account
    suspend fun enqueue(path: String, method: String, payload: String = "{}", kind: String, id: String,
        localPayload: String?, entityId: String? = null, version: String? = null): PendingChange {
        val account = account()
        val operation = writes.withLock { app.database.withTransaction {
            check(still(account))
            val pending = dao.entries(account, "outbox").sortedBy { it.updatedAt }
            val prior = pending.map { buddyJson.decodeFromString<PendingChange>(it.payload) }.lastOrNull { it.kind == kind && it.localId == id }
            val recipeVersion = if(kind == "recipe" && method != "POST") version ?: dao.entry(account, "recipe", id)?.payload?.let { buddyJson.decodeFromString<Recipe>(it).updatedAt.takeIf(String::isNotBlank) } ?: "missing" else version
            val base = if (prior != null && (kind == "recipe" || path == "kitchen-state")) "after:${prior.operationId}" else recipeVersion
            val change = PendingChange(UUID.randomUUID().toString(), path, method, payload, entityId, base, Instant.now().toString(), kind, id, localPayload)
            if (localPayload == null) dao.delete(account, kind, id) else dao.put(LocalEntry(account, kind, id, localPayload))
            dao.put(LocalEntry(account, "outbox", change.operationId, buddyJson.encodeToString(change), maxOf(System.currentTimeMillis(), (pending.maxOfOrNull { it.updatedAt } ?: 0) + 1)))
            change
        } }
        requestSync()
        return operation
    }
    suspend fun kitchen(kind: String, id: String, payload: String?) {
        val version = dao.entry(account(), "version", "$kind|$id")?.payload ?: "missing"
        enqueue("kitchen-state", if (payload == null) "DELETE" else "PUT", buildJsonObject {
            put("kind", kind); put("id", id); payload?.let { put("payload", it) }
        }.toString(), kind, id, payload, version = version)
    }
    suspend fun cached(path: String): String? = dao.entry(account(), "response", path)?.payload
    suspend fun explain(recipe: Recipe, step: Int, servings: Int, language: String): String {
        val account = account()
        val payload = buildJsonObject { put("step", step); put("language", language); put("servings", servings) }.toString()
        val hash = java.security.MessageDigest.getInstance("SHA-256").digest((buddyJson.encodeToString(recipe.input()) + payload).toByteArray()).joinToString("") { "%02x".format(it) }
        val key = "recipes/${recipe.id}/coach:$hash"
        dao.entry(account, "response", key)?.let { return it.payload }
        val result = app.api.request("recipes/${recipe.id}/coach", "POST", payload)
        writes.withLock { if(still(account) && dao.entry(account, "recipe", recipe.id) != null) dao.put(LocalEntry(account, "response", key, result)) }
        return result
    }
    suspend fun hideChef(chefId: String) {
        val account = account()
        writes.withLock { app.database.withTransaction {
            if(!still(account)) return@withTransaction
            dao.entries(account, "recipe").filter { buddyJson.decodeFromString<Recipe>(it.payload).let { recipe -> !recipe.owned && recipe.sharedChefId == chefId } }.forEach {
                dao.delete(account, "recipe", it.id); dao.delete(account, "download", it.id); dao.delete(account, "photo", it.id)
                dao.delete(account, "response", "recipes/${it.id}/community"); dao.delete(account, "response", "recipes/${it.id}/shares")
                dao.entries(account, "response").filter { response -> response.id.startsWith("recipes/${it.id}/coach:") }.forEach { response -> dao.delete(account, "response", response.id) }
            }
            dao.delete(account, "response", "chefs/$chefId")
        } }
    }
    suspend fun read(path: String): String {
        val account = account(); val cached = dao.entry(account, "response", path)?.payload
        if (cached != null) { scope.launch { runCatching { fetch(path, account) } }; return cached }
        return fetch(path, account)
    }
    suspend fun refresh(path: String) { fetch(path, account()) }
    suspend fun refreshRecipe(id: String) {
        val account = account()
        val fresh = buddyJson.decodeFromString<Recipe>(app.api.request("recipes/${android.net.Uri.encode(id)}"))
        writes.withLock {
            if (still(account) && dao.entry(account, "recipe", id) != null && dao.entries(account, "outbox").none {
                buddyJson.decodeFromString<PendingChange>(it.payload).let { change -> change.kind == "recipe" && change.localId == id }
            }) dao.put(LocalEntry(account, "recipe", id, buddyJson.encodeToString(fresh)))
        }
    }
    private suspend fun fetch(path: String, account: String): String {
        val payload = app.api.request(path)
        writes.withLock { if (still(account) && dao.entries(account, "outbox").none { buddyJson.decodeFromString<PendingChange>(it.payload).let { it.kind == "response" && it.localId == path } }) dao.put(LocalEntry(account, "response", path, payload)) }
        return payload
    }
    suspend fun synchronize() = sync.withLock {
        app.preferences.data.first()[androidx.datastore.preferences.core.stringPreferencesKey("backend")]?.let { app.api.configure(it) }
        val account = app.api.session?.userId ?: return@withLock
        try {
            val failedEntities = mutableSetOf<String>()
            for (row in dao.entries(account, "outbox").sortedBy { it.updatedAt }) {
                if (!still(account)) return@withLock
                val operation = buddyJson.decodeFromString<PendingChange>(row.payload)
                val key = "${operation.kind}|${operation.localId}"
                if (operation.failure != null || key in failedEntities) { failedEntities += key; continue }
                try {
                    val response = buddyJson.parseToJsonElement(app.api.request("sync", "POST", operation.request())).jsonObject
                    writes.withLock { app.database.withTransaction {
                        if (!still(account)) return@withTransaction
                        dao.delete(account, "outbox", operation.operationId)
                        response["kitchenVersion"]?.jsonPrimitive?.contentOrNull?.let { dao.put(LocalEntry(account, "version", key, it)) }
                        val later = dao.entries(account, "outbox").any { buddyJson.decodeFromString<PendingChange>(it.payload).let { it.kind == operation.kind && it.localId == operation.localId } }
                        if (!later) response["recipe"]?.let { dao.put(LocalEntry(account, "recipe", operation.localId, it.toString())) }
                    } }
                } catch (error: ApiFailure) {
                    if (error.status == 401 || error.status == 429 || error.status >= 500) throw error
                    writes.withLock { if (still(account)) dao.put(row.copy(payload = buddyJson.encodeToString(operation.copy(failure = error.status)))) }
                    failedEntities += key
                }
            }
            if (!still(account)) return@withLock
            val home = buddyJson.decodeFromString<KitchenHome>(app.api.request("home"))
            val recipes = home.recipes.items.toMutableList(); var cursor = home.recipes.nextCursor
            val seen = mutableSetOf<String>()
            while (cursor != null && seen.add(cursor)) {
                val page = buddyJson.decodeFromString<RecipePage>(app.api.request("recipes?cursor=${android.net.Uri.encode(cursor)}"))
                recipes += page.items; cursor = page.nextCursor
            }
            if (cursor != null) throw ApiFailure(502) // Never prune from an incomplete snapshot.
            val remote = buddyJson.decodeFromString<List<RemoteKitchen>>(app.api.request("kitchen-state"))
            val oldTimers = dao.entries(account, "timer").mapNotNull { runCatching { buddyJson.decodeFromString<KitchenTimer>(it.payload) }.getOrNull() }
            writes.withLock { app.database.withTransaction {
                if (!still(account)) return@withTransaction
                val pending = dao.entries(account, "outbox").map { buddyJson.decodeFromString<PendingChange>(it.payload) }
                val dirty = pending.map { "${it.kind}|${it.localId}" }.toSet()
                val visible = (recipes + home.shared.map { it.copy(owned = false) }).distinctBy { it.id }
                val ids = visible.map { it.id }.toSet()
                dao.entries(account, "recipe").filter { it.id !in ids && "recipe|${it.id}" !in dirty }.forEach {
                    dao.delete(account, "recipe", it.id); dao.delete(account, "photo", it.id); dao.delete(account, "download", it.id)
                    val prefix = "recipes/${it.id}/"
                    dao.entries(account, "response").filter { response -> response.id.startsWith(prefix) }.forEach { response -> dao.delete(account, "response", response.id) }
                }
                visible.filter { "recipe|${it.id}" !in dirty }.forEach { dao.put(LocalEntry(account, "recipe", it.id, buddyJson.encodeToString(it))) }
                if (pending.none { it.path == "settings" }) {
                    val cooks = pending.filter { it.path.endsWith("/cook") && it.occurredAt.substringBefore('T') == Instant.now().toString().substringBefore('T') }.map { it.path.split('/')[1] }
                    dao.put(LocalEntry(account, "me", "current", buddyJson.encodeToString(home.me.copy(cookedToday = (home.me.cookedToday + cooks).distinct()))))
                }
                if(pending.none { it.kind == "friends" }) dao.put(LocalEntry(account, "friends", "current", buddyJson.encodeToString(home.friends)))
                if(pending.none { it.kind == "blocked" }) dao.put(LocalEntry(account, "blocked", "current", buddyJson.encodeToString(home.blocked)))
                val allowedChefs = home.friends.map { it.friend.id }.toSet()
                dao.entries(account, "response").filter { it.id.startsWith("chefs/") && it.id.substringAfter("chefs/") !in allowedChefs }.forEach { dao.delete(account, "response", it.id) }
                // Existing local-only rows are uploaded once, rather than removed on upgrade.
                val remoteKeys = remote.map { "${it.kind}|${it.id}" }.toSet()
                for (kind in listOf("shopping", "ingredients", "progress", "timer")) {
                    for (local in dao.entries(account, kind)) {
                        val key = "$kind|${local.id}"
                        if (key !in remoteKeys && key !in dirty) {
                            val imported = PendingChange(UUID.randomUUID().toString(), "kitchen-state", "PUT", buildJsonObject { put("kind", kind); put("id", local.id); put("payload", local.payload) }.toString(), baseVersion = "missing", occurredAt = Instant.now().toString(), kind = kind, localId = local.id, localPayload = local.payload)
                            if (dao.entry(account, "sync-imported", key) == null) {
                                dao.put(LocalEntry(account, "outbox", imported.operationId, buddyJson.encodeToString(imported)))
                                dao.put(LocalEntry(account, "sync-imported", key, "true"))
                            } else { dao.delete(account, kind, local.id); dao.put(LocalEntry(account, "version", key, "missing")) }
                        }
                    }
                }
                remote.filter { "${it.kind}|${it.id}" !in dirty }.forEach {
                    dao.put(LocalEntry(account, it.kind, it.id, it.payload)); dao.put(LocalEntry(account, "sync-imported", "${it.kind}|${it.id}", "true"))
                    if(it.updatedAt.isNotBlank()) dao.put(LocalEntry(account, "version", "${it.kind}|${it.id}", it.updatedAt))
                }
                dao.put(LocalEntry(account, "sync", "last", Instant.now().toString()))
            } }
            authenticationRequired.value = false; connection.value = true
            CookingWidget.reconcile(app, recipes.map { it.id }.toSet(), true)
            val timers = dao.entries(account, "timer").mapNotNull { runCatching { buddyJson.decodeFromString<KitchenTimer>(it.payload) }.getOrNull() }
            oldTimers.filter { old -> timers.none { it.id == old.id && !it.delivered } }.forEach { TimerScheduler.cancel(app, it) }
            timers.filter { !it.delivered }.forEach { TimerScheduler.schedule(app, it) }
            // Photo failures do not block ordinary cooking or repeat committed changes.
            for (recipe in recipes + home.shared) {
                if (!still(account)) return@withLock
                runCatching { cachePhoto(account, recipe) }
                val cached = dao.entry(account, "response", "recipes/${recipe.id}/community")
                if(cached == null || System.currentTimeMillis() - cached.updatedAt > 600_000) runCatching { fetch("recipes/${recipe.id}/community", account) }
                if(recipe.owned) {
                    val path = "recipes/${recipe.id}/shares"
                    val recipients = dao.entry(account, "response", path)
                    if(recipients == null || System.currentTimeMillis() - recipients.updatedAt > 600_000) runCatching { fetch(path, account) }
                }
            }
            for(friend in home.friends.filter { it.status == "accepted" }) {
                if(!still(account)) return@withLock
                val path = "chefs/${android.net.Uri.encode(friend.friend.id)}"
                val profile = dao.entry(account, "response", path)
                if(profile == null || System.currentTimeMillis() - profile.updatedAt > 600_000) runCatching { fetch(path, account) }
            }
            if (dao.entries(account, "outbox").any { buddyJson.decodeFromString<PendingChange>(it.payload).failure == null }) {
                scope.launch { delay(500); requestSync() }
            }
        } catch (error: ApiFailure) {
            if (error.status == 401) authenticationRequired.value = true
            throw error
        } catch (error: java.io.IOException) { connection.value = false; throw error }
    }
    private suspend fun cachePhoto(account: String, recipe: Recipe) {
        if (!recipe.imageUrl.startsWith("https:")) return
        val old = dao.entry(account, "photo", recipe.id)?.payload?.let { buddyJson.parseToJsonElement(it).jsonObject }
        if (old?.get("url")?.jsonPrimitive?.content == recipe.imageUrl) return
        val loader = coil.Coil.imageLoader(app)
        val result = loader.execute(coil.request.ImageRequest.Builder(app).data(recipe.imageUrl).size(700).allowHardware(false)
            .diskCachePolicy(coil.request.CachePolicy.DISABLED).memoryCachePolicy(coil.request.CachePolicy.DISABLED).build())
        val bitmap = (result.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap ?: return
        val bytes = java.io.ByteArrayOutputStream().apply { bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 65, this) }.toByteArray()
        if (bytes.size > 220_000) return
        writes.withLock { if (still(account) && dao.entry(account, "recipe", recipe.id) != null) dao.put(LocalEntry(account, "photo", recipe.id,
            buildJsonObject { put("url", recipe.imageUrl); put("data", "data:image/jpeg;base64," + android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)) }.toString())) }
    }
    suspend fun resolve(operationId: String, keepCopy: Boolean) {
        val account = account()
        val row = dao.entry(account, "outbox", operationId) ?: return
        val change = buddyJson.decodeFromString<PendingChange>(row.payload)
        val kitchenReplacement = if(keepCopy && change.path == "kitchen-state") {
            val current = buddyJson.decodeFromString<List<RemoteKitchen>>(app.api.request("kitchen-state")).firstOrNull { it.kind == change.kind && it.id == change.localId }
            val latest = dao.entry(account, change.kind, change.localId)?.payload
            change.copy(operationId = UUID.randomUUID().toString(), baseVersion = current?.updatedAt ?: "missing", occurredAt = Instant.now().toString(), failure = null,
                method = if(latest == null) "DELETE" else "PUT",
                payload = buildJsonObject { put("kind", change.kind); put("id", change.localId); latest?.let { put("payload", it) } }.toString(),
                localPayload = latest)
        } else null
        // Keep a recoverable copy before removing a rejected mutation chain.
        if (keepCopy && change.kind == "recipe" && change.localPayload != null) {
            val latest = dao.entry(account, "recipe", change.localId)?.payload ?: change.localPayload
            val recipe = buddyJson.decodeFromString<Recipe>(latest).copy(id = stableRecipeId(), updatedAt = "")
            enqueue("recipes", "POST", buddyJson.encodeToString(recipe.input()), "recipe", recipe.id, buddyJson.encodeToString(recipe), recipe.id)
        }
        writes.withLock { app.database.withTransaction {
            if (!still(account)) return@withTransaction
            val chain = dao.entries(account, "outbox").filter { buddyJson.decodeFromString<PendingChange>(it.payload).let { it.kind == change.kind && it.localId == change.localId } }
            chain.forEach { dao.put(it.copy(kind = "recovery")); dao.delete(account, "outbox", it.id) }
            if(kitchenReplacement != null) {
                dao.put(LocalEntry(account, "outbox", kitchenReplacement.operationId, buddyJson.encodeToString(kitchenReplacement)))
            } else dao.delete(account, change.kind, change.localId)
        } }
        schedule(); scope.launch { runCatching { synchronize() } }
    }
    suspend fun purge() = writes.withLock { app.database.withTransaction { dao.purge() } }
}

class KitchenSyncWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result = try { (applicationContext as BuddyApp).kitchen.synchronize(); Result.success() }
    catch (error: ApiFailure) { if (error.status == 401) Result.success() else Result.retry() }
    catch (_: java.io.IOException) { Result.retry() }
}
