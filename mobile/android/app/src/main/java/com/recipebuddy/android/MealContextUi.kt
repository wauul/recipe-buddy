package com.recipebuddy.android

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MealContextControls(state: BuddyState, vm: BuddyViewModel, date: String) {
    val root = state.meals ?: return
    val existing =
        root["state"]!!.jsonObject.mealRows("contexts").firstOrNull {
            it.mealValue("date") == date && it.mealValue("actorId") == root.mealValue("actorId")
        }
    val previous =
        root["state"]!!
            .jsonObject
            .mealRows("contexts")
            .filter {
                it.mealValue("date") < date && it.mealValue("actorId") == root.mealValue("actorId")
            }
            .maxByOrNull { it.mealValue("date") }
    var time by
        rememberSaveable(date) {
            mutableStateOf(existing?.mealValue("timeMinutes", "")?.toIntOrNull())
        }
    var equipment by
        rememberSaveable(date) {
            mutableStateOf(
                (existing ?: previous)?.get("equipment")?.jsonArray?.map {
                    it.jsonPrimitive.content
                } ?: emptyList<String>()
            )
        }
    var day by rememberSaveable(date) { mutableStateOf(existing?.mealValue("dayType") ?: "work") }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text(mealText("Day", "Journée"), style = MaterialTheme.typography.labelLarge)
        MealVisualGrid(
            listOf(
                Triple("work", mealText("Work", "Travail"), Icons.Default.WorkOutline),
                Triple("rest", mealText("Rest", "Repos"), Icons.Default.Weekend),
                Triple("gym", mealText("Gym", "Sport"), Icons.Default.FitnessCenter),
                Triple("flexible", mealText("Flexible", "Souple"), Icons.Default.AutoAwesome),
            ),
            selected = { it == day },
            onClick = { day = it },
        )
        Text(mealText("Minutes", "Minutes"), style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            (listOf(15, 30, 45, 60) + listOfNotNull(time).filter { it !in listOf(15, 30, 45, 60) })
                .forEach { value ->
                    FilterChip(
                        selected = time == value,
                        onClick = { time = if (time == value) null else value },
                        label = { Text(value.toString()) },
                        modifier = Modifier.heightIn(min = 48.dp),
                    )
                }
        }
        Text(mealText("Kitchen", "Cuisine"), style = MaterialTheme.typography.labelLarge)
        MealVisualGrid(
            listOf(
                Triple("stove", mealText("Stove", "Plaques"), Icons.Default.SoupKitchen),
                Triple("oven", mealText("Oven", "Four"), Icons.Default.LocalFireDepartment),
                Triple("microwave", mealText("Microwave", "Micro-ondes"), Icons.Default.Microwave),
            ) +
                equipment
                    .filter { it !in listOf("stove", "oven", "microwave") }
                    .map { Triple(it, it, Icons.Default.Kitchen) },
            selected = { it in equipment },
            onClick = { equipment = if (it in equipment) equipment - it else equipment + it },
        )
        KitchenButton(
            enabled = !state.busy,
            onClick = {
                vm.mealChange(
                    "context",
                    buildJsonObject {
                        put("date", date)
                        put("timeMinutes", time?.let(::JsonPrimitive) ?: JsonNull)
                        put("equipment", JsonArray(equipment.map(::JsonPrimitive)))
                        put("dayType", day)
                        put("appetite", existing?.mealValue("appetite") ?: "unknown")
                        put("mealSize", existing?.mealValue("mealSize") ?: "unknown")
                    },
                )
            },
        ) {
            Icon(Icons.Default.Check, null)
            Spacer(Modifier.width(8.dp))
            Text(mealText("Save", "Enregistrer"))
        }
    }
}

@Composable
internal fun MealVisualGrid(
    choices: List<Triple<String, String, ImageVector>>,
    selected: (String) -> Boolean,
    onClick: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        choices.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { (id, label, icon) ->
                    val isSelected = selected(id)
                    OutlinedCard(
                        onClick = { onClick(id) },
                        modifier = Modifier.weight(1f).semantics { this.selected = isSelected },
                        colors =
                            CardDefaults.outlinedCardColors(
                                containerColor =
                                    if (isSelected) MaterialTheme.colorScheme.secondaryContainer
                                    else MaterialTheme.colorScheme.surface
                            ),
                        border =
                            BorderStroke(
                                1.dp,
                                if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.outlineVariant,
                            ),
                    ) {
                        Column(
                            Modifier.fillMaxWidth().heightIn(min = 88.dp).padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement =
                                Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
                        ) {
                            Icon(
                                icon,
                                null,
                                Modifier.size(24.dp),
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Text(label, style = MaterialTheme.typography.labelLarge)
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
internal fun MealVisualChoice(
    label: String,
    icon: ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        leadingIcon = { Icon(icon, null, Modifier.size(20.dp)) },
        modifier = Modifier.heightIn(min = 48.dp),
    )
}

@Composable
internal fun MealMinuteStepper(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    maximum: Int = 1440,
) {
    val minutes = value.toIntOrNull() ?: 0
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            IconButton(
                onClick = { onChange((minutes - 5).coerceAtLeast(0).toString()) },
                enabled = minutes > 0,
            ) {
                Icon(Icons.Default.Remove, mealText("Less", "Moins") + " · " + label)
            }
            Text("$minutes min")
            IconButton(
                onClick = { onChange((minutes + 5).coerceAtMost(maximum).toString()) },
                enabled = minutes < maximum,
            ) {
                Icon(Icons.Default.Add, mealText("More", "Plus") + " · " + label)
            }
        }
    }
}
