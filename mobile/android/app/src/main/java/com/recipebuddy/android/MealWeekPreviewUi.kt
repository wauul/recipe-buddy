package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.*

@Composable
fun MealWeekPreviewControls(state: BuddyState, vm: BuddyViewModel) {
    val plans = state.mealWeekPreview ?: return
    val saved = state.meals?.get("state")?.jsonObject?.mealRows("plans") ?: emptyList()
    var selected by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(saved) {
        plans.forEach { p ->
            val id = p.jsonObject.mealValue("id")
            if (saved.any { it.mealValue("id") == id }) {
                vm.removeWeekPreview(id)
                if (selected == id) selected = ""
            }
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        plans.forEach { raw ->
            val p = raw.jsonObject
            val id = p.mealValue("id")
            KitchenTextButton(
                { selected = if (selected == id) "" else id },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        p.mealValue("date") + " · " + mealEnum(p.mealValue("slot")),
                        style = MaterialTheme.typography.labelMedium,
                    )
                    Text(p.mealValue("title"), style = MaterialTheme.typography.titleMedium)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KitchenButton({ vm.mealChange("plan", p) }, enabled = !state.busy) {
                    Text(mealText("Add", "Ajouter"))
                }
                KitchenTextButton(
                    {
                        vm.removeWeekPreview(id)
                        selected = ""
                    },
                    enabled = !state.busy,
                ) {
                    Text(mealText("Skip", "Ignorer"))
                }
            }
            if (selected == id) {
                MealDateProperty(
                    mealText("Day", "Jour"),
                    p.mealValue("date"),
                    { vm.editWeekPreview(id, "date", JsonPrimitive(it)) },
                )
                MealChoice(
                    mealText("Meal", "Repas"),
                    listOf("breakfast", "lunch", "dinner", "snack").map { it to mealEnum(it) },
                    p.mealValue("slot"),
                    { vm.editWeekPreview(id, "slot", JsonPrimitive(it)) },
                )
                MealPortionStepper(
                    p["servings"]?.jsonPrimitive?.doubleOrNull ?: 2.0,
                    { vm.editWeekPreview(id, "servings", JsonPrimitive(it)) },
                )
            }
        }
        if (plans.isEmpty())
            Text(
                mealText("All suggestions reviewed.", "Toutes les propositions ont été vérifiées.")
            )
        KitchenTextButton(vm::clearWeekPreview) { Text(mealText("Clear", "Effacer")) }
    }
}
