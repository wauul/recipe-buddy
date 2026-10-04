package com.recipebuddy.android

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.util.UUID

data class BuddyState(
    val initializing: Boolean = false,
    val mealWeekPreview:JsonArray?=null,val mealCheckIn:JsonObject=JsonObject(emptyMap()),val mealRescue:JsonObject?=null, val lastMealOccasion:String?=null,
    val meals: JsonObject? = null, val mealFrom: String = "", val mealDays: Int = 7, val mealDraft: JsonObject = JsonObject(emptyMap()), val mealActivity: JsonObject? = null, val mealKitchenId: String = "", val mealSuggestionLimited: Boolean = false, val mealDiscovery:JsonObject?=null, val pantryMatches:JsonObject?=null,
    val account: String? = null, val me: Me? = null, val recipes: List<Recipe> = emptyList(),
    val shared: List<Recipe> = emptyList(), val friends: List<Friend> = emptyList(),
    val blocked: List<FriendPerson> = emptyList(),
    val community: Community? = null, val communityLoaded: Boolean = false,
    val recipients: List<RecipeRecipient>? = null, val chefProfile: ChefProfile? = null,
    val searchResults: List<Recipe> = emptyList(), val searchCompleted: Boolean = false,
    val contentTranslations: Map<String, String> = emptyMap(),
    val shopping: List<ShoppingItem> = emptyList(), val downloads: List<Download> = emptyList(),
    val timers: List<KitchenTimer> = emptyList(), val progress: Map<String, CookingProgress> = emptyMap(),
    val confirmed: List<Ingredient> = emptyList(), val suggestions: List<Suggestion> = emptyList(), val matches: List<RecipeMatch> = emptyList(),
    val active: Recipe? = null, val draft: Recipe = Recipe(), val photo: String? = null,
    val invite: Invite? = null, val invitePreview: Invite? = null,
    val pendingInvite: String? = null, val pendingImport: String? = null, val pendingRoute: String? = null,
    val theme: String = "system", val language: String = "system", val busy: Boolean = false, val waiting: Boolean = false, val error: Int? = null,
    val nextCursor: String? = null, val query: String = "", val vibe: String = "", val saved: Int = 0,
    val matchCompleted: Boolean = false,
    val allRecipes: List<Recipe> = emptyList(), val offline: Boolean = false, val pendingChanges: Int = 0,
    val syncProblems: List<PendingChange> = emptyList(), val proPrompt: Boolean = false,
    val chefResults: List<FriendPerson> = emptyList(), val chefSearchDone: Boolean = false,
    val chefSearching: Boolean = false, val chefSearchError: Int? = null,
)
class BuddyViewModel(application: Application) : AndroidViewModel(application) {
    internal var lastOperationFailure:Throwable?=null
    private val app = application as BuddyApp
    val api = app.api
    private fun mealPath(from:String=state.value.mealFrom,days:Int=state.value.mealDays): String {
        val current=state.value
        val query=mutableListOf<String>()
        if(current.mealKitchenId.isNotBlank())query.add("kitchenId=${Uri.encode(current.mealKitchenId)}")
        if(from.isNotBlank()){
            query.add("from=$from")
            query.add("to=${java.time.LocalDate.parse(from).plusDays(days.toLong()-1)}")
        }
        return "meals"+if(query.isEmpty())"" else "?"+query.joinToString("&")
    }
    fun selectMealWindow(from:String,days:Int=7){
        val valid=runCatching{java.time.LocalDate.parse(from).toString()==from}.getOrDefault(false)
        if(!valid||days !in 1..31)return
        run {
            val payload=kitchen.read(mealPath(from,days))
            mutable.update{it.copy(mealFrom=from,mealDays=days,meals=buddyJson.parseToJsonElement(payload).jsonObject)}
        }
    }
    fun selectMealKitchen(id: String) { mutable.update { it.copy(mealKitchenId=id,meals=null) }; loadMeals() }
    fun loadMeals() = run { val path=mealPath();val cached = kitchen.read(path); mutable.update { it.copy(meals = buddyJson.parseToJsonElement(cached).jsonObject) } }
    fun refreshMeals() = run { val path=mealPath();kitchen.refresh(path); mutable.update { it.copy(meals = buddyJson.parseToJsonElement(kitchen.cached(path)!!).jsonObject) } }
    private var checkInRevision=0
    fun saveMealCheckIn(value:JsonObject){checkInRevision++;mutable.update{it.copy(mealCheckIn=value)};viewModelScope.launch{put("meal-check-in","current",value.toString())}}
    private var mealDraftWrites = 0
    private var mealDraftRevision = 0
    fun saveMealDraft(value: JsonObject) {
        mealDraftRevision++
        mealDraftWrites++
        mutable.update { it.copy(mealDraft=value) }
        viewModelScope.launch {
            try { put("meal-draft","current",value.toString()) }
            finally { mealDraftWrites-- }
        }
    }
    fun mealChange(action: String, data: JsonObject, checkVersion: Boolean = true) = run {
        val payload = buildJsonObject {
            put("operationId",UUID.randomUUID().toString()); put("action",action); put("data",data)
            state.value.meals?.get("kitchenId")?.let { put("kitchenId",it) }
            if(checkVersion) state.value.meals?.get("version")?.let { put("baseVersion",it) }
        }
        val id = UUID.randomUUID().toString()
        kitchen.enqueue("meals","POST",payload.toString(),"meal-change",id,payload.toString())
        kitchen.synchronize()
        runCatching { val path=mealPath();kitchen.refresh(path); mutable.update { it.copy(meals=buddyJson.parseToJsonElement(kitchen.cached(path)!!).jsonObject) } }
        if(action=="cook" && state.value.meals?.get("state")?.jsonObject?.get("occasions")?.jsonArray?.any{it.jsonObject["id"]==data["id"]}==true)mutable.update{it.copy(lastMealOccasion=data["id"]!!.jsonPrimitive.content)}
    }
    fun dismissMealSuccess(){mutable.update{it.copy(lastMealOccasion=null)}}
    fun mealSuggestions(weekly: Boolean, date: String, servings: Double, diners: List<String>, slot:String="dinner") = run {
        val reply=buddyJson.parseToJsonElement(api.request("meals/suggestions","POST",buildJsonObject { put("diners",JsonArray(diners.map(::JsonPrimitive))); put("date",date);put("limit",7);state.value.meals?.get("kitchenId")?.let{put("kitchenId",it)} }.toString())).jsonObject
        val candidates=reply["candidates"]!!.jsonArray
        if(candidates.isEmpty()) {mutable.update{it.copy(mealSuggestionLimited=true)};return@run}
        mutable.update{it.copy(mealSuggestionLimited=false)}
        if(!weekly){mutable.update{it.copy(pantryMatches=reply)};return@run}
        val proposed=(0 until 7).mapNotNull{n->
            val mealDate=java.time.LocalDate.parse(date).plusDays(n.toLong()).toString()
            val exists=state.value.meals?.get("state")?.jsonObject?.get("plans")?.jsonArray?.any{it.jsonObject["date"]?.jsonPrimitive?.content==mealDate&&it.jsonObject["slot"]?.jsonPrimitive?.content==slot}?:false
            if(exists)null else {val r=candidates[n%candidates.size].jsonObject;buildJsonObject{put("id",UUID.randomUUID().toString());put("date",mealDate);put("slot",slot);put("recipeId",r["id"]!!);put("title",r["title"]!!);put("recipeVersion",r["recipeVersion"]!!);put("servings",servings);put("diners",JsonArray(diners.map(::JsonPrimitive)));put("suggested",true)}}
        };mutable.update{it.copy(mealWeekPreview=JsonArray(proposed))}
    }
    fun editWeekPreview(id:String,field:String,value:JsonElement){mutable.update{s->s.copy(mealWeekPreview=s.mealWeekPreview?.let{JsonArray(it.map{raw->val p=raw.jsonObject;if(p["id"]?.jsonPrimitive?.content==id)JsonObject(p+mapOf(field to value))else raw})})}}
    fun removeWeekPreview(id:String){mutable.update{s->s.copy(mealWeekPreview=s.mealWeekPreview?.let{JsonArray(it.filter{p->p.jsonObject["id"]?.jsonPrimitive?.content!=id})})}}
    fun clearWeekPreview(){mutable.update{it.copy(mealWeekPreview=null)}}

