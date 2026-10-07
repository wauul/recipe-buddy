package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import kotlinx.serialization.json.*

@Composable
fun MealNutritionControls(
    state: BuddyState,
    vm: BuddyViewModel,
    date: String = LocalDate.now().toString(),
) {
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        MealDailyNutritionControls(state, vm, date)
    }
}

@Composable
private fun MealDailyNutritionControls(state: BuddyState, vm: BuddyViewModel, date: String) {
    val root = state.meals ?: return
    var person by rememberSaveable { mutableStateOf("") }
    var nutrient by rememberSaveable { mutableStateOf("energyKcal") }
    var minimum by rememberSaveable { mutableStateOf("") }
    var maximum by rememberSaveable { mutableStateOf("") }
    var source by rememberSaveable { mutableStateOf("") }
    var issued by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var review by rememberSaveable { mutableStateOf("") }
    var clinical by rememberSaveable { mutableStateOf(false) }
    var confirmed by rememberSaveable { mutableStateOf(false) }
    var edit by rememberSaveable { mutableStateOf(false) }
    val labels =
        listOf(
            "energyKcal" to mealText("Energy · kcal", "Énergie · kcal"),
            "carbohydrateG" to mealText("Carbohydrate · g", "Glucides · g"),
            "proteinG" to mealText("Protein · g", "Protéines · g"),
            "fatG" to mealText("Fat · g", "Lipides · g"),
            "sodiumG" to "Sodium · g",
            "saltG" to mealText("Salt · g", "Sel · g"),
        )
    val clinicalLabel = mealText("Clinician-prescribed target", "Objectif prescrit")
    val confirmationLabel =
        mealText(
            "My clinician prescribed these exact bounds for this person",
            "Le professionnel a prescrit ces limites exactes pour cette personne",
        )
    val days = root.mealRows("dailyNutrition").filter { it.mealValue("date") == date }
    var viewPerson by
        rememberSaveable(date) {
            mutableStateOf(
                days.firstOrNull()?.mealValue("personId")
                    ?: root.mealRows("profiles").firstOrNull()?.mealValue("id")
                    ?: ""
            )
        }
    MealChoice(
        mealText("Person", "Personne"),
        root.mealRows("profiles").map {
            it.mealValue("id") to it["data"]!!.jsonObject.mealValue("name")
        },
        viewPerson,
        {
            viewPerson = it
            person = it
        },
    )
    var showNotes by rememberSaveable { mutableStateOf(false) }
    KitchenTextButton({ showNotes = !showNotes }) {
        Text(mealText("Sources & limits", "Sources et limites"))
    }
    if (showNotes)
        Text(
            mealText(
                "A single day cannot diagnose deficiency or long-term adequacy. Unknown composition stays unknown. Vitamins and minerals are not assessed. Clinical validation pending. Prescribed targets are user-entered and not verified by Recipe Buddy.",
                "Une journée ne diagnostique ni carence ni équilibre à long terme. Composition inconnue reste inconnue. Vitamines et minéraux non évalués. Validation clinique en attente. Objectifs prescrits saisis par l’utilisateur, non vérifiés par Recipe Buddy.",
            )
        )
    if (days.none { it.mealValue("personId") == viewPerson })
        Text(mealText("No intake recorded", "Aucun apport enregistré"))
    root
        .mealRows("dailyNutrition")
        .filter { it.mealValue("date") == date && it.mealValue("personId") == viewPerson }
        .forEach { day ->
            Text(
                day.mealValue("name") + " · " + day.mealValue("date"),
                style = MaterialTheme.typography.titleSmall,
            )
            val dayConfirmed = day["dayConfirmed"]?.jsonPrimitive?.booleanOrNull == true
            Text(
                if (dayConfirmed) mealText("Day confirmed", "Journée confirmée")
                else mealText("Incomplete", "Incomplète")
            )
            day.mealRows("rows").chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEach { row ->
                        val status =
                            when (row.mealValue("status")) {
                                "below-target" -> mealText("Below target", "Sous l’objectif")
                                "above-target" ->
                                    mealText("Above target", "Au-dessus de l’objectif")
                                "within-target" -> mealText("Within target", "Dans l’objectif")
                                "review-required" -> mealText("Needs review", "À réviser")
                                "incomplete" -> mealText("Incomplete", "Incomplet")
                                else -> mealText("No target", "Aucun objectif")
                            }
                        Column(Modifier.weight(1f).padding(vertical = 8.dp)) {
                            Text(
                                labels.find { it.first == row.mealValue("nutrient") }?.second ?: "",
                                style = MaterialTheme.typography.labelLarge,
                            )
                            Text(
                                row.mealValue("value", mealText("Unknown", "Inconnu")),
                                style = MaterialTheme.typography.titleLarge,
                            )
                            Text(
                                status,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (row["value"] == JsonNull && row["knownSubtotal"] != JsonNull)
                                Text(
                                    mealText("Subtotal: ", "Sous-total : ") +
                                        row.mealValue("knownSubtotal", "—"),
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            if (showNotes)
                                (row["target"] as? JsonObject)?.let { target ->
                                    Text(
                                        target.mealValue("minimum", "—") +
                                            " – " +
                                            target.mealValue("maximum", "—") +
                                            " · " +
                                            target.mealValue("source") +
                                            " · " +
                                            target.mealValue("reviewDate"),
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                        }
                    }
                }
            }
            KitchenOutlinedButton(
                enabled = !state.busy,
                onClick = {
                    vm.mealChange(
                        "daily-coverage",
                        buildJsonObject {
                            put("personId", day.mealValue("personId"))
                            put("date", day.mealValue("date"))
                            put("confirmed", !dayConfirmed)
                        },
                    )
                },
            ) {
                Text(
                    if (dayConfirmed)
                        mealText("Mark day incomplete", "Marquer la journée incomplète")
                    else
                        mealText(
                            "Confirm all food and drinks recorded",
                            "Confirmer tous les aliments et boissons enregistrés",
                        )
                )
            }
        }
    KitchenTextButton(
        onClick = {
            person = viewPerson
            edit = !edit
        }
    ) {
        Text(mealText("Targets", "Objectifs"))
    }
    if (edit) {
        Text(
            mealText(
                "Enter exact bounds and source. Children, pregnancy, breastfeeding and medical conditions require clinician-prescribed targets. No prescriptions or insulin doses are generated.",
                "Saisissez limites et source exactes. Enfants, grossesse, allaitement et pathologies exigent des objectifs prescrits. Aucune prescription ni dose d’insuline générée.",
            )
        )
        val profiles = root.mealRows("profiles")
        val targets =
            (profiles.find { it.mealValue("id") == person }?.get("data") as? JsonObject)?.mealRows(
                "nutritionTargets"
            ) ?: emptyList()
        MealChoice(
            mealText("Person", "Personne"),
            listOf("" to mealText("Choose a person", "Choisir une personne")) +
                profiles.map { it.mealValue("id") to it["data"]!!.jsonObject.mealValue("name") },
            person,
            { person = it },
        )
        targets.forEach { target ->
            Text(
                (labels.find { it.first == target.mealValue("nutrient") }?.second
                    ?: target.mealValue("nutrient")) +
                    " · " +
                    target.mealValue("minimum", "—") +
                    " – " +
                    target.mealValue("maximum", "—") +
                    " · " +
                    target.mealValue("source")
            )
            KitchenTextButton(
                enabled = !state.busy,
                onClick = {
                    vm.mealChange(
                        "nutrition-target",
                        buildJsonObject {
                            put("personId", person)
                            put(
                                "targets",
                                JsonArray(
                                    targets.filter {
                                        it.mealValue("nutrient") != target.mealValue("nutrient")
                                    }
                                ),
                            )
                        },
                    )
                },
            ) {
                Text(mealText("Remove", "Retirer"))
            }
        }
        MealChoice(mealText("Nutrient", "Nutriment"), labels, nutrient, { nutrient = it })
        MealField(mealText("Minimum (optional)", "Minimum (facultatif)"), minimum, { minimum = it })
        MealField(mealText("Maximum (optional)", "Maximum (facultatif)"), maximum, { maximum = it })
        MealField(
            mealText("Source or prescription reference", "Source ou référence de prescription"),
            source,
            { source = it },
        )
        MealField(mealText("Issued date", "Date d’émission"), issued, { issued = it })
        MealField(mealText("Review date", "Date de révision"), review, { review = it })
        Row {
            Checkbox(
                clinical,
                {
                    clinical = it
                    confirmed = false
                },
                modifier = Modifier.semantics { contentDescription = clinicalLabel },
            )
            Text(clinicalLabel)
        }
        if (clinical)
            Row {
                Checkbox(
                    confirmed,
                    { confirmed = it },
                    modifier = Modifier.semantics { contentDescription = confirmationLabel },
                )
                Text(confirmationLabel)
            }
        KitchenButton(
            enabled =
                !state.busy &&
                    person.isNotBlank() &&
                    source.trim().length >= 3 &&
                    review.isNotBlank() &&
                    nutritionBoundsValid(minimum, maximum) &&
                    (!clinical || confirmed),
            onClick = {
                val target = buildJsonObject {
                    put("nutrient", nutrient)
                    put(
                        "minimum",
                        nutritionInputNumber(minimum)?.let { JsonPrimitive(it) } ?: JsonNull,
                    )
                    put(
                        "maximum",
                        nutritionInputNumber(maximum)?.let { JsonPrimitive(it) } ?: JsonNull,
                    )
                    put("kind", if (clinical) "clinician-prescribed" else "personal")
                    put("source", source)
                    put("issued", issued)
                    put("reviewDate", review)
                    put("clinicianConfirmed", confirmed)
                }
                vm.mealChange(
                    "nutrition-target",
                    buildJsonObject {
                        put("personId", person)
                        put(
                            "targets",
                            JsonArray(
                                targets.filter { it.mealValue("nutrient") != nutrient } + target
                            ),
                        )
                    },
                )
            },
        ) {
            Text(mealText("Save target", "Enregistrer l’objectif"))
        }
    }
    root
        .mealRows("nutrition")
        .filter { it.mealValue("date") == date && it.mealValue("personId") == viewPerson }
        .forEach { entry -> MealRecordedPortion(entry, state, vm, labels) }
}

@Composable
private fun MealRecordedPortion(
    entry: JsonObject,
    state: BuddyState,
    vm: BuddyViewModel,
    labels: List<Pair<String, String>>,
) {
    val id = entry.mealValue("id")
    val evidence = entry["nutritionEvidence"] as? JsonObject
    var open by rememberSaveable(id) { mutableStateOf(false) }
    var portion by rememberSaveable(id) { mutableStateOf(evidence?.mealValue("portion") ?: "") }
    var source by rememberSaveable(id) { mutableStateOf(evidence?.mealValue("source") ?: "") }
    var confirmed by rememberSaveable(id) { mutableStateOf(false) }
    var values by
        rememberSaveable(id) {
            mutableStateOf(
                labels.map { (evidence?.get("values") as? JsonObject)?.mealValue(it.first) ?: "" }
            )
        }
    KitchenTextButton(onClick = { open = !open }) {
        Text(entry.mealValue("title") + " · " + mealText("Composition", "Composition"))
    }
    if (open) {
        Text(
            mealText(
                "Copy values for the actual consumed portion from its label or a named composition source. Leave unknown nutrients blank. Scale per-100 g values to the consumed portion. User-entered values are not independently verified.",
                "Recopiez les valeurs de la portion consommée depuis son étiquette ou une source nommée. Laissez les nutriments inconnus vides. Ajustez les valeurs pour 100 g à la portion consommée. Données saisies non vérifiées indépendamment.",
            )
        )
        MealField(
            mealText("Actual consumed portion", "Portion réellement consommée"),
            portion,
            { portion = it },
        )
        MealField(
            mealText("Label or composition source", "Étiquette ou source de composition"),
            source,
            { source = it },
        )
        labels.forEachIndexed { i, label ->
            MealField(
                label.second,
                values[i],
                { value -> values = values.toMutableList().also { it[i] = value } },
            )
        }
        val portionConfirmation =
            mealText(
                "These values describe this actual consumed portion",
                "Ces valeurs décrivent cette portion réellement consommée",
            )
        Row {
            Checkbox(
                confirmed,
                { confirmed = it },
                modifier = Modifier.semantics { contentDescription = portionConfirmation },
            )
            Text(portionConfirmation)
        }
        KitchenButton(
            enabled =
                !state.busy &&
                    confirmed &&
                    portion.isNotBlank() &&
                    source.trim().length >= 3 &&
                    values.all { it.isBlank() || nutritionInputNumber(it) != null },
            onClick = {
                vm.mealChange(
                    "eaten-nutrition",
                    buildJsonObject {
                        put("id", id)
                        put(
                            "evidence",
                            buildJsonObject {
                                put("portion", portion)
                                put("source", source)
                                put("confirmed", true)
                                put(
                                    "values",
                                    buildJsonObject {
                                        labels.forEachIndexed { i, label ->
                                            put(
                                                label.first,
                                                nutritionInputNumber(values[i])?.let {
                                                    JsonPrimitive(it)
                                                } ?: JsonNull,
                                            )
                                        }
                                    },
                                )
                            },
                        )
                    },
                )
            },
        ) {
            Text(mealText("Save composition", "Enregistrer la composition"))
        }
        if (evidence != null)
            KitchenTextButton(
                enabled = !state.busy,
                onClick = {
                    vm.mealChange(
                        "eaten-nutrition",
                        buildJsonObject {
                            put("id", id)
                            put("evidence", JsonNull)
                        },
                    )
                },
            ) {
                Text(mealText("Remove manual composition", "Retirer la composition saisie"))
            }
    }
}
