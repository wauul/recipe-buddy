package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import kotlinx.serialization.json.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MealRescueControls(state: BuddyState, vm: BuddyViewModel, from: String) {
    val response = state.mealRescue
    val proposals = response?.mealRows("proposals") ?: emptyList()
    var selected by rememberSaveable { mutableStateOf(listOf<String>()) }
    var objective by rememberSaveable { mutableStateOf("") }
    var editing by rememberSaveable { mutableStateOf("") }
    val to = runCatching { LocalDate.parse(from).plusDays(6).toString() }.getOrDefault(from)
    LaunchedEffect(from) { vm.previewMealRescue(from, to) }
    LaunchedEffect(proposals.map { it.mealValue("token") }) {
        selected =
            proposals.flatMap { p ->
                p.mealRows("changes").map { it["after"]!!.jsonObject.mealValue("id") }
            }
    }
    val proposal =
        proposals.find { it.mealValue("objective") == objective } ?: proposals.firstOrNull()
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            FlowRow(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                proposals.forEach { option ->
                    val key = option.mealValue("objective")
                    val label =
                        when (key) {
                            "Use on-hand food" -> mealText("Stock", "Stock")
                            "Reduce additional groceries" -> mealText("Groceries", "Courses")
                            else -> mealText("Time", "Temps")
                        }
                    val icon =
                        when (key) {
                            "Use on-hand food" -> Icons.Default.Kitchen
                            "Reduce additional groceries" -> Icons.Default.ShoppingBasket
                            else -> Icons.Default.Timer
                        }
                    MealVisualChoice(label, icon, proposal?.mealValue("objective") == key) {
                        objective = key
                        editing = ""
                    }
                }
            }
            IconButton(onClick = { vm.previewMealRescue(from, to) }, enabled = !state.busy) {
                Icon(Icons.Default.Refresh, mealText("Refresh", "Actualiser"))
            }
        }
        if (state.busy) CircularProgressIndicator(Modifier.size(24.dp))
        else if (response != null && proposal == null)
            Text(mealText("No changes available", "Aucun changement disponible"))
        if (proposal != null && !state.busy) {
            proposal.mealRows("changes").forEach { change ->
                val before = change["before"]!!.jsonObject
                val after = change["after"]!!.jsonObject
                val id = after.mealValue("id")
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        id in selected,
                        { selected = if (it) selected + id else selected - id },
                    )
                    Column(Modifier.weight(1f)) {
                        Text(
                            before.mealValue("date") + " · " + mealEnum(before.mealValue("slot")),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            before.mealValue("title"),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(after.mealValue("title"), style = MaterialTheme.typography.titleMedium)
                    }
                    IconButton(onClick = { editing = if (editing == id) "" else id }) {
                        Icon(
                            Icons.Default.Edit,
                            mealText("Edit", "Modifier") + " · " + after.mealValue("title"),
                        )
                    }
                }
                if (editing == id) {
                    MealDateProperty(
                        mealText("Day", "Jour"),
                        after.mealValue("date"),
                        {
                            vm.editMealRescue(
                                proposal.mealValue("objective"),
                                id,
                                "date",
                                JsonPrimitive(it),
                            )
                        },
                    )
                    MealPortionStepper(
                        after.mealValue("servings").toDoubleOrNull() ?: 1.0,
                        {
                            vm.editMealRescue(
                                proposal.mealValue("objective"),
                                id,
                                "servings",
                                JsonPrimitive(it),
                            )
                        },
                    )
                    MealChoice(
                        mealText("Meal", "Repas"),
                        listOf(
                            "breakfast" to mealText("Breakfast", "Petit-déjeuner"),
                            "lunch" to mealText("Lunch", "Déjeuner"),
                            "dinner" to mealText("Dinner", "Dîner"),
                            "snack" to mealText("Snack", "Collation"),
                        ),
                        after.mealValue("slot"),
                        {
                            vm.editMealRescue(
                                proposal.mealValue("objective"),
                                id,
                                "slot",
                                JsonPrimitive(it),
                            )
                        },
                    )
                    change["reasons"]?.jsonArray?.forEach {
                        Text(
                            mealReasonText(it.jsonPrimitive.content),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
                HorizontalDivider()
            }
            val reviewCount = proposal["preparationReview"]!!.jsonArray.size
            if (reviewCount > 0)
                Text(
                    mealText("Tasks", "Tâches") + " · " + reviewCount,
                    style = MaterialTheme.typography.labelMedium,
                )
            Text(
                mealText("Groceries", "Courses") +
                    " · " +
                    proposal["previousShopping"]!!.jsonObject.mealRows("needs").size +
                    " → " +
                    proposal["shopping"]!!.jsonObject.mealRows("needs").size,
                style = MaterialTheme.typography.labelMedium,
            )
            proposal["shopping"]!!.jsonObject.mealRows("needs").forEach { need ->
                Text(
                    need.mealValue("name") +
                        " · " +
                        need.mealValue("quantity", mealText("Unknown", "Inconnu")) +
                        " " +
                        need.mealValue("unit"),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            val needsReview =
                response?.get("edited")?.jsonPrimitive?.booleanOrNull == true ||
                    proposal.mealRows("changes").any {
                        it["after"]!!.jsonObject.mealValue("id") !in selected
                    }
            val hasSelection =
                proposal.mealRows("changes").any {
                    it["after"]!!.jsonObject.mealValue("id") in selected
                }
            if (needsReview)
                KitchenOutlinedButton(
                    enabled = hasSelection,
                    onClick = { vm.reviewEditedRescue(proposal, selected, from, to) },
                ) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text(mealText("Update preview", "Actualiser"))
                }
            KitchenButton(
                enabled = hasSelection && !needsReview,
                onClick = {
                    vm.mealChange(
                        "accept-rescue",
                        buildJsonObject {
                            put("token", proposal["token"]!!)
                            put(
                                "selected",
                                JsonArray(
                                    proposal
                                        .mealRows("changes")
                                        .map { it["after"]!!.jsonObject.mealValue("id") }
                                        .filter { it in selected }
                                        .map(::JsonPrimitive)
                                ),
                            )
                        },
                    )
                },
            ) {
                Icon(Icons.Default.Check, null)
                Spacer(Modifier.width(8.dp))
                Text(mealText("Apply", "Appliquer"))
            }
        }
        state.meals
            ?.get("state")
            ?.jsonObject
            ?.mealRows("rescues")
            ?.filter { it["undone"]?.jsonPrimitive?.booleanOrNull != true }
            ?.forEach { rescue ->
                KitchenTextButton(
                    enabled = !state.busy,
                    onClick = {
                        vm.mealChange(
                            "undo-rescue",
                            buildJsonObject { put("id", rescue.mealValue("id")) },
                        )
                    },
                ) {
                    Text(mealText("Undo", "Annuler"))
                }
            }
    }
}
