package com.recipebuddy.android

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.util.UUID
import kotlinx.serialization.json.*

@Composable
fun MealQuickCandidates(
    state: BuddyState,
    vm: BuddyViewModel,
    date: String,
    slot: String,
    diners: List<String>,
    servings: Double,
) {
    var selected by rememberSaveable { mutableStateOf("") }
    state.pantryMatches?.get("candidates")?.jsonArray?.forEach { raw ->
        val c = raw.jsonObject
        val id = c["id"]!!.jsonPrimitive.content
        Column(
            Modifier.fillMaxWidth().padding(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                Modifier.fillMaxWidth().clickable { selected = id },
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    c["title"]!!.jsonPrimitive.content,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                RadioButton(selected == id, { selected = id })
            }
            if (selected == id) {
                val missing = c["missing"]?.jsonArray ?: JsonArray(emptyList())
                if (missing.isNotEmpty())
                    Text(
                        mealText("Missing: ", "Manque : ") +
                            missing.joinToString { it.jsonObject["name"]!!.jsonPrimitive.content },
                        style = MaterialTheme.typography.bodySmall,
                    )
                c["reasons"]
                    ?.jsonArray
                    ?.filter {
                        it.jsonPrimitive.content !in
                            listOf("prices-unavailable", "health-check-precedes-preferences")
                    }
                    ?.forEach {
                        Text(
                            mealReasonText(it.jsonPrimitive.content),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                Text(
                    mealText(
                        "Health suitability: not assessed",
                        "Adéquation médicale : non évaluée",
                    ),
                    style = MaterialTheme.typography.bodySmall,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KitchenTextButton(
                        onClick = { vm.pendingDestination(state.account!!, id, false) }
                    ) {
                        Text(mealText("Recipe", "Recette"))
                    }
                    KitchenButton(
                        onClick = {
                            vm.mealChange(
                                "plan",
                                buildJsonObject {
                                    put("id", UUID.randomUUID().toString())
                                    put("recipeId", id)
                                    put("recipeVersion", c["recipeVersion"] ?: JsonPrimitive(""))
                                    put("suggested", true)
                                    put("title", c["title"]!!)
                                    put("date", date)
                                    put("slot", slot)
                                    put("servings", servings)
                                    put("diners", JsonArray(diners.map(::JsonPrimitive)))
                                },
                            )
                        },
                        enabled = !state.busy,
                    ) {
                        Text(mealText("Add", "Ajouter"))
                    }
                }
            }
            HorizontalDivider()
        }
    }
}
