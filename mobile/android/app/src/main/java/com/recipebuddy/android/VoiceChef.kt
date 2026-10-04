package com.recipebuddy.android

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.*
import android.speech.tts.*
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.*
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.util.Locale
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import androidx.compose.foundation.verticalScroll

class VoiceChefController(private val context: Context, private val changed: () -> Unit, private val command: (ChefCommand) -> Unit) {
    private val handler = Handler(Looper.getMainLooper())
    private val audio = context.getSystemService(AudioManager::class.java)
    private val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()
    private val focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes)
        .setOnAudioFocusChangeListener({ if (it < 0) { stop(); command(ChefCommand.PAUSE) } }, handler).build()
    private var tts: TextToSpeech? = null
    private var recognizer: SpeechRecognizer? = null
    private var initialized = false
    private var disposed = false
    private var sequence = 0
    private var locale = "en"
    val speechLanguage: String? get() = tts?.voice?.locale?.language
    val commandLanguage: String get() = if (locale == "fr") "fr-FR" else "en-US"
    var ready = false; private set
    var speaking = false; private set
    var listening = false; private set
    var error = false; private set
    var handsFree = false; private set
    val recognitionAvailable: Boolean get() = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
    init {
        tts = TextToSpeech(context) { status -> handler.post {
            if (!disposed) { initialized = status == TextToSpeech.SUCCESS; language(locale) }
        } }
        tts?.setAudioAttributes(attributes)
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) { }
            override fun onDone(id: String?) { handler.post { if (!disposed && id == "chef-$sequence") { speaking = false; audio.abandonAudioFocusRequest(focus); changed(); if (handsFree) listen() } } }
            @Deprecated("TTS callback") override fun onError(id: String?) { handler.post { if (!disposed && id == "chef-$sequence") { error = true; stop() } } }
        })
    }
    fun language(value: String) {
        if (locale != value) { stop(); recognizer?.destroy(); recognizer = null }
        locale = value
        if (!initialized) return
        // Never silently send recipe text to a network speech engine.
        val voice = tts?.voices?.filter { it.locale.language == value && !it.isNetworkConnectionRequired && TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED !in (it.features ?: emptySet()) }
            ?.sortedByDescending { it.quality }?.firstOrNull()
        ready = voice != null
        if (voice != null) tts?.voice = voice
        changed()
    }
    fun speak(text: String) {
        if (!ready || disposed) { error = true; changed(); return }
        recognizer?.cancel(); listening = false; sequence++; tts?.stop(); error = false
        if (audio.requestAudioFocus(focus) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { error = true; stop(); return }
        speaking = true; changed()
        val chunks = text.chunked(TextToSpeech.getMaxSpeechInputLength() - 1)
        chunks.forEachIndexed { index, chunk ->
            val id = if (index == chunks.lastIndex) "chef-$sequence" else "chef-$sequence-part-$index"
            if (tts?.speak(chunk, if (index == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD, null, id) != TextToSpeech.SUCCESS) { error = true; stop(); return }
        }
    }
    fun enableCommands() { handsFree = true; if (!speaking) listen() }
    fun listen() {
        if (disposed || !handsFree || !recognitionAvailable || context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { handsFree = false; error = true; changed(); return }
        if (recognizer == null && Build.VERSION.SDK_INT >= 31) {
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context).apply { setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { if (handsFree && !speaking && !disposed) { listening = true; changed() } }
                override fun onBeginningOfSpeech() { }
                override fun onRmsChanged(rmsdB: Float) { }
                override fun onBufferReceived(buffer: ByteArray?) { } // Never retain audio.
                override fun onEndOfSpeech() { listening = false; changed() }
                override fun onError(code: Int) { if (!handsFree || speaking || disposed) return; listening = false; handsFree = false; error = code != SpeechRecognizer.ERROR_NO_MATCH && code != SpeechRecognizer.ERROR_SPEECH_TIMEOUT; changed() }
                override fun onResults(results: Bundle?) {
                    listening = false; changed()
                    if (!handsFree || speaking || disposed) return
                    val parsed = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let(::chefCommand) ?: ChefCommand.UNKNOWN
                    if (parsed == ChefCommand.UNKNOWN || parsed == ChefCommand.PAUSE) stop()
                    command(parsed)
                }
                override fun onPartialResults(partialResults: Bundle?) { }
                override fun onEvent(eventType: Int, params: Bundle?) { }
            }) }
        }
        error = false
        runCatching { recognizer?.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, commandLanguage).putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1).putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true).putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)) }
            .onFailure { error = true; handsFree = false; changed() }
    }
    fun stop() { sequence++; handsFree = false; speaking = false; listening = false; recognizer?.cancel(); tts?.stop(); audio.abandonAudioFocusRequest(focus); changed() }
    fun close() { stop(); disposed = true; recognizer?.destroy(); tts?.shutdown(); handler.removeCallbacksAndMessages(null) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun VoiceChefPanel(recipe: Recipe, step: Int, servings: Int, language: String, state: BuddyState, vm: BuddyViewModel, advance: (Int) -> Unit) {
    val context = LocalContext.current
    val owner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    var revision by remember { mutableIntStateOf(0) }
    var consent by remember { mutableStateOf(false) }
    var explanation by remember(recipe.id, step, language) { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var request by remember { mutableStateOf<kotlinx.coroutines.Job?>(null) }
    val latestStep by rememberUpdatedState(step)
    val controller = remember(context) { VoiceChefController(context, { revision++ }, {}) }
    val ready = revision.let { controller.ready }
    fun readStep() { controller.speak(recipe.text(recipe.steps.getOrElse(latestStep) { "" }, language)) }
    fun explain() {
        if(state.me?.pro?.active != true) { vm.showPro(); return }
        val requestedStep = step
        request?.cancel(); busy = true; message = null
        request = scope.launch {
            try {
                val result = buddyJson.parseToJsonElement((context.applicationContext as BuddyApp).kitchen.explain(recipe, requestedStep, servings, language)).jsonObject
                if(latestStep == requestedStep) explanation = result.getValue("explanation").jsonPrimitive.content
            } catch(e: kotlinx.coroutines.CancellationException) { throw e }
            catch(e: Exception) { if(e is ApiFailure && e.status == 402) vm.showPro() else message = context.getString(R.string.voice_ai_unavailable) }
            finally { busy = false }
        }
    }
    val speech = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val words = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if(result.resultCode == android.app.Activity.RESULT_OK && !words.isNullOrBlank()) {
            val requestedStep = step; busy = true
            request = scope.launch {
                try {
                    val payload = kotlinx.serialization.json.buildJsonObject { put("text", kotlinx.serialization.json.JsonPrimitive(words.take(500))); put("language", kotlinx.serialization.json.JsonPrimitive(language)) }
                    val action = buddyJson.parseToJsonElement(vm.api.request("voice-command", "POST", payload.toString())).jsonObject.getValue("action").jsonPrimitive.content
                    if(latestStep == requestedStep) when(action) {
                        "NEXT" -> if(step < recipe.steps.lastIndex) advance(step + 1)
                        "PREVIOUS" -> if(step > 0) advance(step - 1)
                        "REPEAT" -> readStep()
                        "EXPLAIN" -> explain()
                        "INGREDIENTS" -> controller.speak(chefIngredients(recipe, servings, language))
                        "PREVIEW" -> recipe.steps.getOrNull(step + 1)?.let { controller.speak(recipe.text(it, language)) }
                        "PAUSE" -> controller.stop()
                        else -> message = context.getString(R.string.voice_commands_hint)
                    }
                } catch(e: kotlinx.coroutines.CancellationException) { throw e }
                catch(e: Exception) { if(e is ApiFailure && e.status == 402) vm.showPro() else message = context.getString(R.string.voice_ai_unavailable) }
                finally { busy = false }
            }
        }
    }
    fun listen() {
        controller.stop(); message = null
        try { speech.launch(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, if(language == "fr") "fr-FR" else "en-US")
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1).putExtra(RecognizerIntent.EXTRA_PROMPT, context.getString(R.string.voice_commands_hint))) }
        catch (_: android.content.ActivityNotFoundException) { message = context.getString(R.string.voice_commands_unavailable) }
    }
    DisposableEffect(owner, controller) {
        val observer = LifecycleEventObserver { _, event -> if(event == Lifecycle.Event.ON_STOP) controller.stop() }
        owner.lifecycle.addObserver(observer)
        onDispose { request?.cancel(); owner.lifecycle.removeObserver(observer); controller.close() }
    }
    LaunchedEffect(language) { controller.language(language) }
    // Lazy rows are disposed while scrolling. Nothing here starts playback.
    LaunchedEffect(recipe.id, step) { request?.cancel(); busy = false; controller.stop() }
    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Outlined.RecordVoiceOver, null, tint = MaterialTheme.colorScheme.primary)
                Column(Modifier.weight(1f)) { Text(stringResource(R.string.voice_chef), style = MaterialTheme.typography.titleMedium); SmallNote(stringResource(if(controller.speaking) R.string.voice_speaking else R.string.voice_step_only)) }
                IconButton(onClick = { if(controller.speaking) controller.stop() else readStep() }, enabled = ready) { Icon(if(controller.speaking) Icons.Outlined.StopCircle else Icons.Outlined.PlayCircle, stringResource(if(controller.speaking) R.string.stop_voice else R.string.start_voice)) }
            }
            if(!ready) KitchenTextButton(onClick = { context.startActivity(Intent("com.android.settings.TTS_SETTINGS")) }) { Text(stringResource(R.string.voice_settings)) }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KitchenTextButton(onClick = ::explain, enabled = !busy) { Icon(Icons.Outlined.AutoAwesome, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.explain_voice)); ProLabel() }
                KitchenTextButton(onClick = { if(state.me?.pro?.active == true) consent = true else vm.showPro() }, enabled = !busy) { Icon(Icons.Outlined.Mic, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.voice_commands)); ProLabel() }
            }
            if(busy) BuddyLoader(Modifier.fillMaxWidth())
            if(controller.error) SmallNote(stringResource(R.string.voice_unavailable))
            message?.let { SmallNote(it) }
        }
    }
    if(consent) KitchenAlertDialog(onDismissRequest = { consent = false }, title = { Text(stringResource(R.string.voice_commands)) }, text = { Text(stringResource(R.string.voice_ai_consent)) },
        confirmButton = { KitchenTextButton(onClick = { consent = false; listen() }) { Text(stringResource(R.string.voice_talk)) } }, dismissButton = { KitchenTextButton(onClick = { consent = false }) { Text(stringResource(R.string.cancel)) } })
    explanation?.let { text -> KitchenBottomSheet(onDismissRequest = { explanation = null }) {
        Column(Modifier.fillMaxWidth().verticalScroll(androidx.compose.foundation.rememberScrollState()).padding(KitchenGutter, 0.dp, KitchenGutter, 28.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(stringResource(R.string.explain_voice), style = MaterialTheme.typography.titleLarge)
            Text(text, style = MaterialTheme.typography.bodyLarge)
            KitchenTextButton(onClick = { controller.speak(text) }, enabled = ready) { Icon(Icons.Outlined.PlayCircle, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.voice_read_explanation)) }
        }
    } }
}
