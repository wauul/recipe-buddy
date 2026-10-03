package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.lifecycle.ViewModelProvider
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File
import java.util.UUID
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.RecordedRequest
import okhttp3.mockwebserver.Dispatcher
import java.util.concurrent.atomic.AtomicBoolean

@RunWith(AndroidJUnit4::class)
class NativeOfflineTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private val vm get() = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
    private fun waitFor(test: () -> Boolean) { compose.waitUntil(60_000, test) }
    private fun backend(url: String) { runBlocking { app.preferences.edit { it[stringPreferencesKey("backend")] = url } }; app.api.configure(url) }
    private fun capture(name: String) {
        compose.waitForIdle()
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        device.waitForIdle(2000)
        InstrumentationRegistry.getInstrumentation().waitForIdleSync()
        android.os.SystemClock.sleep(350) // Capture the settled native frame after navigation/sheet transitions.
        val dir = File(app.getExternalFilesDir(null), "product-fixes").apply { mkdirs() }
        assertTrue(device.takeScreenshot(File(dir, "$name.png")))
    }
    @Before fun connect() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL); assertTrue(app.packageName.endsWith(".design"))
        backend(BuildConfig.BACKEND_URL)
        if(app.api.session == null) { compose.runOnUiThread { vm.login("native-a@example.test", "NativeTestOnly-2026") } }
        compose.runOnUiThread { vm.refresh(); vm.preference("language", "en"); vm.preference("theme", "light") }
        waitFor { vm.state.value.me != null && vm.state.value.allRecipes.isNotEmpty() && vm.state.value.pendingChanges == 0 }
    }
    @After fun restore() { backend(BuildConfig.BACKEND_URL); compose.runOnUiThread { vm.preference("language", "en") } }
    @Test fun proUsesTheChosenAppLanguage() {
        compose.runOnUiThread { vm.preference("language", "fr") }
        waitFor { vm.state.value.language == "fr" }
        compose.runOnUiThread { vm.showPro() }
        compose.onNodeWithText("Passer à Pro").assertExists()
        compose.onNodeWithText("Les recettes, la cuisine hors ligne et les courses restent gratuites.").assertExists()
        compose.onNodeWithText("Get Pro").assertDoesNotExist()
    }
    @Test fun recipeActionsFollowTheChosenAppLanguage() {
        val recipe = vm.state.value.allRecipes.first { it.owned && it.title == "Tomato, egg & rice" }
        compose.activity.startActivity(android.content.Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", app.api.session!!.userId))
        waitFor { compose.onAllNodesWithContentDescription("Recipe actions").fetchSemanticsNodes().isNotEmpty() }
        compose.runOnUiThread { vm.preference("language", "fr") }
        waitFor { vm.state.value.language == "fr" }
        compose.onNodeWithContentDescription("Actions de la recette").performClick()
        compose.onNodeWithText("Modifier").assertExists()
        compose.onNodeWithText("Télécharger hors ligne").assertDoesNotExist()
        compose.onNodeWithText("Partager cette recette").assertExists()
        compose.onNodeWithText("Traduire la recette").assertDoesNotExist()
        compose.onNodeWithText("Edit").assertDoesNotExist()
        compose.onNodeWithText("Supprimer la recette").assertExists()
        capture("08-recipe-actions-fr")
        // Switch while the popup is open: its resources must follow the app too.
        compose.runOnUiThread { vm.preference("language", "en") }
        waitFor { vm.state.value.language == "en" }
        compose.onNodeWithText("Edit").assertExists()
        compose.onNodeWithText("Download for offline").assertDoesNotExist()
        compose.onNodeWithText("Share this recipe").assertExists()
        compose.onNodeWithText("Translate recipe").assertDoesNotExist()
        compose.onNodeWithText("Modifier").assertDoesNotExist()
        compose.onNodeWithText("Delete recipe").assertExists()
        capture("09-recipe-actions-en")
        compose.onNodeWithContentDescription("Dismiss").performClick()
    }
    @Test fun chefSuggestionsLoadAsYouTypeAndClearWhenTooShort() {
        compose.onNodeWithText("Friends").performClick()
        compose.onNodeWithText("Invite friend").performClick()
        waitFor { vm.state.value.invite != null }
        val field = compose.onNode(hasSetTextAction() and hasText("Chef name"))
        field.performScrollTo().performTextInput("Te")
        assertTrue(vm.state.value.chefResults.isEmpty())
        assertFalse(vm.state.value.chefSearchDone)
        field.performTextInput("s")
        waitFor { vm.state.value.chefSearchDone && vm.state.value.chefResults.any { it.username == "Test Kitchen B" } }
        compose.onNodeWithText("Test Kitchen B").assertIsDisplayed()
        compose.onNodeWithText("Search", useUnmergedTree = true).assertDoesNotExist()
        capture("10-chef-suggestions")
        field.performTextReplacement("Nobody with this fixture name")
        waitFor { vm.state.value.chefSearchDone && vm.state.value.chefResults.isEmpty() }
        field.performTextReplacement("T")
        waitFor { !vm.state.value.chefSearchDone && !vm.state.value.chefSearching && vm.state.value.chefResults.isEmpty() }
        val message = compose.activity.getString(R.string.invite_share_message, "https://example.test/i/fixture")
        assertTrue(message.contains("Join me on Recipe Buddy")); assertTrue(message.endsWith("https://example.test/i/fixture"))
    }
    @Test fun savedRecipeLanguagesWorkOfflineForIngredientsAndSteps() {
        val recipe = vm.state.value.allRecipes.first { it.owned && it.title == "Tomato, egg & rice" }
        assertEquals("tomate", recipe.text("tomato", "fr"))
        backend("http://127.0.0.1:3999")
        compose.runOnUiThread { vm.preference("language", "fr") }
        compose.activity.startActivity(android.content.Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", app.api.session!!.userId))
        waitFor { compose.onAllNodesWithText("Riz, tomates et œufs").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("tomate").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("œuf").assertExists()
        compose.onNodeWithText("riz").assertExists()
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Préparez les tomates et battez les œufs."))
        compose.onNodeWithText("Préparez les tomates et battez les œufs.").assertIsDisplayed()
        capture("11-offline-french-recipe")
        compose.onNodeWithText("Commencer à cuisiner").performClick()
        waitFor { compose.onAllNodesWithText("Préparez les tomates et battez les œufs.").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Préparez les tomates et battez les œufs.").assertExists()
    }
    @Test fun completedTranslationsAppearAutomaticallyAndDoNotOverwriteOfflineEdits() {
        val recipe = vm.state.value.allRecipes.first { it.owned && it.title == "Tomato, egg & rice" }
        val account = app.api.session!!.userId
        val home = runBlocking { buddyJson.decodeFromString<KitchenHome>(app.api.request("home")) }
        val kitchen = runBlocking { app.api.request("kitchen-state") }
        val pending = recipe.copy(translations = buildJsonObject { put("en", buildJsonObject {}); put("fr", buildJsonObject {}); put("pending", true) })
        val ready = AtomicBoolean(false)
        val server = MockWebServer()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val body = when(request.path) {
                    "/api/native/v1/home" -> buddyJson.encodeToString(home.copy(recipes = home.recipes.copy(items = home.recipes.items.map { if(it.id == recipe.id) pending else it })))
                    "/api/native/v1/kitchen-state" -> kitchen
                    "/api/native/v1/recipes/${recipe.id}" -> buddyJson.encodeToString(if(ready.get()) recipe else pending)
                    else -> return MockResponse().setResponseCode(503).setBody("{}")
                }
                return MockResponse().setHeader("Content-Type", "application/json").setBody(body)
            }
        }
        server.start()
        try {
            backend("http://127.0.0.1:${server.port}")
            runBlocking { app.database.entries().put(LocalEntry(account, "recipe", recipe.id, buddyJson.encodeToString(pending))) }
            compose.runOnUiThread { vm.preference("language", "fr") }
            compose.activity.startActivity(android.content.Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", account))
            waitFor { vm.state.value.active?.translations?.get("pending")?.toString() == "true" }
            compose.onNodeWithText("Tomato, egg & rice").assertExists()
            ready.set(true)
            waitFor { vm.state.value.active?.translations?.get("pending")?.toString() == "false" }
            compose.onNodeWithText("Riz, tomates et œufs").assertExists()
            assertEquals("tomate", vm.state.value.active!!.text("tomato", "fr"))
            assertTrue(server.requestCount > 0)
            // A newer local edit must win over this delayed language snapshot.
            backend("http://127.0.0.1:3999")
            val local = recipe.copy(title = "Local translation race fixture")
            compose.runOnUiThread { vm.updateDraft(local); vm.save() }
            waitFor { vm.state.value.pendingChanges > 0 && vm.state.value.active?.title == local.title }
            backend("http://127.0.0.1:${server.port}")
            runBlocking { vm.refreshRecipe(recipe.id) }
            assertEquals(local.title, vm.state.value.active!!.title)
        } finally {
            backend(BuildConfig.BACKEND_URL)
            // Fixture cleanup only: undo this test's unsent local edit.
            runBlocking {
                val dao = app.database.entries()
                dao.entries(account, "outbox").filter { buddyJson.decodeFromString<PendingChange>(it.payload).localId == recipe.id }.forEach { dao.delete(account, "outbox", it.id) }
                dao.put(LocalEntry(account, "recipe", recipe.id, buddyJson.encodeToString(recipe)))
            }
            server.shutdown()
        }
    }
    @Test fun communityUpdatesAutomaticallyWhenChangingTabs() {
        val recipe = vm.state.value.allRecipes.first { it.owned }
        compose.activity.startActivity(android.content.Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", app.api.session!!.userId))
        waitFor { compose.onAllNodesWithContentDescription("Recipe actions").fetchSemanticsNodes().isNotEmpty() }
        compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Aprons"))
        compose.onNodeWithText("Aprons").performClick()
        waitFor { vm.state.value.communityLoaded && vm.state.value.community?.recipeId == recipe.id }
        compose.onNodeWithContentDescription("Refresh").assertDoesNotExist()
        val text = "Remote community fixture " + UUID.randomUUID()
        runBlocking { app.api.request("recipes/${recipe.id}/discussion", "POST", buildJsonObject { put("kind", "comment"); put("text", text) }.toString()) }
        try {
            compose.onNodeWithText("Comments").performClick()
            waitFor { vm.state.value.community?.discussion?.comments?.any { it.text == text } == true }
            compose.onNodeWithText(text).assertExists()
            compose.onNodeWithContentDescription("Refresh").assertDoesNotExist()
            capture("07-community-auto-update")
        } finally {
            val remote = runBlocking { buddyJson.decodeFromString<Community>(app.api.request("recipes/${recipe.id}/community")) }
            remote.discussion.comments.firstOrNull { it.text == text }?.let { comment -> runBlocking { app.api.request("recipes/${recipe.id}/discussion", "DELETE", buildJsonObject { put("kind", "comment"); put("id", comment.id) }.toString()) } }
        }
    }
    @Test fun offlineEditsSurviveRecreationAndReconnectExactlyOnce() {
        val recipe = Recipe(title = "Offline fixture " + UUID.randomUUID(), ingredients = listOf(Ingredient("tomato", "2", "piece")), steps = listOf("Slice tomatoes.", "Serve."))
        backend("http://127.0.0.1:3999")
        compose.runOnUiThread { vm.updateDraft(recipe); vm.save(); vm.ingredients(listOf(Ingredient("tomates", "2", "piece"))); vm.addShopping(ShoppingItem("offline-test-item", "Rice", "200 g")) }
        waitFor { vm.state.value.allRecipes.any { it.title == recipe.title } && vm.state.value.pendingChanges >= 3 && vm.state.value.shopping.any { it.id == "offline-test-item" } }
        val saved = vm.state.value.allRecipes.first { it.title == recipe.title }
        compose.runOnUiThread { vm.openRecipe(saved.id); vm.progress(saved, 1, 3); vm.match() }
        waitFor { vm.state.value.progress[saved.id]?.step == 1 && vm.state.value.matches.any { it.recipe.id == saved.id && it.allFound } }
        compose.activityRule.scenario.recreate()
        waitFor { vm.state.value.allRecipes.any { it.id == saved.id } && vm.state.value.confirmed.isNotEmpty() && vm.state.value.progress[saved.id]?.step == 1 }
        assertEquals(3, vm.state.value.progress[saved.id]!!.servings)
        capture("01-offline-collection")
        compose.onNodeWithText("Downloaded").assertDoesNotExist()
        backend(BuildConfig.BACKEND_URL); compose.runOnUiThread { vm.refresh() }
        waitFor { vm.state.value.pendingChanges == 0 }
        val fresh = runBlocking { buddyJson.decodeFromString<Recipe>(app.api.request("recipes/${saved.id}")) }
        assertEquals(recipe.title, fresh.title)
        val all = runBlocking { buddyJson.decodeFromString<KitchenHome>(app.api.request("home")) }
        assertEquals(1, all.recipes.items.count { it.id == saved.id })
        assertTrue(runBlocking { buddyJson.decodeFromString<List<RemoteKitchen>>(app.api.request("kitchen-state")) }.any { it.id == "offline-test-item" })
        compose.runOnUiThread { vm.delete(fresh); vm.deleteShopping(vm.state.value.shopping.first { it.id == "offline-test-item" }) }
        waitFor { vm.state.value.pendingChanges == 0 && vm.state.value.allRecipes.none { it.id == saved.id } }
    }
    @Test fun conflictingRecipeKeepsTheLocalEditAndCanSaveACopy() {
        val original = vm.state.value.allRecipes.first { it.owned && it.title != "Tomato, egg & rice" }
        val changed = original.copy(title = original.title + " remote")
        runBlocking { app.api.request("recipes/${original.id}", "PUT", buddyJson.encodeToString(changed.input())) }
        backend("http://127.0.0.1:3999")
        val mine = original.copy(title = original.title + " offline")
        compose.runOnUiThread { vm.updateDraft(mine); vm.save() }
        waitFor { vm.state.value.pendingChanges > 0 }
        backend(BuildConfig.BACKEND_URL); compose.runOnUiThread { vm.refresh() }
        waitFor { vm.state.value.syncProblems.any { it.localId == original.id } }
        assertEquals(mine.title, vm.state.value.allRecipes.first { it.id == original.id }.title)
        val op = vm.state.value.syncProblems.first { it.localId == original.id }
        compose.runOnUiThread { vm.resolveSync(op.operationId, true) }
        waitFor { vm.state.value.pendingChanges == 0 && vm.state.value.allRecipes.any { it.title == mine.title && it.id != original.id } }
        val remote = runBlocking { buddyJson.decodeFromString<Recipe>(app.api.request("recipes/${original.id}")) }
        assertEquals(changed.title, remote.title)
        val copy = vm.state.value.allRecipes.first { it.title == mine.title && it.id != original.id }
        compose.runOnUiThread { vm.delete(copy) }; waitFor { vm.state.value.pendingChanges == 0 }
        runBlocking { app.api.request("recipes/${original.id}", "PUT", buddyJson.encodeToString(original.input())) }
    }
    @Test fun profileInvitationAndFreeVoiceAreClearAndNeverAutoplay() {
        compose.onNodeWithContentDescription("Settings").performClick()
        compose.onNodeWithText("Recipe Buddy Pro").performScrollTo().performClick()
        compose.onNodeWithText("Recipes, offline cooking and shopping stay free.").assertExists(); capture("02-pro-sheet")
        compose.onNodeWithContentDescription("Dismiss").performClick()
        waitFor { compose.onAllNodesWithText("Recipes, offline cooking and shopping stay free.").fetchSemanticsNodes().isEmpty() }
        compose.onNodeWithContentDescription("Back").performClick()
        compose.onNodeWithText("Friends").performClick(); compose.onNodeWithText("Invite friend").performClick()
        waitFor { vm.state.value.invite != null }
        compose.onNodeWithContentDescription("Your single-use invitation QR code").assertExists(); capture("03-invite-auto-qr")
        compose.onNodeWithText("Find a chef").performScrollTo().assertExists()
        compose.onNodeWithContentDescription("Back").performClick()
        val recipe = vm.state.value.allRecipes.first { it.owned && it.title == "Tomato, egg & rice" }
        compose.activity.startActivity(android.content.Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", app.api.session!!.userId))
        waitFor { compose.onAllNodesWithText("Chef’s roast").fetchSemanticsNodes().isNotEmpty() }
        capture("06-chef-roast-first")
        compose.activity.startActivity(android.content.Intent(compose.activity, MainActivity::class.java).putExtra("recipe", recipe.id).putExtra("account", app.api.session!!.userId).putExtra("cook", true))
        waitFor { compose.onAllNodesWithText("Voice Chef").fetchSemanticsNodes().isNotEmpty() }
        compose.onNodeWithText("Voice Chef").performScrollTo(); capture("04-free-voice-chef")
        compose.onNodeWithContentDescription("Stop Voice Chef").assertDoesNotExist()
        compose.onNodeWithText("Explain").performClick()
        compose.onNodeWithText("Recipe Buddy Pro").assertExists()
    }
}
