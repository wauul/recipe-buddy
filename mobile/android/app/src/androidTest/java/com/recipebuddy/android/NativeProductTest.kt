package com.recipebuddy.android

import android.content.ComponentName
import android.appwidget.AppWidgetManager
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import androidx.lifecycle.ViewModelProvider
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.runBlocking
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class NativeProductTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private val device get() = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    private fun waitText(text: String) { compose.waitUntil(25_000) { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() } }
    private fun shot(name: String) { compose.waitForIdle(); val dir = File(app.getExternalFilesDir(null), "native-verification").apply { mkdirs() }; assertTrue(device.takeScreenshot(File(dir, "$name.png"))) }
    @Test fun friendsLegalVoiceAndLauncherControls() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL)
        assertNotNull(app.api.session)
        waitText("My recipes")
        val vm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        compose.waitUntil(25_000) { vm.state.value.friends.any { it.status == "accepted" } }
        compose.onNodeWithText("Friends").performClick(); waitText("Your chefs"); shot("30-friends")
        compose.onNodeWithText("Shared with you").performClick()
        if (vm.state.value.shared.isNotEmpty()) compose.onNodeWithText(vm.state.value.shared.first().title).assertExists()
        shot("41-shared-recipes"); compose.onNodeWithText("Your chefs").performClick()
        val friend = vm.state.value.friends.first { it.status == "accepted" }
        compose.onNodeWithText(friend.friend.username).performClick(); waitText("Share a recipe"); shot("31-chef-actions")
        compose.onNodeWithText("Report").performClick(); waitText("What happened?"); shot("32-report")
        device.pressBack(); compose.waitForIdle()
        compose.onNodeWithText("Invite friend").performClick(); waitText("My code")
        if (vm.state.value.invite == null) compose.onNodeWithText("Create my QR / link").performClick()
        waitText("Share link"); shot("33-qr")
        compose.onNodeWithContentDescription("Your single-use invitation QR code").assertExists()
        val url = vm.state.value.invite!!.url
        for (size in listOf(1024, 240)) {
            val qr = android.graphics.Bitmap.createScaledBitmap(chefQrBitmap(url), size, size, true)
            val pixels = IntArray(size * size); qr.getPixels(pixels, 0, size, 0, 0, size, size)
            assertEquals(url, com.google.zxing.MultiFormatReader().decode(com.google.zxing.BinaryBitmap(com.google.zxing.common.HybridBinarizer(com.google.zxing.RGBLuminanceSource(size, size, pixels)))).text)
        }
        compose.onNodeWithText("Scan").performClick(); waitText("Scan a chef’s code"); shot("34-scan")
        compose.onNodeWithContentDescription("Back").performClick()
        compose.onNodeWithContentDescription("Settings").performClick()
        compose.onNodeWithText("Privacy policy").performScrollTo().performClick(); waitText("Wae Fezari"); shot("35-privacy")
        compose.onNodeWithContentDescription("Dismiss").performClick()
        compose.onNodeWithText("Delete account").performScrollTo().performClick(); waitText("Delete permanently")
        compose.onNodeWithText("Delete permanently").assertIsNotEnabled(); shot("36-delete-account")
        device.pressBack(); compose.waitForIdle(); compose.onNodeWithContentDescription("Back").performClick()
        val recipe = vm.state.value.recipes.first { it.title == "Test recipe · Tomato, egg & rice · edited" }
        compose.runOnUiThread { vm.openRecipe(recipe.id); vm.progress(recipe, 0, recipe.servings) }
        compose.activity.startActivity(android.content.Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", app.api.session!!.userId).putExtra("cook", true))
        waitText("Voice Chef")
        compose.onNodeWithContentDescription("Start Voice Chef").performScrollTo()
        compose.waitUntil(20_000) { compose.onAllNodes(hasContentDescription("Start Voice Chef") and isEnabled()).fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithContentDescription("Start Voice Chef").performClick(); waitText("Explain")
        compose.onNodeWithText("Explain").performClick(); shot("37-voice-chef")
        compose.onNodeWithText("Playful chef roasts").assertExists()
        compose.onNodeWithText("Voice commands").performClick(); waitText("Enable microphone"); shot("38-microphone-disclosure")
        compose.onNodeWithText("Cancel").performClick()
        val widgets = AppWidgetManager.getInstance(app).getAppWidgetIds(ComponentName(app, CookingWidget::class.java))
        assertTrue("A Recipe Buddy widget must be pinned", widgets.isNotEmpty())
        widgets.forEach { CookingWidget.select(app, it, recipe, app.api.session!!.userId) }
        compose.waitUntil(10_000) { vm.state.value.progress[recipe.id]?.step == 0 }
        device.pressHome()
        assertNotNull(device.wait(Until.findObject(By.res(app.packageName, "widget_next")), 10_000))
        val launcher = device.currentPackageName
        device.findObject(By.res(app.packageName, "widget_next")).click()
        compose.waitUntil(10_000) { runBlocking { app.database.entries().entries(app.api.session!!.userId, "progress").any { buddyJson.decodeFromString<CookingProgress>(it.payload).let { p -> p.recipeId == recipe.id && p.step == 1 } } } }
        assertEquals(launcher, device.currentPackageName)
        assertNotNull(device.wait(Until.findObject(By.textContains("Cook rice for 10 minutes")), 10_000)); shot("39-widget-step-two")
        device.findObject(By.res(app.packageName, "widget_previous")).click()
        assertNotNull(device.wait(Until.findObject(By.textContains("Prepare the tomatoes")), 10_000))
        assertEquals(launcher, device.currentPackageName); shot("40-widget-step-one")
    }
    @Test fun frenchFriendsAndQr() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL)
        assertNotNull(app.api.session)
        val vm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        compose.waitUntil(25_000) { vm.state.value.me != null }
        compose.runOnUiThread { vm.preference("language", "fr"); vm.preference("theme", "dark") }
        try {
            waitText("Amis"); compose.onNodeWithText("Amis").performClick(); waitText("Vos chefs"); shot("42-friends-french-dark")
            compose.onNodeWithText("Inviter un ami").performClick(); waitText("Mon code")
            if (vm.state.value.invite == null) compose.onNodeWithText("Créer mon QR / lien").performClick()
            waitText("Partager le lien"); shot("43-qr-french-dark")
            var chef: VoiceChefController? = null
            compose.runOnUiThread { chef = VoiceChefController(app, {}, {}); chef!!.language("fr") }
            try {
                compose.waitUntil(20_000) { chef?.ready == true }
                assertEquals("fr", chef!!.speechLanguage)
                assertEquals("fr-FR", chef!!.commandLanguage)
                compose.runOnUiThread { chef!!.language("en") }
                compose.waitUntil(20_000) { chef?.ready == true }
                assertEquals("en", chef!!.speechLanguage)
                assertEquals("en-US", chef!!.commandLanguage)
            } finally { compose.runOnUiThread { chef?.close() } }
        } finally { runBlocking { app.preferences.edit { it[stringPreferencesKey("language")] = "en"; it[stringPreferencesKey("theme")] = "light" } } }
    }
}
