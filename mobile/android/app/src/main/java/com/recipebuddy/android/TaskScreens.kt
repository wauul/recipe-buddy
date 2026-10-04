package com.recipebuddy.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.app.AlarmManager
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.unit.*
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.*
import java.io.File

@Composable fun EditorScreen(state: BuddyState, vm: BuddyViewModel, done: () -> Unit) {
    val draft = state.draft; var import by rememberSaveable { mutableStateOf(state.pendingImport ?: "") }; var savedBefore by rememberSaveable { mutableIntStateOf(state.saved) }
    var importExpanded by rememberSaveable { mutableStateOf(state.pendingImport != null) }
    var imageLink by rememberSaveable { mutableStateOf(false) }
    var discard by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(state.saved) { if (state.saved > savedBefore) { savedBefore = state.saved; done() } }
    var servings by rememberSaveable(draft.servings) { mutableStateOf(draft.servings.toString()) }
    var subtitle by rememberSaveable(draft.id) { mutableStateOf(draft.altTitle.isNotBlank()) }
    Column(Modifier.fillMaxSize()) {
        Column(Modifier.weight(1f).imePadding().verticalScroll(rememberScrollState()).padding(KitchenGutter), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            KitchenActionRow(R.string.import_option, Icons.Default.Link, { importExpanded = !importExpanded })
            if (importExpanded) KitchenPanel {
                Field(import, { import = it }, R.string.import_text, single = false)
                SmallNote(stringResource(R.string.import_consent))
                KitchenOutlinedButton(onClick = { vm.importText(import) }, enabled = !state.busy && import.length >= 10, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.parse_recipe)) }
            }
            Field(draft.title, { vm.updateDraft(draft.copy(title = it)) }, R.string.recipe_title)
            if (subtitle) Field(draft.altTitle, { if (it.length <= 180) vm.updateDraft(draft.copy(altTitle = it)) }, R.string.recipe_subtitle)
            else KitchenTextButton(onClick = { subtitle = true }) { Text(stringResource(R.string.add_subtitle)) }
            PhotoActions(photo = draft.imageUrl, onRemove = { vm.updateDraft(draft.copy(imageUrl = "")) }, onImageLink = { imageLink = true }) { vm.updateDraft(draft.copy(imageUrl = it)) }
            Field(servings, { servings = it; it.toIntOrNull()?.takeIf { n -> n in 1..100 }?.let { n -> vm.updateDraft(draft.copy(servings = n)) } }, R.string.servings)
            KitchenTabs(listOf("cozy", "lazy", "fancy", "chaotic").indexOf(draft.vibe), listOf(R.string.cozy, R.string.lazy, R.string.fancy, R.string.chaotic)) { vm.updateDraft(draft.copy(vibe = listOf("cozy", "lazy", "fancy", "chaotic")[it])) }
            SectionTitle(stringResource(R.string.ingredients))
            draft.ingredients.forEachIndexed { index, ingredient -> KitchenPanel {
                fun update(item: Ingredient) { vm.updateDraft(draft.copy(ingredients = draft.ingredients.mapIndexed { i, v -> if (i == index) item else v })) }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Field(ingredient.name, { update(ingredient.copy(name = it)) }, R.string.ingredient_name, Modifier.weight(1f))
                    IconButton(onClick = { vm.updateDraft(draft.copy(ingredients = draft.ingredients.filterIndexed { i, _ -> i != index })) }) { Icon(Icons.Default.Close, stringResource(R.string.remove_ingredient)) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Field(ingredient.quantity, { update(ingredient.copy(quantity = it)) }, R.string.quantity, Modifier.weight(1f))
                    UnitField(ingredient.unit, { update(ingredient.copy(unit = it)) }, Modifier.weight(1f))
                }
            } }
            KitchenOutlinedButton(onClick = { vm.updateDraft(draft.copy(ingredients = draft.ingredients + Ingredient())) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                Icon(Icons.Default.Add, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_ingredient))
            }
            SectionTitle(stringResource(R.string.instructions))
            draft.steps.forEachIndexed { index, step -> KitchenPanel {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.step_number, index + 1), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                    IconButton(onClick = { vm.updateDraft(draft.copy(steps = draft.steps.filterIndexed { i, _ -> i != index })) }) { Icon(Icons.Default.Close, stringResource(R.string.remove_step, index + 1)) }
                }
                Field(step, { text -> vm.updateDraft(draft.copy(steps = draft.steps.mapIndexed { i, v -> if (i == index) text else v })) }, R.string.instruction_hint, single = false)
            } }
            KitchenOutlinedButton(onClick = { vm.updateDraft(draft.copy(steps = draft.steps + "")) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                Icon(Icons.Default.Add, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_step))
            }
            if (draft.id.isEmpty() && (draft.title.isNotBlank() || draft.ingredients.isNotEmpty() || draft.steps.isNotEmpty())) {
                KitchenTextButton(onClick = { discard = true }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text(stringResource(R.string.discard_draft), color = MaterialTheme.colorScheme.error) }
            }
        }
        KitchenActionBar {
            KitchenButton(onClick = vm::save, enabled = !state.busy && draft.title.isNotBlank() && draft.ingredients.isNotEmpty() && draft.ingredients.all { it.name.isNotBlank() } && draft.steps.isNotEmpty() && draft.steps.all { it.isNotBlank() } && servings.toIntOrNull() in 1..100,
                modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Icon(Icons.Default.Check, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.save_recipe)) }
        }
    }
    if (discard) KitchenAlertDialog(onDismissRequest = { discard = false }, title = { Text(stringResource(R.string.discard_draft)) }, text = { Text(stringResource(R.string.discard_draft_note)) },
        confirmButton = { KitchenTextButton(onClick = { vm.edit(); discard = false; done() }) { Text(stringResource(R.string.discard_draft), color = MaterialTheme.colorScheme.error) } },
        dismissButton = { KitchenTextButton(onClick = { discard = false }) { Text(stringResource(R.string.cancel)) } })
    if (imageLink) { var link by remember { mutableStateOf(if (draft.imageUrl.startsWith("https:")) draft.imageUrl else "") }
        KitchenAlertDialog(onDismissRequest = { imageLink = false }, title = { Text(stringResource(R.string.photo_url)) }, text = { Field(link, { link = it }, R.string.photo_url) },
            confirmButton = { KitchenTextButton(onClick = { vm.updateDraft(draft.copy(imageUrl = link.trim())); imageLink = false }, enabled = link.startsWith("https://")) { Text(stringResource(R.string.save)) } }, dismissButton = { KitchenTextButton(onClick = { imageLink = false }) { Text(stringResource(R.string.cancel)) } })
    }
}

