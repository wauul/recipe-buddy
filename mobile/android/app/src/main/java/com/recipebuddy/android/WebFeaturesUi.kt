package com.recipebuddy.android

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.*
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

fun chefBadge(level: Int) = when (level) { 2 -> R.drawable.chef_badge_2; 3 -> R.drawable.chef_badge_3; 4 -> R.drawable.chef_badge_4; 5 -> R.drawable.chef_badge_5; 6 -> R.drawable.chef_badge_6; 7 -> R.drawable.chef_badge_7; else -> R.drawable.chef_badge_1 }
fun chefDescription(level: Int) = when (level) { 2 -> R.string.chef_description_2; 3 -> R.string.chef_description_3; 4 -> R.string.chef_description_4; 5 -> R.string.chef_description_5; 6 -> R.string.chef_description_6; 7 -> R.string.chef_description_7; else -> R.string.chef_description_1 }
@Composable fun levelName(level: ChefLevel): String = stringResource(when (level.level) { 2 -> R.string.level_whisk; 3 -> R.string.level_pan; 4 -> R.string.level_sauce; 5 -> R.string.level_flavor; 6 -> R.string.level_feast; 7 -> R.string.level_legend; else -> R.string.level_toast })

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun ChefProgressTile(chef: Chef, levels: List<ChefLevel>, name: String, week: Week? = null, compact: Boolean = false) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    Surface(onClick = { expanded = true }, shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Image(painterResource(chefBadge(chef.current.level)), null, Modifier.size(if (compact) 44.dp else 56.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(levelName(chef.current), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Text(stringResource(R.string.chef_points, chef.points), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    if (compact) LinearProgressIndicator(progress = { chef.progress.coerceIn(0, 100) / 100f }, modifier = Modifier.fillMaxWidth().height(4.dp), trackColor = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = .12f))
                }
                Icon(Icons.Outlined.ChevronRight, stringResource(R.string.chef_progress_badges), tint = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            if (!compact) {
                LinearProgressIndicator(progress = { chef.progress.coerceIn(0, 100) / 100f }, modifier = Modifier.fillMaxWidth())
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    SmallNote(stringResource(R.string.recipe_count, chef.recipeCount)); Spacer(Modifier.weight(1f)); ApronIcon(true, Modifier.size(18.dp)); Spacer(Modifier.width(4.dp)); SmallNote(stringResource(R.string.aprons_received, chef.receivedAprons))
                }
                if (week != null) WeekStrip(week)
            }
        }
    }
    if (expanded) KitchenBottomSheet(onDismissRequest = { expanded = false }) {
        LazyColumn(Modifier.testTag("chef-roadmap"), contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { Image(painterResource(chefBadge(chef.current.level)), null, Modifier.size(80.dp)); Column { Text(name, style = MaterialTheme.typography.titleLarge); Text(levelName(chef.current), style = MaterialTheme.typography.titleMedium); SmallNote(stringResource(R.string.chef_points, chef.points)) } } }
            item { SmallNote(if (chef.next != null) stringResource(R.string.points_to_level, chef.pointsToNext, levelName(chef.next)) else stringResource(R.string.apron_legend_reached)); LinearProgressIndicator(progress = { chef.progress / 100f }, modifier = Modifier.fillMaxWidth()) }
            item { Text(stringResource(R.string.score_rule), style = MaterialTheme.typography.bodyLarge); SmallNote(stringResource(R.string.score_recalculated)); if (chef.averageAprons != null) SmallNote(stringResource(R.string.apron_average, chef.averageAprons)); SmallNote(stringResource(R.string.review_count, chef.reviewCount)) }
            if (week != null) item { WeekStrip(week) }
            item { Text(stringResource(R.string.seven_levels), style = MaterialTheme.typography.titleLarge) }
            items(levels, key = { it.level }) { level -> Row(Modifier.fillMaxWidth().heightIn(min = 72.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Image(painterResource(chefBadge(level.level)), null, Modifier.size(56.dp)); Column(Modifier.weight(1f)) { Text(levelName(level), style = MaterialTheme.typography.titleMedium); SmallNote(stringResource(R.string.chef_points, level.points)); SmallNote(stringResource(chefDescription(level.level))) }; if (level.level <= chef.current.level) Icon(Icons.Outlined.CheckCircle, stringResource(R.string.level_earned), tint = MaterialTheme.colorScheme.primary) else Icon(Icons.Outlined.Lock, stringResource(R.string.level_locked), tint = MaterialTheme.colorScheme.outline)
            } }
        }
    }
}

