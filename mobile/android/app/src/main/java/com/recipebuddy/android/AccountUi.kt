package com.recipebuddy.android

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.serialization.json.*

const val LEGAL_VERSION = "2026-10-03"
@Composable fun LegalReader(document: String, language: String, close: () -> Unit) {
    val context = LocalContext.current
    val entries = remember(document, language) {
        buddyJson.parseToJsonElement(context.assets.open("legal-content.json").bufferedReader().use { it.readText() }).jsonObject[if (language == "fr") "fr" else "en"]!!.jsonObject[document]!!.jsonArray
    }
    Dialog(onDismissRequest = close, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize()) { Column(Modifier.safeDrawingPadding()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = close) { Icon(Icons.Outlined.Close, stringResource(R.string.dismiss)) }
                Text(stringResource(if (document == "privacy") R.string.privacy_policy else R.string.terms_of_use), style = MaterialTheme.typography.titleLarge)
            }
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
                entries.forEach { entry -> Column(verticalArrangement = Arrangement.spacedBy(8.dp)) { Text(entry.jsonObject["title"]!!.jsonPrimitive.content, style = MaterialTheme.typography.titleMedium); Text(entry.jsonObject["text"]!!.jsonPrimitive.content, style = MaterialTheme.typography.bodyLarge) } }
            }
        } }
    }
}

@Composable fun TermsGate(state: BuddyState, vm: BuddyViewModel) {
    var document by remember { mutableStateOf<String?>(null) }
    var accepted by rememberSaveable { mutableStateOf(false) }
    if (state.me != null && state.me.termsVersion != LEGAL_VERSION) KitchenAlertDialog(onDismissRequest = {}, title = { Text(stringResource(R.string.terms_of_use)) },
        text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.terms_required))
            KitchenTextButton(onClick = { document = "terms" }) { Text(stringResource(R.string.terms_of_use)) }
            KitchenTextButton(onClick = { document = "privacy" }) { Text(stringResource(R.string.privacy_policy)) }
            Row(Modifier.kitchenClickable { accepted = !accepted }, verticalAlignment = Alignment.CenterVertically) { Checkbox(accepted, { accepted = it }); Text(stringResource(R.string.agree_terms), Modifier.weight(1f)) }
        } }, confirmButton = { KitchenTextButton(onClick = vm::acceptTerms, enabled = accepted && !state.busy) { Text(stringResource(R.string.accept)) } }, dismissButton = { KitchenTextButton(onClick = vm::logout, enabled = !state.busy) { Text(stringResource(R.string.sign_out)) } })
    document?.let { LegalReader(it, displayLanguage(state)) { document = null } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun AccountActions(state: BuddyState, vm: BuddyViewModel) {
    val context = LocalContext.current
    var document by remember { mutableStateOf<String?>(null) }
    var deleting by rememberSaveable { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var blocks by remember { mutableStateOf(false) }
    Column {
        KitchenActionRow(R.string.privacy_policy, Icons.Outlined.Shield, { document = "privacy" })
        KitchenActionRow(R.string.terms_of_use, Icons.Outlined.Description, { document = "terms" })
        KitchenActionRow(R.string.blocked_chefs, Icons.Outlined.Block, { blocks = true })
        KitchenActionRow(R.string.legal_support, Icons.Outlined.MailOutline, {
            runCatching { context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:waelfezari@gmail.com"))) }
        })
        HorizontalDivider(Modifier.padding(horizontal = 16.dp), color = MaterialTheme.colorScheme.outlineVariant)
        KitchenActionRow(R.string.delete_account, Icons.Outlined.DeleteOutline, { deleting = true; confirmation = ""; password = "" }, destructive = true)
    }
    document?.let { LegalReader(it, displayLanguage(state)) { document = null } }
    if (deleting) KitchenBottomSheet(onDismissRequest = { deleting = false; password = "" }) {
        Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(KitchenGutter, 0.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.delete_account), style = MaterialTheme.typography.titleLarge)
            Text(stringResource(R.string.delete_account_note), style = MaterialTheme.typography.bodyMedium)
            SmallNote(stringResource(R.string.deletion_reauth))
            OutlinedTextField(password, { password = it }, label = { Text(stringResource(R.string.password)) }, singleLine = true, visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
            Field(confirmation, { confirmation = it }, R.string.confirm_delete_word)
            state.error?.let { if (it == 403) Text(stringResource(R.string.deletion_auth_failed), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) else ErrorNotice(it, {}, vm::clearError) }
            KitchenButton(onClick = { vm.deleteAccount(password); password = "" }, enabled = !state.busy && confirmation == "DELETE", modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error, contentColor = MaterialTheme.colorScheme.onError)) { Text(stringResource(R.string.delete_account_confirm)) }
        }
    }
    if (blocks) KitchenBottomSheet(onDismissRequest = { blocks = false }) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(KitchenGutter, 0.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.blocked_chefs), style = MaterialTheme.typography.titleLarge)
            if (state.blocked.isEmpty()) SmallNote(stringResource(R.string.blocked_empty))
            state.blocked.forEach { chef -> Row(verticalAlignment = Alignment.CenterVertically) { Text(chef.username, Modifier.weight(1f)); KitchenTextButton(onClick = { vm.block(chef.id, true) }, enabled = !state.busy) { Text(stringResource(R.string.unblock)) } } }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun ReportSheet(state: BuddyState, vm: BuddyViewModel, recipeId: String? = null, chefId: String? = null, close: () -> Unit) {
    var reason by remember { mutableStateOf("") }
    val context = LocalContext.current
    KitchenBottomSheet(onDismissRequest = close) {
        Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(KitchenGutter, 0.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.report), style = MaterialTheme.typography.titleLarge)
            SmallNote(stringResource(R.string.report_note))
            Field(reason, { reason = it.take(1000) }, R.string.report_reason, single = false)
            state.error?.let { ErrorNotice(it, {}, vm::clearError) }
            KitchenButton(onClick = { vm.report(recipeId, chefId, reason) { close(); android.widget.Toast.makeText(context, context.getString(R.string.report_sent), android.widget.Toast.LENGTH_SHORT).show() } }, enabled = !state.busy && reason.trim().length >= 5, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.report)) }
        }
    }
}
