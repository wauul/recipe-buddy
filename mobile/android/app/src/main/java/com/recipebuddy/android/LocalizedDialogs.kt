package com.recipebuddy.android

import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalResources

// Dialog windows provide their own Android resource context. Preserve the app's
// chosen language inside their content rather than falling back to system locale.
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun KitchenBottomSheet(onDismissRequest: () -> Unit,
    sheetState: SheetState = rememberModalBottomSheetState(),
    content: @Composable ColumnScope.() -> Unit) {
    val resources = LocalContext.current.resources
    ModalBottomSheet(onDismissRequest = onDismissRequest, sheetState = sheetState) {
        val column = this
        CompositionLocalProvider(LocalResources provides resources) { content(column) }
    }
}

@Composable fun KitchenAlertDialog(onDismissRequest: () -> Unit,
    confirmButton: @Composable () -> Unit, dismissButton: (@Composable () -> Unit)? = null,
    title: (@Composable () -> Unit)? = null, text: (@Composable () -> Unit)? = null) {
    val resources = LocalContext.current.resources
    AlertDialog(onDismissRequest = onDismissRequest,
        confirmButton = { CompositionLocalProvider(LocalResources provides resources) { confirmButton() } },
        dismissButton = dismissButton?.let { { CompositionLocalProvider(LocalResources provides resources) { it() } } },
        title = title?.let { { CompositionLocalProvider(LocalResources provides resources) { it() } } },
        text = text?.let { { CompositionLocalProvider(LocalResources provides resources) { it() } } })
}
