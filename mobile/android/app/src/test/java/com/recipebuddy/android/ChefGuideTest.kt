package com.recipebuddy.android

import org.junit.Assert.*
import org.junit.Test

class ChefGuideTest {
    @Test fun commandsCannotSkipStepsFromCasualSentences() {
        assertEquals(ChefCommand.NEXT, chefCommand("Next step"))
        assertEquals(ChefCommand.NEXT, chefCommand("Étape suivante"))
        assertEquals(ChefCommand.EXPLAIN, chefCommand("explique"))
        assertEquals(ChefCommand.INGREDIENTS, chefCommand("what do I need"))
        assertEquals(ChefCommand.PREVIEW, chefCommand("what’s next"))
        assertEquals(ChefCommand.UNKNOWN, chefCommand("Do I add the rice next?"))
        assertEquals(ChefCommand.UNKNOWN, chefCommand("skip ten steps"))
    }
    @Test fun coachingExplainsTechniqueWithoutReplacingRecipe() {
        val original = "Simmer the sauce for 12 minutes at low heat."
        val recipe = Recipe(steps = listOf(original))
        val calm = chefSpeech(recipe, 0, "en", false)
        val roast = chefSpeech(recipe, 0, "en", true)
        assertTrue(calm.contains(original)); assertTrue(roast.contains(original))
        assertTrue(calm.contains("small, gentle bubbles"))
        assertFalse(roast.contains("Gordon")); assertFalse(roast.contains("Ramsay"))
        assertFalse(chefExplanation(original, "en").contains("12"))
        assertTrue(chefExplanation("Faites mijoter la sauce.", "fr").contains("petites bulles"))
    }
    @Test fun ingredientHelpUsesScaledRecipeAmounts() {
        val recipe = Recipe(servings = 2, ingredients = listOf(Ingredient("rice", "1/2", "cup")))
        assertTrue(chefIngredients(recipe, 4, "en").contains("1 cup rice"))
        assertTrue(chefIngredients(recipe, 4, "en").contains("whole recipe"))
    }
    @Test fun coachingUsesTheSelectedAppLanguageAndSavedTranslations() {
        val recipe = Recipe(steps = listOf("Whisk the eggs."), translations = buddyJson.parseToJsonElement("""{"fr":{"Whisk the eggs.":"Fouettez les œufs."}}""").let { it as kotlinx.serialization.json.JsonObject })
        val french = chefSpeech(recipe, 0, "fr", false)
        assertTrue(french.contains("Étape 1")); assertTrue(french.contains("Fouettez les œufs."))
        assertTrue(french.contains("mouvements réguliers")); assertFalse(french.contains("Whisk the eggs"))
        assertTrue(chefSpeech(recipe, 0, "en", false).contains("Whisk the eggs."))
    }
}
