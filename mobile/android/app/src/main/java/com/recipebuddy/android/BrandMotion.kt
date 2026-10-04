package com.recipebuddy.android

import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import kotlinx.coroutines.delay

val LocalKitchenMotion = staticCompositionLocalOf { true }

@Composable fun KitchenMotion(content: @Composable () -> Unit) {
    val resolver = LocalContext.current.contentResolver
    fun enabled() = Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    var motion by remember(resolver) { mutableStateOf(enabled()) }
    DisposableEffect(resolver) {
        val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) { motion = enabled() }
        }
        resolver.registerContentObserver(Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, observer)
        onDispose { resolver.unregisterContentObserver(observer) }
    }
    CompositionLocalProvider(LocalKitchenMotion provides motion, content = content)
}

// Shared by the splash, in-place loading states and the action status pill.
@Composable fun BuddyLogo(modifier: Modifier = Modifier, size: Dp = 48.dp, loading: Boolean = false) {
    var lift = 0f
    var tilt = 0f
    var scale = 1f
    if (loading && LocalKitchenMotion.current) {
        val loop = rememberInfiniteTransition(label = "chef-logo")
        lift = loop.animateFloat(0f, -4f, infiniteRepeatable(tween(650, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "lift").value
        tilt = loop.animateFloat(-5f, 5f, infiniteRepeatable(tween(650, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "tilt").value
        scale = loop.animateFloat(1f, 1.04f, infiniteRepeatable(tween(650, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "scale").value
    }
    val density = LocalDensity.current
    Image(painterResource(R.drawable.chef_hat), null, modifier.size(size).graphicsLayer {
        translationY = with(density) { lift.dp.toPx() }; rotationZ = tilt; scaleX = scale; scaleY = scale
    }.clip(RoundedCornerShape(size * .28f)))
}

@Composable fun BuddyLoader(modifier: Modifier = Modifier, size: Dp = 36.dp) {
    val label = stringResource(R.string.action_loading)
    Box(modifier.semantics { contentDescription = label; progressBarRangeInfo = ProgressBarRangeInfo.Indeterminate }, contentAlignment = Alignment.Center) {
        BuddyLogo(size = size, loading = true)
    }
}

@Composable fun BuddySplash() {
    Surface(Modifier.fillMaxSize().testTag("launch-splash"), color = MaterialTheme.colorScheme.background) {
        Column(Modifier.safeDrawingPadding().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center) {
            BuddyLogo(size = 96.dp, loading = true)
            Spacer(Modifier.height(24.dp))
            Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineLarge)
        }
    }
}

// Feedback only while the user is waiting, with a short delay and minimum display to avoid
// flashing. This never delays the operation or blocks touch/keyboard input.
@Composable fun BuddyActionIndicator(waiting: Boolean) {
    var visible by remember { mutableStateOf(false) }
    var started by remember { mutableLongStateOf(0L) }
    LaunchedEffect(waiting) {
        if (waiting) { if (!visible) delay(180); if (!visible) started = SystemClock.uptimeMillis(); visible = true }
        else if (visible) { delay((400L - (SystemClock.uptimeMillis() - started)).coerceAtLeast(0)); visible = false }
    }
    if (visible) Popup(alignment = Alignment.BottomCenter,
        offset = IntOffset(0, with(LocalDensity.current) { -104.dp.roundToPx() }),
        properties = PopupProperties(focusable = false, dismissOnBackPress = false, dismissOnClickOutside = false)) {
        Surface(Modifier.testTag("action-loader").semantics { liveRegion = LiveRegionMode.Polite },
            shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerHigh, shadowElevation = 6.dp) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                BuddyLoader(size = 28.dp)
                Text(stringResource(R.string.action_loading), style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

fun Modifier.kitchenClickable(enabled: Boolean = true, onClickLabel: String? = null, role: Role? = null, onClick: () -> Unit): Modifier = composed {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val motion = LocalKitchenMotion.current
    val scale by animateFloatAsState(if (pressed && motion) .96f else 1f, tween(if (motion) 110 else 0), label = "press")
    graphicsLayer { scaleX = scale; scaleY = scale }.clickable(interactionSource = interaction,
        indication = LocalIndication.current, enabled = enabled, onClickLabel = onClickLabel, role = role, onClick = onClick)
}

private fun Modifier.kitchenPress(interaction: MutableInteractionSource): Modifier = composed {
    val pressed by interaction.collectIsPressedAsState()
    val motion = LocalKitchenMotion.current
    val scale by animateFloatAsState(if (pressed && motion) .96f else 1f, tween(if (motion) 110 else 0), label = "button-press")
    graphicsLayer { scaleX = scale; scaleY = scale }
}

@Composable fun KitchenButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true,
    shape: Shape = ButtonDefaults.shape, colors: ButtonColors = ButtonDefaults.buttonColors(),
    elevation: ButtonElevation? = ButtonDefaults.buttonElevation(), border: BorderStroke? = null,
    contentPadding: PaddingValues = ButtonDefaults.ContentPadding, interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit) {
    val interaction = interactionSource ?: remember { MutableInteractionSource() }
    Button(onClick, modifier.kitchenPress(interaction), enabled, shape, colors, elevation, border, contentPadding, interaction, content)
}

@Composable fun KitchenOutlinedButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true,
    shape: Shape = ButtonDefaults.outlinedShape, colors: ButtonColors = ButtonDefaults.outlinedButtonColors(),
    elevation: ButtonElevation? = null, border: BorderStroke? = ButtonDefaults.outlinedButtonBorder(enabled),
    contentPadding: PaddingValues = ButtonDefaults.ContentPadding, interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit) {
    val interaction = interactionSource ?: remember { MutableInteractionSource() }
    OutlinedButton(onClick, modifier.kitchenPress(interaction), enabled, shape, colors, elevation, border, contentPadding, interaction, content)
}

@Composable fun KitchenTextButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true,
    shape: Shape = ButtonDefaults.textShape, colors: ButtonColors = ButtonDefaults.textButtonColors(),
    elevation: ButtonElevation? = null, border: BorderStroke? = null,
    contentPadding: PaddingValues = ButtonDefaults.TextButtonContentPadding, interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit) {
    val interaction = interactionSource ?: remember { MutableInteractionSource() }
    TextButton(onClick, modifier.kitchenPress(interaction), enabled, shape, colors, elevation, border, contentPadding, interaction, content)
}
