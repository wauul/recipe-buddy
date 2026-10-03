package com.recipebuddy.android

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.selection.selectable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.res.*
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.*
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

@Composable fun ApronIcon(filled: Boolean, modifier: Modifier = Modifier) {
    Icon(painterResource(if (filled) R.drawable.apron_filled else R.drawable.apron), null, modifier, tint = if (filled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline)
}

@Composable fun ApronRow(rating: Int, change: ((Int) -> Unit)? = null, enabled: Boolean = true) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        (1..5).forEach { number ->
            if (change != null) {
                val label = stringResource(R.string.aprons_value, number)
                Box(Modifier.size(48.dp).selectable(rating == number, enabled = enabled, role = Role.RadioButton, onClick = { change(number) }).semantics { contentDescription = label }, contentAlignment = Alignment.Center) { ApronIcon(number <= rating, Modifier.size(30.dp)) }
            } else ApronIcon(number <= rating, Modifier.size(20.dp))
        }
    }
}

@Composable private fun ReadContribution(state: BuddyState, language: String, text: String) {
    Text(state.contentTranslations["$language|$text"] ?: text, style = MaterialTheme.typography.bodyLarge)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun CommunityScreen(state: BuddyState, vm: BuddyViewModel, initialTab: Int = 0) {
    val recipe = state.active ?: return
    val language = displayLanguage(state)
    val data = state.community?.takeIf { it.recipeId == recipe.id }
    var tab by rememberSaveable(recipe.id) { mutableIntStateOf(initialTab.coerceIn(0, 2)) }
    var adding by rememberSaveable { mutableStateOf(false) }
    var reviewing by rememberSaveable { mutableStateOf(false) }
    var replying by rememberSaveable { mutableStateOf(false) }
    var replyId by rememberSaveable { mutableStateOf<String?>(null) }
    var expanded by rememberSaveable { mutableStateOf<Set<String>>(emptySet()) }
    var deleting by remember { mutableStateOf<Pair<String, String>?>(null) }
    var deleteReview by remember { mutableStateOf(false) }
    LaunchedEffect(recipe.id) { vm.community(recipe) }
    val owner = LocalLifecycleOwner.current
    LaunchedEffect(recipe.id, tab, owner, state.offline) {
        if(!state.offline) owner.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            while(isActive) { vm.refreshCommunity(recipe); delay(30_000) }
        }
    }
    fun canRemove(author: String) = author == state.account || data?.discussion?.ownerId == state.account
    LazyColumn(contentPadding = PaddingValues(KitchenGutter, 8.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { RecipePhoto(recipe, Modifier.size(56.dp)); Text(recipe.text(recipe.title, language), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium) } }
        item { KitchenTabs(tab, listOf(R.string.aprons_short, R.string.twists_short, R.string.comments)) { tab = it } }
        if (data == null) item { SmallNote(stringResource(if (state.busy) R.string.loading else R.string.community_unavailable)); if (!state.busy) TextButton(onClick = { vm.community(recipe) }) { Text(stringResource(R.string.retry)) } }
        if (data != null) {
            item { SmallNote(stringResource(R.string.contribution_privacy)) }
            val texts = data.discussion.takes.flatMap { listOf(it.title, it.change, it.reason, it.ingredient) } + data.discussion.comments.map { it.text } + data.reviews.reviews.map { it.text }
            if (texts.any { it.isNotBlank() }) item { TextButton(onClick = { vm.translateContent(language, texts) }, enabled = !state.busy) { Icon(Icons.Outlined.Translate, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.translate_conversation)) } }
            if (tab == 0) {
                val rows = data.reviews.reviews
                val own = rows.firstOrNull { it.authorId == state.account }
                item { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ApronIcon(true, Modifier.size(36.dp))
                    Column(Modifier.weight(1f)) { Text(if (rows.isEmpty()) stringResource(R.string.no_reviews) else stringResource(R.string.apron_average, rows.map { it.rating }.average()), style = MaterialTheme.typography.headlineSmall); SmallNote(stringResource(R.string.review_count, rows.size)) }
                } }
                if (recipe.owned) item { SmallNote(stringResource(R.string.no_self_review)) }
                else item { Button(onClick = { reviewing = true }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(if (own == null) R.string.rate_recipe else R.string.update_review)) }; if (own != null) TextButton(onClick = { deleteReview = true }, enabled = !state.busy) { Text(stringResource(R.string.remove_review)) } }
                items(rows, key = { it.id }) { row -> Surface(color = MaterialTheme.colorScheme.surfaceContainerLow, shape = RoundedCornerShape(24.dp)) { Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(row.chefName, style = MaterialTheme.typography.titleSmall); ApronRow(row.rating); if (row.text.isNotBlank()) ReadContribution(state, language, row.text); SmallNote(row.updatedAt.substringBefore('T'))
                } } }
            }
            if (tab == 1) {
                item { Button(onClick = { adding = true }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.Add, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_twist)) } }
                if (data.discussion.takes.isEmpty()) item { Image(painterResource(R.drawable.kitchen_fancy), null, Modifier.fillMaxWidth().height(140.dp)); SmallNote(stringResource(R.string.no_twists)) }
                items(data.discussion.takes, key = { it.id }) { take -> Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) { Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { SmallNote(stringResource(twistTypeLabel(take.type))); Text(state.contentTranslations["$language|${take.title}"] ?: take.title, style = MaterialTheme.typography.titleMedium) }; if (canRemove(take.authorId)) IconButton(onClick = { deleting = "take" to take.id }, enabled = !state.busy) { Icon(Icons.Outlined.DeleteOutline, stringResource(R.string.delete_twist)) } }
                    SmallNote(take.authorName + " · " + take.createdAt.substringBefore('T'))
                    if (take.ingredient.isNotBlank()) AssistChip(onClick = {}, label = { Text(recipe.text(take.ingredient, language)) }, enabled = false)
                    ReadContribution(state, language, take.change)
                    if (take.reason.isNotBlank()) { Text(stringResource(R.string.why_twist), style = MaterialTheme.typography.labelLarge); ReadContribution(state, language, take.reason) }
                    val comments = data.discussion.comments.filter { it.takeId == take.id }
                    TextButton(onClick = { expanded = if (take.id in expanded) expanded - take.id else expanded + take.id }) { Icon(Icons.Outlined.ChatBubbleOutline, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.comment_count, comments.size)) }
                    if (take.id in expanded) {
                        comments.forEach { comment -> CommentRow(comment, state, language, canRemove(comment.authorId)) { deleting = "comment" to comment.id } }
                        TextButton(onClick = { replyId = take.id; replying = true }, enabled = !state.busy) { Text(stringResource(R.string.reply_twist)) }
                    }
                } } }
            }
            if (tab == 2) {
                item { Button(onClick = { replyId = null; replying = true }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.ChatBubbleOutline, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_comment)) } }
                val rows = data.discussion.comments.filter { it.takeId == null }
                if (rows.isEmpty()) item { SmallNote(stringResource(R.string.no_comments)) }
                items(rows, key = { it.id }) { comment -> Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) { Column(Modifier.padding(16.dp)) { CommentRow(comment, state, language, canRemove(comment.authorId)) { deleting = "comment" to comment.id } } } }
            }
        }
    }
    if (adding) TwistSheet(recipe, state, vm) { adding = false }
    if (replying) { var text by rememberSaveable { mutableStateOf("") }
        KitchenBottomSheet(onDismissRequest = { if (!state.busy) replying = false }) { Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(if (replyId == null) R.string.add_comment else R.string.reply_twist), style = MaterialTheme.typography.titleLarge)
            Field(text, { if (it.length <= 2000) text = it }, R.string.comment_text, single = false)
            Button(onClick = { vm.contribution(recipe, buildJsonObject { put("kind", "comment"); put("text", text.trim()); put("takeId", replyId?.let(::JsonPrimitive) ?: JsonNull) }, done = { replying = false }) }, enabled = !state.busy && text.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.post_comment)) }
            SmallNote(stringResource(R.string.contribution_privacy)); state.error?.let { ErrorNotice(it, vm::clearError, vm::clearError) }
        } }
    }
    if (reviewing) { val own = data?.reviews?.reviews?.firstOrNull { it.authorId == state.account }; var rating by rememberSaveable { mutableIntStateOf(own?.rating ?: 0) }; var note by rememberSaveable { mutableStateOf(own?.text ?: "") }
        KitchenBottomSheet(onDismissRequest = { if (!state.busy) reviewing = false }) { Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.rate_recipe), style = MaterialTheme.typography.titleLarge); ApronRow(rating, { rating = it }, !state.busy); SmallNote(stringResource(R.string.apron_hint))
            Field(note, { if (it.length <= 1000) note = it }, R.string.apron_review_note, single = false)
            Button(onClick = { vm.review(recipe, rating, note.trim(), done = { reviewing = false }) }, enabled = !state.busy && rating in 1..5, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.save_review)) }
            state.error?.let { ErrorNotice(it, vm::clearError, vm::clearError) }
        } }
    }
    deleting?.let { target -> KitchenAlertDialog(onDismissRequest = { if (!state.busy) deleting = null }, title = { Text(stringResource(R.string.remove_contribution)) }, text = { Text(stringResource(if (target.first == "take") R.string.twist_delete_note else R.string.comment_delete_note)) }, confirmButton = { TextButton(onClick = { vm.contribution(recipe, buildJsonObject { put("kind", target.first); put("id", target.second) }, remove = true) { deleting = null } }, enabled = !state.busy) { Text(stringResource(R.string.delete)) } }, dismissButton = { TextButton(onClick = { deleting = null }, enabled = !state.busy) { Text(stringResource(R.string.cancel)) } }) }
    if (deleteReview) KitchenAlertDialog(onDismissRequest = { deleteReview = false }, title = { Text(stringResource(R.string.remove_review)) }, text = { Text(stringResource(R.string.review_delete_note)) }, confirmButton = { TextButton(onClick = { vm.review(recipe, 0, "", remove = true) { deleteReview = false } }, enabled = !state.busy) { Text(stringResource(R.string.delete)) } }, dismissButton = { TextButton(onClick = { deleteReview = false }) { Text(stringResource(R.string.cancel)) } })
}

