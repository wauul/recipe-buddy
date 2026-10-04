package com.recipebuddy.android

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.*
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun PhotoActions(photo: String? = null, hero: Boolean = false, onRemove: (() -> Unit)? = null,
    onImageLink: (() -> Unit)? = null, onPhoto: (String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var choosing by rememberSaveable { mutableStateOf(false) }
    var cameraUri by rememberSaveable { mutableStateOf<String?>(null) }
    var preparing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf(false) }
    fun cleanCamera() { context.cacheDir.resolve("camera").listFiles()?.forEach { it.delete() }; cameraUri = null }
    fun process(uri: Uri) { preparing = true; error = false; scope.launch {
        try { onPhoto(preparedPhoto(context, uri)) } catch (_: Exception) { error = true }
        finally { if (uri.toString() == cameraUri) cleanCamera(); preparing = false }
    } }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { it?.let(::process) }
    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success) cameraUri?.let { process(Uri.parse(it)) } else cleanCamera()
    }
    fun take() {
        val directory = File(context.cacheDir, "camera").apply { mkdirs() }
        val file = File.createTempFile("photo-", ".jpg", directory)
        val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
        cameraUri = uri.toString()
        runCatching { camera.launch(uri) }.onFailure { error = true; cleanCamera() }
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { if (it) take() else error = true }
    val selected = !photo.isNullOrBlank()
    val label = stringResource(if (selected) R.string.change_photo else R.string.add_photo)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.fillMaxWidth().aspectRatio(if (hero || selected) 1.65f else 2.6f)
            .clip(RoundedCornerShape(24.dp)).background(MaterialTheme.colorScheme.surfaceVariant)
            .kitchenClickable(enabled = !preparing, onClickLabel = label) { choosing = true }) {
            if (selected) AsyncImage(imageSource(photo!!), stringResource(R.string.photo_preview), Modifier.fillMaxSize(), contentScale = ContentScale.Fit)
            else if (hero) Image(painterResource(R.drawable.ingredients_hero), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            else Image(painterResource(R.drawable.kitchen_pot), null, Modifier.align(Alignment.Center).fillMaxWidth(0.7f), contentScale = ContentScale.Fit)
            Surface(Modifier.align(Alignment.BottomStart).padding(12.dp), shape = RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surfaceContainerLow.copy(alpha = 0.96f)) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Outlined.AddPhotoAlternate, null, Modifier.size(20.dp)); Text(label, style = MaterialTheme.typography.labelLarge)
                }
            }
            if (preparing) BuddyLoader(Modifier.align(Alignment.Center))
        }
        if (error) Text(stringResource(R.string.photo_denied), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
    }
    if (choosing) KitchenBottomSheet(onDismissRequest = { choosing = false }) {
        Column(Modifier.padding(bottom = 24.dp)) {
            Text(stringResource(R.string.add_photo), Modifier.padding(start = 20.dp, bottom = 12.dp), style = MaterialTheme.typography.titleLarge)
            ListItem(headlineContent = { Text(stringResource(R.string.take_photo)) }, leadingContent = { Icon(Icons.Outlined.PhotoCamera, null) },
                trailingContent = { Icon(Icons.Outlined.ChevronRight, null) }, modifier = Modifier.kitchenClickable {
                    choosing = false
                    if (context.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) take() else permission.launch(Manifest.permission.CAMERA)
                }, colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow))
            ListItem(headlineContent = { Text(stringResource(R.string.choose_photo)) }, leadingContent = { Icon(Icons.Outlined.PhotoLibrary, null) },
                trailingContent = { Icon(Icons.Outlined.ChevronRight, null) }, modifier = Modifier.kitchenClickable {
                    choosing = false; picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }, colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow))
            onImageLink?.let { action -> ListItem(headlineContent = { Text(stringResource(R.string.photo_url)) }, leadingContent = { Icon(Icons.Outlined.Link, null) },
                modifier = Modifier.kitchenClickable { choosing = false; action() }, colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)) }
            if (selected && onRemove != null) ListItem(headlineContent = { Text(stringResource(R.string.remove_photo), color = MaterialTheme.colorScheme.error) },
                leadingContent = { Icon(Icons.Outlined.DeleteOutline, null, tint = MaterialTheme.colorScheme.error) }, modifier = Modifier.kitchenClickable { choosing = false; onRemove() },
                colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow))
        }
    }
}
