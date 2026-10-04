package com.recipebuddy.android

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape

private val Light = lightColorScheme(primary = Color(0xFF396449), onPrimary = Color.White,
    primaryContainer = Color(0xFFE4EBDF), onPrimaryContainer = Color(0xFF293C30), secondary = Color(0xFF396449),
    secondaryContainer = Color(0xFFE4EBDF), onSecondaryContainer = Color(0xFF293C30), surfaceTint = Color(0xFF396449),
    surfaceContainer = Color(0xFFF2F1E9), surfaceContainerHigh = Color(0xFFECEFE3), surfaceContainerLow = Color(0xFFFFFEFB),
    surfaceContainerHighest = Color(0xFFEFEEE5), surfaceContainerLowest = Color(0xFFFFFEFB),
    background = Color(0xFFF8F7F1), onBackground = Color(0xFF26362C), surface = Color(0xFFF8F7F1), onSurface = Color(0xFF26362C),
    surfaceVariant = Color(0xFFF0F1EA), onSurfaceVariant = Color(0xFF626C62), outline = Color(0xFF8D978D), outlineVariant = Color(0xFFE0E4DA), error = Color(0xFFA83F37))
private val Dark = darkColorScheme(primary = Color(0xFF85B67B), onPrimary = Color(0xFF122114),
    primaryContainer = Color(0xFF293D2B), onPrimaryContainer = Color(0xFFECF0E5), secondary = Color(0xFF85B67B),
    secondaryContainer = Color(0xFF293D2B), onSecondaryContainer = Color(0xFFECF0E5), surfaceTint = Color(0xFF85B67B),
    surfaceContainer = Color(0xFF1D2922), surfaceContainerHigh = Color(0xFF26362B), surfaceContainerLow = Color(0xFF1D2922),
    surfaceContainerHighest = Color(0xFF242C26), surfaceContainerLowest = Color(0xFF151A17),
    background = Color(0xFF151A17), onBackground = Color(0xFFECF0E5), surface = Color(0xFF151A17), onSurface = Color(0xFFECF0E5),
    surfaceVariant = Color(0xFF242C26), onSurfaceVariant = Color(0xFFABB6AB), outline = Color(0xFF7D9176), outlineVariant = Color(0xFF364138), error = Color(0xFFFFD4C4))
@Composable fun KitchenTheme(theme: String = "system", content: @Composable () -> Unit) {
    val dark = theme == "dark" || theme == "system" && isSystemInDarkTheme()
    val headings = FontFamily(Font(R.font.bricolage, FontWeight.Bold))
    KitchenMotion { MaterialTheme(colorScheme = if (dark) Dark else Light, shapes = Shapes(
        extraSmall = RoundedCornerShape(8.dp), small = RoundedCornerShape(12.dp), medium = RoundedCornerShape(16.dp), large = RoundedCornerShape(20.dp), extraLarge = RoundedCornerShape(28.dp)), typography = Typography(
        headlineLarge = TextStyle(fontFamily = headings, fontWeight = FontWeight.Bold, fontSize = 32.sp, lineHeight = 38.sp),
        headlineMedium = TextStyle(fontFamily = headings, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 34.sp),
        headlineSmall = TextStyle(fontFamily = headings, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 30.sp),
        titleLarge = TextStyle(fontFamily = headings, fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 28.sp),
        titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
        titleSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
        bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
        bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
        bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 18.sp),
        labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
        labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp),
    ), content = content) }
}
