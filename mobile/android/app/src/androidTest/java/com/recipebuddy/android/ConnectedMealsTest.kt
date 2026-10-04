package com.recipebuddy.android
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.espresso.Espresso
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import org.junit.*
import org.junit.runner.RunWith
import java.io.File
@RunWith(AndroidJUnit4::class)
class ConnectedMealsTest {
 @get:Rule val compose=createAndroidComposeRule<MainActivity>()
 private val vm get()=ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
 private val app get()=compose.activity.application as BuddyApp
 private val prescriptionSource="Prescription test Android "+System.currentTimeMillis()
 private fun settle(){compose.waitUntil(45000){!vm.state.value.busy};compose.waitForIdle()}
 private fun visible(text:String){compose.waitUntil(45000){compose.onAllNodesWithText(text,useUnmergedTree=true).fetchSemanticsNodes().isNotEmpty()}}
 private fun shot(name:String){compose.waitForIdle();val device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());device.waitForIdle();val dir=File(app.getExternalFilesDir(null),"meals").apply{mkdirs()};Assert.assertTrue(device.takeScreenshot(File(dir,"$name.png")))}
 @After fun evidence(){println("Meal verification: error="+vm.state.value.error+" pending="+vm.state.value.pendingChanges+" syncFailures="+vm.state.value.syncProblems.map{it.failure});println("Meal diagnostic: "+vm.lastOperationFailure?.let{it.javaClass.name+" "+it.stackTrace.take(5).joinToString()});shot("verification-end")}
 @Before fun login(){Assert.assertEquals("http://127.0.0.1:3003",BuildConfig.BACKEND_URL);Assert.assertTrue(BuildConfig.APPLICATION_ID.endsWith(".meals"));compose.runOnUiThread{vm.login("meal-a@example.test","MealTestOnly-2026")};compose.waitUntil(45000){vm.state.value.me?.email=="meal-a@example.test"&&!vm.state.value.busy};compose.runOnUiThread{vm.preference("language","en");vm.preference("theme","light");vm.saveMealDraft(JsonObject(emptyMap()));vm.dismissMealSuccess()};compose.waitUntil(10000){vm.state.value.language=="en"&&vm.state.value.theme=="light"};compose.waitForIdle()}
 @Test fun persistedAgendaPantryCookingAndFrenchDark(){
  compose.onNodeWithText("Agenda",useUnmergedTree=true).performClick();visible("Meal tools");compose.waitUntil(45000){vm.state.value.meals!=null};settle();shot("01-agenda-en-light")
  compose.onNodeWithText("Pantry",useUnmergedTree=true).performClick();visible("Add batch");shot("02-pantry-en-light")
  compose.onNode(hasSetTextAction() and hasText("Ingredient")).performTextInput("Test oats")
  compose.onNode(hasSetTextAction() and hasText("Quantity · blank means presence")).performTextInput("500")
  Espresso.closeSoftKeyboard();compose.onNodeWithText("Add batch").performScrollTo().assertIsEnabled().performClick();settle()
  compose.waitUntil(45000){vm.state.value.meals?.get("state")?.jsonObject?.get("pantry")?.jsonArray?.any{it.jsonObject["name"]?.jsonPrimitive?.content=="Test oats"}==true};shot("03-persisted-pantry")
  compose.runOnUiThread{vm.preference("language","fr");vm.preference("theme","dark")};compose.waitUntil(10000){vm.state.value.language=="fr"&&vm.state.value.theme=="dark"};compose.waitForIdle();shot("04-pantry-fr-dark")
  val eatenBefore=vm.state.value.meals!!["state"]!!.jsonObject["eaten"]!!.jsonArray.size
  val before=vm.state.value.meals!!["state"]!!.jsonObject["occasions"]!!.jsonArray.size
  compose.runOnUiThread{vm.cooked(vm.state.value.allRecipes.first{it.title=="Rice & chicken"})};settle();Assert.assertTrue("Cooking draft retained",vm.state.value.mealDraft.containsKey("recipeId"));shot("05-cooking-confirm-fr-dark");visible("Confirmer la cuisson")
  compose.onNode(hasSetTextAction() and hasText("Portions préparées")).performTextReplacement("2");Espresso.closeSoftKeyboard()
  compose.onNodeWithText("Confirmer la cuisson").performClick();settle();compose.waitUntil(45000){(vm.state.value.meals?.get("state")?.jsonObject?.get("occasions")?.jsonArray?.size ?: 0) == before+1};shot("06-cooking-saved-fr-dark")
  Assert.assertEquals(eatenBefore,vm.state.value.meals!!["state"]!!.jsonObject["eaten"]!!.jsonArray.size)
  UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack()
  compose.onNodeWithText("Agenda",useUnmergedTree=true).performClick();settle()
  compose.onNode(hasScrollToIndexAction()).performScrollToNode(hasText("Agenda de préparation"))
  compose.onNodeWithText("Agenda de préparation").performClick()
  compose.onNode(hasSetTextAction() and hasText("Description de la tâche")).performScrollTo().performTextInput("Préparation test Android")
  Espresso.closeSoftKeyboard()
  compose.onNode(hasSetTextAction() and hasText("Description de la tâche")).assertTextContains("Préparation test Android")
  compose.onNodeWithText("Enregistrer la tâche").performScrollTo().assertIsEnabled().performClick();settle();shot("07-preparation-submitted")
  compose.waitUntil(45000){vm.state.value.meals!!["state"]!!.jsonObject["preparation"]!!.jsonArray.any{it.jsonObject["description"]?.jsonPrimitive?.content=="Préparation test Android"}}
  shot("07-preparation-persisted-fr-dark")
  compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
  compose.onNode(hasClickAction() and hasText("Agenda") and hasAnySibling(hasText("Outils repas"))).performClick()
  compose.onNodeWithText("Cuisine et repas",useUnmergedTree=true).performClick();settle()
  compose.onNode(hasScrollToIndexAction()).performScrollToIndex(0)
  compose.onNodeWithText("Aliments consommés · estimations sourcées").performScrollTo().performClick()
  visible("Nutrition quotidienne et objectifs")
  compose.onNodeWithText("Configurer les objectifs nutritionnels").performScrollTo().performClick()
  compose.onNodeWithText("Choisir une personne").performScrollTo().performClick()
  compose.onNodeWithText("Nutrition test",useUnmergedTree=true).performClick()
  compose.onNode(hasSetTextAction() and hasText("Source ou référence de prescription")).performScrollTo().performTextInput(prescriptionSource)
  compose.onNode(hasSetTextAction() and hasText("Minimum (facultatif)")).performScrollTo().performTextInput("1800")
  compose.onNode(hasSetTextAction() and hasText("Maximum (facultatif)")).performScrollTo().performTextInput("2200")
  compose.onNode(hasSetTextAction() and hasText("Date d’émission")).performScrollTo().performTextReplacement("2026-10-01")
  compose.onNode(hasSetTextAction() and hasText("Date de révision")).performScrollTo().performTextInput("2026-10-10")
  compose.onNodeWithText("Objectif prescrit").performScrollTo()
  compose.onNodeWithContentDescription("Objectif prescrit").performClick()
  compose.onNodeWithContentDescription("Le professionnel a prescrit ces limites exactes pour cette personne").performScrollTo().performClick()
  Espresso.closeSoftKeyboard()
  compose.onNode(hasSetTextAction() and hasText("Minimum (facultatif)")).performScrollTo().performTextReplacement("mistyped")
  Espresso.closeSoftKeyboard()
  compose.onNodeWithText("Enregistrer l’objectif").performScrollTo().assertIsNotEnabled()
  compose.onNode(hasSetTextAction() and hasText("Minimum (facultatif)")).performScrollTo().performTextReplacement("1800")
  Espresso.closeSoftKeyboard()
  compose.onNodeWithText("Enregistrer l’objectif").performScrollTo().assertIsEnabled().performClick();settle()
  compose.waitUntil(45000){vm.state.value.error!=null||vm.state.value.meals!!.mealRows("profiles").any{p->p["data"]!!.jsonObject.mealRows("nutritionTargets").any{it.mealValue("source")==prescriptionSource}}}
  Assert.assertTrue("Saved target must appear in refreshed native state",vm.state.value.meals!!.mealRows("profiles").any{p->p["data"]!!.jsonObject.mealRows("nutritionTargets").any{it.mealValue("source")==prescriptionSource}})
  shot("08-daily-target-persisted-fr-dark")
  compose.onNodeWithText("Configurer les objectifs nutritionnels").performScrollTo().performClick()
  compose.onNode(hasSetTextAction() and hasText("Date à évaluer")).performScrollTo().performTextReplacement("2026-10-03")
  Espresso.closeSoftKeyboard()
  compose.onNodeWithText("Afficher cette journée").performScrollTo().performClick();settle()
  compose.waitUntil(45000){vm.state.value.mealFrom=="2026-10-03"&&vm.state.value.meals!!.mealRows("dailyNutrition").any{it.mealValue("date")=="2026-10-03"}}
  compose.onNodeWithText("Unmeasured snack · Composition de la portion consommée").performScrollTo().performClick()
  compose.onNode(hasSetTextAction() and hasText("Portion réellement consommée")).performScrollTo().performTextReplacement("TEST ONLY actual snack portion")
  compose.onNode(hasSetTextAction() and hasText("Étiquette ou source de composition")).performScrollTo().performTextReplacement(prescriptionSource+" label")
  listOf("Énergie · kcal" to "50","Glucides · g" to "12","Protéines · g" to "1","Lipides · g" to "0").forEach{(label,value)->compose.onNode(hasSetTextAction() and hasText(label)).performScrollTo().performTextReplacement(value)}
  Espresso.closeSoftKeyboard()
  compose.onNodeWithContentDescription("Ces valeurs décrivent cette portion réellement consommée").performScrollTo().performClick()
  compose.onNodeWithText("Enregistrer la composition").performScrollTo().performClick();settle()
  compose.waitUntil(45000){vm.state.value.meals!!.mealRows("nutrition").any{(it["nutritionEvidence"] as? JsonObject)?.mealValue("source")==prescriptionSource+" label"}}
  compose.onNodeWithText("Confirmer tous les aliments et boissons enregistrés").performScrollTo().performClick();settle()
  compose.waitUntil(45000){vm.state.value.meals!!.mealRows("dailyNutrition").any{day->day.mealValue("date")=="2026-10-03"&&day.mealRows("rows").any{it.mealValue("nutrient")=="energyKcal"&&it.mealValue("status")=="within-target"}}}
  val day=vm.state.value.meals!!.mealRows("dailyNutrition").first{it.mealValue("date")=="2026-10-03"}
  Assert.assertEquals(2050.0,day.mealRows("rows").first{it.mealValue("nutrient")=="energyKcal"}["value"]!!.jsonPrimitive.double,0.01)
  Assert.assertEquals(JsonNull,day.mealRows("rows").first{it.mealValue("nutrient")=="sodiumG"}["value"])
  compose.onNodeWithText("Unmeasured snack · Composition de la portion consommée").performScrollTo().performClick()
  compose.onNodeWithText("Nutrition test · 2026-10-03").performScrollTo()
  shot("11-native-daily-confirmed-fr-dark")
 }
}
