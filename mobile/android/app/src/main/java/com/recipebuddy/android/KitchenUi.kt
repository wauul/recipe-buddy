package com.recipebuddy.android

import androidx.compose.foundation.*
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.*
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

// Shared native controls keep the same rhythm across tasks, sheets and settings.
val KitchenGutter = 20.dp

@Composable fun SectionTitle(text: String, modifier: Modifier = Modifier, action: @Composable (() -> Unit)? = null) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(text, Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleLarge)
        action?.invoke()
    }
}

@Composable fun KitchenPanel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Surface(modifier.fillMaxWidth().animateContentSize(tween(if (LocalKitchenMotion.current) 180 else 0)), shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp), content = content)
    }
}

@Composable fun KitchenTabs(selected: Int, labels: List<Int>, select: (Int) -> Unit) {
    // Wrap instead of clipping French labels or enlarged system text.
    FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        labels.forEachIndexed { index, label -> FilterChip(selected == index, { select(index) },
            label = { Text(stringResource(label)) }, shape = RoundedCornerShape(14.dp),
            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary,
                selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
            border = if (selected == index) null else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) }
    }
}

@Composable fun KitchenActionRow(label: Int, icon: ImageVector, action: () -> Unit, supporting: String? = null, destructive: Boolean = false) {
    val color = if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
    ListItem(headlineContent = { Text(stringResource(label), color = color) },
        supportingContent = supporting?.let { { Text(it, maxLines = 2, overflow = TextOverflow.Ellipsis) } },
        leadingContent = { Icon(icon, null, tint = if (destructive) color else MaterialTheme.colorScheme.primary) },
        trailingContent = { Icon(Icons.Outlined.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) },
        modifier = Modifier.fillMaxWidth().kitchenClickable(onClick = action),
        colors = ListItemDefaults.colors(containerColor = Color.Transparent))
}

@Composable fun KitchenActionBar(content: @Composable RowScope.() -> Unit) {
    Surface(color = MaterialTheme.colorScheme.background) {
        Column {
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = .65f))
            Row(Modifier.fillMaxWidth().padding(horizontal = KitchenGutter, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically, content = content)
        }
    }
}

@Composable fun KitchenEmpty(title: Int, art: Int = R.drawable.kitchen_cozy, action: @Composable (() -> Unit)? = null) {
    Column(Modifier.fillMaxWidth().padding(vertical = 24.dp), horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Image(painterResource(art), null, Modifier.fillMaxWidth(.8f).heightIn(max = 160.dp))
        Text(stringResource(title), style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        action?.invoke()
    }
}

@Composable fun KitchenSearch(value: String, change: (String) -> Unit, hint: Int, submit: () -> Unit,
    trailing: @Composable (() -> Unit)? = null) {
    TextField(value, change, singleLine = true, placeholder = { Text(stringResource(hint), maxLines = 1, overflow = TextOverflow.Ellipsis) },
        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp),
        leadingIcon = { IconButton(onClick = submit) { Icon(Icons.Outlined.Search, stringResource(R.string.search)) } },
        trailingIcon = trailing ?: if (value.isNotEmpty()) { { IconButton(onClick = { change(""); submit() }) { Icon(Icons.Outlined.Close, stringResource(R.string.clear_search)) } } } else null,
        colors = TextFieldDefaults.colors(focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
            focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent),
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { submit() }))
}

@Composable fun InfoDisclosure(label: Int, message: Int) {
    var open by rememberSaveable { mutableStateOf(false) }
    IconButton(onClick = { open = true }) { Icon(Icons.Outlined.Info, stringResource(label), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
    if (open) KitchenAlertDialog(onDismissRequest = { open = false }, title = { Text(stringResource(label)) }, text = { Text(stringResource(message)) },
        confirmButton = { KitchenTextButton(onClick = { open = false }) { Text(stringResource(R.string.done)) } })
}
