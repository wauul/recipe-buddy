package com.recipebuddy.android

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class MealSyncTransportTest {
 @Test fun disconnectedSyncReplaysIdenticalOperation()=runBlocking {
  assertTrue(BuildConfig.APPLICATION_ID.endsWith(".meals"))
  val app=InstrumentationRegistry.getInstrumentation().targetContext.applicationContext as BuddyApp
  // A dedicated transport prevents background workers from consuming responses.
  val api=BuddyApi(app.vault)
  val original=api.baseUrl
  api.login("meal-a@example.test","MealTestOnly-2026")
  val server=MockWebServer()
  server.start()
  try {
   api.configure(server.url("/").toString().trimEnd('/'))
   server.enqueue(MockResponse().setBody("{}"))
   api.request("me") // Establish the reusable connection.
   server.enqueue(MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST))
   server.enqueue(MockResponse().setBody("{}"))
   val body="{\"operationId\":\"${UUID.randomUUID()}\",\"path\":\"meals\",\"method\":\"POST\",\"payload\":\"TEST ONLY transport fixture\"}"
   assertEquals("{}",api.request("sync","POST",body))
   assertEquals("/api/native/v1/me",server.takeRequest(5,TimeUnit.SECONDS)!!.path)
   val first=server.takeRequest(5,TimeUnit.SECONDS)!!
   val replay=server.takeRequest(5,TimeUnit.SECONDS)!!
   assertEquals("/api/native/v1/sync",first.path)
   assertEquals(first.path,replay.path)
   assertEquals(body,first.body.readUtf8())
   assertEquals(body,replay.body.readUtf8())
   assertEquals(3,server.requestCount)
  } finally {api.configure(original);server.shutdown()}
 }
}
