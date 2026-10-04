package com.recipebuddy.android

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun IngredientSheet(value: Ingredient, title: Int, action: Int, dismiss: () -> Unit, save: (Ingredient) -> Unit) {
    var edited by remember(value) { mutableStateOf(value) }
    KitchenBottomSheet(onDismissRequest = dismiss) {
        Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(title), style = MaterialTheme.typography.titleLarge)
            Field(edited.name, { edited = edited.copy(name = it) }, R.string.ingredient_name)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Field(edited.quantity, { edited = edited.copy(quantity = it) }, R.string.quantity, Modifier.weight(1f))
                UnitField(edited.unit, { edited = edited.copy(unit = it) }, Modifier.weight(1f))
            }
            SmallNote(stringResource(R.string.pantry_note))
            KitchenButton(onClick = { save(edited.copy(name = edited.name.trim(), quantity = edited.quantity.trim(), unit = edited.unit.trim())) },
                enabled = edited.name.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 44.dp)) { Text(stringResource(action)) }
        }
    }
}

@Composable private fun IngredientRow(ingredient: Ingredient, uncertain: Boolean = false, edit: () -> Unit, remove: () -> Unit) {
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
            Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) { Icon(if (uncertain) Icons.Outlined.HelpOutline else Icons.Outlined.Eco, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary) }
        }
        Column(Modifier.weight(1f).kitchenClickable(onClickLabel = stringResource(R.string.edit), onClick = edit).padding(vertical = 8.dp)) {
            Text(ingredient.name, style = MaterialTheme.typography.titleMedium)
            val amount = "${ingredient.quantity} ${ingredient.unit}".trim()
            if (amount.isNotEmpty()) SmallNote(amount)
            if (uncertain) Text(stringResource(R.string.uncertain), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
        }
        IconButton(onClick = remove) { Icon(Icons.Outlined.Close, stringResource(R.string.remove_ingredient), Modifier.size(20.dp)) }
    }
}

@Composable fun IngredientsScreen(state: BuddyState, vm: BuddyViewModel, open: (Recipe) -> Unit, shopping: () -> Unit) {
    var adding by rememberSaveable { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Int?>(null) }
    var reviewing by remember { mutableStateOf<Int?>(null) }
    var filter by rememberSaveable { mutableStateOf("all") }
    val language = displayLanguage(state)
    val focus = LocalFocusManager.current
    val listState = rememberLazyListState()
    val matches = if (!state.matchCompleted) emptyList() else state.matches.filter { filter == "all" || filter == "found" && it.allFound || filter == "two" && it.missing.size <= 2 }
    LaunchedEffect(state.matchCompleted, state.matches) {
        if (state.matchCompleted) listState.scrollToItem(2 + (if (state.photo != null) 1 else 0) + (if (state.suggestions.isNotEmpty()) 1 else 0))
    }
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f), state = listState, contentPadding = PaddingValues(KitchenGutter, 8.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item { PhotoActions(photo = state.photo, hero = true, onRemove = vm::removePhoto, onPhoto = vm::photo) }
            if (state.photo != null) item { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SmallNote(stringResource(R.string.photo_consent))
                KitchenButton(onClick = { focus.clearFocus(); if(state.me?.pro?.active == true) vm.analyze(language) else vm.showPro() }, enabled = !state.busy) { Icon(Icons.Outlined.AutoAwesome, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.analyze)); ProLabel() }
            } }
            if (state.suggestions.isNotEmpty()) item { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.review_suggestions), style = MaterialTheme.typography.titleLarge)
                SmallNote(stringResource(R.string.review_note))
                state.suggestions.forEachIndexed { index, suggestion -> IngredientRow(Ingredient(suggestion.label, suggestion.quantity, suggestion.unit), suggestion.uncertain,
                    edit = { reviewing = index }, remove = { vm.suggestion(index, null) }) }
                KitchenButton(onClick = vm::confirmSuggestions, enabled = state.suggestions.all { it.label.isNotBlank() }) { Text(stringResource(R.string.confirm_ingredients)) }
            } }
            item { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.your_ingredients), Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                    KitchenTextButton(onClick = { adding = true }) { Icon(Icons.Outlined.Add, null, Modifier.size(18.dp)); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.add_ingredient)) }
                }
                if (state.confirmed.isEmpty()) SmallNote(stringResource(R.string.ingredients_empty))
                state.confirmed.forEachIndexed { index, ingredient -> IngredientRow(ingredient, edit = { editing = index }, remove = { vm.ingredients(state.confirmed.filterIndexed { i, _ -> i != index }) }) }
            } }
            if (state.matchCompleted) item { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(stringResource(R.string.saved_matches), style = MaterialTheme.typography.titleLarge)
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("all" to R.string.all, "found" to R.string.all_found, "two" to R.string.missing_two).forEach { (value, label) -> FilterChip(filter == value, { filter = value }, label = { Text(stringResource(label)) }) }
                }
                if (matches.isEmpty()) Text(stringResource(R.string.no_matches), style = MaterialTheme.typography.bodyMedium)
            } }
            items(matches, key = { it.recipe.id }) { match -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.fillMaxWidth().kitchenClickable { open(match.recipe) }) {
                    RecipePhoto(match.recipe, Modifier.fillMaxWidth().aspectRatio(1.7f))
                    Surface(Modifier.align(Alignment.TopStart).padding(12.dp), shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
                        Text(stringResource(R.string.matched_count, match.matched, match.required), Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.labelLarge)
                    }
                }
                Text(match.recipe.text(match.recipe.title, language), Modifier.kitchenClickable { open(match.recipe) }, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (!match.recipe.owned) SmallNote(stringResource(R.string.shared_by, match.recipe.sharedBy))
                SmallNote(stringResource(if (match.quantityCaveat == "insufficient") R.string.quantity_insufficient else if (match.allFound) R.string.all_found_quantities else R.string.quantity_check))
                if (match.missing.isNotEmpty()) {
                    SmallNote(stringResource(R.string.missing_items, match.missing.joinToString { match.recipe.text(it.name, language) }))
                    KitchenTextButton(onClick = { vm.missingToShopping(match.missing); shopping() }) { Icon(Icons.Outlined.ShoppingBasket, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_missing)) }
                }
            } }
        }
        if (state.confirmed.isNotEmpty()) KitchenActionBar {
            KitchenButton(onClick = { focus.clearFocus(); vm.match() }, enabled = !state.busy && state.confirmed.all { it.name.isNotBlank() },
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Icon(Icons.Outlined.Search, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.find_recipes)) }
        }
    }
    if (adding) IngredientSheet(Ingredient(), R.string.manual_ingredients, R.string.add_ingredient, { adding = false }) { vm.ingredients(state.confirmed + it); adding = false }
    editing?.let { index -> state.confirmed.getOrNull(index)?.let { value -> IngredientSheet(value, R.string.edit, R.string.save, { editing = null }) { edited ->
        vm.ingredients(state.confirmed.mapIndexed { i, ingredient -> if (i == index) edited else ingredient }); editing = null
    } } }
    reviewing?.let { index -> state.suggestions.getOrNull(index)?.let { suggestion -> IngredientSheet(Ingredient(suggestion.label, suggestion.quantity, suggestion.unit), R.string.review_suggestions, R.string.save, { reviewing = null }) {
        vm.suggestion(index, suggestion.copy(label = it.name, quantity = it.quantity, unit = it.unit)); reviewing = null
    } } }
}
