package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.json.JSONObject
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class NativeLiveBackendTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    @Test fun productionLoginAndRecipeRead() {
        assertEquals("https://recipe-buddy-wauul.vercel.app", BuildConfig.BACKEND_URL)
        val app = compose.activity.application as BuddyApp
        val file = File(app.getExternalFilesDir(null), "live-backend-check.json")
        val fixture = JSONObject(file.readText())
        val vm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        try {
            assertEquals(BuildConfig.BACKEND_URL, app.api.baseUrl)
            compose.waitUntil(45_000) { !vm.state.value.busy }
            if (app.api.session != null) { compose.runOnUiThread { vm.logout() }; compose.waitUntil(45_000) { vm.state.value.account == null && !vm.state.value.busy } }
            compose.runOnUiThread { vm.clearError(); vm.login(fixture.getString("email"), fixture.getString("password")) }
            compose.waitUntil(45_000) { vm.state.value.me?.id == fixture.getString("userId") && !vm.state.value.busy }
            assertNull(vm.state.value.error)
            assertEquals(1, vm.state.value.recipes.size)
            compose.onNodeWithText(fixture.getString("title")).performClick()
            compose.waitUntil(30_000) { vm.state.value.active?.id == fixture.getString("recipeId") && !vm.state.value.busy }
            compose.onNodeWithText("Start cooking").assertExists()
            compose.onAllNodesWithText("Print recipe").assertCountEquals(0)
            val screenshots = File(app.getExternalFilesDir(null), "native-verification").apply { mkdirs() }
            assertTrue(UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).takeScreenshot(File(screenshots, "60-live-backend-detail.png")))
        } finally {
            compose.runOnUiThread { vm.logout() }
            compose.waitUntil(45_000) { vm.state.value.account == null && !vm.state.value.busy }
            file.delete()
        }
    }
}
