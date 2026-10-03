package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import androidx.lifecycle.ViewModelProvider
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import java.io.File

@RunWith(AndroidJUnit4::class)
class NativeDesignTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private fun waitText(text: String) { compose.waitUntil(25_000) { runCatching { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }.getOrDefault(false) } }
    private fun shot(name: String) { compose.waitForIdle(); val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()); device.waitForIdle(); val dir = File(app.getExternalFilesDir(null), "native-verification").apply { mkdirs() }; assertTrue(device.takeScreenshot(File(dir, "$name.png"))) }
    @Test fun nativeGoogleCancellationAndLocalizedScreens() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL)
        val vm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        app.vault.write("pendingImport", null); app.vault.write("pendingInvite", null)
        runBlocking { app.preferences.edit { it[stringPreferencesKey("language")] = "en"; it[stringPreferencesKey("theme")] = "light" } }
        compose.waitUntil(10_000) { vm.state.value.theme == "light" }
        if (app.api.session != null) {
            compose.waitUntil(10_000) { !vm.state.value.busy }; compose.runOnUiThread { vm.logout() }
            compose.waitUntil(10_000) { vm.state.value.account == null && !vm.state.value.busy }
        }
        waitText("Welcome back, chef"); shot("01-login")
        compose.onNodeWithText("Continue with Google").performClick()
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        assertNotNull("Native Google account picker must appear; never choose a personal account in an automated test", device.wait(Until.findObject(By.pkg("com.google.android.gms")), 20_000))
        // Do not record the private list of Google identities on the user's phone.
        device.pressBack()
        compose.waitUntil(15_000) { !vm.state.value.busy }
        waitText("Welcome back, chef"); assertNull(vm.state.value.error); assertNull(app.api.session)
        compose.onNodeWithText("Email address").performTextInput("native-a@example.test")
        compose.onNodeWithText("Password").performTextInput("NativeTestOnly-2026")
        device.pressBack()
        compose.onNodeWithText("Sign in").performScrollTo().performClick(); waitText("My recipes")
        compose.waitUntil(20_000) { !vm.state.value.busy && vm.state.value.recipes.isNotEmpty() }; shot("17-collection-light")
        compose.onNodeWithContentDescription("Settings").performClick(); waitText("Appearance"); shot("18-settings-light")
        compose.onNodeWithText("Français").performScrollTo().performClick(); waitText("Langue")
        compose.onNodeWithText("Sombre").performScrollTo().performClick()
        compose.waitUntil(10_000) { vm.state.value.theme == "dark" }; compose.waitForIdle(); shot("11-french-dark")
        compose.onNodeWithText("Clair").performScrollTo().performClick()
        compose.waitUntil(10_000) { vm.state.value.theme == "light" }; compose.waitForIdle(); shot("12-french-light")
        runBlocking { app.preferences.edit { it[stringPreferencesKey("language")] = "en"; it[stringPreferencesKey("theme")] = "light" } }
        waitText("Appearance")
        compose.onNodeWithContentDescription("Back").performClick(); waitText("My recipes")
        compose.activityRule.scenario.recreate(); waitText("My recipes")
        assertEquals("light", vm.state.value.theme)
    }
}
