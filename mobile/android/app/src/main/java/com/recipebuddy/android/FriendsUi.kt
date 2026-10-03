package com.recipebuddy.android

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.*
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.journeyapps.barcodescanner.*

@Composable private fun ChefAvatar(name: String, size: Int = 48) {
    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
        Box(Modifier.size(size.dp), contentAlignment = Alignment.Center) {
            Text(name.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.let { words -> if (words.size > 1) "${words.first().first()}${words.last().first()}" else words.firstOrNull()?.take(1) ?: "?" }.uppercase(), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSecondaryContainer)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun FriendsScreen(state: BuddyState, vm: BuddyViewModel, open: (Recipe) -> Unit, invite: () -> Unit, kitchen: (String) -> Unit) {
    val language = displayLanguage(state)
    val accepted = state.friends.filter { it.status == "accepted" }
    val requests = state.friends.filter { it.status != "accepted" }
    var selected by remember { mutableStateOf<Friend?>(null) }
    var remove by remember { mutableStateOf<Friend?>(null) }
    var share by remember { mutableStateOf<Friend?>(null) }
    var report by remember { mutableStateOf<Friend?>(null) }
    var blocking by remember { mutableStateOf<Friend?>(null) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val context = LocalContext.current
    LazyColumn(contentPadding = PaddingValues(KitchenGutter, 8.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { FilledTonalButton(onClick = invite, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.PersonAdd, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.invite_friend)) } }
        item { KitchenTabs(tab, listOf(R.string.your_chefs, R.string.shared_recipes)) { tab = it } }
        if (tab == 0 && accepted.isEmpty() && !state.busy) item { Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Image(painterResource(R.drawable.kitchen_fancy), null, Modifier.fillMaxWidth().height(140.dp))
            Text(stringResource(R.string.no_friends), style = MaterialTheme.typography.titleMedium)
            SmallNote(stringResource(R.string.friends_privacy))
        } }
        if (tab == 0) items(accepted, key = { "chef-${it.id}" }) { friend -> Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surfaceContainerLow).heightIn(min = 80.dp).clickable { selected = friend }.padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            ChefAvatar(friend.friend.username, 48)
            Text(friend.friend.username, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Icon(Icons.Outlined.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        } }
        if (tab == 0 && requests.isNotEmpty()) item { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.friend_requests), style = MaterialTheme.typography.titleLarge)
            requests.forEach { friend -> Row(Modifier.fillMaxWidth().heightIn(min = 64.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                ChefAvatar(friend.friend.username)
                Column(Modifier.weight(1f)) { Text(friend.friend.username, style = MaterialTheme.typography.titleMedium); SmallNote(stringResource(if (friend.status == "incoming") R.string.incoming else R.string.outgoing)) }
                if (friend.status == "incoming") FilledTonalButton(onClick = { vm.friendship(friend.id, true) }, enabled = !state.busy) { Text(stringResource(R.string.accept)) }
                IconButton(onClick = { remove = friend }, enabled = !state.busy) { Icon(Icons.Outlined.Close, stringResource(R.string.cancel_request)) }
            } }
        } }
        if (tab == 1 && state.shared.isEmpty() && !state.busy) item { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            RecipePhoto(Recipe(vibe = "cozy"), Modifier.fillMaxWidth().aspectRatio(1.8f))
            SmallNote(stringResource(R.string.empty_shared))
        } }
        if (tab == 1) items(state.shared, key = { it.id }) { recipe -> Column(Modifier.fillMaxWidth().clickable { open(recipe) }, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            RecipePhoto(recipe, Modifier.fillMaxWidth().aspectRatio(1.7f))
            Text(recipe.text(recipe.title, language), style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { ChefAvatar(recipe.sharedBy, 28); SmallNote(stringResource(R.string.shared_by, recipe.sharedBy)) }
        } }
    }
    selected?.let { friend -> KitchenBottomSheet(onDismissRequest = { selected = null }) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(KitchenGutter, 0.dp, KitchenGutter, 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { ChefAvatar(friend.friend.username, 56); Text(friend.friend.username, style = MaterialTheme.typography.titleLarge) }
            FilledTonalButton(onClick = { selected = null; kitchen(friend.friend.id) }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.MenuBook, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.view_kitchen)) }
            SmallNote(stringResource(R.string.friends_privacy))
            Button(onClick = { share = friend; selected = null }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Outlined.IosShare, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.share_a_recipe)) }
            HorizontalDivider()
            Column {
                listOf(R.string.remove_friend to Icons.Outlined.PersonRemove, R.string.report to Icons.Outlined.Flag, R.string.block_friend to Icons.Outlined.Block).forEach { (label, icon) ->
                    ListItem(headlineContent = { Text(stringResource(label)) }, leadingContent = { Icon(icon, null) }, modifier = Modifier.clickable {
                        when (label) { R.string.remove_friend -> remove = friend; R.string.report -> report = friend; else -> blocking = friend }; selected = null
                    }, colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface, headlineColor = if (label == R.string.report) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.error))
                }
            }
        }
    } }
    share?.let { friend -> KitchenBottomSheet(onDismissRequest = { share = null }) {
        LazyColumn(contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text(stringResource(R.string.share_with, friend.friend.username), style = MaterialTheme.typography.titleLarge); SmallNote(stringResource(R.string.choose_one_recipe)) }
            if (state.recipes.isEmpty()) item { SmallNote(stringResource(R.string.empty_recipes)) }
            items(state.recipes.filter { it.owned }, key = { it.id }) { recipe -> Row(Modifier.fillMaxWidth().heightIn(min = 72.dp).clickable(enabled = !state.busy) {
                vm.shareRecipe(recipe, friend.friend.id, true) { share = null; android.widget.Toast.makeText(context, context.getString(R.string.recipe_shared), android.widget.Toast.LENGTH_SHORT).show() }
            }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                RecipePhoto(recipe, Modifier.size(64.dp)); Text(recipe.text(recipe.title, language), Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis); Icon(Icons.Outlined.ChevronRight, null)
            } }
            if (state.nextCursor != null) item { TextButton(onClick = vm::more, enabled = !state.busy) { Text(stringResource(R.string.load_more)) } }
        }
    } }
    remove?.let { friend -> KitchenAlertDialog(onDismissRequest = { remove = null }, title = { Text(stringResource(if (friend.status == "accepted") R.string.remove_friend else R.string.cancel_request)) },
        text = { Text(stringResource(R.string.remove_friend_note, friend.friend.username)) },
        confirmButton = { TextButton(onClick = { vm.friendship(friend.id, false); remove = null }) { Text(stringResource(R.string.remove), color = MaterialTheme.colorScheme.error) } },
        dismissButton = { TextButton(onClick = { remove = null }) { Text(stringResource(R.string.cancel)) } }) }
    report?.let { ReportSheet(state, vm, chefId = it.friend.id) { report = null } }
    blocking?.let { friend -> KitchenAlertDialog(onDismissRequest = { blocking = null }, title = { Text(stringResource(R.string.block_friend)) }, text = { Text(stringResource(R.string.block_note)) }, confirmButton = { TextButton(onClick = { vm.block(friend.friend.id); blocking = null }) { Text(stringResource(R.string.block_friend), color = MaterialTheme.colorScheme.error) } }, dismissButton = { TextButton(onClick = { blocking = null }) { Text(stringResource(R.string.cancel)) } }) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun InvitationScreen(state: BuddyState, vm: BuddyViewModel) {
    val context = LocalContext.current
    var name by rememberSaveable { mutableStateOf("") }
    var link by rememberSaveable { mutableStateOf("") }
    var paste by remember { mutableStateOf(false) }
    var scanning by remember { mutableStateOf(false) }
    var reset by remember { mutableStateOf(false) }
    var permissionDenied by remember { mutableStateOf(false) }
    val searchReveal = remember { BringIntoViewRequester() }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> scanning = granted; permissionDenied = !granted }
    LaunchedEffect(state.account) { if(state.account != null) vm.ensureInvite() }
    LaunchedEffect(name, state.account) { vm.searchChefs(name) }
    DisposableEffect(state.account) { onDispose { vm.resetChefSearch() } }
    LaunchedEffect(state.chefResults, state.chefSearchDone, state.chefSearchError) {
        if(name.trim().length >= 3 && (state.chefSearchDone || state.chefSearchError != null)) searchReveal.bringIntoView()
    }
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(KitchenGutter), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        state.invitePreview?.let { preview -> KitchenPanel {
            Text(stringResource(R.string.invited_by, preview.chefName), style = MaterialTheme.typography.titleLarge)
            SmallNote(stringResource(R.string.friends_privacy))
            Button(onClick = vm::acceptInvite, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.accept_invitation)) }
            TextButton(onClick = vm::declineInvite, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text(stringResource(R.string.decline_invitation)) }
        } }
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(state.me?.username ?: "", style = MaterialTheme.typography.titleLarge)
            state.invite?.let { invite ->
                val bitmap = remember(invite.url) { chefQrBitmap(invite.url) }
                Surface(shape = RoundedCornerShape(24.dp), color = Color.White) { Image(bitmap.asImageBitmap(), stringResource(R.string.invite_qr), Modifier.widthIn(max = 360.dp).fillMaxWidth().aspectRatio(1f)) }
                SmallNote(stringResource(R.string.invite_qr_hint))
                Button(onClick = { shareText(context, context.getString(R.string.invite_share_message, invite.url)) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Icon(Icons.Outlined.IosShare, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.share_link)) }
            } ?: Box(Modifier.fillMaxWidth().aspectRatio(1f), contentAlignment = Alignment.Center) {
                if(state.busy) CircularProgressIndicator() else TextButton(onClick = vm::ensureInvite) { Text(stringResource(R.string.retry)) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                TextButton(onClick = { if(context.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) scanning = true else permission.launch(Manifest.permission.CAMERA) }) { Icon(Icons.Outlined.QrCodeScanner, null, Modifier.size(20.dp)); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.scan_qr)) }
                TextButton(onClick = { paste = true }) { Icon(Icons.Outlined.Link, null, Modifier.size(20.dp)); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.paste_link)) }
            }
            if(permissionDenied) SmallNote(stringResource(R.string.qr_camera_denied))
        }
        Column(Modifier.bringIntoViewRequester(searchReveal), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionTitle(stringResource(R.string.find_chef))
            Field(name, { name = it; vm.resetChefSearch() }, R.string.chef_name)
            SmallNote(stringResource(R.string.chef_search_hint))
            if(state.chefSearching) LinearProgressIndicator(Modifier.fillMaxWidth())
            state.chefSearchError?.let { status ->
                SmallNote(stringResource(if (status == 429) R.string.error_quota else R.string.chef_search_unavailable))
                TextButton(onClick = { vm.searchChefs(name) }) { Text(stringResource(R.string.retry)) }
            }
            if(state.chefSearchDone && state.chefResults.isEmpty()) SmallNote(stringResource(R.string.chef_search_empty))
            state.chefResults.forEach { chef ->
                val connected = state.friends.any { it.friend.id == chef.id }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ChefAvatar(chef.username); Text(chef.username, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                    TextButton(onClick = { vm.inviteChef(chef) }, enabled = !state.busy && !connected) { Text(stringResource(if(connected) R.string.invite_sent else R.string.add_friend)) }
                }
            }
        }
        if(state.invite != null) TextButton(onClick = { reset = true }, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text(stringResource(R.string.regenerate_invite)) }
    }
    if(scanning) KitchenBottomSheet(onDismissRequest = { scanning = false }) {
        Column(Modifier.fillMaxWidth().padding(KitchenGutter, 0.dp, KitchenGutter, 28.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.scan_friend_code), style = MaterialTheme.typography.titleLarge)
            Surface(shape = RoundedCornerShape(24.dp)) { ChefQrScanner { scanning = false; vm.pendingInvite(it) } }
            SmallNote(stringResource(R.string.scan_preview_note))
        }
    }
    if(paste) KitchenBottomSheet(onDismissRequest = { paste = false }) {
        Column(Modifier.fillMaxWidth().imePadding().padding(KitchenGutter, 0.dp, KitchenGutter, 28.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.paste_link), style = MaterialTheme.typography.titleLarge)
            Field(link, { link = it }, R.string.paste_invite)
            Button(onClick = { vm.pendingInvite(link); paste = false }, enabled = link.startsWith("https://") && !state.busy, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.preview_invite)) }
        }
    }
    if(reset) KitchenAlertDialog(onDismissRequest = { reset = false }, title = { Text(stringResource(R.string.regenerate_invite)) }, text = { Text(stringResource(R.string.reset_code_note)) }, confirmButton = { TextButton(onClick = { vm.createInvite(); reset = false }) { Text(stringResource(R.string.regenerate_invite)) } }, dismissButton = { TextButton(onClick = { reset = false }) { Text(stringResource(R.string.cancel)) } })
}

