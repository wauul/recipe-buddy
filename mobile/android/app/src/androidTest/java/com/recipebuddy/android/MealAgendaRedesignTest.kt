package com.recipebuddy.android

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import java.io.File
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.serialization.json.*
import org.junit.*
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MealAgendaRedesignTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val vm
        get() = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]

    private fun settle() {
        compose.waitUntil(45000) { !vm.state.value.busy }
        compose.waitForIdle()
    }

    private fun shot(name: String) {
        compose.waitForIdle()
        compose.waitUntil(10000) {
            compose.onAllNodesWithTag("action-loader").fetchSemanticsNodes().isEmpty()
        }
        println("Agenda evidence: " + name)
        val app = compose.activity.application
        val dir = File(app.getExternalFilesDir(null), "meal-redesign").apply { mkdirs() }
        Assert.assertTrue(
            UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
                .takeScreenshot(File(dir, "$name.png"))
        )
    }

    private fun visible(text: String) {
        compose.waitUntil(45000) {
            compose
                .onAllNodesWithText(text, useUnmergedTree = true)
                .fetchSemanticsNodes()
                .isNotEmpty()
        }
    }

    @After
    fun diagnose() {
        println(
            "Agenda state: error=" +
                vm.state.value.error +
                " pending=" +
                vm.state.value.pendingChanges +
                " failures=" +
                vm.state.value.syncProblems.map { it.failure }
        )
        shot("verification-end")
    }

    @Before
    fun login() {
        Assert.assertEquals("http://127.0.0.1:3003", BuildConfig.BACKEND_URL)
        Assert.assertTrue(BuildConfig.APPLICATION_ID.endsWith(".meals"))
        compose.runOnUiThread { vm.login("meal-a@example.test", "MealTestOnly-2026") }
        compose.waitUntil(45000) {
            vm.state.value.me?.email == "meal-a@example.test" && !vm.state.value.busy
        }
        compose.runOnUiThread {
            vm.preference("language", "en")
            vm.preference("theme", "light")
            vm.saveMealDraft(JsonObject(emptyMap()))
            vm.dismissMealSuccess()
        }
        settle()
        visible("Agenda")
        // Previous interrupted synthetic reviews are recoverable; never touch another mutation.
        vm.state.value.syncProblems
            .filter { it.path == "meals" && it.payload.contains("Agenda review ") }
            .forEach { problem ->
                compose.runOnUiThread { vm.resolveSync(problem.operationId, false) }
                settle()
            }
    }

    @Test
    fun simplifiedToolsSaveAndKeepUnknownPortions() {
        compose.onAllNodesWithText("Agenda", useUnmergedTree = true).onLast().performClick()
        visible("Today")
        compose.onNodeWithText("My day").performScrollTo().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        compose.onNodeWithText("Rest").performClick()
        if (
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("contexts").none {
                it.mealValue("date") == LocalDate.now().toString() &&
                    it.mealValue("timeMinutes") == "30"
            }
        )
            compose.onNodeWithText("30").performClick()
        compose.onNodeWithText("Oven").performClick()
        shot("20-simple-my-day")
        compose.onNodeWithText("Save").performScrollTo().performClick()
        settle()
        Assert.assertTrue(
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("contexts").any {
                it.mealValue("date") == LocalDate.now().toString() &&
                    it.mealValue("timeMinutes") == "30" &&
                    it.mealValue("dayType") == "rest"
            }
        )
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Prep").performScrollTo().performClick()
        val preparationIds =
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("preparation").map {
                it.mealValue("id")
            }
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(1)
        compose.onNodeWithText("Chop").performClick()
        compose.onAllNodesWithText("0 min").assertCountEquals(2)
        shot("21-simple-prepare")
        compose.onNodeWithText("Save").performScrollTo().performClick()
        settle()
        Assert.assertTrue(
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("preparation").any {
                it.mealValue("description") == "Chop vegetables" &&
                    it.mealValue("date") == LocalDate.now().toString() &&
                    it.mealValue("activeMinutes") == "0" &&
                    it.mealValue("passiveMinutes") == "0" &&
                    it.mealValue("id") !in preparationIds
            }
        )
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Eaten").performScrollTo().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        val ownRecipe = vm.state.value.allRecipes.first { it.owned }
        val snackTitle = ownRecipe.title
        compose.onAllNodesWithText(snackTitle).onLast().performScrollTo().performClick()
        compose.onAllNodesWithText("Nutrition test").onLast().performClick()
        shot("22-simple-eaten-unknown")
        compose.onNodeWithText("Save").performScrollTo().performClick()
        settle()
        val eaten =
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("eaten").first {
                it.mealValue("title") == snackTitle
            }
        Assert.assertEquals(JsonNull, eaten["amount"])
        visible("Today")
        compose.onNodeWithText("Nutrition").performScrollTo().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("23-compact-nutrition")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Week").performScrollTo().performClick()
        settle()
        visible("Add")
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("24-visible-week-actions")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Replan").performScrollTo().performClick()
        settle()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("25-simple-replan")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Leftovers").performScrollTo().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("26-leftover-list")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Ideas").performScrollTo().performClick()
        settle()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("27-simple-ideas")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Pantry", useUnmergedTree = true).performClick()
        visible("Check stock")
        compose.onNodeWithText("Check stock").performScrollTo().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("28-stock-list")
        val rice =
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("pantry").first {
                it.mealValue("id") == "rice"
            }
        val measured = rice["quantity"]!!.jsonPrimitive.double + 1
        compose.onAllNodesWithText("rice").onLast().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(1)
        compose.onNode(hasSetTextAction()).performTextReplacement(measured.toString())
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack()
        compose.onNodeWithText("Estimate").performClick()
        shot("29-simple-stock-correction")
        compose.onNodeWithText("Save").performScrollTo().performClick()
        settle()
        compose.waitUntil(45000) {
            vm.state.value.meals!!["state"]!!
                .jsonObject
                .mealRows("pantry")
                .first { it.mealValue("id") == "rice" }["quantity"]!!
                .jsonPrimitive
                .double == measured
        }
        val corrected =
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("pantry").first {
                it.mealValue("id") == "rice"
            }
        Assert.assertEquals(measured, corrected["quantity"]!!.jsonPrimitive.double, .01)
        Assert.assertEquals(true, corrected["quantityEstimated"]!!.jsonPrimitive.boolean)
    }

    @Test
    fun recipePickerPreparationActionsAndCleanNutrition() {
        compose.onAllNodesWithText("Agenda", useUnmergedTree = true).onLast().performClick()
        visible("Today")
        val before = vm.state.value.meals!!["state"]!!.jsonObject
        val beforeEaten = before.mealRows("eaten").map { it.mealValue("id") }
        val pantryBefore = before["pantry"]
        val occasionsBefore = before["occasions"]
        compose.onNodeWithText("Eaten").performScrollTo().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("33-native-own-recipe-picker")
        compose.onAllNodesWithText("Friends", useUnmergedTree = true).onLast().performClick()
        val friendRecipe = vm.state.value.allRecipes.first { !it.owned }
        compose
            .onAllNodesWithText(friendRecipe.title)
            .onLast()
            .performScrollTo()
            .assertIsDisplayed()
        shot("34-native-friend-recipe-picker")
        compose.onAllNodesWithText(friendRecipe.title).onLast().performClick()
        compose.onAllNodesWithText("Nutrition test").onLast().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        compose.onNodeWithText("Unknown").assertExists()
        shot("35-native-selected-eaten")
        compose.onNodeWithText("Save").performScrollTo().performClick()
        settle()
        compose.waitUntil(45000) {
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("eaten").any {
                it.mealValue("id") !in beforeEaten
            }
        }
        val after = vm.state.value.meals!!["state"]!!.jsonObject
        val record = after.mealRows("eaten").first { it.mealValue("id") !in beforeEaten }
        Assert.assertEquals(friendRecipe.id, record.mealValue("recipeId"))
        Assert.assertEquals(friendRecipe.title, record.mealValue("title"))
        Assert.assertEquals(JsonNull, record["amount"])
        Assert.assertEquals(pantryBefore, after["pantry"])
        Assert.assertEquals(occasionsBefore, after["occasions"])
        visible("Today")
        compose.onNodeWithText("Nutrition").performScrollTo().performClick()
        compose.onAllNodesWithText("Nutrition test").onLast().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        compose.onNodeWithText("Energy").assertExists()
        shot("36-native-clean-nutrition")
        if (
            vm.state.value.meals!!
                .mealRows("dailyNutrition")
                .first {
                    it.mealValue("personId") == record.mealValue("personId") &&
                        it.mealValue("date") == LocalDate.now().toString()
                }["dayConfirmed"]
                ?.jsonPrimitive
                ?.booleanOrNull != true
        )
            compose
                .onNodeWithContentDescription("All food & drinks logged")
                .performScrollTo()
                .performClick()
        settle()
        Assert.assertTrue(
            vm.state.value.meals!!
                .mealRows("dailyNutrition")
                .first {
                    it.mealValue("personId") == record.mealValue("personId") &&
                        it.mealValue("date") == LocalDate.now().toString()
                }["dayConfirmed"]!!
                .jsonPrimitive
                .boolean
        )
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Prep").performScrollTo().performClick()
        val taskName = "Prep actions " + System.currentTimeMillis()
        compose.onNode(hasSetTextAction() and hasText("Task")).performTextReplacement(taskName)
        compose.onNode(hasSetTextAction() and hasText("Task")).performImeAction()
        compose.onNodeWithText("Save").performScrollTo().performClick()
        settle()
        val task =
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("preparation").first {
                it.mealValue("description") == taskName
            }
        compose
            .onNode(hasSetTextAction() and hasText("Task"))
            .performTextReplacement("Keep my draft")
        compose.onNode(hasSetTextAction() and hasText("Task")).performImeAction()
        compose.onAllNodesWithText("Edit").onLast().performScrollTo().performClick()
        compose.onNodeWithText("Cancel").performScrollTo().performClick()
        compose.onNode(hasSetTextAction() and hasText("Task")).assertTextContains("Keep my draft")
        compose.onNode(hasSetTextAction() and hasText("Task")).performImeAction()
        compose.onAllNodesWithText("Stock used").onLast().performScrollTo().performClick()
        compose.onAllNodesWithText("rice").onLast().performScrollTo().performClick()
        compose.onNode(hasSetTextAction() and hasText("Quantity used")).performTextReplacement("5")
        compose.onNode(hasSetTextAction() and hasText("Quantity used")).performImeAction()
        shot("37-native-pantry-stock-used")
        compose.onAllNodesWithText("Done").onLast().performScrollTo().performClick()
        settle()
        fun currentTask() =
            vm.state.value.meals!!["state"]!!.jsonObject.mealRows("preparation").first {
                it.mealValue("id") == task.mealValue("id")
            }
        Assert.assertEquals("completed", currentTask().mealValue("status"))
        compose.onAllNodesWithText("Undo").onLast().performScrollTo().performClick()
        settle()
        Assert.assertEquals("planned", currentTask().mealValue("status"))
        Assert.assertEquals(pantryBefore, vm.state.value.meals!!["state"]!!.jsonObject["pantry"])
        compose.onAllNodesWithText("Dismiss").onLast().performScrollTo().performClick()
        settle()
        Assert.assertEquals("dismissed", currentTask().mealValue("status"))
        compose.onAllNodesWithText("Undo").onLast().performScrollTo().performClick()
        settle()
        compose.onAllNodesWithText("Done").onLast().performScrollTo().performClick()
        settle()
        Assert.assertEquals("completed", currentTask().mealValue("status"))
        Assert.assertEquals(pantryBefore, vm.state.value.meals!!["state"]!!.jsonObject["pantry"])
        shot("38-native-prepare-completed")
    }

    @Test
    fun largeTextAgendaAndShortComposer() {
        compose.onAllNodesWithText("Agenda", useUnmergedTree = true).onLast().performClick()
        visible("Today")
        settle()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        shot("17-large-text-agenda-light")
        compose.onNodeWithText("Add meal").performClick()
        visible("Saved recipe")
        compose.onNodeWithText("Another meal").performClick()
        compose.onNode(hasSetTextAction() and hasText("Meal name")).performTextReplacement("Lunch")
        compose.onNodeWithText("Save meal").performScrollTo().assertIsEnabled()
        shot("18-large-text-composer")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.runOnUiThread {
            vm.preference("language", "fr")
            vm.preference("theme", "dark")
        }
        settle()
        visible("Aujourd’hui")
        shot("19-large-text-agenda-french-dark")
    }

    @Test
    fun nutritionBoundsAndFrenchDarkRecipePicker() {
        compose.onAllNodesWithText("Agenda", useUnmergedTree = true).onLast().performClick()
        visible("Today")
        compose.onNodeWithContentDescription("Previous week").performClick()
        compose.onNode(hasContentDescription("Saturday 3 October", substring = true)).performClick()
        settle()
        compose.onNodeWithText("Nutrition").performScrollTo().performClick()
        compose.onAllNodesWithText("Nutrition test").onLast().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        compose.onNodeWithText("1800 – 2200").assertExists()
        compose.onNodeWithText("2000 recorded").assertExists()
        shot("39-native-exact-bounds-large")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.runOnUiThread {
            vm.preference("language", "fr")
            vm.preference("theme", "dark")
        }
        settle()
        compose.onNodeWithText("Nutrition").performScrollTo().performClick()
        compose.onAllNodesWithText("Nutrition test").onLast().performClick()
        compose.onNodeWithText("1800 – 2200").assertExists()
        shot("40-native-nutrition-french-dark-large")
        compose.onNodeWithContentDescription("Fermer").performClick()
        compose.onNodeWithText("Mangé").performScrollTo().performClick()
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        compose.onNodeWithText("Mes recettes").assertExists()
        shot("41-native-recipes-french-dark-large")
    }

    @Test
    fun daySelectionPlanPersistenceAndFocusedTools() {
        compose.onAllNodesWithText("Agenda", useUnmergedTree = true).onLast().performClick()
        visible("Today")
        settle()
        shot("01-agenda-light")
        compose.onAllNodes(hasSetTextAction()).assertCountEquals(0)
        val day = agendaWeekStart(LocalDate.now()).plusDays(4)
        val dayLabel = day.format(DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.UK))
        compose.onNode(hasContentDescription(dayLabel, substring = true)).performClick()
        shot("02-selected-day")
        compose.onNodeWithText("Add meal", useUnmergedTree = true).performClick()
        visible("Saved recipe")
        shot("03-add-choice")
        compose.onNodeWithText("Another meal").performClick()
        visible("Meal name")
        val name = "Agenda review " + System.currentTimeMillis()
        compose.onNode(hasSetTextAction() and hasText("Meal name")).performTextReplacement(name)
        compose.onNode(hasSetTextAction() and hasText("Meal name")).assertTextContains(name)
        UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack()
        compose.onNodeWithText("Lunch", useUnmergedTree = true).performClick()
        compose.onNodeWithContentDescription("More servings").performClick()
        shot("04-plan-editor")
        compose.onNodeWithText("Save meal").performScrollTo().performClick()
        settle()
        compose.waitUntil(45000) {
            vm.state.value.meals!!.get("state")!!.jsonObject.mealRows("plans").any {
                it.mealValue("title") == name
            }
        }
        val saved =
            vm.state.value.meals!!.get("state")!!.jsonObject.mealRows("plans").first {
                it.mealValue("title") == name
            }
        Assert.assertEquals(day.toString(), saved.mealValue("date"))
        Assert.assertEquals("lunch", saved.mealValue("slot"))
        Assert.assertEquals(2.5, saved["servings"]!!.jsonPrimitive.double, 0.01)
        shot("05-saved-meal")
        compose.onNode(hasScrollToNodeAction()).performScrollToNode(hasText(name))
        compose.onNodeWithText(name).performClick()
        visible("Edit or move")
        shot("06-meal-actions")
        compose.onNodeWithText("Edit or move").performClick()
        visible("Save meal")
        compose.onNodeWithContentDescription("More servings").performClick()
        compose.onNodeWithText("Save meal").performScrollTo().performClick()
        settle()
        compose.waitUntil(45000) {
            vm.state.value.meals!!
                .get("state")!!
                .jsonObject
                .mealRows("plans")
                .first { it.mealValue("id") == saved.mealValue("id") }["servings"]!!
                .jsonPrimitive
                .double == 3.0
        }
        compose.runOnUiThread { vm.refreshMeals() }
        settle()
        Assert.assertTrue(
            vm.state.value.meals!!.get("state")!!.jsonObject.mealRows("plans").any {
                it.mealValue("id") == saved.mealValue("id")
            }
        )
        compose.onNodeWithText("Pantry", useUnmergedTree = true).performClick()
        visible("What’s in your kitchen")
        shot("07-pantry-list")
        compose.onNodeWithText("Add ingredient", useUnmergedTree = true).performClick()
        visible("Quantity (optional)")
        shot("08-ingredient-sheet")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.onNodeWithText("Shopping", useUnmergedTree = true).performClick()
        visible("For this week")
        shot("09-shopping-list")
        compose.onAllNodesWithText("Agenda", useUnmergedTree = true).onLast().performClick()
        compose.onNodeWithText("Household", useUnmergedTree = true).performClick()
        visible("Your household")
        shot("10-household-list")
        compose.onNodeWithText("Add person", useUnmergedTree = true).performClick()
        visible("Allow private restriction checks")
        shot("11-private-profile-sheet")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.runOnUiThread {
            vm.preference("language", "fr")
            vm.preference("theme", "dark")
        }
        settle()
        compose.onAllNodesWithText("Agenda", useUnmergedTree = true).onLast().performClick()
        visible("Aujourd’hui")
        shot("12-agenda-french-dark")
        visible("Nutrition")
        shot("13-visible-day-actions")
        compose.onNodeWithText("Nutrition").performScrollTo().performClick()
        visible("Nutrition quotidienne")
        shot("14-daily-nutrition")
        compose.onNodeWithContentDescription("Fermer").performClick()
        compose.onNodeWithText("Aujourd’hui").performScrollTo().performClick()
        settle()
        shot("15-agenda-french-dark-clean")
        compose.onNodeWithContentDescription("Semaine précédente").performClick()
        val knownDay = LocalDate.parse("2026-10-03")
        compose
            .onNode(
                hasContentDescription(
                    knownDay.format(DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.FRANCE)),
                    substring = true,
                )
            )
            .performClick()
        settle()
        compose.onNodeWithText("Nutrition").performScrollTo().performClick()
        visible("Nutrition quotidienne")
        val assessment =
            vm.state.value.meals!!.mealRows("dailyNutrition").first {
                it.mealValue("date") == "2026-10-03" &&
                    it.mealRows("rows").any { row ->
                        row.mealValue("nutrient") == "energyKcal" &&
                            row["value"]?.jsonPrimitive?.doubleOrNull != null
                    }
            }
        Assert.assertEquals(
            2050.0,
            assessment
                .mealRows("rows")
                .first { it.mealValue("nutrient") == "energyKcal" }["value"]!!
                .jsonPrimitive
                .double,
            0.01,
        )
        Assert.assertEquals(
            JsonNull,
            assessment.mealRows("rows").first { it.mealValue("nutrient") == "sodiumG" }["value"],
        )
        shot("16-known-daily-nutrition")
    }
}
