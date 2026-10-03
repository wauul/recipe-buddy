package com.recipebuddy.android

import android.content.Context
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import java.io.File

// Real native UI against the disposable local server, never production accounts.
@RunWith(AndroidJUnit4::class)
class NativeJourneyTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private fun waitText(value: String, timeout: Long = 25_000) {
        compose.waitUntil(timeout) { compose.onAllNodesWithText(value, substring = true).fetchSemanticsNodes().isNotEmpty() }
    }
    private fun click(value: String) { compose.onNodeWithText(value).performClick() }
    private fun screenshot(name: String) {
        compose.waitForIdle()
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).waitForIdle()
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "native-verification").apply { mkdirs() }
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).takeScreenshot(File(directory, "$name.png"))
    }
    @Test fun accountRecipesShoppingCookingAndInvites() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        assertTrue("Test must use isolated adb-reversed server", BuildConfig.BACKEND_URL == "http://127.0.0.1:3002")
        if ((context.applicationContext as BuddyApp).api.session == null) {
            waitText("Welcome back, chef")
            screenshot("01-login")
            compose.onNodeWithText("Email address").performTextInput("native-a@example.test")
            compose.onNodeWithText("Password").performTextInput("NativeTestOnly-2026")
            UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack()
            compose.onNodeWithText("Sign in").performScrollTo().performClick()
        }
        waitText("My recipes")
        waitText("Test recipe · Tomato, egg & rice · edited")
        screenshot("02-collection")
        click("Test recipe · Tomato, egg & rice · edited"); waitText("Start cooking")
        screenshot("03-detail")
        val vm = androidx.lifecycle.ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        compose.runOnUiThread { vm.state.value.active?.let { vm.progress(it, 0, it.servings) } }
        compose.waitUntil(10_000) { vm.state.value.progress[vm.state.value.active?.id]?.step == 0 }
        click("Start cooking"); waitText("Prepare the tomatoes")
        click("Next"); waitText("Cook rice for 10 minutes")
        screenshot("04-cooking")
        compose.onNodeWithContentDescription("Back").performClick(); waitText("Start cooking")
        if (vm.state.value.downloads.none { it.recipe.id == vm.state.value.active?.id }) {
            compose.onNodeWithContentDescription("Recipe actions").performClick(); click("Download for offline")
        }
        compose.onNodeWithText("Recipe info").performScrollTo().performClick(); waitText("Downloaded · last refreshed")
        compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText("Add to shopping"))
        compose.onNodeWithText("Add to shopping").performClick()
        waitText("Choose recipes"); waitText("rice")
        compose.onAllNodes(isToggleable() and SemanticsMatcher.expectValue(androidx.compose.ui.semantics.SemanticsProperties.ToggleableState, androidx.compose.ui.state.ToggleableState.Off)).onFirst().performClick()
        screenshot("05-shopping")
        click("Friends"); waitText("Your chefs"); click("Invite friend")
        waitText("Create my code"); click("Create my code"); waitText("Share link")
        screenshot("06-invite-qr")
        compose.onNodeWithContentDescription("Back").performClick(); click("Ingredients"); waitText("Your ingredients")
        compose.runOnUiThread { vm.ingredients(emptyList()); vm.removePhoto() }
        for (name in listOf("tomato", "egg", "rice")) {
            compose.onNodeWithText("Add ingredient").performClick()
            compose.onAllNodesWithText("Ingredient name").onFirst().performScrollTo().performTextInput(name)
            compose.onAllNodesWithText("Add ingredient").onLast().performScrollTo().performClick()
            compose.waitUntil(10_000) { compose.onAllNodesWithText("Ingredient name").fetchSemanticsNodes().isEmpty() }
        }
        screenshot("07-ingredient-confirmation")
        compose.onNodeWithText("Find saved recipes").performClick()
        compose.waitUntil(25_000) { compose.onAllNodesWithText("All", substring = false).fetchSemanticsNodes().isNotEmpty() }
        compose.onAllNodes(hasScrollAction()).onFirst().performScrollToNode(hasText("All found · check quantities"))
        screenshot("08-matches")
        // Persistence is checked directly through a new DAO read, then activity recreation.
        val app = context.applicationContext as BuddyApp
        val account = app.api.session!!.userId
        runBlocking {
            assertTrue(app.database.entries().entries(account, "download").isNotEmpty())
            assertTrue(app.database.entries().entries(account, "shopping").map { buddyJson.decodeFromString<ShoppingItem>(it.payload) }.any { it.checked })
            assertTrue(app.database.entries().entries(account, "progress").any { buddyJson.decodeFromString<CookingProgress>(it.payload).step == 1 })
        }
        compose.activityRule.scenario.recreate(); waitText("Ingredients")
        screenshot("09-recreated")
    }
}
