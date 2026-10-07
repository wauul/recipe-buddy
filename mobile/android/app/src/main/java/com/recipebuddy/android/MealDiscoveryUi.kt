package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MealDiscoveryControls(
    state: BuddyState,
    vm: BuddyViewModel,
    diners: List<String>,
    servings: Double,
    date: String,
) {
    val uri = LocalUriHandler.current
    var selected by rememberSaveable { mutableStateOf(listOf<String>()) }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        run {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (state.meals?.get("state") as? JsonObject)
                    ?.mealRows("pantry")
                    ?.map { it.mealValue("name") }
                    ?.distinct()
                    ?.forEach { name ->
                        FilterChip(
                            selected.contains(name),
                            {
                                selected =
                                    if (name in selected) selected - name else selected + name
                            },
                            label = { Text(name) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        )
                    }
            }
            KitchenOutlinedButton(
                onClick = { vm.pantryMatches(selected, diners, servings) },
                enabled = selected.isNotEmpty() && !state.busy,
            ) {
                Text(mealText("Refresh ideas", "Actualiser les idées"))
            }
            MealQuickCandidates(state, vm, date, "dinner", diners, servings)
            Text(
                mealText(
                    "Search shares ingredient names and country only.",
                    "Seuls ingrédients et pays sont transmis au fournisseur.",
                )
            )
            KitchenOutlinedButton(
                onClick = { vm.discoverMeals(selected, diners, servings) },
                enabled = selected.isNotEmpty() && !state.busy,
            ) {
                Text(mealText("Explore · Pro", "Explorer · Pro"))
            }
            state.mealDiscovery?.get("candidates")?.jsonArray?.forEach { raw ->
                val c = raw.jsonObject
                Text(
                    c["title"]!!.jsonPrimitive.content,
                    style = MaterialTheme.typography.titleLarge,
                )
                Text(c["source"]!!.jsonObject["publisher"]!!.jsonPrimitive.content)
                Text(
                    mealText(
                        "Health suitability is not established",
                        "L’adéquation médicale n’est pas établie",
                    )
                )
                KitchenButton(
                    onClick = { vm.importMealCandidate(c["token"]!!.jsonPrimitive.content) },
                    enabled = !state.busy,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(mealText("Import this recipe", "Importer cette recette"))
                }
            }
            if (
                state.mealDiscovery != null &&
                    state.mealDiscovery["candidates"]!!.jsonArray.size < 3
            )
                Text(
                    mealText(
                        "Fewer than three eligible importable recipes were found.",
                        "Moins de trois recettes admissibles et importables ont été trouvées.",
                    )
                )
            state.mealDiscovery?.mealRows("reviewSources")?.forEach { s ->
                Text(
                    mealText(
                        "Incomplete recipe · manual review",
                        "Recette incomplète · vérification manuelle",
                    )
                )
                Text(
                    mealText(
                        "Quantities, servings or instructions are missing. Open the source and enter a complete recipe manually after review. No eligibility or import approved.",
                        "Quantités, portions ou instructions manquantes. Ouvrez la source puis saisissez une recette complète après vérification. Aucun import ni admissibilité approuvé.",
                    )
                )
                TextButton(onClick = { uri.openUri(s.mealValue("url")) }) {
                    Text(s.mealValue("publisher"))
                }
            }
        }
    }
}
