package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import androidx.lifecycle.ViewModelProvider
import kotlinx.coroutines.runBlocking
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class NativeParityTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private val device get() = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    private fun waitText(text: String) { compose.waitUntil(45_000) { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() } }
    private fun shot(name: String) { compose.waitForIdle(); val dir = File(app.getExternalFilesDir(null), "native-verification").apply { mkdirs() }; assertTrue(device.takeScreenshot(File(dir, "$name.png"))) }
    @Test fun chefReviewsTwistsCommentsAndSearch() {
        assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL); assertNotNull(app.api.session)
        val vm = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
        fun settled() { compose.waitUntil(45_000) { !vm.state.value.busy }; compose.waitForIdle() }
        compose.waitUntil(45_000) { vm.state.value.me?.levels?.size == 7 && vm.state.value.shared.isNotEmpty() }
        settled(); waitText("chef points"); shot("50-chef-home")
        compose.onNodeWithContentDescription("Chef progress and badges").performClick(); waitText("All seven chef levels"); shot("51-badges")
        compose.onNodeWithTag("chef-roadmap").performScrollToNode(hasText("Apron Legend")); compose.onNodeWithText("Apron Legend").assertExists(); device.pressBack(); compose.waitForIdle()
        compose.onNodeWithText("Friends").performClick()
        val shared = vm.state.value.shared.first(); val friend = vm.state.value.friends.first { it.friend.id == shared.sharedChefId }
        compose.onNodeWithText(friend.friend.username).performClick(); waitText("View chef’s kitchen"); compose.onNodeWithText("View chef’s kitchen").performClick()
        waitText("Only recipes this chef has shared"); shot("52-friend-kitchen")
        compose.onNodeWithText(shared.title).performScrollTo().performClick(); waitText("Aprons")
        compose.onNodeWithText("Aprons").performScrollTo().performClick(); waitText("Rate this recipe")
        compose.onNodeWithText("Rate this recipe").performClick(); compose.onNodeWithContentDescription("5 aprons").performClick()
        compose.onNodeWithText("A note for the chef (optional)").performTextInput("Native fixture review."); device.pressBack(); compose.waitForIdle()
        compose.onNodeWithText("Save review").performScrollTo().performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.reviews?.reviews?.any { it.authorId == app.api.session!!.userId && it.rating == 5 } == true }
        settled(); waitText("Update my review"); shot("53-aprons")
        compose.onNodeWithText("Update my review").performClick(); compose.onNodeWithContentDescription("4 aprons").performClick(); compose.onNodeWithText("Save review").performScrollTo().performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.reviews?.reviews?.any { it.authorId == app.api.session!!.userId && it.rating == 4 } == true }
        settled(); compose.onNodeWithText("Twists").performClick(); compose.onNodeWithText("Add a twist").performClick()
        compose.onNodeWithText("A name for your twist").performTextInput("Native fixture twist")
        compose.onNodeWithText("What did you change?").performTextInput("I sautéed the tomatoes separately.")
        device.pressBack(); compose.waitForIdle(); compose.onNodeWithText("Save twist").performScrollTo().performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.discussion?.takes?.any { it.title == "Native fixture twist" } == true }
        settled(); waitText("Native fixture twist"); shot("54-twists")
        compose.onNodeWithText("Comments (0)").performScrollTo().performClick(); compose.onNodeWithText("Reply to this twist").performScrollTo().performClick()
        compose.onNodeWithText("Your comment").performTextInput("A native fixture reply."); device.pressBack(); compose.waitForIdle(); compose.onNodeWithText("Post comment").performScrollTo().performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.discussion?.comments?.any { it.text == "A native fixture reply." && it.takeId != null } == true }
        settled(); compose.onNodeWithText("Comments", substring = false).performClick(); compose.onNodeWithText("Add a comment").performClick()
        compose.onNodeWithText("Your comment").performTextInput("A native recipe comment."); device.pressBack(); compose.waitForIdle(); compose.onNodeWithText("Post comment").performScrollTo().performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.discussion?.comments?.any { it.text == "A native recipe comment." && it.takeId == null } == true }; settled(); shot("55-comments")
        compose.runOnUiThread { vm.preference("language", "fr") }; waitText("Commentaires"); shot("58-french-community")
        compose.runOnUiThread { vm.preference("language", "en") }; waitText("Comments")
        compose.onNodeWithContentDescription("Delete comment").performScrollTo().performClick(); waitText("Remove this contribution?"); compose.onNodeWithText("Delete", substring = false).performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.discussion?.comments?.none { it.text == "A native recipe comment." } == true }
        settled(); compose.onNodeWithText("Twists").performClick(); compose.onNodeWithContentDescription("Delete twist").performScrollTo().performClick(); compose.onNodeWithText("Delete", substring = false).performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.discussion?.takes?.none { it.title == "Native fixture twist" } == true && vm.state.value.community?.discussion?.comments?.none { it.text == "A native fixture reply." } == true }
        settled(); compose.onNodeWithText("Aprons").performClick(); compose.onNodeWithText("Remove my review").performScrollTo().performClick(); compose.onNodeWithText("Delete", substring = false).performClick()
        compose.waitUntil(30_000) { vm.state.value.community?.reviews?.reviews?.none { it.authorId == app.api.session!!.userId } == true }
        settled(); compose.onNodeWithContentDescription("Back").performClick(); waitText("View chef’s kitchen")
        compose.onAllNodesWithText("Print recipe").assertCountEquals(0)
        // Return to the root and exercise the global, ingredient/step-aware search.
        compose.onNodeWithContentDescription("Back").performClick(); compose.onNodeWithContentDescription("Back").performClick(); settled()
        compose.onNodeWithContentDescription("Search recipes and help").performClick()
        compose.onNodeWithText("Recipes, ingredients, help").performTextInput("beat")
        compose.onNodeWithText("Recipes, ingredients, help").assertTextContains("beat")
        compose.onNode(hasSetTextAction()).performImeAction()
        compose.waitUntil(45_000) { vm.state.value.searchCompleted || vm.state.value.error != null }; assertNull("Search error", vm.state.value.error); assertTrue(vm.state.value.searchResults.isNotEmpty()); settled(); shot("57-global-search")
    }
}
