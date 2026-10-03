package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.*
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.*

@Composable fun ChefQrScanner(found: (String) -> Unit) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val latestFound by rememberUpdatedState(found)
    val scanner = remember { DecoratedBarcodeView(context).apply {
        barcodeView.decoderFactory = DefaultDecoderFactory(listOf(BarcodeFormat.QR_CODE))
        barcodeView.framingRectSize = Size(800, 800)
        setStatusText("")
        decodeSingle(object : BarcodeCallback { override fun barcodeResult(result: BarcodeResult) { pause(); latestFound(result.text) } })
    } }
    DisposableEffect(scanner, lifecycle) {
        val observer = LifecycleEventObserver { _, event -> if(event == Lifecycle.Event.ON_RESUME) scanner.resume() else if(event == Lifecycle.Event.ON_PAUSE) scanner.pause() }
        lifecycle.addObserver(observer); if(lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) scanner.resume()
        onDispose { lifecycle.removeObserver(observer); scanner.pause() }
    }
    AndroidView(factory = { scanner }, modifier = Modifier.fillMaxWidth().aspectRatio(1f))
}
