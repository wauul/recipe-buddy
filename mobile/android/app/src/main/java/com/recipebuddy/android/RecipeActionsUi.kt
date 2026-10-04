package com.recipebuddy.android

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun RecipeActionsSheet(recipe: Recipe, language: String, busy: Boolean,
    roastEnabled: Boolean, dismiss: () -> Unit, edit: () -> Unit, share: () -> Unit,
    widget: () -> Unit, roast: () -> Unit, delete: () -> Unit) {
    KitchenBottomSheet(dismiss, rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding()
            .padding(horizontal = KitchenGutter).padding(bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(stringResource(R.string.recipe_actions), style = MaterialTheme.typography.titleLarge)
                    Text(recipe.text(recipe.title, language), style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                IconButton(onClick = dismiss) { Icon(Icons.Outlined.Close, stringResource(R.string.dismiss)) }
            }
            ActionGroup {
                RecipeAction(R.string.edit, Icons.Outlined.Edit, edit)
                RecipeAction(R.string.share_recipe, Icons.Outlined.Share, share)
            }
            ActionGroup {
                RecipeAction(R.string.add_home_screen, Icons.Outlined.Widgets, widget)
            }
            if (roastEnabled) ActionGroup {
                RecipeAction(R.string.new_roast, Icons.Outlined.FormatQuote, roast, enabled = !busy, pro = true)
            }
            RecipeAction(R.string.delete_recipe_action, Icons.Outlined.DeleteOutline, delete, enabled = !busy, destructive = true)
        }
    }
}

@Composable private fun ActionGroup(content: @Composable ColumnScope.() -> Unit) {
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(vertical = 4.dp), content = content)
    }
}

@Composable private fun RecipeAction(label: Int, icon: ImageVector, action: () -> Unit,
    enabled: Boolean = true, pro: Boolean = false, destructive: Boolean = false) {
    val color = (if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface)
        .copy(alpha = if (enabled) 1f else .38f)
    ListItem(headlineContent = { Text(stringResource(label), color = color) },
        leadingContent = { Icon(icon, null, tint = if (destructive) color else MaterialTheme.colorScheme.primary.copy(alpha = if (enabled) 1f else .38f)) },
        trailingContent = if (pro) { { ProLabel() } } else null,
        colors = ListItemDefaults.colors(containerColor = androidx.compose.ui.graphics.Color.Transparent),
        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).kitchenClickable(enabled = enabled, role = Role.Button, onClick = action))
}