@Composable fun WeekStrip(week: Week) {
    val labels = listOf(R.string.day_mon, R.string.day_tue, R.string.day_wed, R.string.day_thu, R.string.day_fri, R.string.day_sat, R.string.day_sun)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { labels.forEachIndexed { index, label -> Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) { Icon(if (week.days.getOrElse(index) { false }) Icons.Outlined.CheckCircle else Icons.Outlined.RadioButtonUnchecked, stringResource(if (week.days.getOrElse(index) { false }) R.string.day_cooked else R.string.day_not_cooked), Modifier.size(20.dp), tint = if (week.days.getOrElse(index) { false }) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline); Text(stringResource(label), style = MaterialTheme.typography.labelSmall) } } }
        SmallNote(stringResource(R.string.week_utc, week.count))
    }
}

@Composable fun ChefKitchenScreen(state: BuddyState, vm: BuddyViewModel, chefId: String, open: (Recipe) -> Unit) {
    val language = displayLanguage(state)
    LaunchedEffect(chefId) { vm.chef(chefId) }
    val profile = state.chefProfile?.takeIf { it.id == chefId }
    LazyColumn(contentPadding = PaddingValues(KitchenGutter), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        if (profile == null) item { SmallNote(stringResource(if (state.busy) R.string.loading else R.string.error_missing)); if (!state.busy) KitchenTextButton(onClick = { vm.chef(chefId) }) { Text(stringResource(R.string.retry)) } }
        if (profile != null) {
            item { Text(stringResource(R.string.chef_kitchen_name, profile.username), style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.height(12.dp)); ChefProgressTile(profile.chef, state.me?.levels ?: emptyList(), profile.username) }
            item { Text(stringResource(R.string.shared_recipes), style = MaterialTheme.typography.titleLarge); SmallNote(stringResource(R.string.friend_kitchen_privacy)) }
            if (profile.recipes.isEmpty()) item { Image(painterResource(R.drawable.kitchen_cozy), null, Modifier.fillMaxWidth().height(180.dp)); SmallNote(stringResource(R.string.empty_shared)) }
            items(profile.recipes, key = { it.id }) { recipe -> RecipeResultRow(recipe, language) { open(recipe) } }
        }
    }
}

@Composable fun RecipeResultRow(recipe: Recipe, language: String, open: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).kitchenClickable(onClick = open).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        RecipePhoto(recipe, Modifier.size(80.dp)); Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) { Text(recipe.text(recipe.title, language), style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis); SmallNote(if (recipe.owned) vibeLabel(recipe.vibe) else stringResource(R.string.shared_by, recipe.sharedBy)) }; Icon(Icons.Outlined.ChevronRight, null)
    }
}

@Composable fun helpAnswers(language: String): List<HelpAnswer> {
    val context = LocalContext.current
    return remember(language) { context.assets.open("help-$language.json").bufferedReader().use { buddyJson.decodeFromString<List<HelpAnswer>>(it.readText()) } }
}

@Composable fun HelpScreen(state: BuddyState) {
    val answers = helpAnswers(displayLanguage(state)); var expanded by rememberSaveable { mutableStateOf<Set<Int>>(emptySet()) }; val context = LocalContext.current
    LazyColumn(contentPadding = PaddingValues(KitchenGutter), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { RecipePhoto(Recipe(vibe = "cozy"), Modifier.fillMaxWidth().height(160.dp)) }
        items(answers.size) { index -> val row = answers[index]; Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) { Column(Modifier.fillMaxWidth().padding(16.dp)) { Row(Modifier.fillMaxWidth().kitchenClickable { expanded = if (index in expanded) expanded - index else expanded + index }.heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) { Text(row.question, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium); Icon(if (index in expanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, null) }; if (index in expanded) { Spacer(Modifier.height(12.dp)); Text(row.answer) } } } }
        item { KitchenOutlinedButton(onClick = { context.startActivity(android.content.Intent(android.content.Intent.ACTION_SENDTO, android.net.Uri.parse("mailto:waelfezari@gmail.com"))) }) { Text(stringResource(R.string.contact_support)) } }
        item { KitchenOutlinedButton(onClick = {
            val sample = "Tomato toast\nServes 1\nIngredients: 1 slice bread, 1 tomato, salt to taste\nSteps: Toast bread. Slice tomato. Put tomato on toast and season."
            context.getSystemService(android.content.ClipboardManager::class.java).setPrimaryClip(android.content.ClipData.newPlainText("Recipe Buddy", sample))
            android.widget.Toast.makeText(context, context.getString(R.string.example_copied), android.widget.Toast.LENGTH_SHORT).show()
        }) { Icon(Icons.Outlined.ContentCopy, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.copy_example)) } }
    }
}