// Brand-colored modules and rounded finder frames; preserve all QR data and a
// four-module white quiet zone. No logo hides modules. Decode-tested on-device.
fun chefQrBitmap(value: String): android.graphics.Bitmap {
    val matrix = QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, 0, 0, mapOf(EncodeHintType.MARGIN to 4, EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.H))
    val size = 1024
    val bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888)
    val canvas = android.graphics.Canvas(bitmap); canvas.drawColor(android.graphics.Color.WHITE)
    val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.rgb(36, 60, 48) }
    val unit = size.toFloat() / matrix.width
    val eyes = listOf(4 to 4, matrix.width - 11 to 4, 4 to matrix.height - 11)
    for (y in 0 until matrix.height) for (x in 0 until matrix.width) {
        if (!matrix[x, y] || eyes.any { (a,b) -> x in a until a + 7 && y in b until b + 7 }) continue
        val rect = android.graphics.RectF(x * unit, y * unit, (x + 1) * unit, (y + 1) * unit)
        canvas.drawRoundRect(rect, unit * .22f, unit * .22f, paint)
    }
    eyes.forEach { (x,y) ->
        fun square(inset: Int, count: Int, color: Int, radius: Float) { paint.color = color; canvas.drawRoundRect(android.graphics.RectF((x + inset) * unit, (y + inset) * unit, (x + inset + count) * unit, (y + inset + count) * unit), unit * radius, unit * radius, paint) }
        val green = android.graphics.Color.rgb(36, 60, 48)
        square(0,7,green,.8f); square(1,5,android.graphics.Color.WHITE,.5f); square(2,3,green,.45f)
    }
    return bitmap
}
