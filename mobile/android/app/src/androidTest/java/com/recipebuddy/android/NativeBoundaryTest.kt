package com.recipebuddy.android

import android.content.Intent
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.encodeToJsonElement
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import java.io.File

@RunWith(AndroidJUnit4::class)
class NativeBoundaryTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private fun waitText(text: String) { compose.waitUntil(25_000) { runCatching { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }.getOrDefault(false) } }
    private fun shot(name: String) { compose.waitForIdle(); val dir = File(app.getExternalFilesDir(null), "native-verification").apply { mkdirs() }; assertTrue(UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).takeScreenshot(File(dir, "$name.png"))) }
    @Test fun localRestorationLocaleWidgetRoutingAndLogout() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL)
        assertNotNull("Run NativeJourneyTest first", app.api.session)
        waitText("My recipes")
        val vm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        val account = app.api.session!!.userId
        compose.waitUntil(10_000) { vm.state.value.downloads.isNotEmpty() }
        val recipe = vm.state.value.downloads.first().recipe
        compose.runOnUiThread { vm.openRecipe(recipe.id); vm.timer(recipe, 1, "Test timer", 15) }
        compose.waitUntil(10_000) { vm.state.value.timers.isNotEmpty() }
        val deadline = vm.state.value.timers.first().deadline
        // Simulate an unreachable network without changing the user's phone radios.
        app.api.configure("http://127.0.0.1:39999")
        compose.runOnUiThread { vm.openRecipe(recipe.id) }
        compose.waitUntil(10_000) { vm.state.value.active?.id == recipe.id && !vm.state.value.busy }
        assertTrue(vm.state.value.shopping.isNotEmpty())
        assertEquals(0, vm.state.value.error)
        app.api.configure(BuildConfig.BACKEND_URL)
        compose.activityRule.scenario.recreate()
        val recreated = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        compose.waitUntil(10_000) { recreated.state.value.timers.isNotEmpty() }
        assertEquals(deadline, recreated.state.value.timers.first().deadline)
        // A launcher-style intent must work even with the main activity already alive.
        compose.activity.startActivity(Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", account).putExtra("cook", true))
        waitText("Cook rice for 10 minutes"); shot("10-timer-restoration")
        compose.onNodeWithContentDescription("Back").performClick()
        compose.activity.startActivity(Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", account))
        waitText("Start cooking")
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val existingWidgets = android.appwidget.AppWidgetManager.getInstance(app).getAppWidgetIds(android.content.ComponentName(app, CookingWidget::class.java))
        if (existingWidgets.isEmpty()) {
            compose.onNodeWithContentDescription("Recipe actions").performClick()
            compose.onNodeWithText("Add to home screen").performClick()
            val add = device.wait(Until.findObject(By.text("Add")), 8_000)
            assertNotNull("Launcher pin confirmation must be visible", add); add.click()
        } else existingWidgets.forEach { CookingWidget.select(app, it, recipe, account) }
        compose.waitUntil(10_000) { app.getSharedPreferences("widgets", 0).all.keys.any { it.toIntOrNull() != null } }
        device.pressHome()
        device.waitForIdle()
        assertNotNull(device.wait(Until.findObject(By.text(recipe.title)), 8_000)); shot("14-launcher-widget")
        val tile = device.findObject(By.res(app.packageName, "widget_title").text(recipe.title))
        assertNotNull(tile); tile.click(200)
        assertNotNull("Widget tap must open native detail", device.wait(Until.findObject(By.text("Start cooking")), 10_000))
        waitText("Start cooking")
        compose.waitUntil(10_000) { recreated.state.value.active?.id == recipe.id }
        val widgets = android.appwidget.AppWidgetManager.getInstance(app).getAppWidgetIds(android.content.ComponentName(app, CookingWidget::class.java))
        assertTrue(widgets.isNotEmpty())
        val alternate = runBlocking { buddyJson.decodeFromString<Recipe>(app.api.request("recipes", "POST", buddyJson.encodeToString(kotlinx.serialization.json.buildJsonObject {
            put("title", kotlinx.serialization.json.JsonPrimitive("Test recipe Â· Widget replacement")); put("servings", kotlinx.serialization.json.JsonPrimitive(2)); put("vibe", kotlinx.serialization.json.JsonPrimitive("cozy"))
            put("ingredients", buddyJson.encodeToJsonElement(listOf(Ingredient("rice", "1/2", "cup")))); put("steps", buddyJson.encodeToJsonElement(listOf("Cook rice for 5 minutes.")))
        }))) }
        // Repeated runs may leave test widgets on different launcher pages.
        // Replace every Recipe Buddy test widget, then verify the visible page.
        widgets.forEach { CookingWidget.select(app, it, alternate, account) }
        device.pressHome(); assertNotNull(device.wait(Until.findObject(By.text(alternate.title)), 8_000)); shot("15-widget-replaced")
        runBlocking { app.api.request("recipes/${alternate.id}", "DELETE") }; CookingWidget.deleted(app, alternate.id)
        assertNotNull(device.wait(Until.findObject(By.text("Choose a recipe")), 8_000)); shot("16-widget-deleted")
        compose.activity.startActivity(Intent(compose.activity, MainActivity::class.java))
        compose.onNodeWithContentDescription("Back").performClick()
        waitText("My recipes")
        compose.onNodeWithContentDescription("Settings").performClick()
        compose.onNodeWithText("FranÃ§ais").performScrollTo().performClick(); waitText("RÃ©glages")
        compose.onNodeWithText("Sombre").performScrollTo().performClick(); shot("11-french-dark")
        compose.onNodeWithText("Clair").performScrollTo().performClick(); shot("12-french-light")
        // Restore app preference, without changing the user's device language/theme.
        runBlocking { app.preferences.edit { it[stringPreferencesKey("language")] = "en"; it[stringPreferencesKey("theme")] = "system" } }
        waitText("Settings")
        compose.onNodeWithText("Sign out").performScrollTo().performClick(); waitText("Welcome back, chef")
        runBlocking {
            assertTrue(app.database.entries().entries(account, "shopping").isEmpty())
            assertTrue(app.database.entries().entries(account, "download").isEmpty())
            assertTrue(app.database.entries().entries(account, "timer").isEmpty())
        }
        assertNull(app.vault.read("session")); assertTrue(app.getSharedPreferences("widgets", 0).all.isEmpty())
        // Incoming share payload persists unauthenticated and resumes only as a draft.
        compose.activity.startActivity(Intent(compose.activity, MainActivity::class.java).setAction(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "https://example.test/recipe"))
        compose.waitUntil(10_000) { app.vault.read("pendingImport") != null }
        assertEquals("https://example.test/recipe", app.vault.read("pendingImport"))
        compose.onNodeWithText("Email address").performTextInput("native-a@example.test")
        compose.onNodeWithText("Password").performTextInput("NativeTestOnly-2026")
        device.pressBack()
        compose.onNodeWithText("Sign in").performScrollTo().performClick(); waitText("Paste recipe URL or text")
        compose.onNodeWithText("https://example.test/recipe").assertExists(); shot("13-share-import-draft")
        compose.onNodeWithText("Recipe title").performScrollTo().performTextInput("Test recipe Â· Native share draft")
        compose.onNodeWithText("Add ingredient").performScrollTo().performClick()
        compose.onNodeWithText("Ingredient name").performScrollTo().performTextInput("rice")
        compose.onNodeWithText("Quantity, if known").performScrollTo().performTextInput("1/2")
        compose.onNodeWithText("Unit").performScrollTo().performTextInput("cup")
        compose.onNodeWithText("Add step").performScrollTo().performClick()
        compose.onNodeWithText("Step 1").performScrollTo().performTextInput("Cook rice for 5 minutes.")
        compose.onNodeWithText("Save recipe").performScrollTo().performClick(); waitText("My recipes")
        val createdVm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        compose.waitUntil(25_000) { createdVm.state.value.recipes.any { it.title == "Test recipe Â· Native share draft" } }
        val created = createdVm.state.value.recipes.first { it.title == "Test recipe Â· Native share draft" }
        compose.activity.startActivity(Intent(compose.activity, MainActivity::class.java).putExtra("recipe", created.id).putExtra("account", account))
        waitText("Start cooking"); compose.onNodeWithContentDescription("Recipe actions").performClick(); compose.onNodeWithText("Edit").performClick()
        compose.onNodeWithText("Recipe title").performScrollTo().performTextClearance()
        compose.onNodeWithText("Recipe title").performTextInput("Test recipe Â· Native edited")
        compose.onNodeWithText("Save recipe").performScrollTo().performClick()
        compose.activityRule.scenario.recreate()
        val fresh = runBlocking { buddyJson.decodeFromString<Recipe>(app.api.request("recipes/${created.id}")) }
        assertEquals("Test recipe Â· Native edited", fresh.title)
    }
}
