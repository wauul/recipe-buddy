package com.recipebuddy.android

import android.content.Context
import android.content.ContextWrapper
import android.content.SharedPreferences
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.*
import okhttp3.mockwebserver.*
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

@RunWith(AndroidJUnit4::class)
class NativeApiTest {
    private fun vault(): SecureVault {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        assertTrue(context.packageName.endsWith(".design"))
        val file = "native-api-test-" + UUID.randomUUID()
        return SecureVault(object : ContextWrapper(context) {
            override fun getSharedPreferences(name: String, mode: Int): SharedPreferences = context.getSharedPreferences(file, Context.MODE_PRIVATE)
        })
    }
    private val login = """{"accessToken":"fixture-old-access","refreshToken":"fixture-old-refresh","userId":"fixture-account","expiresIn":600}"""
    private val rotated = """{"accessToken":"fixture-new-access","refreshToken":"fixture-new-refresh","userId":"fixture-account","expiresIn":600}"""

    @Test fun cancellingSearchDuringTokenRotationStillSavesTheRotatedSession() = runBlocking {
        val vault = vault(); val server = MockWebServer()
        val started = CountDownLatch(1); val release = CountDownLatch(1); val rotations = AtomicInteger()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse = when(request.path) {
                "/api/native/auth/login" -> MockResponse().setBody(login)
                "/api/native/auth/refresh" -> {
                    rotations.incrementAndGet(); started.countDown()
                    check(release.await(5, TimeUnit.SECONDS))
                    MockResponse().setBody(rotated)
                }
                else -> if(request.getHeader("Authorization") == "Bearer fixture-old-access") MockResponse().setResponseCode(401).setBody("{}") else MockResponse().setBody("[]")
            }
        }
        server.start()
        try {
            val api = BuddyApi(vault).apply { configure("http://127.0.0.1:${server.port}") }
            api.login("fixture@example.test", "FixtureOnly")
            val search = launch(Dispatchers.Default) { api.request("chef-search?name=Chef") }
            assertTrue(withContext(Dispatchers.IO) { started.await(5, TimeUnit.SECONDS) })
            search.cancel(); release.countDown(); withTimeout(5000) { search.join() }
            assertEquals("fixture-new-refresh", api.session!!.refreshToken)
            assertEquals("fixture-new-refresh", buddyJson.decodeFromString<Session>(vault.read("session")!!).refreshToken)
            assertEquals("[]", api.request("chef-search?name=Other")); assertEquals(1, rotations.get())
        } finally { release.countDown(); vault.clear(); server.shutdown() }
    }

    @Test fun safeReadsRecoverFromAPooledConnectionDroppingBeforeItsResponse() = runBlocking {
        val vault = vault(); val server = MockWebServer()
        server.enqueue(MockResponse().setBody(login))
        server.enqueue(MockResponse().setBody("[]"))
        server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))
        server.enqueue(MockResponse().setBody("[\"recovered\"]"))
        server.start()
        try {
            val api = BuddyApi(vault).apply { configure("http://127.0.0.1:${server.port}") }
            api.login("fixture@example.test", "FixtureOnly")
            assertEquals("[]", api.request("chef-search?name=Warm"))
            assertEquals("[\"recovered\"]", api.request("chef-search?name=Next"))
            assertEquals(4, server.requestCount)
        } finally { vault.clear(); server.shutdown() }
    }
}
