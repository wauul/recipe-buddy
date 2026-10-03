package com.recipebuddy.android
import org.junit.Test
import org.junit.Assert.*
class KitchenInputsTest {
    @Test fun quantitiesRejectPastedTextAndAllowLocalDecimals() {
        listOf("", "2", "2.5", "0,25", ".5", "2.").forEach { assertTrue(it, numericInput(it)) }
        listOf("two", "2 kg", "-1", "1e3", "2..5", "1/2", "9999999").forEach { assertFalse(it, numericInput(it)) }
        assertFalse(numericInput("1.5", true)); assertTrue(numericInput("3", true))
    }
    @Test fun offlineMatchingPreservesIngredientAndQuantityMeaning() {
        val recipe = Recipe(id="r", ingredients=listOf(Ingredient("tomato", "2", "piece"), Ingredient("salt (optional)", "", "")))
        val match = localRecipeMatches(listOf(recipe), listOf(Ingredient("tomates", "1", "piece"))).single()
        assertTrue(match.allFound); assertEquals(1, match.required); assertEquals("insufficient", match.quantityCaveat)
        assertFalse(localRecipeMatches(listOf(Recipe(ingredients=listOf(Ingredient("almond milk")))), listOf(Ingredient("milk"))).single().allFound)
    }
}
