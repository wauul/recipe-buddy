package com.recipebuddy.android
import org.junit.Assert.*
import org.junit.Test
class CheckInReminderTest {
    @Test fun quietHoursAndOptInTiming() {
        assertFalse(checkInReminderDue("18:00","21:00","08:00","07:00"))
        assertFalse(checkInReminderDue("18:00","21:00","08:00","17:59"))
        assertTrue(checkInReminderDue("18:00","21:00","08:00","18:00"))
        assertFalse(checkInReminderDue("18:00","21:00","08:00","21:00"))
        assertTrue(checkInReminderDue("08:00","12:00","14:00","14:00"))
    }
}
