package com.recipebuddy.android

import org.junit.Assert.*
import org.junit.Test

class CookingToolsTest {
    @Test fun fractionsAndAmbiguousScaling() {
        assertEquals(1.5, quantityValue("1 1/2")!!, 0.001)
        assertEquals(0.5, quantityValue("½")!!, 0.001)
        assertNull(quantityValue("1/0"))
        assertEquals("3", scaledQuantity("1 1/2", 2.0))
        assertEquals("to taste", scaledQuantity("to taste", 2.0))
        assertEquals("1–2", scaledQuantity("1–2", 2.0))
    }
    @Test fun onlyExplicitDurations() {
        assertEquals(listOf(300L, 3600L), explicitDurations("Cook 5 minutes then rest 1 hour").map { it.seconds })
        assertEquals(120L, explicitDurations("Cuire 2 minutes").single().seconds)
        assertTrue(explicitDurations("Cook 10–15 minutes").isEmpty())
        assertTrue(explicitDurations("Cook about 10 minutes").isEmpty())
        assertTrue(explicitDurations("Cuire environ 10 minutes").isEmpty())
    }
    @Test fun restorationUsesDeadlineAndStoredStep() {
        val progress = CookingProgress("owned", 3, 4)
        assertEquals(progress, buddyJson.decodeFromString<CookingProgress>(kotlinx.serialization.json.Json.encodeToString(CookingProgress.serializer(), progress)))
        val timer = KitchenTimer("timer", "owned", "Rice", 100_000, 3)
        assertEquals(20_000L, timer.deadline - 80_000)
    }
}
