package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.lifecycle.ViewModelProvider
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File
import kotlinx.coroutines.runBlocking

// Exercises real Compose destinations and persisted fixture data on a separate install.
// Backend guard prevents this UI review from operating on a production account.
@RunWith(AndroidJUnit4::class)
class NativeRedesignTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private val vm get() = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
    private val device get() = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    private fun waitText(text: String) { compose.waitUntil(45_000) { compose.onAllNodesWithText(text, substring = true, useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty() } }
    private fun settled() { compose.waitUntil(45_000) { !vm.state.value.busy }; compose.waitForIdle() }
    private fun shot(name: String) {
        compose.waitForIdle(); device.waitForIdle()
        val dir = File(app.getExternalFilesDir(null), if (app.resources.configuration.fontScale > 1.3f) "redesign-large-type" else "redesign").apply { mkdirs() }
        assertTrue(device.takeScreenshot(File(dir, "$name.png")))
    }
    private fun back() { compose.onNodeWithContentDescription("Back").performClick(); compose.waitForIdle() }
    @Before fun fixtureLogin() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL)
        assertTrue("UI review must use a separate install", BuildConfig.APPLICATION_ID.endsWith(".design"))
        app.api.configure(BuildConfig.BACKEND_URL)
        compose.runOnUiThread { vm.preference("language", "en"); vm.preference("theme", "light") }
        compose.waitUntil(10_000) { vm.state.value.language == "en" && vm.state.value.theme == "light" }
        if (app.api.session == null) {
            waitText("Welcome back, chef"); shot("01-login")
            compose.onNodeWithText("Create an account", substring = false).performClick(); waitText("Already have an account"); shot("02-signup")
            compose.onNodeWithText("Already have an account? Sign in").performScrollTo().performClick()
            compose.onNodeWithText("Email address").performTextInput("native-a@example.test")
            compose.onNodeWithText("Password").performTextInput("NativeTestOnly-2026")
            device.pressBack(); compose.onNodeWithText("Sign in", substring = false).performScrollTo().performClick()
        }
        if (app.api.session != null) {
            runBlocking {
                for (attempt in 0..2) {
                    try { app.api.request("me"); break }
                    catch (error: java.io.IOException) { if (attempt == 2) throw error; kotlinx.coroutines.delay(250) }
                }
            }
            compose.runOnUiThread { vm.refresh() }
        }
        compose.waitUntil(45_000) { vm.state.value.me?.email == "native-a@example.test" && !vm.state.value.busy }
        waitText("My recipes")
    }
    @Test fun allDestinationsAndTaskControls() {
        runBlocking {
            val account = app.api.session!!.userId
            app.database.entries().entries(account, "shopping").forEach { app.database.entries().delete(account, "shopping", it.id) }
        }
        compose.runOnUiThread { vm.edit(); vm.ingredients(emptyList()); vm.removePhoto() }; compose.waitForIdle()
        shot("03-collection")
        compose.onNodeWithContentDescription("Filters").performClick(); waitText("Cozy"); shot("04-filters")
        compose.onNodeWithContentDescription("Filters").performClick()
        compose.onNodeWithContentDescription("Chef progress and badges").performClick(); waitText("All seven chef levels"); shot("05-badges"); device.pressBack(); compose.waitForIdle()
        val owned = vm.state.value.recipes.first { it.ingredients.any { i -> i.name == "tomato" } && it.ingredients.size == 3 }
        compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText(owned.title))
        compose.onNodeWithText(owned.title).performScrollTo().performClick(); waitText("Start cooking"); settled(); shot("06-detail")
        compose.onNodeWithText("Start cooking").assertIsDisplayed()
        compose.onNodeWithContentDescription("Recipe actions").performClick(); shot("07-recipe-menu")
        if (vm.state.value.downloads.any { it.recipe.id == owned.id }) {
            compose.onNodeWithText("Remove download").performClick(); settled()
            compose.onNodeWithContentDescription("Recipe actions").performClick()
        }
        compose.onNodeWithText("Download for offline").performClick(); settled()
        assertTrue(vm.state.value.downloads.any { it.recipe.id == owned.id })
        compose.runOnUiThread { vm.state.value.active?.let { vm.progress(it, 0, it.servings) } }
        compose.waitUntil(10_000) { vm.state.value.progress[vm.state.value.active?.id]?.step == 0 }
        compose.onNodeWithText("Start cooking").performClick(); waitText("Prepare the tomatoes"); shot("08-cooking")
        compose.onNodeWithText("Next").assertIsDisplayed().performClick(); waitText("Cook rice for 10 minutes"); shot("09-last-step")
        compose.onNodeWithText("Previous").assertIsDisplayed().performClick(); waitText("Prepare the tomatoes")
        compose.onNodeWithContentDescription("Add timer").performScrollTo().performClick(); waitText("Minutes"); shot("10-timer-dialog"); compose.onNodeWithText("Cancel").performClick()
        back(); compose.onNodeWithText("Add to shopping").performScrollTo().performClick(); waitText("Choose recipes"); settled(); shot("11-shopping")
        compose.onNodeWithText("Add item").performClick(); waitText("Item name")
        compose.onNodeWithText("Item name").performTextInput("Fresh basil")
        compose.onNodeWithText("Amount / notes").performTextInput("1 bunch"); compose.waitForIdle(); device.pressBack(); shot("12-shopping-sheet")
        compose.onAllNodesWithText("Add item").onLast().performScrollTo().performClick()
        compose.waitUntil(10_000) { vm.state.value.shopping.any { it.name == "Fresh basil" } }
        compose.onNodeWithText("Ingredients", substring = false).performClick(); waitText("Your ingredients"); shot("13-ingredients")
        compose.onNodeWithText("Add photo").performClick(); waitText("Choose photo"); shot("14-photo-source"); device.pressBack()
        compose.onNodeWithText("Add ingredient").performClick(); waitText("Ingredient name")
        compose.onNodeWithText("Ingredient name").performTextInput("tomato"); compose.waitForIdle(); device.pressBack(); shot("15-ingredient-sheet")
        compose.onAllNodesWithText("Add ingredient").onLast().performScrollTo().performClick()
        compose.onNodeWithText("Find saved recipes").assertIsDisplayed().performClick(); settled(); waitText("Recipe matches"); shot("16-matches")
        compose.onNodeWithText("Friends", substring = false).performClick(); waitText("Your chefs"); shot("17-friends")
        val friend = vm.state.value.friends.first { it.status == "accepted" }
        compose.onNodeWithText(friend.friend.username).performScrollTo().performClick(); waitText("Share a recipe"); shot("18-chef-actions")
        compose.onNodeWithText("View chef’s kitchen").performClick(); waitText("Only recipes this chef has shared"); settled(); shot("19-chef-kitchen"); back()
        compose.onNodeWithText("Invite friend").performClick(); waitText("My code")
        compose.onNodeWithText("Create my code").performClick(); waitText("Share link"); shot("20-invitation")
        compose.onNodeWithText("Scan", substring = false).performClick(); shot("21-scan"); back()
        compose.onNodeWithText("Shared with you").performClick(); settled(); shot("22-shared-recipes")
        val shared = vm.state.value.shared.first()
        compose.onNodeWithText(shared.title).performScrollTo().performClick(); waitText("Start cooking"); settled()
        compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText("Aprons"))
        compose.onNodeWithText("Aprons", substring = false).performClick(); waitText("Rate this recipe"); settled(); shot("23-aprons")
        compose.onNodeWithText("Rate this recipe").performClick(); waitText("Save review"); shot("24-review-sheet"); device.pressBack(); compose.waitForIdle()
        compose.onNodeWithText("Twists", substring = false).performClick(); settled(); shot("25-twists")
        compose.onNodeWithText("Add a twist").performClick(); waitText("What did you change?"); shot("26-twist-sheet"); device.pressBack(); compose.waitForIdle()
        compose.onNodeWithText("Comments", substring = false).performClick(); shot("27-comments")
        compose.onNodeWithText("Add a comment").performClick(); waitText("Your comment"); shot("28-comment-sheet"); device.pressBack(); compose.waitForIdle()
        back(); back()
        compose.onNodeWithContentDescription("Search recipes and help").performClick(); waitText("Recipes, ingredients, help"); shot("29-search")
        compose.onNodeWithText("Recipes, ingredients, help").performTextInput("beat")
        compose.onNode(hasSetTextAction()).performImeAction(); settled()
        assertTrue(vm.state.value.searchResults.isNotEmpty()); shot("30-search-results"); back()
        compose.onNodeWithContentDescription("Settings").performClick(); waitText("Preferences"); shot("31-settings")
        compose.onNodeWithText("Help & FAQ").performScrollTo().performClick(); waitText("Help & FAQ"); shot("32-help"); back()
        compose.onNodeWithText("Privacy policy").performScrollTo().performClick(); shot("33-privacy"); compose.onNodeWithContentDescription("Dismiss").performClick()
        compose.onNodeWithText("Terms of use").performScrollTo().performClick(); shot("34-terms"); compose.onNodeWithContentDescription("Dismiss").performClick()
        compose.onNodeWithText("Blocked chefs").performScrollTo().performClick(); shot("35-blocked"); device.pressBack(); compose.waitForIdle()
        compose.onNodeWithText("Delete account", substring = false).performScrollTo().performClick(); waitText("Delete permanently"); shot("36-delete-sheet"); device.pressBack(); compose.waitForIdle(); back()
        compose.onNodeWithText("Recipes", substring = false).performClick()
        waitText("My recipes"); shot("60-section-navigation")
    }
    @Test fun editorPersistenceAndFailedSave() {
        compose.runOnUiThread { vm.edit() }; compose.waitForIdle()
        waitText("Add recipe")
        compose.onNodeWithContentDescription("Add recipe").performClick(); waitText("Recipe title"); shot("37-editor")
        compose.onNodeWithText("Save recipe").assertIsDisplayed().assertIsNotEnabled()
        compose.onNodeWithText("Recipe title").performTextInput("Draft with a very long recipe name for a relaxed Sunday lunch")
        compose.onNodeWithText("Save recipe").assertIsDisplayed(); device.pressBack()
        compose.onNodeWithText("Import a recipe").performScrollTo().performClick(); waitText("Paste recipe URL or text"); shot("38-import")
        back(); compose.activityRule.scenario.recreate(); waitText("My recipes"); assertNotNull(app.api.session)
        waitText("Resume draft"); compose.onNodeWithContentDescription("Resume draft").performClick()
        compose.onNodeWithText("Recipe title").assertTextContains("Draft with a very long recipe name", substring = true)
        compose.onNodeWithText("Add ingredient").performScrollTo().performClick()
        compose.onNodeWithText("Ingredient name").performScrollTo().performTextInput("tomato"); compose.waitForIdle()
        assertEquals("Ingredient input was committed", "tomato", vm.state.value.draft.ingredients.first().name)
        device.pressBack()
        shot("61-editor-ingredient")
        assertEquals("Ingredient was added", 1, vm.state.value.draft.ingredients.size)
        assertEquals("Ingredient text reached the draft", "tomato", vm.state.value.draft.ingredients.first().name)
        compose.onNodeWithText("Add step").performScrollTo().performClick()
        compose.onNodeWithText("What to do").performScrollTo().performTextInput("Slice the tomato and serve.")
        compose.waitUntil(5_000) { vm.state.value.draft.steps.singleOrNull() == "Slice the tomato and serve." }
        shot("39-editor-keyboard")
        compose.onNodeWithText("Save recipe").assertIsDisplayed().assertIsEnabled()
        device.pressBack(); compose.waitForIdle()
        app.api.configure("http://127.0.0.1:3999")
        compose.onNodeWithText("Save recipe").performClick(); settled(); assertEquals(0, vm.state.value.error)
        compose.onNodeWithText("What to do").assertTextContains("Slice the tomato and serve."); shot("46-save-failure")
        app.api.configure(BuildConfig.BACKEND_URL); compose.runOnUiThread { vm.clearError() }
        compose.onNodeWithText("Save recipe").performClick(); waitText("My recipes"); settled()
        assertTrue(vm.state.value.recipes.any { it.title.startsWith("Draft with a very long recipe name") })
        assertTrue(vm.state.value.draft.title.isEmpty()); shot("47-saved-recipe")
    }
    @Test fun frenchDarkModeAndLargeType() {
        compose.runOnUiThread { vm.preference("language", "fr"); vm.preference("theme", "dark") }
        waitText("Mes recettes"); shot("40-french-dark-collection")
        val owned = vm.state.value.recipes.first { it.ingredients.any { i -> i.name == "tomato" } && it.ingredients.size == 3 }
        compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText(owned.text(owned.title, "fr")))
        compose.onNodeWithText(owned.text(owned.title, "fr")).performScrollTo().performClick(); waitText("Commencer à cuisiner"); settled(); shot("48-french-detail")
        compose.onNodeWithText("Commencer à cuisiner").assertIsDisplayed().performClick(); waitText("Suivant"); settled(); shot("49-french-cooking")
        compose.onNodeWithText("Suivant").assertIsDisplayed()
        compose.onNodeWithContentDescription("Retour").performClick(); compose.onNodeWithContentDescription("Retour").performClick(); waitText("Mes recettes")
        compose.runOnUiThread { vm.edit() }; compose.waitForIdle()
        compose.onNodeWithContentDescription("Ajouter une recette").performClick(); waitText("Titre de la recette"); shot("50-french-editor")
        compose.onNodeWithText("Titre de la recette").performTextInput("Une recette avec un très long titre pour dimanche")
        compose.onNodeWithText("Enregistrer la recette").assertIsDisplayed().assertIsNotEnabled(); shot("51-french-editor-keyboard")
        device.pressBack(); compose.onNodeWithContentDescription("Retour").performClick(); compose.runOnUiThread { vm.edit() }
        compose.onNodeWithContentDescription("Réglages").performClick(); waitText("Préférences"); shot("41-french-dark-settings")
        compose.onNodeWithText("Langue").performScrollTo(); shot("42-french-preferences")
        compose.onNodeWithContentDescription("Retour").performClick()
        compose.onNodeWithText("Ingrédients", substring = false).performClick(); waitText("Vos ingrédients"); shot("43-french-ingredients")
        compose.onNodeWithText("Amis", substring = false).performClick(); waitText("Vos chefs"); shot("44-french-friends")
        compose.onNodeWithText("Inviter un ami").performClick(); waitText("Mon code"); shot("45-french-invitation")
        compose.onNodeWithContentDescription("Retour").performClick()
        compose.runOnUiThread { vm.preference("theme", "light"); vm.preference("language", "en") }
        waitText("Your chefs")
    }
    @Test fun photosSharingAndSecondarySheets() {
        compose.onNodeWithText("Ingredients", substring = false).performClick(); waitText("Your ingredients")
        compose.runOnUiThread { vm.ingredients(emptyList()); vm.removePhoto() }; compose.waitForIdle()
        compose.onNodeWithText("Add photo").performClick(); waitText("Choose photo")
        compose.onNodeWithText("Choose photo").performClick(); device.waitForIdle(); shot("52-system-photo-picker")
        device.pressBack(); waitText("Your ingredients")
        val fixture = File(app.cacheDir, "camera/design-photo.png").apply { parentFile!!.mkdirs() }
        app.resources.openRawResource(R.drawable.ingredients_hero).use { source -> fixture.outputStream().use { source.copyTo(it) } }
        val uri = androidx.core.content.FileProvider.getUriForFile(app, app.packageName + ".files", fixture)
        val photo = runBlocking { preparedPhoto(app, uri) }; fixture.delete()
        assertTrue(photo.startsWith("data:image/jpeg;base64,")); assertTrue(photo.length < 350_000)
        compose.runOnUiThread { vm.photo(photo) }; waitText("Analyze photo"); shot("53-photo-preview")
        compose.onNodeWithText("Change photo").performClick(); waitText("Remove photo"); shot("54-remove-photo")
        compose.onNodeWithText("Remove photo").performClick(); compose.waitUntil(10_000) { vm.state.value.photo == null }
        compose.onNodeWithText("Recipes", substring = false).performClick(); waitText("My recipes")
        val owned = vm.state.value.recipes.first { it.ingredients.size == 3 && it.ingredients.any { i -> i.name == "tomato" } }
        compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText(owned.title)); compose.onNodeWithText(owned.title).performScrollTo().performClick(); waitText("Start cooking"); settled()
        compose.onNodeWithContentDescription("Recipe actions").performClick(); compose.onNodeWithText("Share this recipe").performClick(); waitText("Not shared"); settled(); shot("55-sharing")
        device.pressBack(); compose.waitForIdle(); back()
        compose.onNodeWithText("Friends", substring = false).performClick(); waitText("Your chefs")
        compose.onNodeWithText(vm.state.value.friends.first { it.status == "accepted" }.friend.username).performClick(); waitText("Share a recipe")
        compose.onNodeWithText("Report", substring = false).performClick(); waitText("What happened?"); shot("56-report-sheet"); device.pressBack(); compose.waitForIdle()
        compose.onNodeWithText("Invite friend").performClick(); waitText("Other ways to connect")
        compose.onNodeWithText("Other ways to connect").performClick(); waitText("Connect by email"); shot("57-invite-methods")
        compose.onNodeWithText("Connect by email").performClick(); waitText("Email address"); shot("58-email-invite"); device.pressBack(); compose.waitForIdle()
        back()
        compose.activity.startActivity(android.content.Intent(compose.activity, WidgetConfigureActivity::class.java))
        assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(androidx.test.uiautomator.By.text("Choose a recipe")), 15_000))
        device.waitForIdle(); shot("59-widget-configuration"); device.pressBack()
    }
    @Test fun authenticationKeepsFailedInput() {
        compose.runOnUiThread { vm.logout() }; waitText("Welcome back, chef"); settled(); shot("01-login")
        compose.onNodeWithText("Create an account").performClick(); waitText("Already have an account"); shot("02-signup")
        compose.onNodeWithText("Already have an account? Sign in").performScrollTo().performClick()
        compose.onNodeWithText("Email address").performTextInput("native-a@example.test")
        compose.onNodeWithText("Password").performTextInput("WrongTestPassword")
        compose.waitForIdle()
        compose.onNodeWithText("Password").performImeAction(); waitText("Check your email and password."); settled()
        compose.onNodeWithText("Email address").assertTextContains("native-a@example.test")
        compose.onNodeWithText("Password").assertTextContains("WrongTestPassword"); shot("62-login-error")
        compose.onNodeWithText("Password").performTextReplacement("NativeTestOnly-2026")
        compose.waitForIdle()
        compose.onNodeWithText("Password").performImeAction(); waitText("My recipes"); settled()
        assertEquals("native-a@example.test", vm.state.value.me?.email)
    }
}
