package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.util.UUID
import kotlinx.serialization.json.*

@Composable
internal fun MealPersonComposer(
    state: BuddyState,
    vm: BuddyViewModel,
    profile: JsonObject?,
    onSaved: (String) -> Unit,
) {
    val data = profile?.get("data") as? JsonObject
    fun value(key: String, default: String = "") =
        (data?.get(key) as? JsonPrimitive)?.contentOrNull ?: default
    fun flag(key: String) = (data?.get(key) as? JsonPrimitive)?.booleanOrNull == true
    fun names(key: String) =
        (data?.get(key) as? JsonArray)?.joinToString(", ") { it.jsonPrimitive.content } ?: ""
    val id = profile?.get("id")?.jsonPrimitive?.content
    var name by rememberSaveable(id) { mutableStateOf(value("name")) }
    var age by rememberSaveable(id) { mutableStateOf(value("ageBand", "adult")) }
    var country by rememberSaveable(id) { mutableStateOf(value("country", "FR")) }
    var consent by rememberSaveable(id) { mutableStateOf(flag("consent")) }
    var caregiver by rememberSaveable(id) { mutableStateOf(flag("caregiverAuthorized")) }
    var allergies by rememberSaveable(id) { mutableStateOf(names("allergies")) }
    var intolerances by rememberSaveable(id) { mutableStateOf(names("intolerances")) }
    var dislikes by rememberSaveable(id) { mutableStateOf(names("dislikes")) }
    var equipment by rememberSaveable(id) { mutableStateOf(value("equipment")) }
    var routine by rememberSaveable(id) { mutableStateOf(value("routine")) }
    var conditions by rememberSaveable(id) { mutableStateOf(value("otherConditions")) }
    var instructions by rememberSaveable(id) { mutableStateOf(value("clinicianInstructions")) }
    var diabetes by rememberSaveable(id) { mutableStateOf(value("diabetes", "none")) }
    var coeliac by rememberSaveable(id) { mutableStateOf(flag("coeliac")) }
    var pregnancy by rememberSaveable(id) { mutableStateOf(flag("pregnancy")) }
    var breastfeeding by rememberSaveable(id) { mutableStateOf(flag("breastfeeding")) }
    var expanded by rememberSaveable(id) { mutableStateOf("") }
    var delete by rememberSaveable(id) { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        MealField(mealText("Name", "Prénom"), name, { name = it })
        MealChoice(
            mealText("Age group", "Tranche d’âge"),
            listOf(
                "adult" to mealText("Adult", "Adulte"),
                "child" to mealText("5–17 years", "5–17 ans"),
                "under5" to mealText("Under 5", "Moins de 5 ans"),
                "infant" to mealText("Infant", "Nourrisson"),
            ),
            age,
            { age = it },
        )
        if (age == "infant" || age == "under5")
            Text(
                mealText(
                    "Nutrition planning for this age needs professional review.",
                    "La nutrition à cet âge nécessite un avis professionnel.",
                ),
                style = MaterialTheme.typography.bodyMedium,
            )
        KitchenTextButton({ expanded = if (expanded == "preferences") "" else "preferences" }) {
            Text(mealText("Food preferences", "Préférences alimentaires"))
        }
        if (expanded == "preferences") {
            MealField(
                mealText("Disliked ingredients", "Ingrédients non appréciés"),
                dislikes,
                { dislikes = it },
            )
            MealField(mealText("Equipment", "Équipement"), equipment, { equipment = it })
            MealField(mealText("Routine", "Organisation"), routine, { routine = it })
        }
        KitchenTextButton({ expanded = if (expanded == "health") "" else "health" }) {
            Text(mealText("Restrictions & care", "Restrictions et suivi"))
        }
        if (expanded == "health") {
            Text(
                mealText(
                    "Private to you. Restriction checks are not a medical clearance.",
                    "Visible uniquement par vous. Ces vérifications ne sont pas un avis médical.",
                ),
                style = MaterialTheme.typography.bodyMedium,
            )
            MealField(
                mealText("Allergies (comma separated)", "Allergies (séparées par des virgules)"),
                allergies,
                { allergies = it },
            )
            MealField(mealText("Intolerances", "Intolérances"), intolerances, { intolerances = it })
            MealPersonToggle(
                mealText("Coeliac disease", "Maladie cœliaque"),
                coeliac,
                { coeliac = it },
            )
            MealPersonToggle(mealText("Pregnancy", "Grossesse"), pregnancy, { pregnancy = it })
            MealPersonToggle(
                mealText("Breastfeeding", "Allaitement"),
                breastfeeding,
                { breastfeeding = it },
            )
            MealChoice(
                mealText("Diabetes", "Diabète"),
                listOf(
                    "none" to mealText("None", "Aucun"),
                    "type1" to "Type 1",
                    "type2" to "Type 2",
                    "gestational" to mealText("Gestational", "Gestationnel"),
                    "preexisting-pregnancy" to
                        mealText("Predating pregnancy", "Antérieur à la grossesse"),
                ),
                diabetes,
                { diabetes = it },
            )
            MealField(
                mealText("Clinician instructions", "Instructions médicales"),
                instructions,
                { instructions = it },
            )
            MealField(
                mealText("Other conditions", "Autres situations"),
                conditions,
                { conditions = it },
            )
            MealField(
                mealText("Guidance country code", "Code pays des recommandations"),
                country,
                { country = it },
            )
        }
        if (age != "adult")
            MealPersonToggle(
                mealText(
                    "I’m authorized to manage this child’s profile",
                    "Je suis autorisé à gérer ce profil enfant",
                ),
                caregiver,
                { caregiver = it },
            )
        MealPersonToggle(
            mealText("Allow private restriction checks", "Autoriser les vérifications privées"),
            consent,
            { consent = it },
        )
        Text(
            mealText(
                "Health details stay private and are not sent to AI or friends. Delete this profile to withdraw consent.",
                "Ces informations restent privées, sans envoi à l’IA ni aux amis. Supprimez le profil pour retirer l’accord.",
            ),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        KitchenButton(
            {
                val newId = id ?: UUID.randomUUID().toString()
                onSaved(newId)
                vm.mealChange(
                    "profile",
                    buildJsonObject {
                        data?.forEach { (key, value) -> put(key, value) }
                        put("id", newId)
                        put("name", name)
                        put("ageBand", age)
                        put("country", country)
                        put("consent", true)
                        put("caregiverAuthorized", caregiver)
                        fun named(key: String, value: String) {
                            put(
                                key,
                                JsonArray(
                                    value
                                        .split(',')
                                        .map { it.trim() }
                                        .filter { it.isNotBlank() }
                                        .map(::JsonPrimitive)
                                ),
                            )
                        }
                        named("allergies", allergies)
                        named("intolerances", intolerances)
                        named("dislikes", dislikes)
                        put("equipment", equipment)
                        put("routine", routine)
                        put("otherConditions", conditions)
                        put("clinicianInstructions", instructions)
                        put("diabetes", diabetes)
                        put("coeliac", coeliac)
                        put("pregnancy", pregnancy)
                        put("breastfeeding", breastfeeding)
                    },
                )
            },
            enabled = !state.busy && consent && name.isNotBlank() && (age == "adult" || caregiver),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(mealText("Save person", "Enregistrer la personne"))
        }
        if (id != null) {
            KitchenTextButton({ delete = true }) {
                Text(
                    mealText("Delete private profile", "Supprimer le profil privé"),
                    color = MaterialTheme.colorScheme.error,
                )
            }
            if (delete)
                KitchenAlertDialog(
                    onDismissRequest = { delete = false },
                    title = { Text(mealText("Delete this profile?", "Supprimer ce profil ?")) },
                    text = {
                        Text(
                            mealText(
                                "Its private eating history is also deleted.",
                                "Son historique privé de repas est aussi supprimé.",
                            )
                        )
                    },
                    confirmButton = {
                        KitchenTextButton(
                            {
                                vm.mealChange("delete-profile", buildJsonObject { put("id", id) })
                                delete = false
                            },
                            enabled = !state.busy,
                        ) {
                            Text(
                                mealText(
                                    "Delete profile & history",
                                    "Supprimer le profil et l’historique",
                                )
                            )
                        }
                    },
                    dismissButton = {
                        KitchenTextButton({ delete = false }) {
                            Text(mealText("Cancel", "Annuler"))
                        }
                    },
                )
        }
    }
}

@Composable
private fun MealPersonToggle(label: String, value: Boolean, change: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
        Switch(value, change)
    }
}
