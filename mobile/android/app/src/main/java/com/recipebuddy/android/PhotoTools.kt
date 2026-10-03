package com.recipebuddy.android

import android.content.Context
import android.graphics.*
import android.net.Uri
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import kotlinx.coroutines.*

fun imageSource(url: String): Any? = if (url.startsWith("data:image/")) runCatching { Base64.decode(url.substringAfter(','), Base64.DEFAULT) }.getOrNull() else url.ifBlank { null }
suspend fun preparedPhoto(context: Context, uri: Uri): String = withContext(Dispatchers.IO) {
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    require(bounds.outWidth > 0 && bounds.outHeight > 0 && bounds.outWidth.toLong() * bounds.outHeight < 100_000_000)
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 1920) sample *= 2
    var bitmap = resolver.openInputStream(uri).use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) } ?: error("Invalid image")
    val orientation = resolver.openInputStream(uri).use { stream -> stream?.let { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) } } ?: 1
    val matrix = Matrix().apply {
        when (orientation) {
            2 -> setScale(-1f, 1f); 3 -> setRotate(180f); 4 -> { setRotate(180f); postScale(-1f, 1f) }
            5 -> { setRotate(90f); postScale(-1f, 1f) }; 6 -> setRotate(90f)
            7 -> { setRotate(270f); postScale(-1f, 1f) }; 8 -> setRotate(270f)
        }
    }
    bitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    val ratio = minOf(1f, 960f / maxOf(bitmap.width, bitmap.height))
    bitmap = Bitmap.createScaledBitmap(bitmap, maxOf(1, (bitmap.width * ratio).toInt()), maxOf(1, (bitmap.height * ratio).toInt()), true)
    var quality = 85; var encoded: ByteArray
    do { encoded = ByteArrayOutputStream().use { out -> bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out); out.toByteArray() }; quality -= 10 } while (encoded.size > 200_000 && quality >= 25)
    require(encoded.size <= 200_000)
    // Encoding a decoded bitmap copies no EXIF metadata.
    "data:image/jpeg;base64," + Base64.encodeToString(encoded, Base64.NO_WRAP)
}
