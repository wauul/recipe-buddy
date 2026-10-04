package com.recipebuddy.android

import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.*
import androidx.compose.ui.text.input.*
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.semantics.*
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.*
import coil.compose.AsyncImage
import java.util.UUID
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.isActive

@Composable fun Heading(text: String) { Text(text, style = MaterialTheme.typography.headlineMedium) }
@Composable fun SmallNote(text: String) { Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
@Composable fun Field(value: String, change: (String) -> Unit, label: Int, modifier: Modifier = Modifier, single: Boolean = true) {
    val numeric = label in listOf(R.string.quantity, R.string.minutes, R.string.servings)
    val limit = when(label) { R.string.recipe_title -> 160; R.string.ingredient_name, R.string.item_name -> 120; R.string.chef_name -> 64; R.string.email -> 254; R.string.recipe_subtitle -> 180; R.string.quantity, R.string.unit -> 40; R.string.instruction_hint -> 2000; else -> 16000 }
    OutlinedTextField(value, { if(it.length <= limit && (!numeric || numericInput(it, label == R.string.servings))) change(it) }, label = { Text(stringResource(label)) }, modifier = modifier.fillMaxWidth(), singleLine = single, minLines = if (single) 1 else 3,
        shape = RoundedCornerShape(16.dp), keyboardOptions = KeyboardOptions(keyboardType = when (label) { R.string.email -> KeyboardType.Email; R.string.servings -> KeyboardType.Number; R.string.minutes, R.string.quantity -> KeyboardType.Decimal; R.string.photo_url, R.string.paste_invite -> KeyboardType.Uri; else -> KeyboardType.Text }, imeAction = if(single) ImeAction.Next else ImeAction.Default), colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow))
}
@Composable fun ErrorNotice(status: Int, retry: () -> Unit, dismiss: () -> Unit, authentication: Boolean = false) {
    val message = when (status) { 0 -> R.string.error_offline; 401 -> if (authentication) R.string.error_credentials else R.string.error_auth; 403 -> R.string.error_denied; 404 -> R.string.error_missing; 409 -> R.string.error_conflict; 410 -> R.string.error_expired; 413 -> R.string.error_size; 429 -> R.string.error_quota; 503 -> R.string.error_setup; 507 -> R.string.error_storage; else -> R.string.error_input }
    Surface(color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
        Column(Modifier.fillMaxWidth().padding(horizontal = KitchenGutter, vertical = 8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(message), Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onErrorContainer)
                IconButton(onClick = dismiss) { Icon(Icons.Default.Close, stringResource(R.string.dismiss), tint = MaterialTheme.colorScheme.onErrorContainer) }
            }
            KitchenTextButton(onClick = retry) { Text(stringResource(R.string.retry)) }
        }
    }
}
@Composable fun LoginScreen(state: BuddyState, vm: BuddyViewModel) {
    var email by rememberSaveable { mutableStateOf("") }; var password by remember { mutableStateOf("") }
    var googleAttempt by rememberSaveable { mutableStateOf(false) }
    var legal by remember { mutableStateOf<String?>(null) }
    var signup by rememberSaveable { mutableStateOf(false) }
    val context = LocalContext.current
    val canSubmit = !state.busy && email.isNotBlank() && password.length >= 8 && (!signup || password.toByteArray().size <= 72)
    fun submit() { if (canSubmit) { googleAttempt = false; if (signup) vm.signup(email.trim(), password) else vm.login(email.trim(), password) } }
    Surface(Modifier.fillMaxSize()) { BoxWithConstraints(Modifier.safeDrawingPadding().imePadding()) {
      val compact = maxHeight < 560.dp
      Column(Modifier.widthIn(max = 440.dp).fillMaxWidth().align(Alignment.TopCenter).verticalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = if (compact) 16.dp else 32.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(Modifier.fillMaxWidth().padding(bottom = if (compact) 8.dp else 20.dp), horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            BuddyLogo(Modifier.testTag("sign-in-logo"), size = if (compact) 64.dp else 80.dp)
            Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineLarge,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Text(stringResource(if (signup) R.string.create_account else R.string.welcome), style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
        KitchenOutlinedButton(onClick = { googleAttempt = true; vm.google(context.findActivity() ?: context) }, enabled = !state.busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), colors = ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Image(painterResource(R.drawable.google_g), null, Modifier.size(20.dp)); Spacer(Modifier.width(12.dp)); Text(stringResource(R.string.google_sign_in))
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant); SmallNote(stringResource(R.string.or_email)); HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant) }
        Field(email, { email = it }, R.string.email)
        var visible by remember { mutableStateOf(false) }
        OutlinedTextField(password, { password = it }, label = { Text(stringResource(R.string.password)) }, visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { submit() }), colors = OutlinedTextFieldDefaults.colors(unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant),
            trailingIcon = { IconButton(onClick = { visible = !visible }) { Icon(if (visible) Icons.Default.VisibilityOff else Icons.Default.Visibility, stringResource(if (visible) R.string.hide_password else R.string.show_password)) } })
        state.error?.let { if (googleAttempt) { SmallNote(stringResource(if (it == 503) R.string.google_setup else R.string.google_error)); KitchenTextButton(onClick = vm::clearError) { Text(stringResource(R.string.dismiss)) } } else ErrorNotice(it, { submit() }, vm::clearError, authentication = true) }
        if (signup) SmallNote(stringResource(R.string.password_rules))
        KitchenButton(onClick = ::submit, enabled = canSubmit, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(if (signup) R.string.create_account else R.string.sign_in)) }
        KitchenTextButton(onClick = { signup = !signup; vm.clearError() }, enabled = !state.busy, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text(stringResource(if (signup) R.string.have_account else R.string.create_account)) }
        FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { KitchenTextButton(onClick = { legal = "terms" }) { Text(stringResource(R.string.terms_of_use)) }; KitchenTextButton(onClick = { legal = "privacy" }) { Text(stringResource(R.string.privacy_policy)) } }
    } } }
    legal?.let { LegalReader(it, displayLanguage(state)) { legal = null } }
}
@Composable fun RecipePhoto(recipe: Recipe, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val dark = MaterialTheme.colorScheme.background.luminance() < 0.5f
    val art = when (recipe.vibe) { "lazy" -> R.drawable.kitchen_lazy; "fancy" -> R.drawable.kitchen_fancy; "chaotic" -> R.drawable.kitchen_chaotic; else -> R.drawable.kitchen_cozy }
    val backdrop = if (dark) when (recipe.vibe) { "lazy" -> Color(0xFF29352B); "fancy" -> Color(0xFF343038); "chaotic" -> Color(0xFF3C3029); else -> Color(0xFF343529) }
        else when (recipe.vibe) { "lazy" -> Color(0xFFE7EDDC); "fancy" -> Color(0xFFEDE5E9); "chaotic" -> Color(0xFFF3E0D1); else -> Color(0xFFF1EBD9) }
    Box(modifier.clip(RoundedCornerShape(24.dp)).border(1.dp, (if (dark) Color.White else Color.Black).copy(alpha = .07f), RoundedCornerShape(24.dp)).background(backdrop), contentAlignment = Alignment.Center) {
        Image(painterResource(art), null, Modifier.fillMaxWidth(0.95f), contentScale = ContentScale.Fit)
        val app = context.applicationContext as BuddyApp
        val account = app.api.session?.userId
        val cached by produceState<String?>(null, account, recipe.id, recipe.imageUrl) {
            if(account != null) app.database.entries().observe(account, "photo").collect { rows ->
                value = rows.firstOrNull { it.id == recipe.id }?.payload?.let { payload ->
                    val data = buddyJson.parseToJsonElement(payload).jsonObject
                    if(data["url"]?.jsonPrimitive?.content == recipe.imageUrl) data["data"]?.jsonPrimitive?.content else null
                }
            }
        }
        if (recipe.imageUrl.isNotBlank()) AsyncImage(model = coil.request.ImageRequest.Builder(context).data(imageSource(cached ?: recipe.imageUrl)).memoryCachePolicy(coil.request.CachePolicy.DISABLED).diskCachePolicy(coil.request.CachePolicy.DISABLED).crossfade(true).build(), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.matchParentSize())
    }
}
@Composable fun CollectionScreen(state: BuddyState, vm: BuddyViewModel, open: (Recipe) -> Unit) {
    var query by rememberSaveable { mutableStateOf(state.query) }
    var filters by rememberSaveable { mutableStateOf(false) }
    val language = displayLanguage(state)
    val focus = LocalFocusManager.current
    val fontScale = androidx.compose.ui.platform.LocalDensity.current.fontScale
    val recipes = state.recipes
    // At larger type, compact rows leave room for names and the reserved action bar.
    LazyVerticalGrid(columns = if (fontScale > 1.3f) GridCells.Fixed(1) else GridCells.Adaptive(156.dp),
        contentPadding = PaddingValues(KitchenGutter, 8.dp, KitchenGutter, if (fontScale > 1.3f) 24.dp else 96.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        if(state.syncProblems.isNotEmpty()) item(span = { GridItemSpan(maxLineSpan) }) { SyncProblemCard(state, vm) }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                KitchenSearch(query, { query = it }, R.string.search_recipes,
                    { vm.search(query, state.vibe); focus.clearFocus() },
                    trailing = { Row {
                      IconButton(onClick = { filters = !filters }) {
                        Icon(Icons.Default.Tune, stringResource(R.string.filters), tint = if (filters || state.vibe.isNotEmpty()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                      }
                      IconButton(onClick = { vm.chooseRecipe(open) }, enabled = !state.busy) { Icon(Icons.Default.Shuffle, stringResource(R.string.choose_for_me)) }
                    } })
                if (filters) FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("", "cozy", "lazy", "fancy", "chaotic").forEach { vibe -> FilterChip(state.vibe == vibe,
                        { vm.search(query, vibe) }, label = { Text(vibeLabel(vibe)) }) }
                    if (query.isNotBlank() || state.vibe.isNotBlank()) KitchenTextButton(onClick = { query = ""; vm.search("", "") }) { Text(stringResource(R.string.clear_search)) }
                }
                state.me?.let { ChefProgressTile(it.chef, it.levels, it.username, it.week, compact = true) }
            }
        }
        if (recipes.isEmpty() && !state.busy && state.me != null) item(span = { GridItemSpan(maxLineSpan) }) {
            KitchenEmpty(R.string.empty_recipes) {
                if (query.isNotBlank() || state.vibe.isNotBlank()) KitchenTextButton(onClick = { query = ""; vm.search("", "") }) { Text(stringResource(R.string.clear_search)) }
            }
        }
        items(recipes, key = { it.id }) { recipe ->
            if (fontScale > 1.3f) RecipeResultRow(recipe, language) { open(recipe) }
            else
            Column(Modifier.clip(RoundedCornerShape(24.dp)).kitchenClickable { open(recipe) }, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Box {
                    RecipePhoto(recipe, Modifier.fillMaxWidth().aspectRatio(.96f))
                    Surface(Modifier.align(Alignment.BottomStart).padding(10.dp), shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = .96f)) {
                        Text(vibeLabel(recipe.vibe), Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.labelMedium)
                    }
                }
                Text(recipe.text(recipe.title, language), Modifier.padding(horizontal = 2.dp), style = MaterialTheme.typography.titleMedium,
                    maxLines = 2, overflow = TextOverflow.Ellipsis)
                Row(Modifier.padding(horizontal = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Icon(Icons.Default.PeopleOutline, null, Modifier.size(15.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(pluralStringResource(R.plurals.servings, recipe.servings, recipe.servings), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        if (state.nextCursor != null) item(span = { GridItemSpan(maxLineSpan) }) {
            KitchenTextButton(onClick = vm::more, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.load_more)) }
        }
    }
}
@Composable fun displayLanguage(state: BuddyState): String = if (state.language == "system") androidx.compose.ui.platform.LocalConfiguration.current.locales[0].language.let { if (it == "fr") "fr" else "en" } else state.language
@Composable fun vibeLabel(vibe: String): String = stringResource(when (vibe) { "cozy" -> R.string.cozy; "lazy" -> R.string.lazy; "fancy" -> R.string.fancy; "chaotic" -> R.string.chaotic; else -> R.string.all })

@Composable fun DetailScreen(state: BuddyState, vm: BuddyViewModel, cook: () -> Unit, edit: () -> Unit, shopping: () -> Unit, community: (Int) -> Unit, kitchen: (String) -> Unit, deleted: () -> Unit) {
    val recipe = state.active
    if (recipe == null) { Box(Modifier.fillMaxSize().padding(20.dp)) { Text(stringResource(if (state.busy) R.string.loading else R.string.error_missing)) }; return }
    val language = displayLanguage(state); val context = LocalContext.current
    var menu by remember { mutableStateOf(false) }; var share by remember { mutableStateOf(false) }; var delete by remember { mutableStateOf(false) }; var widgetHelp by remember { mutableStateOf(false) }; var reporting by remember { mutableStateOf(false) }
    var details by rememberSaveable(recipe.id) { mutableStateOf(false) }
    val owner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    val translating = recipe.translations?.get("pending")?.toString() == "true"
    LaunchedEffect(recipe.id, translating, state.offline, owner) {
        if (translating && !state.offline) owner.lifecycle.repeatOnLifecycle(androidx.lifecycle.Lifecycle.State.RESUMED) {
            while (kotlinx.coroutines.currentCoroutineContext().isActive) {
                vm.refreshRecipe(recipe.id)
                kotlinx.coroutines.delay(10_000)
            }
        }
    }
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(KitchenGutter, 8.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            if (state.me?.roastEnabled == true && recipe.roastLine.isNotBlank()) item(key = "chef-roast") {
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                        Icon(Icons.Default.FormatQuote, null, Modifier.size(28.dp), tint = MaterialTheme.colorScheme.primary)
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(stringResource(R.string.chef_roast), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                            Text(recipe.text(recipe.roastLine, language), style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
            item { RecipePhoto(recipe, Modifier.fillMaxWidth().aspectRatio(if (recipe.imageUrl.isBlank()) 1.8f else 1.25f)) }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.Top) {
                        Text(recipe.text(recipe.title, language), style = MaterialTheme.typography.headlineLarge, modifier = Modifier.weight(1f))
                        if (recipe.owned) {
                            IconButton(onClick = { menu = true }) { Icon(Icons.Default.MoreVert, stringResource(R.string.recipe_actions)) }
                        }
                    }
                    if (recipe.altTitle.isNotBlank()) SmallNote(recipe.text(recipe.altTitle, language))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) { Icon(Icons.Default.LocalDining, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary); SmallNote(pluralStringResource(R.plurals.servings, recipe.servings, recipe.servings)) }
                        SmallNote(vibeLabel(recipe.vibe))
                    }
                    if (!recipe.owned) KitchenTextButton(onClick = { kitchen(recipe.sharedChefId) }, enabled = recipe.sharedChefId.isNotBlank(), contentPadding = PaddingValues(0.dp)) {
                        Icon(Icons.Default.PersonOutline, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.shared_by, recipe.sharedBy))
                    }
                }
            }
            item { SectionTitle(stringResource(R.string.ingredients)) }
            item {
                KitchenPanel {
                    recipe.ingredients.forEachIndexed { index, ingredient ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.Top) {
                            Text(recipe.text(ingredient.name, language), Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                            Text(recipe.text("${ingredient.quantity} ${ingredient.unit}".trim(), language), Modifier.widthIn(max = 120.dp), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        if (index < recipe.ingredients.lastIndex) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = .6f))
                    }
                    KitchenOutlinedButton(onClick = { vm.shoppingFrom(listOf(recipe.id)); shopping() }, enabled = !state.busy, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                        Icon(Icons.Default.ShoppingBasket, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_to_shopping))
                    }
                }
            }
            item { SectionTitle(stringResource(R.string.instructions)) }
            itemsIndexed(recipe.steps) { index, step ->
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(12.dp)) {
                        Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) { Text("${index + 1}", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onPrimaryContainer) }
                    }
                    Text(recipe.text(step, language), Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
                }
            }
            item {
                SectionTitle(stringResource(R.string.recipe_community))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(R.string.aprons_short, R.string.twists_short, R.string.comments).forEachIndexed { index, label ->
                        KitchenOutlinedButton(onClick = { community(index) }) {
                            if (index == 0) ApronIcon(true, Modifier.size(18.dp)) else Icon(if (index == 1) Icons.Default.AutoAwesome else Icons.Default.ChatBubbleOutline, null, Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp)); Text(stringResource(label))
                        }
                    }
                }
            }
            if (recipe.owned) item {
                FilledTonalButton(onClick = { vm.cooked(recipe) }, enabled = !state.busy && recipe.id !in (state.me?.cookedToday ?: emptyList()), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Icon(Icons.Default.Check, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(if (recipe.id in (state.me?.cookedToday ?: emptyList())) R.string.cooked_today else R.string.mark_cooked))
                }
            }
            item {
                KitchenActionRow(R.string.recipe_information, Icons.Default.Info, { details = !details })
                if (details) {
                    if (recipe.owned && translating) SmallNote(stringResource(R.string.languages_pending))
                    if (recipe.updatedAt.isNotBlank()) SmallNote(stringResource(R.string.updated_on, recipe.updatedAt.substringBefore('T')))
                    if (!recipe.owned) { KitchenTextButton(onClick = { kitchen(recipe.sharedChefId) }, enabled = recipe.sharedChefId.isNotBlank()) { Text(stringResource(R.string.view_kitchen)) } }
                    KitchenTextButton(onClick = { reporting = true }) { Icon(Icons.Default.Flag, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.report)) }
                }
            }
        }
        KitchenActionBar {
            KitchenButton(onClick = cook, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
                Icon(Icons.Default.PlayArrow, null, Modifier.size(22.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.start_cooking))
            }
        }
    }
    if (menu) RecipeActionsSheet(recipe, language, state.busy, state.me?.roastEnabled == true,
        dismiss = { menu = false }, edit = { menu = false; edit() }, share = { menu = false; share = true },
        widget = { menu = false; state.account?.let { widgetHelp = !CookingWidget.pin(context, recipe, it) } },
        roast = { menu = false; vm.recipePersonality(recipe, "roast") },
        delete = { menu = false; delete = true })
    if (delete) KitchenAlertDialog(onDismissRequest = { if (!state.busy) delete = false }, title = { Text(stringResource(R.string.delete_recipe)) }, text = { Text(recipe.text(recipe.title, language)) }, confirmButton = { KitchenTextButton(onClick = { vm.delete(recipe) { delete = false; deleted() } }, enabled = !state.busy) { Text(stringResource(R.string.delete)) } }, dismissButton = { KitchenTextButton(onClick = { delete = false }, enabled = !state.busy) { Text(stringResource(R.string.cancel)) } })
    if (widgetHelp) KitchenAlertDialog(onDismissRequest = { widgetHelp = false }, text = { Text(stringResource(R.string.widget_help)) }, confirmButton = { KitchenTextButton(onClick = { widgetHelp = false }) { Text(stringResource(R.string.done)) } })
    if (share) RecipeSharingSheet(recipe, state, vm) { share = false }
    if (reporting) ReportSheet(state, vm, recipeId = recipe.id) { reporting = false }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun ShoppingScreen(state: BuddyState, vm: BuddyViewModel) {
    var name by rememberSaveable { mutableStateOf("") }; var amount by rememberSaveable { mutableStateOf("") }; var removed by remember { mutableStateOf<ShoppingItem?>(null) }
    var editing by remember { mutableStateOf<ShoppingItem?>(null) }; var selected by remember { mutableStateOf<Set<String>>(emptySet()) }; var picking by remember { mutableStateOf(false) }
    var adding by rememberSaveable { mutableStateOf(false) }; var shoppingUnit by rememberSaveable { mutableStateOf("") }
    val context = LocalContext.current
    val language = displayLanguage(state)
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(KitchenGutter, 8.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    KitchenOutlinedButton(onClick = { picking = true }) { Icon(Icons.Default.MenuBook, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.from_recipes)) }
                    Spacer(Modifier.weight(1f))
                    IconButton(onClick = { shareText(context, state.shopping.joinToString("\n") { "${if (it.checked) "✓" else "□"} ${it.name} ${it.amount}" }) }, enabled = state.shopping.isNotEmpty()) { Icon(Icons.Default.Share, stringResource(R.string.share_list)) }
                }
            }
            if (state.shopping.isEmpty()) item { KitchenEmpty(R.string.empty_shopping, R.drawable.kitchen_lazy) }
            if (state.shopping.isNotEmpty()) item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.shopping_remaining, state.shopping.count { !it.checked }), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                    InfoDisclosure(R.string.shopping, R.string.device_local)
                }
            }
            fun shoppingRow(item: ShoppingItem) {
                item(key = item.id) {
                    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
                        Row(Modifier.fillMaxWidth().padding(end = 4.dp).heightIn(min = 68.dp), verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(item.checked, { vm.addShopping(item.copy(checked = it)) })
                            Column(Modifier.weight(1f).kitchenClickable(onClickLabel = stringResource(R.string.edit_item)) { editing = item }.padding(vertical = 12.dp)) {
                                Text(item.name, style = MaterialTheme.typography.titleMedium, color = if (item.checked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                    textDecoration = if (item.checked) androidx.compose.ui.text.style.TextDecoration.LineThrough else null)
                                if (item.amount.isNotEmpty()) SmallNote(item.amount)
                            }
                            IconButton(onClick = { removed = item; vm.deleteShopping(item) }) { Icon(Icons.Default.DeleteOutline, stringResource(R.string.delete_item)) }
                        }
                    }
                }
            }
            state.shopping.filter { !it.checked }.forEach { shoppingRow(it) }
            if (state.shopping.any { it.checked }) item { Text(stringResource(R.string.shopping_checked), Modifier.padding(top = 12.dp), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            state.shopping.filter { it.checked }.forEach { shoppingRow(it) }
            removed?.let { removedItem -> item { Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.item_removed), Modifier.weight(1f)); KitchenTextButton(onClick = { vm.addShopping(removedItem); removed = null }) { Text(stringResource(R.string.undo)) }
            } } }
        }
        KitchenActionBar {
            KitchenButton(onClick = { adding = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
                Icon(Icons.Default.Add, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_item))
            }
        }
    }
    if (adding) KitchenBottomSheet(onDismissRequest = { adding = false }) { Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(KitchenGutter), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(stringResource(R.string.add_item), style = MaterialTheme.typography.titleLarge); Field(name, { name = it }, R.string.item_name); Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { Field(amount, { amount = it }, R.string.quantity, Modifier.weight(1f)); UnitField(shoppingUnit, { shoppingUnit = it }, Modifier.weight(1f)) }
        KitchenButton(onClick = { vm.addShopping(ShoppingItem(UUID.randomUUID().toString(), name.trim(), "$amount $shoppingUnit".trim())); name = ""; amount = ""; shoppingUnit = ""; adding = false }, enabled = name.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.add_item)) }
    } }
    editing?.let { item -> var editName by remember(item.id) { mutableStateOf(item.name) }; var editAmount by remember(item.id) { mutableStateOf(item.amount.substringBefore(" ").takeIf { numericInput(it) } ?: "") }; var editUnit by remember(item.id) { mutableStateOf(if(numericInput(item.amount.substringBefore(" "))) item.amount.substringAfter(" ", "") else item.amount) }
        KitchenAlertDialog(onDismissRequest = { editing = null }, title = { Text(stringResource(R.string.edit_item)) }, text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { Field(editName, { editName = it }, R.string.item_name); Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { Field(editAmount, { editAmount = it }, R.string.quantity, Modifier.weight(1f)); UnitField(editUnit, { editUnit = it }, Modifier.weight(1f)) } } },
            confirmButton = { KitchenTextButton(onClick = { vm.addShopping(item.copy(name = editName.trim(), amount = "$editAmount $editUnit".trim())); editing = null }, enabled = editName.isNotBlank()) { Text(stringResource(R.string.save)) } }, dismissButton = { KitchenTextButton(onClick = { editing = null }) { Text(stringResource(R.string.cancel)) } })
    }
    if (picking) KitchenAlertDialog(onDismissRequest = { picking = false }, title = { Text(stringResource(R.string.from_recipes)) }, text = { Column(Modifier.verticalScroll(rememberScrollState())) { (state.recipes + state.shared).distinctBy { it.id }.forEach { recipe -> Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(recipe.id in selected, { selected = if (it) selected + recipe.id else selected - recipe.id }); Text(recipe.text(recipe.title, language)) } } } }, confirmButton = { KitchenTextButton(onClick = { vm.shoppingFrom(selected.toList()); picking = false }, enabled = selected.isNotEmpty()) { Text(stringResource(R.string.add_to_shopping)) } }, dismissButton = { KitchenTextButton(onClick = { picking = false }) { Text(stringResource(R.string.cancel)) } })
}
fun shareText(context: android.content.Context, text: String) { context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), context.getString(R.string.share))) }

