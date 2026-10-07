package com.recipebuddy.android

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun MealDateProperty(
    label: String,
    value: String,
    change: (String) -> Unit,
    optional: Boolean = false,
) {
    var open by rememberSaveable { mutableStateOf(false) }
    KitchenTextButton({ open = true }) {
        Text(label + " · " + value.ifBlank { mealText("Not set", "Non renseignée") })
    }
    if (open) {
        val initial = runCatching { LocalDate.parse(value) }.getOrDefault(LocalDate.now())
        val picker =
            rememberDatePickerState(
                initialSelectedDateMillis =
                    initial.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
            )
        DatePickerDialog(
            onDismissRequest = { open = false },
            confirmButton = {
                KitchenTextButton({
                    picker.selectedDateMillis?.let {
                        change(
                            Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString()
                        )
                    }
                    open = false
                }) {
                    Text(mealText("Done", "Terminer"))
                }
            },
            dismissButton = {
                KitchenTextButton({
                    if (optional) change("")
                    open = false
                }) {
                    Text(
                        if (optional) mealText("Clear", "Effacer")
                        else mealText("Cancel", "Annuler")
                    )
                }
            },
        ) {
            DatePicker(picker)
        }
    }
}
