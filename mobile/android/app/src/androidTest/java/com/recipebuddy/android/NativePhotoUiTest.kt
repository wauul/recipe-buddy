package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import androidx.lifecycle.ViewModelProvider
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.core.content.FileProvider
import kotlinx.coroutines.runBlocking
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class NativePhotoUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private val device get() = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    private fun waitText(text: String) { compose.waitUntil(20_000) { runCatching { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }.getOrDefault(false) } }
    private fun shot(name: String) { compose.waitForIdle(); device.waitForIdle(); val dir = File(app.getExternalFilesDir(null), "native-verification").apply { mkdirs() }; assertTrue(device.takeScreenshot(File(dir, "$name.png"))) }
    @Test fun photoSourceCancellationManualSheetAndPreview() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL); assertNotNull(app.api.session)
        val vm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        runBlocking { app.preferences.edit { it[stringPreferencesKey("language")] = "en"; it[stringPreferencesKey("theme")] = "light" } }
        waitText("My recipes"); compose.waitUntil(15_000) { !vm.state.value.busy && vm.state.value.recipes.isNotEmpty() }; shot("20-image-led-recipes")
        val ingredientsTab = device.wait(Until.findObject(By.text("Ingredients")), 5_000)
        assertNotNull(ingredientsTab); ingredientsTab.click(200); waitText("Your ingredients")
        compose.runOnUiThread { vm.ingredients(emptyList()); vm.removePhoto() }; shot("21-ingredients-home")
        compose.onNodeWithText("Add photo").performClick(); waitText("Take a photo"); shot("22-photo-source-sheet")
        compose.onNodeWithText("Choose photo").performClick()
        val picker = device.wait(Until.findObject(By.res("com.google.android.providers.media.module:id/picker_tab")), 5_000)
        // Picker versions expose different resource names, but all run outside the app.
        assertTrue("Native gallery must open", picker != null || device.currentPackageName != app.packageName)
        device.pressBack(); waitText("Your ingredients")
        compose.onNodeWithText("Add photo").performClick(); waitText("Take a photo"); compose.onNodeWithText("Take a photo").performClick()
        device.wait(Until.findObject(By.res("com.android.permissioncontroller:id/permission_allow_foreground_only_button")), 2_000)?.click(200)
        assertNotNull("Native camera must open", device.wait(Until.findObject(By.pkg("com.sec.android.app.camera")), 10_000))
        // Do not photograph the user's surroundings; cancel the camera and check cleanup.
        device.pressBack(); waitText("Your ingredients")
        assertNull(vm.state.value.photo); assertTrue(app.cacheDir.resolve("camera").listFiles().isNullOrEmpty())
        compose.onNodeWithText("Add ingredient").performClick(); waitText("Ingredient name"); shot("23-manual-ingredient-sheet")
        compose.onNodeWithText("Ingredient name").performTextInput("tomato")
        compose.onNodeWithText("Quantity, if known").performTextInput("2")
        compose.onNodeWithText("Unit").performTextInput("pcs")
        device.pressBack(); compose.onAllNodesWithText("Add ingredient").onLast().performScrollTo().performClick(); waitText("tomato")
        compose.onNodeWithText("tomato").performClick(); waitText("Ingredient name")
        compose.onNodeWithText("Quantity, if known").performTextClearance(); compose.onNodeWithText("Quantity, if known").performTextInput("3")
        device.pressBack(); compose.onNodeWithText("Save").performScrollTo().performClick(); waitText("3 pcs")
        // Exercise the real metadata-stripping/downsampling path with our generated app asset.
        val file = File(app.cacheDir, "camera/ui-photo-fixture.png").apply { parentFile!!.mkdirs() }
        app.resources.openRawResource(R.drawable.ingredients_hero).use { input -> file.outputStream().use { input.copyTo(it) } }
        val uri = FileProvider.getUriForFile(app, app.packageName + ".files", file)
        val prepared = runBlocking { preparedPhoto(app, uri) }; file.delete()
        assertTrue(prepared.startsWith("data:image/jpeg;base64,")); assertTrue(prepared.length < 300_000)
        compose.runOnUiThread { vm.photo(prepared) }; waitText("Analyze photo"); shot("24-photo-preview")
        compose.onNodeWithText("Change photo").performClick(); waitText("Remove photo"); compose.onNodeWithText("Remove photo").performClick(); waitText("Add photo")
        compose.waitUntil(10_000) { vm.state.value.photo == null }
        runBlocking { app.preferences.edit { it[stringPreferencesKey("language")] = "fr"; it[stringPreferencesKey("theme")] = "dark" } }
        waitText("Vos ingrédients"); compose.waitUntil(10_000) { vm.state.value.theme == "dark" }; shot("25-ingredients-french-dark")
        runBlocking { app.preferences.edit { it[stringPreferencesKey("language")] = "en"; it[stringPreferencesKey("theme")] = "light" } }
        waitText("Your ingredients")
        compose.activityRule.scenario.recreate(); waitText("Your ingredients"); waitText("3 pcs")
    }
}