@Composable private fun CommentRow(comment: RecipeComment, state: BuddyState, language: String, removable: Boolean, remove: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) { Row(verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text(comment.authorName, style = MaterialTheme.typography.titleSmall); SmallNote(comment.createdAt.substringBefore('T')) }; if (removable) IconButton(onClick = remove, enabled = !state.busy) { Icon(Icons.Outlined.DeleteOutline, stringResource(R.string.delete_comment)) } }; ReadContribution(state, language, comment.text) }
}

val twistTypes = listOf("new_ingredient", "ingredient_swap", "quantity", "cooking_time", "technique", "equipment", "serving", "other")
fun twistTypeLabel(type: String) = when (type) { "new_ingredient" -> R.string.twist_new_ingredient; "ingredient_swap" -> R.string.twist_swap; "quantity" -> R.string.twist_quantity; "cooking_time" -> R.string.twist_time; "technique" -> R.string.twist_technique; "equipment" -> R.string.twist_equipment; "serving" -> R.string.twist_serving; else -> R.string.twist_other }

@OptIn(ExperimentalMaterial3Api::class)
@Composable private fun TwistSheet(recipe: Recipe, state: BuddyState, vm: BuddyViewModel, done: () -> Unit) {
    var type by rememberSaveable { mutableStateOf("other") }; var title by rememberSaveable { mutableStateOf("") }; var change by rememberSaveable { mutableStateOf("") }; var ingredient by rememberSaveable { mutableStateOf("") }; var reason by rememberSaveable { mutableStateOf("") }
    var choosing by remember { mutableStateOf(false) }; var choosingIngredient by remember { mutableStateOf(false) }
    val language = displayLanguage(state)
    KitchenBottomSheet(onDismissRequest = { if (!state.busy) done() }) { Column(Modifier.fillMaxWidth().heightIn(max = 640.dp).imePadding().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(stringResource(R.string.add_twist), style = MaterialTheme.typography.titleLarge)
        Box { OutlinedButton(onClick = { choosing = true }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(twistTypeLabel(type))); Spacer(Modifier.weight(1f)); Icon(Icons.Outlined.ExpandMore, null) }; DropdownMenu(choosing, { choosing = false }) { twistTypes.forEach { value -> DropdownMenuItem(text = { Text(stringResource(twistTypeLabel(value))) }, onClick = { type = value; choosing = false }) } } }
        Field(title, { if (it.length <= 120) title = it }, R.string.twist_title)
        Field(change, { if (it.length <= 2000) change = it }, R.string.twist_change, single = false)
        Box { OutlinedButton(onClick = { choosingIngredient = true }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text(if (ingredient.isEmpty()) stringResource(R.string.whole_recipe) else recipe.text(ingredient, language)); Spacer(Modifier.weight(1f)); Icon(Icons.Outlined.ExpandMore, null) }; DropdownMenu(choosingIngredient, { choosingIngredient = false }) { (listOf("") + recipe.ingredients.map { it.name }.distinct()).forEach { value -> DropdownMenuItem(text = { Text(if (value.isEmpty()) stringResource(R.string.whole_recipe) else recipe.text(value, language)) }, onClick = { ingredient = value; choosingIngredient = false }) } } }
        Field(reason, { if (it.length <= 2000) reason = it }, R.string.twist_reason, single = false)
        SmallNote(stringResource(R.string.twist_original))
        Button(onClick = { vm.contribution(recipe, buildJsonObject { put("kind", "take"); put("type", type); put("title", title.trim()); put("change", change.trim()); put("ingredient", ingredient); put("reason", reason.trim()) }, done = done) }, enabled = !state.busy && title.isNotBlank() && change.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.save_twist)) }
        state.error?.let { ErrorNotice(it, vm::clearError, vm::clearError) }
    } }
}
