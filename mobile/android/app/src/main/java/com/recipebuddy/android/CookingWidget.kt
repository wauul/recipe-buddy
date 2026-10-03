package com.recipebuddy.android

import android.app.*
import android.appwidget.*
import android.content.*
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.*
import kotlinx.serialization.encodeToString
import kotlinx.coroutines.flow.first
import androidx.room.withTransaction

class CookingWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { refresh(context) }
    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) { refresh(context) }
    override fun onDeleted(context: Context, ids: IntArray) { val prefs = context.getSharedPreferences("widgets", 0); ids.forEach { prefs.edit().remove(it.toString()).remove("image:$it").apply() } }
    companion object {
        private fun ids(context: Context) = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, CookingWidget::class.java))
        fun select(context: Context, id: Int, recipe: Recipe, account: String) {
            if (!recipe.owned || (context.applicationContext as BuddyApp).api.session?.userId != account || id !in ids(context)) return
            // Pinning/configuring explicitly authorizes an offline cooking snapshot.
            val previous = selection(context, id)
            val edit = context.getSharedPreferences("widgets", 0).edit().putString(id.toString(), buddyJson.encodeToString(WidgetSelection(account, recipe.id, recipe.title, recipe.copy(imageUrl = ""))))
            if (previous?.recipeId != recipe.id) edit.remove("image:$id")
            edit.apply()
            val source = imageSource(recipe.imageUrl)
            CoroutineScope(Dispatchers.IO).launch {
                val bitmap = if (source is ByteArray) BitmapFactory.decodeByteArray(source, 0, source.size) else runCatching {
                    val result = coil.ImageLoader(context).execute(coil.request.ImageRequest.Builder(context).data(source).size(256).allowHardware(false)
                        .diskCachePolicy(coil.request.CachePolicy.DISABLED).memoryCachePolicy(coil.request.CachePolicy.DISABLED).build())
                    (result.drawable as? android.graphics.drawable.BitmapDrawable)?.bitmap
                }.getOrNull()
                val app = context.applicationContext as BuddyApp
                if (app.api.session?.userId == account && selection(context, id)?.recipeId == recipe.id) {
                    bitmap?.let {
                        val tiny = android.graphics.Bitmap.createScaledBitmap(it, 256, maxOf(1, (256f * it.height / it.width).toInt().coerceAtMost(256)), true)
                        val bytes = java.io.ByteArrayOutputStream().apply { tiny.compress(android.graphics.Bitmap.CompressFormat.JPEG, 65, this) }.toByteArray()
                        context.getSharedPreferences("widgets", 0).edit().putString("image:$id", Base64.encodeToString(bytes, Base64.NO_WRAP)).apply()
                    }; refresh(context)
                }
            }
            refresh(context)
        }
        fun pin(context: Context, recipe: Recipe, account: String): Boolean {
            val manager = AppWidgetManager.getInstance(context)
            if (!manager.isRequestPinAppWidgetSupported) return false
            // Launcher configuration asks the user to choose; the action itself downloads nothing.
            val callback = PendingIntent.getBroadcast(context, recipe.id.hashCode(), Intent(context, PinWidgetReceiver::class.java)
                .putExtra("account", account).putExtra("recipe", recipe.id), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
            return manager.requestPinAppWidget(ComponentName(context, CookingWidget::class.java), null, callback)
        }
        fun clear(context: Context) { context.getSharedPreferences("widgets", 0).edit().clear().commit(); refresh(context) }
        fun deleted(context: Context, recipeId: String) {
            val prefs = context.getSharedPreferences("widgets", 0)
            ids(context).forEach { id -> if (selection(context, id)?.recipeId == recipeId) prefs.edit().remove(id.toString()).remove("image:$id").apply() }; refresh(context)
        }
        fun reconcile(context: Context, ownedIds: Set<String>, complete: Boolean) { if (complete) ids(context).toList().mapNotNull { selection(context, it) }.filter { it.recipeId !in ownedIds }.forEach { deleted(context, it.recipeId) } }
        fun updateRecipe(context: Context, recipe: Recipe) { if (recipe.owned) ids(context).filter { selection(context, it)?.recipeId == recipe.id }.forEach { select(context, it, recipe, (context.applicationContext as BuddyApp).api.session?.userId ?: return) } }
        fun selection(context: Context, id: Int): WidgetSelection? = context.getSharedPreferences("widgets", 0).getString(id.toString(), null)?.let { runCatching { buddyJson.decodeFromString<WidgetSelection>(it) }.getOrNull() }
        fun refresh(context: Context) {
          val app = context.applicationContext as BuddyApp
          CoroutineScope(Dispatchers.IO).launch {
            val preferences = app.preferences.data.first()
            val language = preferences[androidx.datastore.preferences.core.stringPreferencesKey("language")]?.takeIf { it != "system" } ?: java.util.Locale.getDefault().language
            val config = android.content.res.Configuration(context.resources.configuration).apply { setLocale(java.util.Locale.forLanguageTag(language)) }
            val localized = context.createConfigurationContext(config)
            val manager = AppWidgetManager.getInstance(context)
            val account = app.api.session?.userId
            val progress = account?.let { app.database.entries().entries(it, "progress").map { row -> buddyJson.decodeFromString<CookingProgress>(row.payload) }.associateBy { it.recipeId } } ?: emptyMap()
            ids(context).forEach { id ->
                val selected = selection(context, id)?.takeIf { it.account == account }
                val views = RemoteViews(context.packageName, R.layout.cooking_widget)
                val recipe = selected?.recipe
                val step = (progress[selected?.recipeId]?.step ?: 0).coerceIn(0, maxOf(0, (recipe?.steps?.size ?: 1) - 1))
                views.setTextViewText(R.id.widget_title, recipe?.text(recipe.title, language) ?: selected?.title ?: localized.getString(R.string.choose_recipe))
                views.setTextViewText(R.id.widget_progress, if (recipe != null) localized.getString(R.string.step_progress, step + 1, recipe.steps.size) else localized.getString(R.string.widget_choose_note))
                views.setViewVisibility(R.id.widget_controls, if (recipe != null) View.VISIBLE else View.GONE)
                views.setViewVisibility(R.id.widget_steps, if (recipe != null) View.VISIBLE else View.GONE)
                views.setViewVisibility(R.id.widget_progress_bar, if (recipe != null) View.VISIBLE else View.GONE)
                views.setProgressBar(R.id.widget_progress_bar, recipe?.steps?.size ?: 1, step + 1, false)
                views.setTextViewText(R.id.widget_previous, localized.getString(R.string.previous))
                views.setTextViewText(R.id.widget_next, localized.getString(R.string.next))
                views.setTextViewText(R.id.widget_cook, localized.getString(R.string.open_app))
                views.setBoolean(R.id.widget_previous, "setEnabled", step > 0)
                views.setBoolean(R.id.widget_next, "setEnabled", step < (recipe?.steps?.lastIndex ?: 0))
                val instruction = recipe?.text(recipe.steps.getOrElse(step) { "" }, language) ?: ""
                val row = RemoteViews(context.packageName, R.layout.widget_step).apply { setTextViewText(R.id.widget_step_text, instruction) }
                if (android.os.Build.VERSION.SDK_INT >= 31) views.setRemoteAdapter(R.id.widget_steps, RemoteViews.RemoteCollectionItems.Builder().addItem(step.toLong(), row).setHasStableIds(true).build())
                else views.setRemoteAdapter(R.id.widget_steps, Intent(context, WidgetStepsService::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).setData(android.net.Uri.parse("recipebuddy-widget://steps/$id/$step")))
                fun move(delta: Int): PendingIntent = PendingIntent.getBroadcast(context, id * 2 + if (delta > 0) 1 else 0,
                    Intent(context, WidgetStepReceiver::class.java).setAction("com.recipebuddy.android.WIDGET_STEP").setData(android.net.Uri.parse("recipebuddy-widget://move/$id/$step/$delta"))
                        .putExtra("widget", id).putExtra("recipe", selected?.recipeId).putExtra("account", selected?.account).putExtra("step", step).putExtra("delta", delta), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_previous, move(-1)); views.setOnClickPendingIntent(R.id.widget_next, move(1))
                val image = context.getSharedPreferences("widgets", 0).getString("image:$id", null)
                views.setViewVisibility(R.id.widget_photo, if (selected != null && image != null) View.VISIBLE else View.GONE)
                views.setViewVisibility(R.id.widget_art, if (selected != null && image != null) View.GONE else View.VISIBLE)
                if (selected != null && image != null) { val bytes = Base64.decode(image, Base64.DEFAULT); views.setImageViewBitmap(R.id.widget_photo, BitmapFactory.decodeByteArray(bytes, 0, bytes.size)) }
                else views.setImageViewResource(R.id.widget_art, when (recipe?.vibe) { "lazy" -> R.drawable.kitchen_lazy; "fancy" -> R.drawable.kitchen_fancy; "chaotic" -> R.drawable.kitchen_chaotic; else -> R.drawable.kitchen_cozy })
                fun open(cook: Boolean): PendingIntent {
                    val intent = if (selected == null) Intent(context, WidgetConfigureActivity::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                        else Intent(context, MainActivity::class.java).putExtra("recipe", selected.recipeId).putExtra("account", selected.account).putExtra("cook", cook)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    val options = if (android.os.Build.VERSION.SDK_INT >= 35) ActivityOptions.makeBasic().setPendingIntentCreatorBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED).toBundle() else null
                    // Immutable, explicit app destination, delegated only to the launcher.
                    return PendingIntent.getActivity(context, id * 2 + if (cook) 1 else 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE, options)
                }
                val detail = open(false)
                // The recipe body stays on the launcher; only labelled app/header actions navigate.
                views.setOnClickPendingIntent(R.id.widget_root, if (selected == null) detail else null)
                views.setOnClickPendingIntent(R.id.widget_title, detail); views.setOnClickPendingIntent(R.id.widget_photo, detail); views.setOnClickPendingIntent(R.id.widget_art, detail)
                views.setOnClickPendingIntent(R.id.widget_cook, open(true))
                // An earlier render must not restore a private snapshot after sign-out/reconfiguration.
                if (app.api.session?.userId == account && selection(context, id)?.takeIf { it.account == account } == selected) manager.updateAppWidget(id, views)
            }
          }
        }
    }
}
class WidgetStepReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.recipebuddy.android.WIDGET_STEP") return
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as BuddyApp
                val id = intent.getIntExtra("widget", -1)
                val selected = CookingWidget.selection(context, id) ?: return@launch
                val recipe = selected.recipe ?: return@launch
                val delta = intent.getIntExtra("delta", 0)
                if (id !in AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, CookingWidget::class.java)) || delta !in listOf(-1, 1) || !recipe.owned || selected.account != app.api.session?.userId || selected.account != intent.getStringExtra("account") || selected.recipeId != intent.getStringExtra("recipe")) return@launch
                val current = app.database.entries().entry(selected.account, "progress", selected.recipeId)?.let { buddyJson.decodeFromString<CookingProgress>(it.payload) } ?: CookingProgress(selected.recipeId, 0, recipe.servings)
                if (app.api.session?.userId != selected.account || current.step != intent.getIntExtra("step", -1)) return@launch
                val next = (current.step + delta).coerceIn(0, maxOf(0, recipe.steps.lastIndex))
                app.kitchen.kitchen("progress", recipe.id, buddyJson.encodeToString(current.copy(step = next)))
                CookingWidget.refresh(context)
            } finally { pending.finish() }
        }
    }
}
class WidgetStepsService : android.widget.RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = object : RemoteViewsFactory {
        private var text = ""
        override fun onCreate() { onDataSetChanged() }
        override fun onDataSetChanged() {
            val app = application as BuddyApp
            val selected = CookingWidget.selection(app, intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1))
            text = if (selected != null && selected.account == app.api.session?.userId) runBlocking {
                val language = app.preferences.data.first()[androidx.datastore.preferences.core.stringPreferencesKey("language")]?.takeIf { it != "system" } ?: java.util.Locale.getDefault().language
                val progress = app.database.entries().entries(selected.account, "progress").firstOrNull { it.id == selected.recipeId }?.let { buddyJson.decodeFromString<CookingProgress>(it.payload) }
                selected.recipe?.let { it.text(it.steps.getOrElse(progress?.step ?: 0) { "" }, language) } ?: ""
            } else ""
        }
        override fun onDestroy() { text = "" }
        override fun getCount() = if (text.isEmpty()) 0 else 1
        override fun getViewAt(position: Int) = RemoteViews(packageName, R.layout.widget_step).apply { setTextViewText(R.id.widget_step_text, text) }
        override fun getLoadingView(): RemoteViews? = null
        override fun getViewTypeCount() = 1
        override fun getItemId(position: Int) = position.toLong()
        override fun hasStableIds() = true
    }
}
class PinWidgetReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as BuddyApp
                val account = intent.getStringExtra("account") ?: return@launch
                val recipeId = intent.getStringExtra("recipe") ?: return@launch
                val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID || app.api.session?.userId != account) return@launch
                val cached = app.database.entries().entry(account, "recipe", recipeId)?.let { buddyJson.decodeFromString<Recipe>(it.payload) }
                    ?: app.database.entries().entries(account, "download").map { buddyJson.decodeFromString<Download>(it.payload).recipe }.find { it.id == recipeId }
                val recipe = runCatching { buddyJson.decodeFromString<Recipe>(app.api.request("recipes/$recipeId")) }.getOrElse { if (it is ApiFailure) null else cached } ?: return@launch
                if (recipe.owned && app.api.session?.userId == account) CookingWidget.select(context, id, recipe, account)
            } finally { pending.finish() }
        }
    }
}
class WidgetConfigureActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        setResult(RESULT_CANCELED)
        setContent {
            var recipes by remember { mutableStateOf<List<Recipe>>(emptyList()) }; var failed by remember { mutableStateOf(false) }
            var loading by remember { mutableStateOf(true) }; var theme by remember { mutableStateOf("system") }; var language by remember { mutableStateOf(java.util.Locale.getDefault().language) }
            val app = application as BuddyApp
            LaunchedEffect(Unit) {
                val prefs = app.preferences.data.first()
                theme = prefs[androidx.datastore.preferences.core.stringPreferencesKey("theme")] ?: "system"
                language = prefs[androidx.datastore.preferences.core.stringPreferencesKey("language")]?.takeIf { it != "system" } ?: java.util.Locale.getDefault().language
                val account = app.api.session?.userId
                if (account == null) { failed = true; loading = false; return@LaunchedEffect }
                recipes = app.database.entries().entries(account, "recipe").map { buddyJson.decodeFromString<Recipe>(it.payload) }.filter { it.owned }
                try { recipes = (recipes + buddyJson.decodeFromString<RecipePage>(app.api.request("recipes")).items).distinctBy { it.id } } catch (_: Exception) { failed = recipes.isEmpty() } finally { loading = false }
            }
            val localized = remember(language) { createConfigurationContext(android.content.res.Configuration(resources.configuration).apply { setLocale(java.util.Locale.forLanguageTag(language)) }) }
            CompositionLocalProvider(androidx.compose.ui.platform.LocalContext provides localized) {
            KitchenTheme(theme) { Surface(Modifier.fillMaxSize().safeDrawingPadding()) { LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item { Text(stringResource(R.string.choose_recipe), style = MaterialTheme.typography.headlineMedium) }
                if (loading && recipes.isEmpty()) item { CircularProgressIndicator() }
                if (!loading && !failed && recipes.isEmpty()) item { KitchenEmpty(R.string.empty_recipes) }
                if (failed) item { Text(stringResource(R.string.widget_connection)); TextButton(onClick = { startActivity(Intent(this@WidgetConfigureActivity, MainActivity::class.java)); finish() }) { Text(stringResource(R.string.open_app)) } }
                items(recipes, key = { it.id }) { recipe -> RecipeResultRow(recipe, language) {
                    val account = app.api.session?.userId ?: return@RecipeResultRow
                    CookingWidget.select(this@WidgetConfigureActivity, id, recipe, account)
                    setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)); finish()
                } }
            } } }
            }
        }
    }
}
