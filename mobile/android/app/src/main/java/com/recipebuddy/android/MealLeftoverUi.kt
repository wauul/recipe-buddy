package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.util.UUID
import kotlinx.serialization.json.*

@Composable
fun MealLeftoverControls(
    state: BuddyState,
    vm: BuddyViewModel,
    date: String = LocalDate.now().toString(),
) {
    var selected by rememberSaveable { mutableStateOf("") }
    var amount by rememberSaveable { mutableStateOf(1.0) }
    var person by rememberSaveable { mutableStateOf("") }
    var mode by rememberSaveable { mutableStateOf("plan") }
    val recordId = rememberSaveable(selected, mode) { UUID.randomUUID().toString() }
    var savingVersion by rememberSaveable { mutableStateOf("") }
    var slot by rememberSaveable { mutableStateOf("lunch") }
    val leftovers = state.meals?.get("state")?.jsonObject?.mealRows("leftovers") ?: emptyList()
    LaunchedEffect(state.meals?.mealValue("version")) {
        val version = state.meals?.mealValue("version") ?: ""
        val kitchen = state.meals?.get("state") as? JsonObject
        if (
            savingVersion.isNotBlank() &&
                version != savingVersion &&
                kitchen?.mealRows(if (mode == "eat") "eaten" else "plans")?.any {
                    it.mealValue("id") == recordId
                } == true
        ) {
            selected = ""
            savingVersion = ""
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        if (leftovers.isEmpty())
            Text(mealText("No leftovers saved yet.", "Aucun reste enregistré."))
        leftovers.forEach { batch ->
            val id = batch.mealValue("id")
            val remaining = batch["remaining"]!!.jsonPrimitive.double
            KitchenTextButton(
                {
                    selected = if (selected == id) "" else id
                    amount = minOf(1.0, remaining)
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.weight(1f)) {
                    Text(batch.mealValue("title"), style = MaterialTheme.typography.titleMedium)
                    Text(
                        batch.mealValue("remaining") +
                            " " +
                            mealText("servings left", "portions restantes"),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
            if (selected == id) {
                Text(date, style = MaterialTheme.typography.bodyMedium)
                MealChoice(
                    mealText("Use leftovers", "Utiliser les restes"),
                    listOf(
                        "plan" to mealText("Plan", "Prévoir"),
                        "eat" to mealText("Eaten", "Mangé"),
                    ),
                    mode,
                    { mode = it },
                )
                MealChoice(
                    mealText("Meal", "Repas"),
                    listOf("breakfast", "lunch", "dinner", "snack").map { it to mealEnum(it) },
                    slot,
                    { slot = it },
                )
                MealChoice(
                    mealText("For whom?", "Pour qui ?"),
                    listOf("" to mealText("Choose person", "Choisir une personne")) +
                        (state.meals?.mealRows("profiles") ?: emptyList()).map {
                            it.mealValue("id") to it["data"]!!.jsonObject.mealValue("name")
                        },
                    person,
                    { person = it },
                )
                MealPortionStepper(amount, { amount = it.coerceAtMost(remaining) })
                Text(
                    mealText(
                        "Check the batch. Dates cannot certify safety.",
                        "Vérifiez le lot. Les dates ne garantissent pas la sécurité.",
                    ),
                    style = MaterialTheme.typography.bodySmall,
                )
                KitchenButton(
                    {
                        savingVersion = state.meals?.mealValue("version") ?: ""
                        vm.mealChange(
                            if (mode == "eat") "eat" else "plan",
                            buildJsonObject {
                                put("id", recordId)
                                put("leftoverId", id)
                                put("title", batch["title"]!!)
                                put("date", date)
                                put("slot", slot)
                                if (mode == "eat") {
                                    put("personId", person)
                                    put("amount", amount)
                                } else {
                                    put("servings", amount)
                                    put(
                                        "diners",
                                        JsonArray(
                                            if (person.isBlank()) emptyList()
                                            else listOf(JsonPrimitive(person))
                                        ),
                                    )
                                }
                            },
                            mode != "eat",
                        )
                    },
                    enabled =
                        !state.busy &&
                            amount > 0 &&
                            amount <= remaining &&
                            (mode != "eat" || person.isNotBlank()),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        if (mode == "eat") mealText("Save", "Enregistrer")
                        else mealText("Add", "Ajouter")
                    )
                }
                KitchenTextButton(
                    { vm.mealChange("remove-leftover", buildJsonObject { put("id", id) }, false) },
                    enabled = !state.busy,
                ) {
                    Text(mealText("Remove batch", "Retirer le lot"))
                }
            }
        }
    }
}
