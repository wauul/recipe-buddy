package com.recipebuddy.android

import java.time.LocalDate
import org.junit.Assert.*
import org.junit.Test

class MealCalendarTest {
    @Test
    fun weekStartsOnMondayAcrossYearBoundary() {
        assertEquals(LocalDate.parse("2025-12-29"), agendaWeekStart(LocalDate.parse("2026-01-01")))
    }

    @Test
    fun sundayBelongsToPreviousMonday() {
        assertEquals(LocalDate.parse("2026-10-05"), agendaWeekStart(LocalDate.parse("2026-10-11")))
    }

    @Test
    fun leapDayIsPreserved() {
        val days = agendaDays(agendaWeekStart(LocalDate.parse("2028-02-29")))
        assertEquals(7, days.size)
        assertTrue(days.contains(LocalDate.parse("2028-02-29")))
        assertEquals(LocalDate.parse("2028-03-05"), days.last())
    }

    @Test
    fun daylightSavingDoesNotSkipDays() {
        val days = agendaDays(LocalDate.parse("2026-10-19"))
        assertEquals(LocalDate.parse("2026-10-25"), days.last())
        assertEquals(7, days.distinct().size)
    }
}