@Composable fun SearchScreen(state: BuddyState, vm: BuddyViewModel, open: (Recipe) -> Unit, page: (Int) -> Unit) {
    val language = displayLanguage(state); val help = helpAnswers(language)
    var query by rememberSaveable { mutableStateOf("") }; var submitted by rememberSaveable { mutableStateOf("") }
    var expanded by rememberSaveable { mutableStateOf<Set<String>>(emptySet()) }
    val pages = listOf(R.string.recipes, R.string.shopping, R.string.friends, R.string.settings, R.string.help_title)
    val context = LocalContext.current; val focus = LocalFocusManager.current
    val term = submitted.lowercase(); val answers = if (term.isBlank()) emptyList() else help.filter { (it.question + " " + it.answer).lowercase().contains(term) }
    LaunchedEffect(Unit) { vm.resetGlobalSearch() }
    val destinations = if (term.isBlank()) emptyList() else pages.filter { context.getString(it).lowercase().contains(term) }
    fun submit() { submitted = query.trim(); if (submitted.isNotEmpty()) vm.globalSearch(submitted) else vm.resetGlobalSearch(); focus.clearFocus() }
    LazyColumn(contentPadding = PaddingValues(KitchenGutter), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        item { KitchenSearch(query, { if (it.length <= 100) query = it }, R.string.global_search_hint, ::submit) }
        if (submitted.isBlank()) item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SmallNote(stringResource(R.string.global_search_description))
                pages.forEach { destination -> KitchenActionRow(destination, when (destination) {
                    R.string.shopping -> Icons.Outlined.ShoppingBasket; R.string.friends -> Icons.Outlined.People;
                    R.string.settings -> Icons.Outlined.Settings; R.string.help_title -> Icons.Outlined.HelpOutline; else -> Icons.Outlined.MenuBook
                }, { page(destination) }) }
            }
        }
        if (state.searchCompleted && submitted.isNotBlank()) item { SectionTitle(stringResource(R.string.result_count, state.searchResults.size + answers.size + destinations.size)) }
        if (state.searchCompleted && submitted.isNotBlank() && state.searchResults.isEmpty() && answers.isEmpty() && destinations.isEmpty()) item { KitchenEmpty(R.string.no_search_results, R.drawable.kitchen_lazy) }
        items(state.searchResults, key = { it.id }) { recipe -> RecipeResultRow(recipe, language) { open(recipe) } }
        items(answers) { answer -> KitchenPanel {
            Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).kitchenClickable { expanded = if (answer.question in expanded) expanded - answer.question else expanded + answer.question }, verticalAlignment = Alignment.CenterVertically) {
                Text(answer.question, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                Icon(if (answer.question in expanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, null)
            }
            if (answer.question in expanded) Text(answer.answer)
        } }
        items(destinations) { destination -> KitchenActionRow(destination, Icons.Outlined.Search, { page(destination) }) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun RecipeSharingSheet(recipe: Recipe, state: BuddyState, vm: BuddyViewModel, done: () -> Unit) {
    var revoke by remember { mutableStateOf<Friend?>(null) }
    LaunchedEffect(recipe.id) { vm.recipients(recipe) }
    KitchenBottomSheet(onDismissRequest = done) {
        LazyColumn(contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text(stringResource(R.string.share_recipe), style = MaterialTheme.typography.titleLarge); SmallNote(stringResource(R.string.friends_privacy)) }
            if (state.friends.none { it.status == "accepted" }) item { SmallNote(stringResource(R.string.no_friends)) }
            if (state.recipients == null) item { SmallNote(stringResource(if (state.busy) R.string.loading else R.string.error_offline)); if (!state.busy) KitchenTextButton(onClick = { vm.recipients(recipe) }) { Text(stringResource(R.string.retry)) } }
            items(state.friends.filter { it.status == "accepted" }, key = { it.id }) { friend -> val shared = state.recipients?.any { it.recipientId == friend.friend.id } == true
                ListItem(headlineContent = { Text(friend.friend.username) }, supportingContent = { Text(stringResource(if (shared) R.string.can_view_recipe else R.string.not_shared)) }, trailingContent = { KitchenTextButton(onClick = { if (shared) revoke = friend else vm.toggleShare(recipe, friend.friend.id, true) {} }, enabled = !state.busy && state.recipients != null) { Text(stringResource(if (shared) R.string.revoke else R.string.share)) } })
            }
            state.error?.let { item { ErrorNotice(it, vm::clearError, vm::clearError) } }
        }
    }
    revoke?.let { friend -> KitchenAlertDialog(onDismissRequest = { revoke = null }, title = { Text(stringResource(R.string.stop_sharing)) }, text = { Text(stringResource(R.string.stop_sharing_note, friend.friend.username)) }, confirmButton = { KitchenTextButton(onClick = { vm.toggleShare(recipe, friend.friend.id, false) { revoke = null } }, enabled = !state.busy) { Text(stringResource(R.string.revoke)) } }, dismissButton = { KitchenTextButton(onClick = { revoke = null }) { Text(stringResource(R.string.cancel)) } }) }
}