@Composable fun SettingsScreen(state: BuddyState, vm: BuddyViewModel, help: () -> Unit) {
    var name by rememberSaveable(state.me?.username) { mutableStateOf(state.me?.username ?: "") }
    var roast by rememberSaveable(state.me?.roastEnabled) { mutableStateOf(state.me?.roastEnabled ?: false) }
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(KitchenGutter), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                Image(painterResource(R.drawable.chef_hat), null, Modifier.padding(14.dp).size(36.dp))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(state.me?.username ?: "", style = MaterialTheme.typography.headlineSmall)
                SmallNote(state.me?.email ?: "")
            }
        }
        state.me?.let { ChefProgressTile(it.chef, it.levels, it.username, it.week, compact = true) }
        ProProfileCard(state, vm)
        SyncProblemCard(state, vm)
        SectionTitle(stringResource(R.string.profile))
        KitchenPanel {
            Field(name, { name = it }, R.string.chef_name)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f)) { Text(stringResource(R.string.roast_mode), style = MaterialTheme.typography.titleMedium); SmallNote(stringResource(R.string.roast_short_note)) }
                Switch(roast, { roast = it })
            }
            if (name != state.me?.username || roast != state.me?.roastEnabled) KitchenButton(onClick = { vm.settings(name.trim(), roast) },
                enabled = !state.busy && name.isNotBlank(), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.save)) }
        }
        SectionTitle(stringResource(R.string.preferences))
        KitchenPanel {
            Text(stringResource(R.string.theme), style = MaterialTheme.typography.titleMedium)
            KitchenTabs(listOf("system", "light", "dark").indexOf(state.theme), listOf(R.string.system, R.string.light, R.string.dark)) { vm.preference("theme", listOf("system", "light", "dark")[it]) }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Text(stringResource(R.string.language), style = MaterialTheme.typography.titleMedium)
            KitchenTabs(listOf("system", "en", "fr").indexOf(state.language), listOf(R.string.system, R.string.english, R.string.french)) { vm.preference("language", listOf("system", "en", "fr")[it]) }
        }
        SectionTitle(stringResource(R.string.help_and_account))
        Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
            Column {
                KitchenActionRow(R.string.help_title, Icons.Default.HelpOutline, help)
                AccountActions(state, vm)
            }
        }
        if(state.pendingChanges > 0) SmallNote(stringResource(R.string.sync_pending_logout))
        KitchenOutlinedButton(onClick = vm::logout, enabled = !state.busy && state.pendingChanges == 0, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
            Icon(Icons.Default.Logout, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.sign_out))
        }
        SmallNote(stringResource(R.string.logout_data))
    }
}
