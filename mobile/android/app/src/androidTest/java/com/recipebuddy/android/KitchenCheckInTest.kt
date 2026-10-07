package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import java.io.File
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import org.junit.*
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class KitchenCheckInTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val vm get() = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
    private fun settle() { compose.waitUntil(45000) { !vm.state.value.busy }; compose.waitForIdle() }
    private fun shot(name:String) {
        compose.waitForIdle()
        val dir=File(compose.activity.getExternalFilesDir(null),"check-in").apply{mkdirs()}
        Assert.assertTrue(UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).takeScreenshot(File(dir,"$name.png")))
    }
    @Test fun checkInDraftCorrectionAndLanguages() {
        Assert.assertEquals("http://127.0.0.1:3003",BuildConfig.BACKEND_URL)
        Assert.assertTrue(BuildConfig.APPLICATION_ID.endsWith(".meals"))
        compose.runOnUiThread{if((compose.activity.application as BuddyApp).api.session==null)vm.login("checkin-a@example.test","CheckInTestOnly-2026")else vm.refresh()}
        compose.waitUntil(45000){vm.state.value.me?.email=="checkin-a@example.test"&&!vm.state.value.busy}
        compose.runOnUiThread{vm.preference("language","en");vm.preference("theme","light");vm.saveMealCheckIn(JsonObject(emptyMap()))}
        settle()
        compose.onAllNodesWithText("Agenda",useUnmergedTree=true).onLast().performClick()
        compose.waitUntil(45000){vm.state.value.meals!=null}
        compose.onNodeWithText("Kitchen check-in",substring=true).performScrollTo().performClick()
        shot("01-entry-en-light")
        compose.onNodeWithText("Tomatoes").performScrollTo().performClick()
        shot("06-pantry")
        compose.onNodeWithText("Back to questions").performScrollTo().performClick()
        compose.onNodeWithText("Saved changes and corrections").performScrollTo().performClick()
        compose.onNodeWithText("Correct Rice leftovers").performScrollTo().performClick()
        shot("07-leftover")
        compose.onNodeWithText("Back to questions").performScrollTo().performClick()
        compose.onNodeWithText("Add food or drink").performScrollTo().performClick()
        compose.onNodeWithText("What was eaten or drunk?").performTextReplacement("Native check-in tea")
        compose.onNodeWithText("Servings · blank if unknown").performScrollTo().performTextReplacement("0.5")
        shot("02-food-draft")
        compose.activityRule.scenario.recreate()
        settle()
        Assert.assertTrue(vm.state.value.mealCheckIn.toString().contains("Native check-in tea"))
        compose.onAllNodesWithText("Agenda",useUnmergedTree=true).onLast().performClick()
        compose.onNodeWithText("Kitchen check-in",substring=true).performScrollTo().performClick()
        compose.onNodeWithText("Save answer").performScrollTo().performClick()
        settle()
        compose.waitUntil(45000){vm.state.value.meals?.get("state")?.jsonObject?.mealRows("eaten")?.any{it.mealValue("title")=="Native check-in tea"}==true}
        val entry=vm.state.value.meals!!["state"]!!.jsonObject.mealRows("eaten").last{it.mealValue("title")=="Native check-in tea"}
        Assert.assertEquals("0.5",entry.mealValue("amount"))
        Assert.assertEquals("true",entry.mealValue("approximate"))
        shot("03-saved")
        compose.onNodeWithText("Update availability").performScrollTo().performClick()
        shot("04-context")
        compose.runOnUiThread{vm.preference("language","fr");vm.preference("theme","dark")}
        settle()
        shot("05-context-fr-dark")
        val app=compose.activity.application as BuddyApp
        runBlocking {
            Assert.assertNotNull(app.database.entries().entry(vm.state.value.account!!,"meal-check-in","current"))
        }
    }
}
