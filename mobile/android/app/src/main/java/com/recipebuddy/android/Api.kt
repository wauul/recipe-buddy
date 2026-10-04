package com.recipebuddy.android

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.NonCancellable
import kotlinx.serialization.json.*
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import java.util.concurrent.TimeUnit
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class ApiFailure(val status: Int) : IOException("API request failed ($status)")
val buddyJson = Json { ignoreUnknownKeys = true; encodeDefaults = true }
class BuddyApi(private val vault: SecureVault) {
    private val client = OkHttpClient.Builder().callTimeout(65, TimeUnit.SECONDS).connectTimeout(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(false).followRedirects(false).build()
    private val refreshLock = Mutex()
    @Volatile var session: Session? = vault.read("session")?.let { runCatching { buddyJson.decodeFromString<Session>(it) }.getOrNull() }; private set
    var baseUrl: String = BuildConfig.BACKEND_URL; private set
    fun configure(url: String) {
        val parsed = java.net.URI(url)
        // Endpoint overrides exist only for instrumented debug tests.
        require(BuildConfig.DEBUG)
        val debugLocal = BuildConfig.DEBUG && parsed.scheme == "http" && parsed.host in listOf("127.0.0.1", "localhost", "10.0.2.2")
        require((parsed.scheme == "https" || debugLocal) && parsed.host != null && parsed.userInfo == null && parsed.query == null && parsed.fragment == null && (parsed.path.isNullOrBlank() || parsed.path == "/"))
        baseUrl = url.trimEnd('/')
    }
    private fun save(value: Session) { session = value; vault.write("session", buddyJson.encodeToString(value)) }
    fun clear() { session = null; vault.clear() }
    fun expire() { session = null; vault.write("session", null) }
    private suspend fun raw(path: String, method: String, payload: String?, token: String?): String = withContext(Dispatchers.IO) {
        val builder = Request.Builder().url(baseUrl + path).header("Accept", "application/json")
        if (token != null) builder.header("Authorization", "Bearer $token")
        builder.method(method, if (method == "GET") null else (payload ?: "{}").toRequestBody("application/json".toMediaType()))
        // Save-time bilingual preparation uses the same bounded server budget as web.
        val slowRecipeOperation = method in listOf("POST", "PUT") && Regex("^/api/native/v1/recipes(?:/[^/]+(?:/translations)?)?$").matches(path)
        val transport = when {
            slowRecipeOperation -> client.newBuilder().callTimeout(300, TimeUnit.SECONDS).build()
            // Sync writes carry stable operation IDs and server receipts. A lost
            // response can replay the identical body without repeating effects.
            method == "POST" && path == "/api/native/v1/sync" -> client.newBuilder().retryOnConnectionFailure(true).build()
            method == "GET" -> client.newBuilder().retryOnConnectionFailure(true).build()
            else -> client
        }
        suspendCancellableCoroutine { continuation ->
            val call = transport.newCall(builder.build())
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : okhttp3.Callback {
                override fun onFailure(call: okhttp3.Call, e: IOException) { continuation.resumeWithException(e) }
                override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                    try { response.use {
                        if (!it.isSuccessful) throw ApiFailure(it.code)
                        continuation.resume(it.body?.string() ?: throw ApiFailure(502))
                    } } catch (error: Exception) { continuation.resumeWithException(error) }
                }
            })
        }
    }
    suspend fun login(email: String, password: String) {
        val data = buildJsonObject { put("email", email); put("password", password) }
        save(buddyJson.decodeFromString(raw("/api/native/auth/login", "POST", data.toString(), null)))
    }
    suspend fun signup(email: String, password: String) {
        val data = buildJsonObject { put("email", email); put("password", password) }.toString()
        raw("/api/auth/signup", "POST", data, null)
        login(email, password)
    }
    suspend fun beginBrowser(): String {
        val random = java.security.SecureRandom()
        fun token() = android.util.Base64.encodeToString(ByteArray(32).also(random::nextBytes), android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP)
        val state = token(); val verifier = token()
        val challenge = android.util.Base64.encodeToString(java.security.MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray()), android.util.Base64.URL_SAFE or android.util.Base64.NO_PADDING or android.util.Base64.NO_WRAP)
        vault.write("browser", buddyJson.encodeToString(BrowserAttempt(state, verifier)))
        val data = buildJsonObject { put("state", state); put("challenge", challenge); put("redirect", "recipebuddy://auth") }
        return buddyJson.decodeFromString<BrowserUrl>(raw("/api/native/auth/begin", "POST", data.toString(), null)).url
    }
    suspend fun beginGoogle(): GoogleAttempt = buddyJson.decodeFromString(raw("/api/native/auth/google-begin", "POST", "{}", null))
    suspend fun google(attempt: String, idToken: String) {
        val data = buildJsonObject { put("attempt", attempt); put("idToken", idToken) }
        save(buddyJson.decodeFromString(raw("/api/native/auth/google", "POST", data.toString(), null)))
    }
    suspend fun exchange(uri: android.net.Uri) {
        require(uri.scheme == "recipebuddy" && uri.host == "auth")
        val pending = vault.read("browser")?.let { buddyJson.decodeFromString<BrowserAttempt>(it) } ?: throw ApiFailure(401)
        if (uri.getQueryParameter("state") != pending.state) throw ApiFailure(401)
        val data = buildJsonObject { put("code", uri.getQueryParameter("code")); put("state", pending.state); put("verifier", pending.verifier) }
        save(buddyJson.decodeFromString(raw("/api/native/auth/exchange", "POST", data.toString(), null)))
        vault.write("browser", null)
    }
    suspend fun request(path: String, method: String = "GET", payload: String? = null): String {
        val previous = session ?: throw ApiFailure(401)
        try { return raw("/api/native/v1/$path", method, payload, previous.accessToken) }
        catch (error: ApiFailure) {
            if (error.status != 401) throw error
            refreshLock.withLock {
              withContext(NonCancellable) {
                val current = session ?: throw ApiFailure(401)
                if (current.accessToken == previous.accessToken) {
                    val data = buildJsonObject { put("refreshToken", current.refreshToken) }
                    val result = raw("/api/native/auth/refresh", "POST", data.toString(), null)
                    // A logout during refresh must not resurrect a session.
                    if (session != current) throw ApiFailure(401)
                    save(buddyJson.decodeFromString(result))
                }
              }
            }
            return raw("/api/native/v1/$path", method, payload, session?.accessToken ?: throw ApiFailure(401))
        }
    }
    suspend fun logout() {
        session?.let { raw("/api/native/auth/logout", "POST", buildJsonObject { put("refreshToken", it.refreshToken) }.toString(), it.accessToken) }
    }
    suspend fun photo(path: String): String = withContext(Dispatchers.IO) {
        // Refresh through the normal authenticated path first; never put a token in a URL.
        request("me")
        val token=session?.accessToken ?: throw ApiFailure(401)
        client.newCall(Request.Builder().url("$baseUrl/api/native/v1/$path").header("Authorization","Bearer $token").build()).execute().use { response ->
            if(!response.isSuccessful) throw ApiFailure(response.code)
            val bytes=response.body?.bytes() ?: throw ApiFailure(502)
            if(bytes.size>200000 || response.header("Content-Type")!="image/webp") throw ApiFailure(502)
            "data:image/webp;base64,"+android.util.Base64.encodeToString(bytes,android.util.Base64.NO_WRAP)
        }
    }
}
