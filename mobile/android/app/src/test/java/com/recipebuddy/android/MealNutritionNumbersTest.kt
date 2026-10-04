package com.recipebuddy.android
import org.junit.Assert.*
import org.junit.Test
class MealNutritionNumbersTest {
 @Test fun frenchAndEnglishDecimalsRetainExactBounds(){assertEquals(1.5,nutritionInputNumber("1,5")!!,0.0);assertEquals(1.5,nutritionInputNumber("1.5")!!,0.0);assertTrue(nutritionBoundsValid("1,5","2,5"))}
 @Test fun malformedEnteredBoundCannotBeSilentlyOmitted(){assertFalse(nutritionBoundsValid("mistyped","2200"));assertFalse(nutritionBoundsValid("1800","1,2,3"));assertFalse(nutritionBoundsValid("",""))}
 @Test fun unknownAndZeroAreDistinct(){assertNull(nutritionInputNumber(""));assertEquals(0.0,nutritionInputNumber("0")!!,0.0);assertTrue(nutritionBoundsValid("","0"))}
 @Test fun invertedAndUnboundedValuesAreRejected(){assertFalse(nutritionBoundsValid("2200","1800"));listOf("NaN","Infinity","-1","100001").forEach{assertNull(nutritionInputNumber(it));assertFalse(nutritionBoundsValid(it,"2200"))}}
}
