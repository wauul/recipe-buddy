package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

fun numericInput(value: String, integer: Boolean = false): Boolean =
    (if (integer) Regex("^[0-9]{0,6}$") else Regex("^[0-9]{0,6}([.,][0-9]{0,4})?$" )).matches(value)
fun ingredientKey(value: String): String {
    val clean = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD).replace(Regex("\\p{M}"), "").replace("œ", "oe").lowercase()
        .replace(Regex("\\((optional|facultatif|facultative)\\)"), "").replace(Regex("['’]"), " ").trim().replace(Regex("\\s+"), " ")
    return mapOf("tomatoes" to "tomato", "tomate" to "tomato", "tomates" to "tomato", "eggs" to "egg", "oeuf" to "egg", "oeufs" to "egg", "riz" to "rice", "onions" to "onion", "oignon" to "onion", "oignons" to "onion", "ail" to "garlic", "carotte" to "carrot", "carottes" to "carrot", "carrots" to "carrot", "lait" to "milk", "farine" to "flour", "sel" to "salt", "eau" to "water", "huile" to "oil", "huile d olive" to "olive oil", "courgette" to "zucchini", "courgettes" to "zucchini", "poivron" to "pepper", "poivrons" to "pepper", "bell peppers" to "pepper", "bell pepper" to "pepper")[clean] ?: clean
}
fun localRecipeMatches(recipes: List<Recipe>, available: List<Ingredient>): List<RecipeMatch> = recipes.map { recipe ->
    val inventory = available.groupBy { ingredientKey(it.name) }
    val required = recipe.ingredients.filter { !Regex("\\((optional|facultatif|facultative)\\)", RegexOption.IGNORE_CASE).containsMatchIn(it.name) }
    val missing = required.filter { ingredientKey(it.name) !in inventory }
    var unknown = false; var insufficient = false
    required.filter { ingredientKey(it.name) in inventory }.groupBy { ingredientKey(it.name) to it.unit.lowercase().trim() }.forEach { (key, need) ->
        val amounts = inventory.getValue(key.first).filter { it.unit.lowercase().trim() == key.second }.map { quantityValue(it.quantity) }
        val needs = need.map { quantityValue(it.quantity) }
        if(amounts.isEmpty() || amounts.any { it == null } || needs.any { it == null }) unknown = true
        else if(amounts.sumOf { it!! } < needs.sumOf { it!! }) insufficient = true
    }
    RecipeMatch(recipe, required.size - missing.size, required.size, missing, if(insufficient) "insufficient" else if(unknown) "unknown" else "check", missing.isEmpty())
}.sortedWith(compareBy<RecipeMatch> { it.missing.size }.thenByDescending { it.matched.toDouble() / it.required.coerceAtLeast(1) }.thenBy { it.recipe.id })

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun UnitField(value: String, change: (String) -> Unit, modifier: Modifier = Modifier) {
    var expanded by remember { mutableStateOf(false) }
    var custom by remember { mutableStateOf(value.isNotBlank() && value !in listOf("g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "pinch")) }
    val units = listOf("", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "pinch")
    val fr = androidx.compose.ui.platform.LocalConfiguration.current.locales[0].language == "fr"
    fun label(unit: String) = when(unit) { "" -> if (fr) "Aucune" else "None"; "tsp" -> if (fr) "c. à café" else "tsp"; "tbsp" -> if (fr) "c. à soupe" else "tbsp"; "cup" -> if(fr) "tasse" else "cup"; "piece" -> if(fr) "pièce" else "piece"; "pinch" -> if(fr) "pincée" else "pinch"; else -> unit }
    Column(modifier) {
        ExposedDropdownMenuBox(expanded, { expanded = !expanded }) {
            OutlinedTextField(if (custom) stringResource(R.string.custom_unit) else label(value), {}, readOnly = true,
                label = { Text(stringResource(R.string.unit)) }, trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable), shape = RoundedCornerShape(16.dp))
            ExposedDropdownMenu(expanded, { expanded = false }) {
                units.forEach { unit -> DropdownMenuItem(text = { Text(label(unit)) }, onClick = { custom = false; change(unit); expanded = false }) }
                DropdownMenuItem(text = { Text(stringResource(R.string.custom_unit)) }, onClick = { custom = true; if(value in units) change(""); expanded = false })
            }
        }
        if (custom) OutlinedTextField(value, { if(it.length <= 40) change(it) }, label = { Text(stringResource(R.string.custom_unit)) },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp), singleLine = true, shape = RoundedCornerShape(16.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text))
    }
}