@Composable fun CookingScreen(state: BuddyState, vm: BuddyViewModel) {
    val recipe = state.active ?: return
    val progress = state.progress[recipe.id] ?: CookingProgress(recipe.id, 0, recipe.servings)
    val step = progress.step.coerceIn(0, maxOf(0, recipe.steps.lastIndex)); val language = displayLanguage(state)
    val context = LocalContext.current; val activity = context.findActivity()
    DisposableEffect(Unit) { activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); onDispose { activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) } }
    var timerDialog by remember { mutableStateOf(false) }; var name by rememberSaveable { mutableStateOf("") }; var minutes by rememberSaveable { mutableStateOf("5") }; var showIngredients by rememberSaveable { mutableStateOf(false) }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1000) } }
    Column(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(KitchenGutter, 8.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(recipe.text(recipe.title, language), style = MaterialTheme.typography.titleLarge)
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Text(stringResource(R.string.step_progress, step + 1, recipe.steps.size), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                        LinearProgressIndicator(progress = { (step + 1).toFloat() / recipe.steps.size.coerceAtLeast(1) }, modifier = Modifier.weight(1f).height(6.dp))
                    }
                }
            }
            item {
                Surface(shape = RoundedCornerShape(28.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
                    Text(recipe.text(recipe.steps.getOrElse(step) { "" }, language), Modifier.fillMaxWidth().padding(24.dp), fontSize = 24.sp, lineHeight = 36.sp)
                }
            }
            item { VoiceChefPanel(recipe, step, progress.servings, language, state, vm) { vm.progress(recipe, it, progress.servings) } }
            item {
                KitchenActionRow(R.string.ingredients_servings, Icons.Default.LocalDining, { showIngredients = !showIngredients })
                if (showIngredients) KitchenPanel {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { vm.progress(recipe, step, progress.servings - 1) }, enabled = progress.servings > 1) { Icon(Icons.Default.Remove, stringResource(R.string.fewer_servings)) }
                        Text(pluralStringResource(R.plurals.servings, progress.servings, progress.servings), Modifier.weight(1f))
                        IconButton(onClick = { vm.progress(recipe, step, progress.servings + 1) }, enabled = progress.servings < 100) { Icon(Icons.Default.Add, stringResource(R.string.more_servings)) }
                        InfoDisclosure(R.string.ingredients_servings, R.string.scaling_note)
                    }
                    recipe.ingredients.forEach { ingredient ->
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text(recipe.text(ingredient.name, language), Modifier.weight(1f))
                            SmallNote("${recipe.text(scaledQuantity(ingredient.quantity, progress.servings.toDouble() / recipe.servings), language)} ${recipe.text(ingredient.unit, language)}".trim())
                        }
                    }
                }
            }
            item {
                SectionTitle(stringResource(R.string.timers), action = {
                    InfoDisclosure(R.string.timers, R.string.timer_limitations)
                    IconButton(onClick = { name = context.getString(R.string.step_number, step + 1); timerDialog = true }) { Icon(Icons.Default.Add, stringResource(R.string.add_timer)) }
                })
                if (state.timers.none { it.recipeId == recipe.id } && explicitDurations(recipe.steps.getOrElse(step) { "" }).isEmpty()) SmallNote(stringResource(R.string.no_timers))
            }
            items(explicitDurations(recipe.steps.getOrElse(step) { "" })) { duration ->
                KitchenOutlinedButton(onClick = { minutes = (duration.seconds / 60.0).toString(); name = duration.label; timerDialog = true }) {
                    Icon(Icons.Default.Timer, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.suggest_timer, duration.label))
                }
            }
            items(state.timers.filter { it.recipeId == recipe.id }, key = { it.id }) { timer ->
                KitchenPanel {
                    val seconds = ((timer.deadline - now) / 1000).coerceAtLeast(0)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.Timer, null, tint = MaterialTheme.colorScheme.primary)
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(timer.name, style = MaterialTheme.typography.titleSmall)
                            Text(if (seconds == 0L) stringResource(R.string.timer_finished) else "%02d:%02d:%02d".format(seconds / 3600, seconds / 60 % 60, seconds % 60),
                                style = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 28.sp, color = MaterialTheme.colorScheme.primary))
                        }
                        IconButton(onClick = { vm.cancelTimer(timer) }) { Icon(Icons.Default.Close, stringResource(R.string.cancel_timer)) }
                    }
                }
            }
        }
        KitchenActionBar {
            KitchenOutlinedButton(onClick = { vm.progress(recipe, step - 1, progress.servings) }, enabled = step > 0, modifier = Modifier.weight(1f).heightIn(min = 52.dp)) { Text(stringResource(R.string.previous)) }
            if (recipe.owned && step == recipe.steps.lastIndex) KitchenButton(onClick = { vm.cooked(recipe) }, enabled = !state.busy && recipe.id !in (state.me?.cookedToday ?: emptyList()), modifier = Modifier.weight(1.2f).heightIn(min = 52.dp)) {
                Text(stringResource(if (recipe.id in (state.me?.cookedToday ?: emptyList())) R.string.cooked_today else R.string.mark_cooked))
            } else KitchenButton(onClick = { vm.progress(recipe, step + 1, progress.servings) }, enabled = step < recipe.steps.lastIndex, modifier = Modifier.weight(1f).heightIn(min = 52.dp)) { Text(stringResource(R.string.next)) }
        }
    }
    if (timerDialog) KitchenAlertDialog(onDismissRequest = { timerDialog = false }, title = { Text(stringResource(R.string.add_timer)) }, text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Field(name, { name = it }, R.string.timer_name); Field(minutes, { minutes = it }, R.string.minutes)
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) KitchenTextButton(onClick = { permission.launch(Manifest.permission.POST_NOTIFICATIONS) }) { Text(stringResource(R.string.enable_notifications)) }
        if (Build.VERSION.SDK_INT >= 31 && !context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()) KitchenTextButton(onClick = { context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))) }) { Text(stringResource(R.string.enable_precise_timers)) }
    } }, confirmButton = { KitchenTextButton(onClick = { vm.timer(recipe, step, name, ((quantityValue(minutes) ?: 0.0) * 60).toLong()); timerDialog = false }, enabled = name.isNotBlank() && (quantityValue(minutes) ?: 0.0) * 60 in 1.0..604800.0) { Text(stringResource(R.string.start_timer)) } }, dismissButton = { KitchenTextButton(onClick = { timerDialog = false }) { Text(stringResource(R.string.cancel)) } })
}
fun android.content.Context.findActivity(): android.app.Activity? = when (this) { is android.app.Activity -> this; is android.content.ContextWrapper -> baseContext.findActivity(); else -> null }
