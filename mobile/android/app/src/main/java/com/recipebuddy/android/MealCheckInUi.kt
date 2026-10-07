package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.*

@Composable
fun MealCheckInControls(state: BuddyState, vm: BuddyViewModel) {
    val batches = state.meals?.get("state")?.jsonObject?.mealRows("pantry") ?: emptyList()
    var selected by rememberSaveable { mutableStateOf("") }
    var quantity by rememberSaveable { mutableStateOf("") }
    var estimated by rememberSaveable { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        if (batches.isEmpty()) Text(mealText("Empty stock", "Stock vide"))
        batches
            .sortedBy {
                if (
                    it["quantity"] == JsonNull ||
                        it["quantityEstimated"]?.jsonPrimitive?.booleanOrNull == true
                )
                    0
                else 1
            }
            .forEach { batch ->
                val id = batch.mealValue("id")
                KitchenTextButton(
                    onClick = {
                        selected = if (selected == id) "" else id
                        quantity = batch.mealValue("quantity")
                        estimated = batch["quantityEstimated"]?.jsonPrimitive?.booleanOrNull == true
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Default.Kitchen, null, Modifier.size(22.dp))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(batch.mealValue("name"), style = MaterialTheme.typography.titleMedium)
                        Text(
                            batch.mealValue("quantity", mealText("Unknown", "Inconnu")) +
                                " " +
                                batch.mealValue("unit") +
                                (if (
                                    batch["quantityEstimated"]?.jsonPrimitive?.booleanOrNull == true
                                )
                                    " · " + mealText("Estimated", "Estimé")
                                else ""),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null)
                }
                if (selected == id) {
                    MealField(
                        mealText("Quantity", "Quantité") + " · " + batch.mealValue("unit"),
                        quantity,
                        { quantity = it },
                        KeyboardType.Decimal,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MealVisualChoice(
                            mealText("Exact", "Exact"),
                            Icons.Default.Check,
                            !estimated,
                        ) {
                            estimated = false
                        }
                        MealVisualChoice(
                            mealText("Estimate", "Estimation"),
                            Icons.Default.Adjust,
                            estimated,
                        ) {
                            estimated = true
                        }
                    }
                    KitchenButton(
                        enabled =
                            !state.busy &&
                                quantity.toDoubleOrNull()?.let { it.isFinite() && it >= 0 } == true,
                        onClick = {
                            val previous = batch["quantity"]?.jsonPrimitive?.doubleOrNull
                            vm.mealChange(
                                if (previous == null) "pantry" else "stock",
                                if (previous == null)
                                    JsonObject(
                                        batch +
                                            mapOf(
                                                "quantity" to JsonPrimitive(quantity.toDouble()),
                                                "quantityEstimated" to JsonPrimitive(estimated),
                                            )
                                    )
                                else
                                    buildJsonObject {
                                        put("id", id)
                                        put("delta", quantity.toDouble() - previous)
                                        put("reason", "correction")
                                        put("quantityEstimated", estimated)
                                    },
                                true,
                            )
                        },
                    ) {
                        Icon(Icons.Default.Check, null)
                        Spacer(Modifier.width(8.dp))
                        Text(mealText("Save", "Enregistrer"))
                    }
                }
            }
    }
}
