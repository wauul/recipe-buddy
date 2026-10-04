package com.recipebuddy.android

import android.content.res.Configuration
import android.view.ContextThemeWrapper
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.*
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Density
import androidx.compose.ui.graphics.toPixelMap
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File
import java.util.Locale

// Render-only review on a fresh isolated package: no login or production writes.
@RunWith(AndroidJUnit4::class)
class NativeMotionTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val activity get() = compose.activity
    private val vm get() = ViewModelProvider(activity)[BuddyViewModel::class.java]
    private fun shot(name: String) {
        compose.waitForIdle()
        InstrumentationRegistry.getInstrumentation().waitForIdleSync()
        android.os.SystemClock.sleep(450) // Wait for the emulator compositor, including popup windows.
        val dir = File(activity.getExternalFilesDir(null), "motion-review").apply { mkdirs() }
        assertTrue(UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).takeScreenshot(File(dir, "$name.png")))
    }
    private fun render(language: String = "en", theme: String = "light", font: Float = 1f,
        busy: Boolean = false, waiting: Boolean = busy, splash: Boolean = false, motion: Boolean = true) {
        val config = Configuration(activity.resources.configuration).apply { setLocale(Locale.forLanguageTag(language)); fontScale = font }
        val localized = ContextThemeWrapper(activity, 0).apply { applyOverrideConfiguration(config) }
        compose.runOnUiThread {
          val style = if (theme == "dark") SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
            else SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
          activity.enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
          activity.setContent {
            CompositionLocalProvider(LocalContext provides localized, LocalConfiguration provides config,
                LocalResources provides localized.resources, LocalDensity provides Density(activity.resources.displayMetrics.density, font)) {
                KitchenTheme(theme) { CompositionLocalProvider(LocalKitchenMotion provides motion) {
                    if (splash) BuddySplash() else LoginScreen(BuddyState(busy = busy, waiting = waiting, language = language, theme = theme), vm)
                    BuddyActionIndicator(waiting)
                } }
            }
        } }
        compose.waitForIdle()
        if (waiting) compose.waitUntil(3_000) { compose.onAllNodesWithTag("action-loader").fetchSemanticsNodes().isNotEmpty() }
    }
    @Test fun signInSplashLoaderAndMotionAcrossAccessibleStates() {
        assertTrue(BuildConfig.APPLICATION_ID.endsWith(".motion"))
        assertNull((activity.application as BuddyApp).api.session)
        compose.waitUntil(10_000) { compose.onAllNodesWithTag("sign-in-logo").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithTag("sign-in-logo").assertWidthIsEqualTo(80.dp)
        compose.onNodeWithText("Sign in", substring = false).assertIsDisplayed().assertIsNotEnabled()
        shot("01-login-light")
        compose.onNodeWithText("Email address").performTextInput("chef@example.test")
        compose.onNodeWithText("Password", substring = false).performTextInput("ReviewOnly2026")
        compose.onNodeWithText("Sign in", substring = false).assertIsEnabled()
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack()
        compose.onNodeWithText("Create an account", substring = false).performScrollTo().performClick()
        compose.onNodeWithText("Already have an account? Sign in", substring = false).assertExists()
        shot("02-signup")
        render(theme = "dark"); shot("03-login-dark")
        render(language = "fr"); compose.onNodeWithText("Se connecter", substring = false).assertIsDisplayed(); shot("04-login-french")
        render(language = "fr", font = 1.5f)
        compose.onNodeWithText("Se connecter", substring = false).performScrollTo().assertIsDisplayed(); shot("05-login-large-text")
        render(splash = true); compose.onNodeWithTag("launch-splash").assertIsDisplayed(); shot("06-splash")
        render(busy = true, waiting = false); compose.onNodeWithTag("action-loader").assertDoesNotExist()
        render(busy = true); compose.onNodeWithText("Stirring the pot…").assertIsDisplayed(); compose.onNodeWithTag("action-loader").assertIsDisplayed(); shot("07-action-loader")
        render(busy = true, motion = false); compose.onNodeWithTag("action-loader").assertIsDisplayed(); shot("08-reduced-motion")
    }

    @Test fun logoMovesAndPressesReactWhileReducedMotionStaysStill() {
        assertTrue(BuildConfig.APPLICATION_ID.endsWith(".motion"))
        var clicks = 0
        fun fixture(motion: Boolean) {
            compose.runOnUiThread { activity.setContent { KitchenTheme {
                CompositionLocalProvider(LocalKitchenMotion provides motion) {
                    Column(Modifier.fillMaxSize().padding(24.dp)) {
                        Box(Modifier.size(80.dp).testTag("animated-logo"), contentAlignment = androidx.compose.ui.Alignment.Center) { BuddyLogo(loading = true) }
                        KitchenButton(onClick = { clicks++ }, modifier = Modifier.testTag("press-button")) { Text("Press") }
                    }
                }
            } } }
            compose.waitForIdle()
        }
        fun differs(first: androidx.compose.ui.graphics.ImageBitmap, second: androidx.compose.ui.graphics.ImageBitmap): Boolean {
            val a = first.toPixelMap(); val b = second.toPixelMap()
            if (a.width != b.width || a.height != b.height) return true
            for (y in 0 until a.height) for (x in 0 until a.width) if (a[x, y] != b[x, y]) return true
            return false
        }
        compose.mainClock.autoAdvance = false
        fixture(true)
        compose.mainClock.advanceTimeBy(32)
        val first = compose.onNodeWithTag("animated-logo").captureToImage()
        compose.mainClock.advanceTimeBy(350)
        assertTrue("loading logo must animate", differs(first, compose.onNodeWithTag("animated-logo").captureToImage()))
        val button = compose.onNodeWithTag("press-button")
        val width = button.fetchSemanticsNode().boundsInRoot.width
        button.performTouchInput { down(center) }; compose.mainClock.advanceTimeBy(150)
        assertTrue("press feedback contracts the button", button.fetchSemanticsNode().boundsInRoot.width < width)
        button.performTouchInput { up() }; compose.mainClock.advanceTimeBy(150)
        assertEquals(1, clicks)
        assertEquals(width, button.fetchSemanticsNode().boundsInRoot.width, 1f)
        compose.mainClock.autoAdvance = true
        fixture(false)
        compose.mainClock.autoAdvance = false
        val still = compose.onNodeWithTag("animated-logo").captureToImage()
        compose.mainClock.advanceTimeBy(500)
        assertFalse("reduced-motion logo stays static", differs(still, compose.onNodeWithTag("animated-logo").captureToImage()))
        compose.mainClock.autoAdvance = true
    }

    @Test fun backgroundRefreshStaysQuietWithoutHidingAUserWait() {
        assertTrue(BuildConfig.APPLICATION_ID.endsWith(".motion"))
        val app = activity.application as BuddyApp
        assertNull(app.api.session)
        val responseGate = java.util.concurrent.CountDownLatch(1)
        val requestStarted = java.util.concurrent.CountDownLatch(1)
        val server = okhttp3.mockwebserver.MockWebServer()
        server.dispatcher = object : okhttp3.mockwebserver.Dispatcher() {
            override fun dispatch(request: okhttp3.mockwebserver.RecordedRequest): okhttp3.mockwebserver.MockResponse {
                requestStarted.countDown()
                responseGate.await(10, java.util.concurrent.TimeUnit.SECONDS)
                return okhttp3.mockwebserver.MockResponse().setResponseCode(401).setBody("{}")
            }
        }
        server.start()
        try {
            app.api.configure(server.url("/").toString())
            compose.runOnUiThread { vm.refresh() }
            compose.waitForIdle()
            assertFalse(vm.state.value.waiting)
            compose.onNodeWithTag("action-loader").assertDoesNotExist()
            compose.runOnUiThread { vm.login("chef@example.test", "ReviewOnly2026") }
            assertTrue(requestStarted.await(5, java.util.concurrent.TimeUnit.SECONDS))
            compose.waitUntil(5_000) { vm.state.value.waiting }
            compose.runOnUiThread { vm.refresh() }
            compose.waitForIdle()
            assertTrue("background refresh must not clear a foreground wait", vm.state.value.waiting)
            compose.waitUntil(3_000) { compose.onAllNodesWithTag("action-loader").fetchSemanticsNodes().isNotEmpty() }
            compose.onNodeWithText("Stirring the pot…").assertIsDisplayed()
            responseGate.countDown()
            compose.waitUntil(5_000) { !vm.state.value.busy }
            assertFalse(vm.state.value.waiting)
        } finally {
            responseGate.countDown()
            server.shutdown()
            app.api.configure(BuildConfig.BACKEND_URL)
            compose.runOnUiThread { vm.clearError() }
        }
    }
}