    fun prepareMealHandoff(id:String)=run{api.request("meals/handoff","POST",buildJsonObject{put("operationId",UUID.randomUUID().toString());put("id",id);put("kitchenId",state.value.meals!!["kitchenId"]!!);put("baseVersion",state.value.meals!!["version"]!!)}.toString());val path=mealPath();kitchen.refresh(path);mutable.update{it.copy(meals=buddyJson.parseToJsonElement(kitchen.cached(path)!!).jsonObject)}}
    fun previewMealRescue(from:String,to:String)=run{val response=api.request("meals/rescue","POST",buildJsonObject{put("from",from);put("to",to);state.value.meals?.get("kitchenId")?.let{put("kitchenId",it)}}.toString());mutable.update{it.copy(mealRescue=buddyJson.parseToJsonElement(response).jsonObject)}}
    fun dismissMealRescue(){mutable.update{it.copy(mealRescue=null)}}
    fun editMealRescue(objective:String,id:String,field:String,value:JsonElement){mutable.update{s->val response=s.mealRescue?:return@update s;val proposals=response.mealRows("proposals").map{p->if(p.mealValue("objective")!=objective)p else JsonObject(p+mapOf("changes" to JsonArray(p.mealRows("changes").map{c->val after=c["after"]!!.jsonObject;if(after.mealValue("id")!=id)c else JsonObject(c+mapOf("after" to JsonObject(after+mapOf(field to value))))})))};s.copy(mealRescue=JsonObject(response+mapOf("proposals" to JsonArray(proposals),"edited" to JsonPrimitive(true))))}}
    fun reviewEditedRescue(p:JsonObject,selected:List<String>,from:String,to:String)=run{val response=api.request("meals/rescue","POST",buildJsonObject{put("from",from);put("to",to);put("token",p["token"]!!);state.value.meals?.get("kitchenId")?.let{put("kitchenId",it)};put("selected",JsonArray(p.mealRows("changes").filter{selected.contains(it["after"]!!.jsonObject.mealValue("id"))}.map{it["after"]!!.jsonObject["id"]!!}));put("overrides",JsonArray(p.mealRows("changes").map{it["after"]!!.jsonObject}.filter{selected.contains(it.mealValue("id"))}.map{after->JsonObject(after.filterKeys{it in listOf("id","date","slot","servings","diners")})}))}.toString());mutable.update{it.copy(mealRescue=buddyJson.parseToJsonElement(response).jsonObject)}}
    fun loadMealActivity() = run { mutable.update { it.copy(mealActivity=buddyJson.parseToJsonElement(api.request("meals/activity")).jsonObject) } }
    fun pantryMatches(ingredients:List<String>,diners:List<String>,servings:Double) = run {
        val data=buildJsonObject {put("ingredients",JsonArray(ingredients.map(::JsonPrimitive)));put("diners",JsonArray(diners.map(::JsonPrimitive)));put("servings",servings);put("kitchenId",state.value.meals!!["kitchenId"]!!)}
        mutable.update{it.copy(pantryMatches=buddyJson.parseToJsonElement(api.request("meals/suggestions","POST",data.toString())).jsonObject)}
    }
    fun discoverMeals(ingredients:List<String>,diners:List<String>,servings:Double)=run {
        val data=buildJsonObject {put("ingredients",JsonArray(ingredients.map(::JsonPrimitive)));put("diners",JsonArray(diners.map(::JsonPrimitive)));put("servings",servings);put("kitchenId",state.value.meals!!["kitchenId"]!!)}
        mutable.update{it.copy(mealDiscovery=buddyJson.parseToJsonElement(api.request("meals/discovery","POST",data.toString())).jsonObject)}
    }
    fun importMealCandidate(token:String)=run {
        val recipe=buddyJson.decodeFromString<Recipe>(api.request("meals/discovery/import","POST",buildJsonObject{put("token",token)}.toString()))
        put("recipe",recipe.id,buddyJson.encodeToString(recipe));pendingDestination(api.session!!.userId,recipe.id,false)
    }
    fun moreMealActivity() = run { val prior=state.value.mealActivity ?: return@run;val cursor=prior["nextCursor"]?.jsonPrimitive?.contentOrNull ?: return@run;val next=buddyJson.parseToJsonElement(api.request("meals/activity?cursor=${Uri.encode(cursor)}")).jsonObject;mutable.update{it.copy(mealActivity=JsonObject(next+mapOf("posts" to JsonArray(prior["posts"]!!.jsonArray+next["posts"]!!.jsonArray))))} }
    suspend fun mealPhoto(id: String): String = api.photo("meals/activity/${Uri.encode(id)}/media")
    fun followMeal(occasion:JsonObject)=run {
        val reference=occasion["photo"]?.jsonPrimitive?.contentOrNull.orEmpty()
        val photo=if(reference.startsWith("/api/meals/"))try{api.photo(reference.removePrefix("/api/"))}catch(e:Exception){if(e is ApiFailure&&e.status==401)throw e;reference}else reference
        saveMealDraft(JsonObject(occasion+mapOf("followUp" to JsonPrimitive(true),"photo" to JsonPrimitive(photo))))
    }
    fun publishOccasion(data: JsonObject, post: JsonObject) = run {
        val follow=buildJsonObject{put("operationId",UUID.randomUUID().toString());put("action","follow-up");put("kitchenId",state.value.meals!!["kitchenId"]!!);put("data",data)}
        val localId=UUID.randomUUID().toString();kitchen.enqueue("meals","POST",follow.toString(),"meal-change",localId,follow.toString());
        val postId=UUID.randomUUID().toString();kitchen.enqueue("meals/activity","POST",post.toString(),"meal-publication",postId,post.toString());kitchen.synchronize();loadMealActivity()
    }
    fun mealPost(path: String, data: JsonObject, method: String = "POST") = run { val id=UUID.randomUUID().toString();kitchen.enqueue(path,method,data.toString(),"meal-publication",id,data.toString());kitchen.synchronize();loadMealActivity() }
    private val local = app.database.entries()
    private val mutable = MutableStateFlow(BuddyState(initializing = true, account = api.session?.userId,
        pendingInvite = app.vault.read("pendingInvite"), pendingImport = app.vault.read("pendingImport"), pendingRoute = app.vault.read("pendingRoute")))
    val state: StateFlow<BuddyState> = mutable.asStateFlow()
    private var generation = 0
    private val actions = Mutex()
    private val localLock = Mutex()
    private var localJobs = mutableListOf<Job>()
    private var scanId = UUID.randomUUID().toString()
    private val kitchen get() = app.kitchen
    init {
        viewModelScope.launch {
            if (api.session != null) { app.vault.write("cachedAccount", api.session!!.userId); observeLocal(); refresh() }
            launch { kitchen.connection.collect { online -> mutable.update { it.copy(offline = !online) } } }
            launch { kitchen.authenticationRequired.collect { required -> if(required && api.session != null) expireAccount() } }
            app.preferences.data.collect { prefs ->
                mutable.update { it.copy(initializing = false, theme = prefs[stringPreferencesKey("theme")] ?: "system", language = prefs[stringPreferencesKey("language")] ?: "system") }
            }
        }
    }
    // Keep operation locks independent from visible user-wait feedback. Background
    // synchronization never changes waiting, even while a foreground action runs.
    private fun run(waiting: Boolean = true, action: suspend () -> Unit) {
        val epoch = generation
        viewModelScope.launch {
          actions.withLock {
            if (epoch != generation) return@withLock
            mutable.update { it.copy(busy = true, waiting = waiting, error = null) }
            try { action() } catch (e: CancellationException) { throw e }
            catch (e: Exception) {
                if(BuildConfig.DEBUG)lastOperationFailure=e
                if (epoch == generation) {
                    val status = (e as? ApiFailure)?.status ?: 0
                    mutable.update { it.copy(error = if(status == 402) null else status, proPrompt = it.proPrompt || status == 402) }
                    if (status == 401) expireAccount()
                }
            } finally { if (epoch == generation) mutable.update { it.copy(busy = false, waiting = false) } }
          }
        }
    }
    private fun observeLocal() {
        localJobs.forEach { it.cancel() }; localJobs.clear()
        val account = api.session?.userId ?: return
        localJobs += viewModelScope.launch { local.observeAccount(account).collect { rows ->
            if (api.session?.userId != account) return@collect
            val recipes = rows.filter { it.kind == "recipe" }.map { buddyJson.decodeFromString<Recipe>(it.payload) }
            val changes = rows.filter { it.kind == "outbox" }.map { buddyJson.decodeFromString<PendingChange>(it.payload) }
            mutable.update { previous ->
                val own = recipes.filter { it.owned }
                val cachedMe = rows.firstOrNull { it.kind == "me" }?.let { buddyJson.decodeFromString<Me>(it.payload) } ?: previous.me
                val cooks = changes.filter { it.path.endsWith("/cook") && it.occurredAt.substringBefore('T') == java.time.Instant.now().toString().substringBefore('T') }.map { it.path.split('/')[1] }
                previous.copy(me = cachedMe?.copy(cookedToday = (cachedMe.cookedToday + cooks).distinct()),
                    recipes = own.filter { (previous.vibe.isBlank() || it.vibe == previous.vibe) && (previous.query.isBlank() || it.title.contains(previous.query, true) || it.ingredients.any { i -> i.name.contains(previous.query, true) }) }, allRecipes = recipes, shared = recipes.filter { !it.owned }, nextCursor = null,
                    friends = rows.firstOrNull { it.kind == "friends" }?.let { buddyJson.decodeFromString(it.payload) } ?: previous.friends,
                    blocked = rows.firstOrNull { it.kind == "blocked" }?.let { buddyJson.decodeFromString(it.payload) } ?: previous.blocked,
                    active = previous.active?.let { active -> recipes.firstOrNull { it.id == active.id } ?: if(rows.any { it.kind == "sync" }) null else active },
                    pendingChanges = changes.size, syncProblems = changes.filter { it.failure != null })
            }
        } }
        fun watch(kind: String, update: (List<LocalEntry>) -> Unit) {
            localJobs += viewModelScope.launch { local.observe(account, kind).collect { if (api.session?.userId == account) update(it) } }
        }
        watch("shopping") { rows -> mutable.update { it.copy(shopping = rows.map { row -> buddyJson.decodeFromString(row.payload) }) } }
        watch("download") { rows -> mutable.update { it.copy(downloads = rows.map { row -> buddyJson.decodeFromString(row.payload) }) } }
        watch("timer") { rows -> mutable.update { it.copy(timers = rows.map { row -> buddyJson.decodeFromString(row.payload) }) } }
        watch("progress") { rows -> mutable.update { it.copy(progress = rows.map { row -> buddyJson.decodeFromString<CookingProgress>(row.payload) }.associateBy { p -> p.recipeId }) }; CookingWidget.refresh(app) }
        watch("ingredients") { rows -> mutable.update { it.copy(confirmed = rows.firstOrNull()?.let { row -> buddyJson.decodeFromString<List<Ingredient>>(row.payload) } ?: emptyList()) } }
        watch("meal-check-in"){rows->if(checkInRevision==0)mutable.update{it.copy(mealCheckIn=rows.firstOrNull()?.let{row->buddyJson.parseToJsonElement(row.payload).jsonObject}?:JsonObject(emptyMap()))}}
        watch("meal-draft") { rows -> if(mealDraftWrites == 0 && mealDraftRevision == 0) mutable.update { it.copy(mealDraft=rows.firstOrNull()?.let { row -> buddyJson.parseToJsonElement(row.payload).jsonObject } ?: JsonObject(emptyMap())) } }
        watch("response") { rows -> mutable.update { previous ->
            val payload = previous.active?.let { recipe -> rows.firstOrNull { it.id == "recipes/${recipe.id}/community" }?.payload }
            val community = payload?.let { buddyJson.decodeFromString<Community>(it) }
            previous.copy(community = community, communityLoaded = community != null,meals=rows.firstOrNull { it.id==mealPath() }?.payload?.let { buddyJson.parseToJsonElement(it).jsonObject })
        } }
        viewModelScope.launch { local.entries(account, "draft").firstOrNull()?.let { row -> mutable.update { it.copy(draft = buddyJson.decodeFromString(row.payload)) } } }
    }
    private suspend fun put(kind: String, id: String, payload: String) {
        val account = api.session?.userId ?: return
        val epoch = generation
        localLock.withLock { if (generation == epoch && api.session?.userId == account) local.put(LocalEntry(account, kind, id, payload)) }
    }
    private fun localWrite(kind: String, id: String, payload: String?) {
        val account = api.session?.userId ?: return; val epoch = generation
        viewModelScope.launch { try { localLock.withLock {
            if (epoch == generation && api.session?.userId == account) {
                kitchen.kitchen(kind, id, payload)
            }
        } } catch(e: CancellationException) { throw e }
        catch(_: Exception) { if(epoch == generation) mutable.update { it.copy(error = 507) } } }
    }
    fun login(email: String, password: String) = run {
        api.login(email, password); connected()
    }
    fun signup(email: String, password: String) = run { api.signup(email, password); connected() }
    fun browser(open: (String) -> Unit) = run { open(api.beginBrowser()) }
    fun google(context: android.content.Context) = run {
        try {
            val attempt = api.beginGoogle()
            api.google(attempt.attempt, nativeGoogleToken(context, attempt)); connected()
        } catch (_: androidx.credentials.exceptions.GetCredentialCancellationException) {
            // Dismissing the system picker leaves the sign-in screen available.
        } catch (e: androidx.credentials.exceptions.GetCredentialException) { android.util.Log.w("RecipeBuddyAuth", "Credential Manager: ${e.type}"); throw ApiFailure(422) }
    }
    fun exchange(uri: Uri) = run { api.exchange(uri); connected() }
    private suspend fun connected() {
        // An identity change purges all old private data before observation.
        if (app.vault.read("cachedAccount") != api.session!!.userId) { kitchen.purge(); CookingWidget.clear(app); TimerScheduler.cancelAll(app, state.value.timers) }
        app.vault.write("cachedAccount", api.session!!.userId)
        mealDraftRevision = 0
        checkInRevision = 0
        mutable.update { it.copy(account = api.session!!.userId, active = null, recipes = emptyList(), shared = emptyList(),
            shopping = emptyList(), downloads = emptyList(), timers = emptyList(), confirmed = emptyList(), matches = emptyList(), draft = Recipe(), meals=null, mealDraft=JsonObject(emptyMap()), mealActivity=null, mealKitchenId="", mealFrom="", mealDays=7, mealWeekPreview=null,mealCheckIn=JsonObject(emptyMap()),mealRescue=null, mealDiscovery=null, pantryMatches=null, lastMealOccasion=null) }
        mutable.update { it.copy(community = null, communityLoaded = false, recipients = null, chefProfile = null, searchResults = emptyList(), searchCompleted = false, contentTranslations = emptyMap()) }
        mutable.update { it.copy(waiting = false) }; observeLocal(); try { loadHome() } catch (e: java.io.IOException) { if (e is ApiFailure && e.status == 401) throw e }
    }
    fun refresh() { viewModelScope.launch {
        try { loadHome() } catch(error: ApiFailure) { if(error.status == 401) expireAccount() else if(state.value.me == null) mutable.update { it.copy(error = error.status) } }
        catch(_: java.io.IOException) { if(state.value.me == null) mutable.update { it.copy(error = 0) } }
        catch(e: CancellationException) { throw e }
        catch(_: Exception) { if(state.value.me == null) mutable.update { it.copy(error = 502) } }
    } }
    fun foreground() {
        if(api.session == null) return
        refresh()
        viewModelScope.launch { runCatching { state.value.me?.pro?.let { recoverPlayPurchases(app, it) } }.getOrNull()?.takeIf { it }?.let { refresh() } }
    }
    private suspend fun loadHome() {
        try { kitchen.synchronize() } catch (error: java.io.IOException) {
            if (error is ApiFailure && error.status == 401) throw error
            if (local.entries(api.session?.userId ?: return, "me").isEmpty()) throw error
        }
    }
    fun search(query: String, vibe: String) = run(waiting = false) {
        mutable.update { previous -> previous.copy(recipes = previous.allRecipes.filter { it.owned && (vibe.isBlank() || it.vibe == vibe) && (query.isBlank() || it.title.contains(query, true) || it.ingredients.any { i -> i.name.contains(query, true) }) }, nextCursor = null, query = query, vibe = vibe) }
    }
    fun more() = run {
        val cursor = state.value.nextCursor ?: return@run
        val page = buddyJson.decodeFromString<RecipePage>(api.request("recipes?cursor=${Uri.encode(cursor)}&q=${Uri.encode(state.value.query)}&vibe=${Uri.encode(state.value.vibe)}"))
        mutable.update { it.copy(recipes = (it.recipes + page.items).distinctBy { r -> r.id }, nextCursor = page.nextCursor) }
    }
    fun chooseRecipe(open: (Recipe) -> Unit) = run(waiting = false) { state.value.allRecipes.filter { it.owned }.randomOrNull()?.let(open) }
    fun openRecipe(id: String) = run(waiting = false) {
        mutable.update { it.copy(active = null, community = null, communityLoaded = false, recipients = null) }
        val cached = state.value.allRecipes.firstOrNull { it.id == id } ?: state.value.downloads.firstOrNull { it.recipe.id == id }?.recipe
        if(cached != null) { mutable.update { it.copy(active = cached) }; return@run }
        mutable.update { it.copy(waiting = true) }
        val recipe = buddyJson.decodeFromString<Recipe>(api.request("recipes/$id"))
        put("recipe", id, buddyJson.encodeToString(recipe)); mutable.update { it.copy(active = recipe) }
    }
    fun edit(recipe: Recipe = Recipe()) { mutable.update { it.copy(draft = recipe) }; persistDraft(recipe) }
    fun updateDraft(recipe: Recipe) { mutable.update { it.copy(draft = recipe) }; persistDraft(recipe) }
    private var draftJob: Job? = null
    private fun persistDraft(recipe: Recipe) { draftJob?.cancel(); draftJob = viewModelScope.launch { delay(200); put("draft", "current", buddyJson.encodeToString(recipe)) } }
    fun save() = run(waiting = false) {
        val draft = state.value.draft
        val recipe = (if (draft.id.isEmpty()) draft.copy(id = stableRecipeId()) else draft).copy(roastLine = "", translations = buildJsonObject {
            put("en", buildJsonObject {}); put("fr", buildJsonObject {}); put("pending", true)
        })
        kitchen.enqueue(if (draft.id.isEmpty()) "recipes" else "recipes/${recipe.id}", if (draft.id.isEmpty()) "POST" else "PUT", buddyJson.encodeToString(recipe.input()), "recipe", recipe.id, buddyJson.encodeToString(recipe), if (draft.id.isEmpty()) recipe.id else null, draft.updatedAt.takeIf { it.isNotBlank() })
        draftJob?.cancel(); local.delete(api.session!!.userId, "draft", "current"); app.vault.write("pendingImport", null)
        mutable.update { it.copy(draft = Recipe(), pendingImport = null, saved = it.saved + 1) }
    }
    fun delete(recipe: Recipe, done: () -> Unit = {}) = run(waiting = false) {
        kitchen.enqueue("recipes/${recipe.id}", "DELETE", kind = "recipe", id = recipe.id, localPayload = null, version = recipe.updatedAt.takeIf { it.isNotBlank() })
        local.delete(api.session!!.userId, "download", recipe.id); CookingWidget.deleted(app, recipe.id)
        mutable.update { it.copy(active = null) }; done()
    }
    fun importText(text: String) = run {
        val recipe = buddyJson.decodeFromString<Recipe>(api.request("recipes/parse", "POST", buildJsonObject { put("text", text) }.toString()))
        updateDraft(recipe)
    }
    fun pendingImport(text: String) {
        if (text.length > 16_000) { mutable.update { it.copy(error = 413) }; return }
        if (text.startsWith("http", true) && runCatching { Uri.parse(text).scheme != "https" }.getOrDefault(true)) { mutable.update { it.copy(error = 400) }; return }
        if (state.value.pendingImport != text) { app.vault.write("pendingImport", text); mutable.update { it.copy(pendingImport = text) } }
    }
    fun pendingDestination(account: String, recipe: String, cook: Boolean) {
        val value = "$account|$recipe|$cook"
        app.vault.write("pendingRoute", value); mutable.update { it.copy(pendingRoute = value) }
    }
    fun consumeDestination() { app.vault.write("pendingRoute", null); mutable.update { it.copy(pendingRoute = null) } }
    fun pendingInvite(url: String) {
        val uri = runCatching { Uri.parse(url.trim()) }.getOrNull()
        if (uri?.scheme != "https" || uri.host != Uri.parse(api.baseUrl).host || uri.port !in listOf(-1, 443) || uri.userInfo != null || uri.query != null || uri.fragment != null || !Regex("^/invite/[A-Za-z0-9_-]{43}$").matches(uri.path ?: "")) {
            mutable.update { it.copy(error = 400) }; return
        }
        val token = uri.lastPathSegment!!; app.vault.write("pendingInvite", token)
        mutable.update { it.copy(pendingInvite = token, invitePreview = null) }
        if (api.session != null) previewInvite()
    }
    fun previewInvite() = run { val token = state.value.pendingInvite ?: return@run; val invite = buddyJson.decodeFromString<Invite>(api.request("invites/$token")); mutable.update { it.copy(invitePreview = invite) } }
    fun acceptInvite() = run { val token = state.value.pendingInvite ?: return@run; api.request("invites/$token", "POST"); app.vault.write("pendingInvite", null); mutable.update { it.copy(pendingInvite = null, invitePreview = null) }; mutable.update { it.copy(waiting = false) }; loadHome() }
    fun createInvite() = run { val invite = buddyJson.decodeFromString<Invite>(api.request("invites", "POST")); put("invite", "current", buddyJson.encodeToString(invite)); mutable.update { it.copy(invite = invite) } }
    fun ensureInvite() = run {
        val cached = state.value.invite ?: local.entries(api.session!!.userId, "invite").firstOrNull()?.let { buddyJson.decodeFromString<Invite>(it.payload) }
        if(cached != null && runCatching { java.time.Instant.parse(cached.expiresAt).toEpochMilli() > System.currentTimeMillis() }.getOrDefault(false)) { mutable.update { it.copy(invite = cached) }; return@run }
        val invite = buddyJson.decodeFromString<Invite>(api.request("invites", "POST")); put("invite", "current", buddyJson.encodeToString(invite)); mutable.update { it.copy(invite = invite) }
    }
    private var chefSearchJob: Job? = null
    private var chefSearchRevision = 0
    fun searchChefs(name: String) {
        resetChefSearch()
        val query = name.trim(); val account = api.session?.userId ?: return
        if (query.length !in 3..64 || query.any { it == '@' || Character.isISOControl(it) || Character.getType(it) == Character.FORMAT.toInt() }) return
        val revision = chefSearchRevision; val epoch = generation
        fun current() = revision == chefSearchRevision && epoch == generation && api.session?.userId == account
        chefSearchJob = viewModelScope.launch {
            delay(450)
            if (!current()) return@launch
            mutable.update { it.copy(chefSearching = true) }
            try {
                val rows = buddyJson.decodeFromString<List<FriendPerson>>(api.request("chef-search?name=${Uri.encode(query)}"))
                if (current()) mutable.update { it.copy(chefResults = rows, chefSearchDone = true) }
            } catch (e: CancellationException) { throw e }
            catch (e: ApiFailure) { if (current()) { if (e.status == 401) expireAccount() else mutable.update { it.copy(chefSearchError = e.status) } } }
            catch (_: java.io.IOException) { if (current()) mutable.update { it.copy(chefSearchError = 0) } }
            catch (_: Exception) { if (current()) mutable.update { it.copy(chefSearchError = 502) } }
            finally { if (current()) mutable.update { it.copy(chefSearching = false) } }
        }
    }
    fun resetChefSearch() {
        chefSearchJob?.cancel(); chefSearchRevision++
        mutable.update { it.copy(chefResults = emptyList(), chefSearchDone = false, chefSearching = false, chefSearchError = null) }
    }
    fun inviteChef(person: FriendPerson) = run(waiting = false) { kitchen.enqueue("friends", "POST", buildJsonObject { put("chefId", person.id) }.toString(), "friend-request", person.id, "true"); mutable.update { it.copy(chefResults = it.chefResults.filter { row -> row.id != person.id }) } }
    fun friendship(id: String, accept: Boolean) = run(waiting = false) {
        val rows = state.value.friends.mapNotNull { if(it.id == id) { if(accept) it.copy(status = "accepted") else null } else it }
        kitchen.enqueue("friends/$id", if(accept) "PATCH" else "DELETE", kind = "friends", id = "current", localPayload = buddyJson.encodeToString(rows))
    }
    fun emailInvite(email: String) = run(waiting = false) { kitchen.enqueue("friends", "POST", buildJsonObject { put("email", email) }.toString(), "friend-request", UUID.randomUUID().toString(), "true") }
    fun shareRecipe(recipe: Recipe, friendId: String, grant: Boolean, done: () -> Unit = {}) = run(waiting = false) { queueShare(recipe, friendId, grant); done() }
    fun recipients(recipe: Recipe) = run {
        val rows = buddyJson.decodeFromString<List<RecipeRecipient>>(kitchen.read("recipes/${recipe.id}/shares"))
        if(state.value.active?.id == recipe.id) mutable.update { it.copy(recipients = rows) }
    }
    private suspend fun queueShare(recipe: Recipe, friendId: String, grant: Boolean) {
        val rows = state.value.recipients ?: kitchen.cached("recipes/${recipe.id}/shares")?.let { buddyJson.decodeFromString<List<RecipeRecipient>>(it) } ?: emptyList()
        val next = if(grant) (rows + RecipeRecipient(friendId)).distinctBy { it.recipientId } else rows.filter { it.recipientId != friendId }
        kitchen.enqueue("recipes/${recipe.id}/shares", if(grant) "POST" else "DELETE", buildJsonObject { put("recipientId", friendId) }.toString(), "response", "recipes/${recipe.id}/shares", buddyJson.encodeToString(next))
        mutable.update { it.copy(recipients = next) }
    }
    fun toggleShare(recipe: Recipe, friendId: String, grant: Boolean, done: () -> Unit) = run(waiting = false) { queueShare(recipe, friendId, grant); done() }
    private suspend fun loadCommunity(id: String) {
        val data = buddyJson.decodeFromString<Community>(kitchen.read("recipes/$id/community"))
        if (state.value.active?.id == id) mutable.update { it.copy(community = data, communityLoaded = true) }
    }
    fun community(recipe: Recipe) = run { loadCommunity(recipe.id) }
    fun refreshCommunity(recipe: Recipe) { viewModelScope.launch {
        try { kitchen.refresh("recipes/${recipe.id}/community") }
        catch(e: CancellationException) { throw e }
        catch(e: ApiFailure) { if(e.status == 401) expireAccount() else if(e.status == 403 || e.status == 404) refresh() }
        catch(_: java.io.IOException) { } // Keep the last account-scoped snapshot while offline.
    } }
    fun contribution(recipe: Recipe, payload: JsonObject, remove: Boolean = false, done: () -> Unit) = run(waiting = false) {
        val data = state.value.community ?: Community(recipe.id, Discussion(recipe.sharedChefId.ifBlank { state.value.account!! }), Reviews(recipe.sharedChefId.ifBlank { state.value.account!! }))
        val id = if(remove) payload.getValue("id").jsonPrimitive.content else stableRecipeId()
        fun text(key: String) = payload[key]?.jsonPrimitive?.content ?: ""
        val kind = text("kind"); val now = java.time.Instant.now().toString()
        val discussion = if(remove) data.discussion.copy(takes = data.discussion.takes.filter { it.id != id }, comments = data.discussion.comments.filter { it.id != id && it.takeId != id }) else if(kind == "take") data.discussion.copy(takes = data.discussion.takes + Take(id, state.value.account!!, state.value.me?.username ?: "", text("title"), text("type"), text("change"), text("ingredient"), text("reason"), now)) else data.discussion.copy(comments = data.discussion.comments + RecipeComment(id, state.value.account!!, state.value.me?.username ?: "", text("text"), text("takeId").takeIf { it.isNotBlank() }, now))
        val next = data.copy(discussion = discussion)
        kitchen.enqueue("recipes/${recipe.id}/discussion", if(remove) "DELETE" else "POST", payload.toString(), "response", "recipes/${recipe.id}/community", buddyJson.encodeToString(next), if(remove) null else id)
        mutable.update { it.copy(community = next, communityLoaded = true) }; done()
    }
    fun review(recipe: Recipe, rating: Int, text: String, remove: Boolean = false, done: () -> Unit) = run(waiting = false) {
        val data = state.value.community ?: Community(recipe.id, Discussion(recipe.sharedChefId.ifBlank { state.value.account!! }), Reviews(recipe.sharedChefId.ifBlank { state.value.account!! }))
        val own = data.reviews.reviews.filter { it.authorId != state.value.account }
        val next = data.copy(reviews = data.reviews.copy(reviews = if(remove) own else own + ApronReview(stableRecipeId(), state.value.account!!, state.value.me?.username ?: "", rating, text, java.time.Instant.now().toString())))
        kitchen.enqueue("recipes/${recipe.id}/reviews", if(remove) "DELETE" else "PUT", buildJsonObject { put("rating", rating); put("text", text) }.toString(), "response", "recipes/${recipe.id}/community", buddyJson.encodeToString(next))
        mutable.update { it.copy(community = next, communityLoaded = true) }; done()
    }
    fun chef(id: String) {
        mutable.update { it.copy(chefProfile = null) }
        run { val profile = try { buddyJson.decodeFromString<ChefProfile>(kitchen.read("chefs/${Uri.encode(id)}")) } catch (_: java.io.IOException) { ChefProfile(id, state.value.friends.firstOrNull { it.friend.id == id }?.friend?.username ?: "", Chef(), state.value.shared.filter { it.sharedChefId == id }) }; mutable.update { it.copy(chefProfile = profile) } }
    }
    fun globalSearch(query: String) {
        mutable.update { it.copy(searchCompleted = false, searchResults = emptyList()) }
        run(waiting = false) { val rows = state.value.allRecipes.filter { it.title.contains(query.trim(), true) || it.ingredients.any { i -> i.name.contains(query.trim(), true) } }; mutable.update { it.copy(searchResults = rows, searchCompleted = true) } }
    }
    fun resetGlobalSearch() { mutable.update { it.copy(searchResults = emptyList(), searchCompleted = false) } }
    fun recipePersonality(recipe: Recipe, kind: String) = run {
        require(kind == "roast")
        if(kind == "roast" && state.value.me?.pro?.active != true) { showPro(); return@run }
        api.request("recipes/${recipe.id}/$kind", "POST")
        val fresh = buddyJson.decodeFromString<Recipe>(api.request("recipes/${recipe.id}"))
        if (state.value.active?.id == recipe.id) mutable.update { it.copy(active = fresh) }
        CookingWidget.updateRecipe(app, fresh); mutable.update { it.copy(waiting = false) }; loadHome()
    }
    suspend fun refreshRecipe(id: String) {
        try { kitchen.refreshRecipe(id) }
        catch (e: CancellationException) { throw e }
        catch (e: ApiFailure) { if (e.status == 401) expireAccount(); else if (e.status in listOf(403, 404)) refresh() }
        catch (_: java.io.IOException) { /* Retain the original and cached languages while disconnected. */ }
    }
    fun translateContent(language: String, texts: List<String>) = run {
        val batches = mutableListOf<List<String>>()
        var current = mutableListOf<String>()
        texts.filter { it.isNotBlank() && it.length <= 4000 }.distinct().forEach { text ->
            if (current.size >= 30 || current.sumOf { it.length } + text.length > 12000) { batches += current.toList(); current = mutableListOf() }
            current += text
        }
        if (current.isNotEmpty()) batches += current
        for (batch in batches) {
            val response = buddyJson.decodeFromString<TranslationResult>(api.request("translate", "POST", buildJsonObject { put("locale", language); put("texts", buddyJson.encodeToJsonElement(batch)) }.toString()))
            require(response.translations.size == batch.size)
            mutable.update { it.copy(contentTranslations = it.contentTranslations + batch.zip(response.translations).associate { (text, value) -> "$language|$text" to value }) }
        }
    }
    fun settings(name: String, roast: Boolean) = run(waiting = false) { val me = state.value.me ?: return@run; kitchen.enqueue("settings", "PUT", buildJsonObject { put("username", name); put("roastEnabled", roast) }.toString(), "me", "current", buddyJson.encodeToString(me.copy(username = name, roastEnabled = roast))) }
    fun acceptTerms() = run { api.request("terms", "POST", buildJsonObject { put("version", LEGAL_VERSION); put("accepted", true) }.toString()); mutable.update { it.copy(waiting = false) }; loadHome() }
    fun deleteAccount(password: String) = run {
        api.request("account", "DELETE", buildJsonObject { put("confirmation", "DELETE"); if (password.isNotBlank()) put("password", password) }.toString())
        listOf("pendingInvite", "pendingImport", "pendingRoute", "browser").forEach { app.vault.write(it, null) }
        clearAccount()
    }
    fun block(id: String, unblock: Boolean = false) = run(waiting = false) {
        val current = state.value
        val person = current.friends.firstOrNull { it.friend.id == id }?.friend ?: current.blocked.firstOrNull { it.id == id } ?: FriendPerson(id, current.chefProfile?.takeIf { it.id == id }?.username ?: "")
        val blocked = if(unblock) current.blocked.filterNot { it.id == id } else (current.blocked + person).distinctBy { it.id }
        kitchen.enqueue("blocks", if(unblock) "DELETE" else "POST", buildJsonObject { put("chefId", id) }.toString(), "blocked", "current", buddyJson.encodeToString(blocked))
        if(!unblock) {
            kitchen.hideChef(id)
            put("friends", "current", buddyJson.encodeToString(current.friends.filterNot { it.friend.id == id }))
        }
        mutable.update { it.copy(active = null, chefProfile = null, blocked = blocked) }
    }
    fun report(recipeId: String?, chefId: String?, reason: String, done: () -> Unit) = run(waiting = false) { kitchen.enqueue("reports", "POST", buildJsonObject { if(recipeId != null) put("recipeId", recipeId); if(chefId != null) put("chefId", chefId); put("reason", reason) }.toString(), "report", UUID.randomUUID().toString(), "true"); done() }
    fun preference(name: String, value: String) { viewModelScope.launch { app.preferences.edit { it[stringPreferencesKey(name)] = value } } }
    fun photo(encoded: String) { scanId = UUID.randomUUID().toString(); mutable.update { it.copy(photo = encoded, suggestions = emptyList()) } }
    fun removePhoto() { mutable.update { it.copy(photo = null) } }
    fun analyze(locale: String) = run {
        val photo = state.value.photo ?: return@run
        val result = buddyJson.decodeFromString<Suggestions>(api.request("analyze", "POST", buildJsonObject { put("requestId", scanId); put("locale", locale); put("image", photo) }.toString()))
        mutable.update { it.copy(suggestions = result.suggestions, photo = null) }
    }
    fun confirmSuggestions() { ingredients(state.value.confirmed + state.value.suggestions.map { Ingredient(it.label, it.quantity, it.unit) }); mutable.update { it.copy(suggestions = emptyList()) } }
    fun suggestion(index: Int, value: Suggestion?) { mutable.update { it.copy(suggestions = it.suggestions.mapIndexedNotNull { i, s -> if (i == index) value else s }) } }
    fun ingredients(list: List<Ingredient>) { mutable.update { it.copy(confirmed = list, matches = emptyList(), matchCompleted = false) }; localWrite("ingredients", "confirmed", buddyJson.encodeToString(list)) }
    fun match() = run(waiting = false) { val matches = localRecipeMatches(state.value.allRecipes, state.value.confirmed); mutable.update { it.copy(matches = matches, matchCompleted = true) } }
    fun addShopping(item: ShoppingItem) { localWrite("shopping", item.id, buddyJson.encodeToString(item)) }
    fun deleteShopping(item: ShoppingItem) { localWrite("shopping", item.id, null) }
    fun shoppingFrom(ids: List<String>) = run(waiting = false) {
        state.value.allRecipes.filter { it.id in ids }.flatMap { it.ingredients }.groupBy { it.name.trim().lowercase() }.values.forEach { group -> addShopping(ShoppingItem(UUID.randomUUID().toString(), group.first().name, group.map { "${it.quantity} ${it.unit}".trim() }.distinct().filter { it.isNotBlank() }.joinToString(" + "))) }
    }
    fun missingToShopping(items: List<Ingredient>) { items.forEach { addShopping(ShoppingItem(UUID.randomUUID().toString(), it.name, "${it.quantity} ${it.unit}".trim())) } }
    fun progress(recipe: Recipe, step: Int, servings: Int) { val progress = CookingProgress(recipe.id, step.coerceIn(0, maxOf(0, recipe.steps.lastIndex)), servings.coerceIn(1, 100)); mutable.update { it.copy(progress = it.progress + (recipe.id to progress)) }; localWrite("progress", recipe.id, buddyJson.encodeToString(progress)) }
    fun timer(recipe: Recipe, step: Int, name: String, seconds: Long) {
        if (seconds !in 1..604800) { mutable.update { it.copy(error = 400) }; return }
        val account = api.session?.userId ?: return; val epoch = generation
        val timer = KitchenTimer(UUID.randomUUID().toString(), recipe.id, name, System.currentTimeMillis() + seconds * 1000, step)
        viewModelScope.launch { localLock.withLock {
            if (epoch == generation && api.session?.userId == account) {
                kitchen.kitchen("timer", timer.id, buddyJson.encodeToString(timer))
                TimerScheduler.schedule(app, timer)
            }
        } }
    }
    fun cancelTimer(timer: KitchenTimer) {
        val account = api.session?.userId ?: return; val epoch = generation
        viewModelScope.launch { localLock.withLock {
            if (epoch == generation && api.session?.userId == account) {
                TimerScheduler.cancel(app, timer); kitchen.kitchen("timer", timer.id, null)
            }
        } }
    }
    fun cooked(recipe: Recipe) { saveMealDraft(buildJsonObject { put("id",UUID.randomUUID().toString());put("recipeId",recipe.id);put("title",recipe.title);put("servings",state.value.progress[recipe.id]?.servings ?: recipe.servings) }); loadMeals() }
    fun showPro() { mutable.update { it.copy(proPrompt = true) } }
    fun dismissPro() { mutable.update { it.copy(proPrompt = false) } }
    fun resolveSync(id: String, keepCopy: Boolean) = run(waiting = false) { kitchen.resolve(id, keepCopy) }
    fun declineInvite() { app.vault.write("pendingInvite", null); mutable.update { it.copy(pendingInvite = null, invitePreview = null) } }
    fun clearError() { mutable.update { it.copy(error = null) } }
    fun logout() = run { if(state.value.pendingChanges > 0) throw ApiFailure(409); try { api.logout() } finally { clearAccount() } }
    private fun expireAccount() {
        generation++; resetChefSearch(); localJobs.forEach { it.cancel() }; draftJob?.cancel(); api.expire()
        // Reauthentication to the same account restores its durable pending edits.
        mutable.value = BuddyState(theme = state.value.theme, language = state.value.language, error = 401)
    }
    private suspend fun clearAccount() {
        clearGoogleCredential(app)
        generation++; resetChefSearch(); localJobs.forEach { it.cancel() }; draftJob?.cancel()
        val account = api.session?.userId
        CookingWidget.clear(app); api.clear(); localLock.withLock {
            val storedTimers = account?.let { local.entries(it, "timer").map { row -> buddyJson.decodeFromString<KitchenTimer>(row.payload) } } ?: emptyList()
            TimerScheduler.cancelAll(app, storedTimers + state.value.timers); kitchen.purge()
        }
        app.cacheDir.listFiles()?.filter { it.isFile }?.forEach { it.delete() }
        app.cacheDir.resolve("camera").listFiles()?.forEach { it.delete() }
        coil.Coil.imageLoader(app).memoryCache?.clear()
        withContext(Dispatchers.IO) { coil.Coil.imageLoader(app).diskCache?.clear() }
        mutable.value = BuddyState(theme = state.value.theme, language = state.value.language, error = state.value.error)
    }
}
