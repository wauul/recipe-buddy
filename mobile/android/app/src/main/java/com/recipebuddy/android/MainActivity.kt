package com.recipebuddy.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.SystemBarStyle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import android.content.res.Configuration
import java.util.Locale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.foundation.Image
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import kotlinx.coroutines.delay
import androidx.navigation.compose.*
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.toRoute
import kotlinx.serialization.Serializable

@Serializable object RecipesRoute
@Serializable object IngredientsRoute
@Serializable object AgendaRoute
@Serializable object PantryRoute
@Serializable object ActivityRoute
@Serializable object ShoppingRoute
@Serializable object FriendsRoute
@Serializable object SettingsRoute
@Serializable object EditorRoute
@Serializable object InviteRoute
@Serializable object SearchRoute
@Serializable object HelpRoute
@Serializable data class CommunityRoute(val id: String, val tab: Int = 0)
@Serializable data class ChefKitchenRoute(val id: String)
@Serializable data class DetailRoute(val id: String)
@Serializable data class CookRoute(val id: String)

class MainActivity : ComponentActivity() {
    private var incoming by mutableStateOf<Intent?>(null)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState); enableEdgeToEdge(); incoming = if (savedInstanceState == null) intent else null
        setContent {
            val vm: BuddyViewModel = viewModel(); val state by vm.state.collectAsStateWithLifecycle()
            DisposableEffect(vm) {
                val observer = androidx.lifecycle.LifecycleEventObserver { _, event -> if(event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) vm.foreground() }
                lifecycle.addObserver(observer)
                onDispose { lifecycle.removeObserver(observer) }
            }
            LaunchedEffect(state.account, state.me?.pro?.billingReady) { if(state.me?.pro?.billingReady == true) vm.foreground() }
            LaunchedEffect(incoming) {
                val delivered = incoming ?: return@LaunchedEffect
                delivered.data?.let { if (it.scheme == "recipebuddy") vm.exchange(it) else vm.pendingInvite(it.toString()) }
                if (delivered.action == Intent.ACTION_SEND) delivered.getStringExtra(Intent.EXTRA_TEXT)?.let(vm::pendingImport)
                val recipe = delivered.getStringExtra("recipe"); val account = delivered.getStringExtra("account")
                if (recipe != null && account != null) {
                    vm.pendingDestination(account, recipe, delivered.getBooleanExtra("cook", false))
                }
                incoming = null
            }
            val system = LocalConfiguration.current
            val context = LocalContext.current
            val localized = remember(state.language, state.theme, system) {
                val config = Configuration(system)
                if (state.language != "system") config.setLocale(Locale.forLanguageTag(state.language))
                if (state.theme != "system") config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
                    if (state.theme == "dark") Configuration.UI_MODE_NIGHT_YES else Configuration.UI_MODE_NIGHT_NO
                android.view.ContextThemeWrapper(this@MainActivity, 0).apply { applyOverrideConfiguration(config) }
            }
            CompositionLocalProvider(LocalContext provides localized, LocalConfiguration provides localized.resources.configuration, LocalMealLanguage provides localized.resources.configuration.locales[0].language) {
                KitchenTheme(state.theme) {
                    val lightSurface = MaterialTheme.colorScheme.background.luminance() > 0.5f
                    LaunchedEffect(lightSurface) {
                        val style = if (lightSurface) SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
                            else SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                        this@MainActivity.enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
                    }
                    var launching by rememberSaveable { mutableStateOf(savedInstanceState == null) }
                    LaunchedEffect(Unit) { if (launching) { delay(650); launching = false } }
                    val splash = launching || state.initializing
                    val motion = LocalKitchenMotion.current
                    AnimatedContent(splash, transitionSpec = { fadeIn(tween(if (motion) 180 else 0)) togetherWith fadeOut(tween(if (motion) 120 else 0)) }, label = "launch") { showingSplash ->
                        if (showingSplash) BuddySplash()
                        else AnimatedContent(state.account != null, transitionSpec = { fadeIn(tween(if (motion) 180 else 0)) togetherWith fadeOut(tween(if (motion) 120 else 0)) }, label = "account") { authenticated ->
                            if (!authenticated) LoginScreen(state, vm)
                            else key(state.account) { BuddyNavigation(state, vm); TermsGate(state, vm) }
                        }
                    }
                    if (!splash) BuddyActionIndicator(state.waiting)
                }
            }
        }
    }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); incoming = intent }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun BuddyNavigation(state: BuddyState, vm: BuddyViewModel) {
    val motion = LocalKitchenMotion.current
    if(state.proPrompt) ProSheet(state, vm)
    if(state.mealDraft.containsKey("recipeId")) MealCookingSheet(state, vm)
    state.lastMealOccasion?.let {id->MealCookingSuccess(state,vm,id)}
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val destination = entry?.destination
    val roots = listOf(RecipesRoute, AgendaRoute, PantryRoute, ShoppingRoute, FriendsRoute)
    val labels = listOf(R.string.recipes, R.string.agenda, R.string.pantry, R.string.shopping, R.string.friends)
    val icons = listOf(Icons.AutoMirrored.Outlined.MenuBook, Icons.Outlined.CalendarMonth, Icons.Outlined.Eco, Icons.Outlined.ShoppingBasket, Icons.Outlined.People)
    val selectedIcons = listOf(Icons.AutoMirrored.Filled.MenuBook, Icons.Filled.CalendarMonth, Icons.Filled.Eco, Icons.Filled.ShoppingBasket, Icons.Filled.People)
    val current = roots.indexOfFirst { destination?.route?.substringBefore('?') == it::class.qualifiedName }
    val focus = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    LaunchedEffect(state.mealDraft) { if(state.mealDraft.containsKey("recipeId")) {focus.clearFocus();keyboard?.hide()} }
    val largeType = LocalConfiguration.current.fontScale > 1.3f
    val resume = state.draft.id.isEmpty() && (state.draft.title.isNotBlank() || state.draft.ingredients.isNotEmpty() || state.draft.steps.isNotEmpty())
    val actionLabel = stringResource(if (resume) R.string.resume_draft else R.string.add_recipe)
    fun addRecipe() { if (!resume) vm.edit(); nav.navigate(EditorRoute) }
    LaunchedEffect(entry) { focus.clearFocus(); keyboard?.hide() }
    LaunchedEffect(state.pendingImport, state.account) { if (state.pendingImport != null) nav.navigate(EditorRoute) { launchSingleTop = true } }
    LaunchedEffect(state.pendingInvite, state.account) {
        if (state.pendingInvite != null) { vm.previewInvite(); nav.navigate(InviteRoute) { launchSingleTop = true } }
    }
    LaunchedEffect(state.account, state.pendingRoute) {
        val pending = state.pendingRoute?.split('|')
        if (pending?.size == 3) {
            vm.consumeDestination()
            if (pending[0] == state.account) {
                if(pending[1].startsWith("checkin:")){vm.selectMealKitchen(pending[1].removePrefix("checkin:"));nav.navigate(AgendaRoute){launchSingleTop=true}}
                else if (pending[2] == "true") nav.navigate(CookRoute(pending[1])) { launchSingleTop = true } else nav.navigate(DetailRoute(pending[1])) { launchSingleTop = true }
            }
        }
    }
    fun open(recipe: Recipe) { nav.navigate(DetailRoute(recipe.id)) }
    fun root(route: Any) { nav.navigate(route) {
        // A section button always opens that section. Task routes can otherwise be
        // restored under another tab after a recipe sends the user to Shopping.
        popUpTo(nav.graph.findStartDestination().id)
        launchSingleTop = true
    } }
    Scaffold(
        modifier = Modifier.imePadding(),
        topBar = {
            TopAppBar(colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background), title = {
                if (current >= 0) Text(stringResource(if (current == 0) R.string.your_collection else labels[current]), style = MaterialTheme.typography.headlineMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                else Text(stringResource(when { destination?.route == SettingsRoute::class.qualifiedName -> R.string.settings; destination?.route == EditorRoute::class.qualifiedName -> if (state.draft.id.isEmpty()) R.string.add_recipe else R.string.edit; destination?.route == InviteRoute::class.qualifiedName -> R.string.invite_friend; destination?.route == SearchRoute::class.qualifiedName -> R.string.search; destination?.route == HelpRoute::class.qualifiedName -> R.string.help_title; destination?.route?.startsWith(CommunityRoute::class.qualifiedName!!) == true -> R.string.recipe_community; destination?.route?.startsWith(ChefKitchenRoute::class.qualifiedName!!) == true -> R.string.chef_kitchen; destination?.route?.startsWith(CookRoute::class.qualifiedName!!) == true -> R.string.cooking; else -> R.string.recipes }), style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            },
                navigationIcon = { if (current < 0) IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back)) } },
                actions = { if (current >= 0) { IconButton(onClick = { nav.navigate(SearchRoute) }) { Icon(Icons.Outlined.Search, stringResource(R.string.search_everything)) }; IconButton(onClick = { nav.navigate(SettingsRoute) }) { Icon(Icons.Outlined.AccountCircle, stringResource(R.string.settings)) } } })
        },
        bottomBar = {
            if (current >= 0) Column {
                if (current == 0 && largeType) KitchenActionBar {
                    KitchenButton(onClick = ::addRecipe, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).semantics { contentDescription = actionLabel }) {
                        Icon(if (resume) Icons.Default.Edit else Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text(actionLabel)
                    }
                }
                NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainerLow, tonalElevation = 0.dp) { roots.forEachIndexed { index, route ->
                NavigationBarItem(selected = current == index, onClick = { root(route) }, icon = { Icon(if (current == index) selectedIcons[index] else icons[index], null) }, label = { Text(if(index==2) mealText("Pantry","Stock") else stringResource(labels[index])) })
                } }
            }
        },
        floatingActionButton = { if (current == 0 && !largeType) {
            ExtendedFloatingActionButton(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.semantics { contentDescription = actionLabel },
                onClick = ::addRecipe,
                icon = { Icon(if (resume) Icons.Default.Edit else Icons.Default.Add, null) },
                text = { Text(actionLabel) })
        } },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            state.error?.let { ErrorNotice(it, vm::refresh, vm::clearError) }
            NavHost(nav, startDestination = RecipesRoute, modifier = Modifier.weight(1f),
                enterTransition = {
                    when {
                        !motion -> EnterTransition.None
                        roots.any { it::class.qualifiedName == targetState.destination.route } -> fadeIn(tween(160))
                        targetState.destination.route in listOf(EditorRoute::class.qualifiedName, SearchRoute::class.qualifiedName) -> slideInVertically(tween(220)) { it / 10 } + fadeIn(tween(180))
                        else -> slideInHorizontally(tween(220)) { it / 8 } + fadeIn(tween(180))
                    }
                },
                exitTransition = { if (motion) fadeOut(tween(120)) else ExitTransition.None },
                popEnterTransition = { if (motion) fadeIn(tween(180)) else EnterTransition.None },
                popExitTransition = {
                    when {
                        !motion -> ExitTransition.None
                        initialState.destination.route in listOf(EditorRoute::class.qualifiedName, SearchRoute::class.qualifiedName) -> slideOutVertically(tween(180)) { it / 10 } + fadeOut(tween(120))
                        else -> slideOutHorizontally(tween(180)) { it / 8 } + fadeOut(tween(120))
                    }
                }) {
                composable<RecipesRoute> { CollectionScreen(state, vm, ::open) }
                composable<AgendaRoute> { MealsScreen(state,vm) }
                composable<PantryRoute> { MealsScreen(state,vm,"pantry") { nav.navigate(IngredientsRoute) } }
                composable<ActivityRoute> { MealActivityScreen(state,vm) }
                composable<IngredientsRoute> { IngredientsScreen(state, vm, ::open, { root(ShoppingRoute) }) }
                composable<ShoppingRoute> { MealShoppingDestination(state, vm) }
                composable<FriendsRoute> { Column { KitchenTextButton(onClick={nav.navigate(ActivityRoute)}){Text(mealText("Friends activity","Activité des amis"))};FriendsScreen(state, vm, ::open, { nav.navigate(InviteRoute) }, { nav.navigate(ChefKitchenRoute(it)) }) } }
                composable<InviteRoute> { InvitationScreen(state, vm) }
                composable<SettingsRoute> { SettingsScreen(state, vm) { nav.navigate(HelpRoute) } }
                composable<EditorRoute> { EditorScreen(state, vm, { nav.popBackStack() }) }
                composable<DetailRoute> { entry -> val id = entry.toRoute<DetailRoute>().id
                    RecipeDestination(id, state, vm) { DetailScreen(state, vm, { nav.navigate(CookRoute(id)) }, { state.active?.let(vm::edit); nav.navigate(EditorRoute) }, { root(ShoppingRoute) }, { nav.navigate(CommunityRoute(id, it)) }, { nav.navigate(ChefKitchenRoute(it)) }, { nav.popBackStack() }) }
                }
                composable<CookRoute> { entry -> RecipeDestination(entry.toRoute<CookRoute>().id, state, vm) { CookingScreen(state, vm) } }
                composable<CommunityRoute> { entry -> val route = entry.toRoute<CommunityRoute>(); RecipeDestination(route.id, state, vm, false) { CommunityScreen(state, vm, route.tab) } }
                composable<ChefKitchenRoute> { ChefKitchenScreen(state, vm, it.toRoute<ChefKitchenRoute>().id, ::open) }
                composable<HelpRoute> { HelpScreen(state) }
                composable<SearchRoute> { SearchScreen(state, vm, ::open) { label -> when (label) { R.string.shopping -> root(ShoppingRoute); R.string.friends -> root(FriendsRoute); R.string.settings -> nav.navigate(SettingsRoute); R.string.help_title -> nav.navigate(HelpRoute); else -> root(RecipesRoute) } } }
            }
        }
    }
}

@Composable private fun RecipeDestination(id: String, state: BuddyState, vm: BuddyViewModel, refreshOnEnter: Boolean = true, content: @Composable () -> Unit) {
    // Back navigation must restore the route's recipe, rather than whichever friend recipe was opened last.
    LaunchedEffect(id) { if (refreshOnEnter || state.active?.id != id) vm.openRecipe(id) }
    if (state.active?.id == id) content()
    else Box(Modifier.fillMaxSize().padding(KitchenGutter), contentAlignment = Alignment.Center) { if (state.busy) BuddyLoader() else KitchenEmpty(R.string.error_missing) { KitchenTextButton(onClick = { vm.openRecipe(id) }) { Text(stringResource(R.string.retry)) } } }
}
