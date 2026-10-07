package com.recipebuddy.android

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import java.util.UUID
import kotlinx.serialization.json.*

internal fun agendaWeekStart(date: LocalDate): LocalDate =
    date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))

internal fun agendaDays(start: LocalDate): List<LocalDate> = (0L..6L).map(start::plusDays)

private fun JsonObject.value(key: String, fallback: String = "") =
    (get(key) as? JsonPrimitive)?.contentOrNull ?: fallback

private fun JsonObject.list(key: String) =
    (get(key) as? JsonArray)?.mapNotNull { it as? JsonObject } ?: emptyList()

/** The calendar is navigation. Only the selected day's content and its next action are shown. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealsScreen(
    state: BuddyState,
    vm: BuddyViewModel,
    initial: String = "agenda",
    recognition: () -> Unit = {},
) {
    var section by rememberSaveable { mutableStateOf(initial) }
    var day by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var week by rememberSaveable { mutableStateOf(agendaWeekStart(LocalDate.now()).toString()) }
    var sheet by rememberSaveable { mutableStateOf("") }
    var selectedId by rememberSaveable { mutableStateOf("") }
    var savedId by rememberSaveable { mutableStateOf("") }
    var savedVersion by rememberSaveable { mutableStateOf("") }
    val root = state.meals
    val kitchen = root?.get("state") as? JsonObject
    val plans = kitchen?.list("plans") ?: emptyList()
    val profiles = root?.list("profiles") ?: emptyList()
    val locale = if (LocalMealLanguage.current == "fr") Locale.FRANCE else Locale.UK
    val selected = plans.find { it.value("id") == selectedId }
    LaunchedEffect(week) { vm.selectMealWindow(week, 7) }
    // Keep a pending draft visible on a failed request; close only after the object exists.
    LaunchedEffect(root, savedId) {
        if (
            savedId.isNotBlank() &&
                root?.value("version") != savedVersion &&
                listOf("plans", "pantry", "manualShopping", "eaten").any { key ->
                    (kitchen?.list(key)?.any { it.value("id") == savedId } == true ||
                        profiles.any { it.value("id") == savedId })
                }
        ) {
            sheet = ""
            savedId = ""
        }
    }
    BackHandler(section != "agenda" && initial == "agenda" && sheet.isBlank()) {
        section = "agenda"
    }
    val title =
        when (section) {
            "pantry" -> mealText("Pantry", "Garde-manger")
            "shopping" -> mealText("Shopping", "Courses")
            "history" -> mealText("Journal", "Journal")
            "profiles" -> mealText("Your household", "Votre foyer")
            else -> mealText("Meal agenda", "Agenda repas")
        }
    Column(Modifier.fillMaxSize()) {
        if (section in listOf("agenda", "history", "profiles"))
            FlowRow(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(
                        "agenda" to mealText("Agenda", "Agenda"),
                        "history" to mealText("Journal", "Journal"),
                        "profiles" to mealText("Household", "Foyer"),
                    )
                    .forEach { (key, label) ->
                        FilterChip(
                            section == key,
                            { section = key },
                            label = { Text(label) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        )
                    }
            }
        if (section != "agenda" && section != initial)
            Text(
                title,
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            if (state.syncProblems.isNotEmpty() || state.offline || state.pendingChanges > 0)
                item {
                    SyncProblemCard(state, vm)
                    if (state.offline || state.pendingChanges > 0)
                        Text(
                            if (state.offline)
                                mealText(
                                    "Offline · saved changes will sync",
                                    "Hors ligne · synchronisation en attente",
                                )
                            else mealText("Syncing your changes", "Synchronisation en cours"),
                            style = MaterialTheme.typography.bodySmall,
                        )
                }
            if (root == null) {
                item {
                    LinearProgressIndicator(Modifier.fillMaxWidth())
                    KitchenTextButton(vm::refreshMeals, enabled = !state.busy) {
                        Text(mealText("Retry", "Réessayer"))
                    }
                }
                return@LazyColumn
            }
            if (section == "agenda" || section == "history") {
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            LocalDate.parse(day)
                                .format(DateTimeFormatter.ofPattern("MMM yyyy", locale))
                                .replaceFirstChar { it.titlecase(locale) },
                            style = MaterialTheme.typography.titleLarge,
                            modifier = Modifier.weight(1f),
                        )
                        KitchenTextButton({
                            day = LocalDate.now().toString()
                            week = agendaWeekStart(LocalDate.now()).toString()
                        }) {
                            Text(mealText("Today", "Aujourd’hui"))
                        }
                        IconButton({
                            week = LocalDate.parse(week).minusWeeks(1).toString()
                            day = LocalDate.parse(day).minusWeeks(1).toString()
                        }) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                mealText("Previous week", "Semaine précédente"),
                            )
                        }
                        IconButton({
                            week = LocalDate.parse(week).plusWeeks(1).toString()
                            day = LocalDate.parse(day).plusWeeks(1).toString()
                        }) {
                            Icon(
                                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                mealText("Next week", "Semaine suivante"),
                            )
                        }
                    }
                    MealWeekStrip(
                        week,
                        day,
                        plans,
                        locale,
                        onDay = { day = it },
                        onWeek = { offset ->
                            val next = LocalDate.parse(week).plusWeeks(offset)
                            week = next.toString()
                            day = LocalDate.parse(day).plusWeeks(offset).toString()
                        },
                    )
                }
                item {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            LocalDate.parse(day)
                                .format(DateTimeFormatter.ofPattern("EEEE d MMM", locale))
                                .replaceFirstChar { it.titlecase(locale) },
                            style = MaterialTheme.typography.titleLarge,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
            if (section == "agenda") {
                val todayPlans =
                    plans
                        .filter { it.value("date") == day }
                        .sortedBy {
                            listOf("breakfast", "lunch", "dinner", "snack")
                                .indexOf(it.value("slot"))
                        }
                if (todayPlans.isEmpty())
                    item {
                        Column(
                            Modifier.fillMaxWidth().padding(vertical = 20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Icon(
                                Icons.Default.Restaurant,
                                null,
                                Modifier.size(36.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                mealText("No meals yet", "Aucun repas"),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                items(todayPlans, key = { it.value("id") }) { meal ->
                    MealObjectRow(
                        meal.value("title"),
                        mealEnum(meal.value("slot")) +
                            " · " +
                            meal.value("servings") +
                            " " +
                            mealText("servings", "portions") +
                            (if (meal.value("cookedId").isNotBlank())
                                " · " + mealText("Cooked", "Cuisiné")
                            else ""),
                        Icons.Default.Restaurant,
                    ) {
                        selectedId = meal.value("id")
                        sheet = "meal"
                    }
                }
                item {
                    val actions =
                        listOf(
                            Triple("eat", mealText("Eaten", "Mangé"), Icons.Default.CheckCircle),
                            Triple(
                                "nutrition",
                                mealText("Nutrition", "Nutrition"),
                                Icons.Default.MonitorHeart,
                            ),
                            Triple(
                                "leftovers",
                                mealText("Leftovers", "Restes"),
                                Icons.Default.Kitchen,
                            ),
                            Triple("ideas", mealText("Ideas", "Idées"), Icons.Default.AutoAwesome),
                            Triple(
                                "week-preview",
                                mealText("Week", "Semaine"),
                                Icons.Default.CalendarMonth,
                            ),
                            Triple(
                                "context",
                                mealText("My day", "Ma journée"),
                                Icons.Default.WbSunny,
                            ),
                            Triple("prepare", mealText("Prep", "Préparer"), Icons.Default.Schedule),
                            Triple(
                                "rescue",
                                mealText("Replan", "Réorganiser"),
                                Icons.Default.EventRepeat,
                            ),
                        )
                    actions.chunked(4).forEach { row ->
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            row.forEach { (key, label, icon) ->
                                Column(
                                    Modifier.weight(1f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .clickable(enabled = !state.busy) {
                                            sheet = key
                                            if (key == "ideas" || key == "week-preview")
                                                vm.mealSuggestions(
                                                    key == "week-preview",
                                                    day,
                                                    2.0,
                                                    emptyList(),
                                                )
                                        }
                                        .padding(vertical = 12.dp)
                                        .semantics(mergeDescendants = true) { role = Role.Button },
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    Icon(
                                        icon,
                                        null,
                                        Modifier.size(24.dp),
                                        tint = MaterialTheme.colorScheme.primary,
                                    )
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        label,
                                        style = MaterialTheme.typography.labelMedium,
                                        maxLines = 1,
                                    )
                                }
                            }
                        }
                    }
                }
                val eaten =
                    kitchen?.list("eaten")?.filter { it.value("date") == day } ?: emptyList()
                if (eaten.isNotEmpty())
                    item {
                        Text(
                            mealText("Actually eaten", "Repas consommés"),
                            style = MaterialTheme.typography.titleMedium,
                        )
                        eaten.forEach { entry ->
                            MealObjectRow(
                                entry.value("title"),
                                profiles
                                    .find { it.value("id") == entry.value("personId") }
                                    ?.get("data")
                                    ?.jsonObject
                                    ?.value("name") ?: "",
                                Icons.Default.CheckCircle,
                            ) {
                                selectedId = entry.value("id")
                                sheet = "eaten"
                            }
                        }
                    }
            }
            if (section == "pantry") {
                item {
                    Text(
                        mealText("What’s in your kitchen", "Dans votre cuisine"),
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                item {
                    KitchenTextButton({ sheet = "checkin" }) {
                        Icon(Icons.Default.FactCheck, null, Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(mealText("Check stock", "Vérifier le stock"))
                    }
                }
                val batches = kitchen?.list("pantry") ?: emptyList()
                if (batches.isEmpty())
                    item {
                        Text(
                            mealText(
                                "Add your first ingredient.",
                                "Ajoutez votre premier ingrédient.",
                            ),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                items(batches, key = { it.value("id") }) { batch ->
                    MealObjectRow(
                        batch.value("name"),
                        batch.value("quantity", mealText("Presence only", "Présence seule")) +
                            " " +
                            batch.value("unit") +
                            " · " +
                            mealEnum(batch.value("storage")),
                        Icons.Default.Kitchen,
                    ) {
                        selectedId = batch.value("id")
                        sheet = "stock"
                    }
                }
            }
            if (section == "shopping") {
                item {
                    Text(
                        mealText("For this week", "Pour cette semaine"),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        mealText(
                            "Buying updates stock only when you confirm it.",
                            "Le stock change quand vous confirmez l’achat.",
                        ),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                val needs = (root["shopping"] as? JsonObject)?.list("needs") ?: emptyList()
                if (needs.isEmpty())
                    item {
                        Text(
                            mealText(
                                "Your planned meals need nothing extra.",
                                "Aucun ingrédient supplémentaire à prévoir.",
                            ),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                items(needs) { need ->
                    MealObjectRow(
                        need.value("name"),
                        need.value("quantity", mealText("Check quantity", "Quantité à vérifier")) +
                            " " +
                            need.value("unit"),
                        Icons.Default.ShoppingBasket,
                    ) {
                        selectedId = need.toString()
                        sheet = "purchase"
                    }
                }
                items(kitchen?.list("manualShopping") ?: emptyList(), key = { it.value("id") }) {
                    entry ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            entry["checked"]?.jsonPrimitive?.booleanOrNull == true,
                            { checked ->
                                vm.mealChange(
                                    "manual-shopping",
                                    JsonObject(entry + mapOf("checked" to JsonPrimitive(checked))),
                                )
                            },
                            modifier =
                                Modifier.semantics { contentDescription = entry.value("name") },
                        )
                        Text(entry.value("name"), Modifier.weight(1f))
                        KitchenTextButton({
                            selectedId = entry.value("id")
                            sheet = "shopping-item"
                        }) {
                            Text(mealText("Edit", "Modifier"))
                        }
                    }
                }
                item {
                    KitchenTextButton({ sheet = "commerce" }) {
                        Text(
                            mealText("Shopping services & receipts", "Services d’achat et tickets")
                        )
                    }
                }
            }
            if (section == "history") {
                val occasions =
                    kitchen?.list("occasions")?.filter {
                        it.value("date") == day &&
                            it["undone"]?.jsonPrimitive?.booleanOrNull != true
                    } ?: emptyList()
                if (occasions.isEmpty())
                    item {
                        Text(
                            mealText(
                                "No cooking recorded on this day.",
                                "Aucune cuisson enregistrée ce jour.",
                            ),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                items(occasions, key = { it.value("id") }) { occasion ->
                    MealObjectRow(
                        occasion.value("title"),
                        occasion.value("servings") +
                            " " +
                            mealText("servings cooked", "portions cuisinées"),
                        Icons.Default.Restaurant,
                    ) {
                        selectedId = occasion.value("id")
                        sheet = "occasion"
                    }
                }
                items(
                    kitchen?.list("eaten")?.filter { it.value("date") == day } ?: emptyList(),
                    key = { it.value("id") },
                ) { entry ->
                    MealObjectRow(
                        entry.value("title"),
                        mealText("Recorded as eaten", "Consommé"),
                        Icons.Default.CheckCircle,
                    ) {
                        selectedId = entry.value("id")
                        sheet = "eaten"
                    }
                }
                item {
                    KitchenTextButton({ sheet = "nutrition" }) {
                        Text(mealText("Daily nutrition", "Nutrition du jour"))
                    }
                }
            }
            if (section == "profiles") {
                items(profiles, key = { it.value("id") }) { profile ->
                    MealObjectRow(
                        (profile["data"] as? JsonObject)?.value("name") ?: "",
                        mealText(
                            "Private preferences & restrictions",
                            "Préférences et restrictions privées",
                        ),
                        Icons.Default.Person,
                    ) {
                        selectedId = profile.value("id")
                        sheet = "profile-editor"
                    }
                }
                item {
                    KitchenTextButton({ sheet = "household" }) {
                        Text(
                            mealText(
                                "Sharing & household settings",
                                "Partage et paramètres du foyer",
                            )
                        )
                    }
                }
            }
        }
        if (root != null)
            KitchenButton(
                onClick = {
                    selectedId = ""
                    sheet =
                        when (section) {
                            "pantry" -> "ingredient"
                            "shopping" -> "manual"
                            "profiles" -> "profile-editor"
                            "history" -> "eat"
                            else -> "recipe"
                        }
                },
                modifier =
                    Modifier.fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .heightIn(min = 48.dp),
                enabled = !state.busy,
            ) {
                Icon(Icons.Default.Add, null, Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    when (section) {
                        "pantry" -> mealText("Add ingredient", "Ajouter un ingrédient")
                        "shopping" -> mealText("Add item", "Ajouter un article")
                        "profiles" -> mealText("Add person", "Ajouter une personne")
                        "history" -> mealText("Record eating", "Noter un repas mangé")
                        else -> mealText("Add meal", "Ajouter un repas")
                    }
                )
            }
    }
    if (sheet.isNotBlank())
        KitchenBottomSheet(
            onDismissRequest = { sheet = "" },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        ) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    when (sheet) {
                        "tools" -> mealText("Your kitchen", "Votre cuisine")
                        "external" -> mealText("Another meal", "Autre repas")
                        "edit" -> mealText("Edit meal", "Modifier le repas")
                        "context" -> mealText("My day", "Ma journée")
                        "prepare" -> mealText("Prepare", "Préparer")
                        "ideas" -> mealText("Ideas", "Idées")
                        "leftovers" -> mealText("Leftovers", "Restes")
                        "week-preview" -> mealText("Week", "Semaine")
                        "checkin" -> "Stock"
                        "rescue" -> mealText("Replan", "Réorganiser")
                        "add" -> mealText("Add a meal", "Ajouter un repas")
                        "recipe" -> mealText("Add a meal", "Ajouter un repas")
                        "meal" -> selected?.value("title") ?: ""
                        "ingredient" -> mealText("Add ingredient", "Ajouter un ingrédient")
                        "stock" -> mealText("Ingredient", "Ingrédient")
                        "eat" -> mealText("Eaten", "Mangé")
                        "nutrition" -> mealText("Daily nutrition", "Nutrition quotidienne")
                        "profile-editor" -> mealText("Person", "Personne")
                        "manual",
                        "shopping-item" -> mealText("Item", "Article")
                        "purchase" -> mealText("Purchase", "Achat")
                        "household" -> mealText("Household", "Foyer")
                        "commerce" -> mealText("Shopping services", "Services d’achat")
                        "pantry-details" -> mealText("Ingredient", "Ingrédient")
                        "remove-plan" -> mealText("Remove meal?", "Retirer le repas ?")
                        "occasion" -> mealText("Cooking", "Cuisson")
                        "eaten" -> mealText("Eaten", "Mangé")
                        else -> mealText("Meal details", "Détails")
                    },
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f),
                )
                IconButton({ sheet = "" }) {
                    Icon(Icons.Default.Close, mealText("Close", "Fermer"))
                }
            }
            LazyColumn(
                Modifier.fillMaxWidth().imePadding(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                item { SyncProblemCard(state, vm) }
                when (sheet) {
                    "recipe",
                    "external",
                    "edit" ->
                        item {
                            MealPlanComposer(
                                state,
                                vm,
                                day,
                                if (sheet == "edit") selected else null,
                                sheet == "external" ||
                                    (sheet == "edit" &&
                                        selected?.value("recipeId").isNullOrBlank()),
                                onSaved = {
                                    savedVersion = root?.value("version") ?: ""
                                    savedId = it
                                },
                            )
                        }
                    "meal" ->
                        item {
                            if (selected != null) {
                                Text(
                                    mealEnum(selected.value("slot")) +
                                        " · " +
                                        selected.value("servings") +
                                        " " +
                                        mealText("servings", "portions"),
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                                if (
                                    selected.value("recipeId").isNotBlank() &&
                                        selected.value("cookedId").isBlank()
                                )
                                    MealActionRow(
                                        mealText("Cook this meal", "Cuisiner ce repas"),
                                        Icons.Default.Restaurant,
                                        enabled = !state.busy,
                                    ) {
                                        vm.saveMealDraft(
                                            buildJsonObject {
                                                put("id", UUID.randomUUID().toString())
                                                put("recipeId", selected.value("recipeId"))
                                                put("planId", selected.value("id"))
                                                put("title", selected.value("title"))
                                                put("date", selected.value("date"))
                                                put("servings", selected["servings"]!!)
                                            }
                                        )
                                        sheet = ""
                                    }
                                if (
                                    selected.value("recipeId").isNotBlank() && state.account != null
                                )
                                    MealActionRow(
                                        mealText("Open recipe", "Ouvrir la recette"),
                                        Icons.Default.MenuBook,
                                    ) {
                                        sheet = ""
                                        vm.pendingDestination(
                                            state.account,
                                            selected.value("recipeId"),
                                            false,
                                        )
                                    }
                                MealActionRow(
                                    mealText("Record eating", "Noter un repas mangé"),
                                    Icons.Default.CheckCircle,
                                ) {
                                    sheet = "eat"
                                }
                                MealActionRow(
                                    mealText("Edit or move", "Modifier ou déplacer"),
                                    Icons.Default.Edit,
                                ) {
                                    sheet = "edit"
                                }
                                MealRepeatControls(selected, state, vm)
                                MealActionRow(
                                    mealText("Remove from agenda", "Retirer de l’agenda"),
                                    Icons.Default.Delete,
                                    enabled = !state.busy,
                                ) {
                                    sheet = "remove-plan"
                                }
                            }
                        }
                    "remove-plan" ->
                        item {
                            Text(
                                mealText(
                                    "Remove this meal from your agenda?",
                                    "Retirer ce repas de votre agenda ?",
                                )
                            )
                            KitchenButton(
                                {
                                    vm.mealChange(
                                        "remove-plan",
                                        buildJsonObject { put("id", selectedId) },
                                    )
                                    sheet = ""
                                },
                                enabled = !state.busy,
                            ) {
                                Text(mealText("Remove meal", "Retirer le repas"))
                            }
                        }
                    "ingredient",
                    "stock" ->
                        item {
                            MealIngredientComposer(
                                state,
                                vm,
                                if (sheet == "stock")
                                    kitchen?.list("pantry")?.find { it.value("id") == selectedId }
                                else null,
                                onSaved = {
                                    savedVersion = root?.value("version") ?: ""
                                    savedId = it
                                },
                            )
                            if (sheet == "stock") MealStockCorrection(state, vm, selectedId)
                            if (sheet == "stock")
                                kitchen
                                    ?.list("history")
                                    ?.filter {
                                        it.value("action") == "stock" &&
                                            it["reversed"]?.jsonPrimitive?.booleanOrNull != true &&
                                            it.value("actorId") == root.value("actorId") &&
                                            it.list("effects").any { effect ->
                                                effect.value("batchId") == selectedId
                                            }
                                    }
                                    ?.takeLast(5)
                                    ?.forEach { entry ->
                                        KitchenTextButton(
                                            {
                                                vm.mealChange(
                                                    "undo-stock",
                                                    buildJsonObject {
                                                        put("id", entry.value("id"))
                                                    },
                                                    false,
                                                )
                                            },
                                            enabled = !state.busy,
                                        ) {
                                            Icon(Icons.Default.Undo, null, Modifier.size(18.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(
                                                mealText("Undo", "Annuler") +
                                                    " · " +
                                                    entry.value("date").take(10)
                                            )
                                        }
                                    }

                            MealActionRow(
                                mealText("Scan ingredients", "Reconnaître des ingrédients"),
                                Icons.Default.CameraAlt,
                            ) {
                                sheet = ""
                                recognition()
                            }
                            MealActionRow(
                                mealText("Product labels & dates", "Étiquettes et dates"),
                                Icons.Default.Info,
                            ) {
                                sheet = "pantry-details"
                            }
                        }
                    "manual",
                    "shopping-item" ->
                        item {
                            var name by
                                rememberSaveable(selectedId) {
                                    mutableStateOf(
                                        kitchen
                                            ?.list("manualShopping")
                                            ?.find { it.value("id") == selectedId }
                                            ?.value("name") ?: ""
                                    )
                                }
                            MealField(mealText("Item", "Article"), name, { name = it })
                            KitchenButton(
                                {
                                    val id = selectedId.ifBlank { UUID.randomUUID().toString() }
                                    savedId = id
                                    vm.mealChange(
                                        "manual-shopping",
                                        buildJsonObject {
                                            put("id", id)
                                            put("name", name)
                                            put("quantity", "")
                                            put("checked", false)
                                        },
                                    )
                                },
                                enabled = name.isNotBlank() && !state.busy,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(mealText("Save item", "Enregistrer"))
                            }
                            if (selectedId.isNotBlank())
                                MealActionRow(
                                    mealText("Remove item", "Retirer l’article"),
                                    Icons.Default.Delete,
                                ) {
                                    vm.mealChange(
                                        "remove-shopping",
                                        buildJsonObject { put("id", selectedId) },
                                    )
                                    sheet = ""
                                }
                        }
                    "purchase" ->
                        item {
                            val need =
                                runCatching { buddyJson.parseToJsonElement(selectedId).jsonObject }
                                    .getOrNull()
                            if (need != null) {
                                var amount by
                                    rememberSaveable(selectedId) {
                                        mutableStateOf(need.value("quantity"))
                                    }
                                Text(
                                    need.value("name"),
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                MealField(
                                    mealText("Actual quantity", "Quantité achetée"),
                                    amount,
                                    { amount = it },
                                )
                                Text(need.value("unit"))
                                KitchenButton(
                                    {
                                        vm.mealChange(
                                            "purchase",
                                            buildJsonObject {
                                                put("id", UUID.randomUUID().toString())
                                                put("name", need.value("name"))
                                                put("quantity", amount.toDouble())
                                                put("unit", need.value("unit"))
                                                put("date", LocalDate.now().toString())
                                            },
                                            false,
                                        )
                                        sheet = ""
                                    },
                                    enabled =
                                        !state.busy &&
                                            amount.toDoubleOrNull()?.let { it > 0 } == true,
                                ) {
                                    Text(mealText("Confirm purchase", "Confirmer l’achat"))
                                }
                            }
                        }
                    "eat" ->
                        item {
                            MealEatingComposer(
                                state,
                                vm,
                                day,
                                selected,
                                onSaved = {
                                    savedVersion = root?.value("version") ?: ""
                                    savedId = it
                                },
                            )
                        }
                    "occasion" ->
                        item {
                            val occasion =
                                kitchen?.list("occasions")?.find { it.value("id") == selectedId }
                            if (occasion != null) {
                                Text(
                                    occasion.value("title"),
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                MealActionRow(
                                    mealText("Photo & personal rating", "Photo et appréciation"),
                                    Icons.Default.CameraAlt,
                                ) {
                                    vm.followMeal(occasion)
                                    sheet = ""
                                }
                                MealActionRow(
                                    mealText("Undo cooking", "Annuler la cuisson"),
                                    Icons.Default.Undo,
                                    enabled = !state.busy,
                                ) {
                                    vm.mealChange(
                                        "undo-cook",
                                        buildJsonObject { put("id", selectedId) },
                                        false,
                                    )
                                    sheet = ""
                                }
                            }
                        }
                    "eaten" ->
                        item {
                            val eaten =
                                kitchen?.list("eaten")?.find { it.value("id") == selectedId }
                            Text(eaten?.value("title") ?: "")
                            MealActionRow(
                                mealText(
                                    "Nutrition & actual portion",
                                    "Nutrition et portion consommée",
                                ),
                                Icons.Default.MonitorHeart,
                            ) {
                                sheet = "nutrition"
                            }
                            MealActionRow(
                                mealText("Remove eating record", "Retirer le repas mangé"),
                                Icons.Default.Delete,
                                enabled = !state.busy,
                            ) {
                                vm.mealChange(
                                    "remove-eaten",
                                    buildJsonObject { put("id", selectedId) },
                                    false,
                                )
                                sheet = ""
                            }
                        }
                    "nutrition" -> item { MealNutritionControls(state, vm, day) }
                    "context" -> item { MealContextControls(state, vm, day) }
                    "prepare" -> item { MealPreparationControls(state, vm, day) }
                    "leftovers" -> item { MealLeftoverControls(state, vm, day) }
                    "checkin" -> item { MealCheckInControls(state, vm) }
                    "rescue" -> item { MealRescueControls(state, vm, week) }
                    "commerce" -> item { MealCommerceControls(state, vm, week) }
                    "household" -> item { MealHouseholdControls(state, vm) }
                    "week-preview" ->
                        item {
                            if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                            if (state.mealSuggestionLimited)
                                Text(
                                    mealText(
                                        "No reviewed matches for these diners.",
                                        "Aucune correspondance validée pour ces convives.",
                                    )
                                )
                            MealWeekPreviewControls(state, vm)
                        }
                    "ideas" ->
                        item {
                            if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                            if (state.mealSuggestionLimited)
                                Text(
                                    mealText(
                                        "No reviewed matches. You can choose a saved recipe.",
                                        "Aucune correspondance validée. Choisissez une recette enregistrée.",
                                    )
                                )
                            MealDiscoveryControls(state, vm, emptyList(), 2.0, day)
                            MealActionRow(mealText("Recipes", "Recettes"), Icons.Default.MenuBook) {
                                sheet = "recipe"
                            }
                        }
                    "profile-editor" ->
                        item {
                            MealPersonComposer(
                                state,
                                vm,
                                profiles.find { it.value("id") == selectedId },
                                onSaved = {
                                    savedVersion = root?.value("version") ?: ""
                                    savedId = it
                                },
                            )
                        }
                    "pantry-details" ->
                        item {
                            MealIngredientComposer(
                                state,
                                vm,
                                kitchen?.list("pantry")?.find { it.value("id") == selectedId },
                                details = true,
                                onSaved = {
                                    savedVersion = root?.value("version") ?: ""
                                    savedId = it
                                },
                            )
                        }
                }
            }
        }
}

@Composable
private fun MealWeekStrip(
    week: String,
    day: String,
    plans: List<JsonObject>,
    locale: Locale,
    onDay: (String) -> Unit,
    onWeek: (Long) -> Unit,
) {
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            agendaDays(LocalDate.parse(week)).forEach { date ->
                val isSelected = date.toString() == day
                val count = plans.count { it.value("date") == date.toString() }
                val ink =
                    if (isSelected) MaterialTheme.colorScheme.onPrimary
                    else MaterialTheme.colorScheme.onSurface
                Column(
                    Modifier.weight(1f)
                        .heightIn(min = 76.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surface
                        )
                        .clickable { onDay(date.toString()) }
                        .semantics(mergeDescendants = true) {
                            selected = isSelected
                            contentDescription =
                                date.format(DateTimeFormatter.ofPattern("EEEE d MMMM", locale)) +
                                    ", " +
                                    count +
                                    " " +
                                    if (locale.language == "fr") "repas" else "meals"
                        },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        date.format(DateTimeFormatter.ofPattern("EEE", locale)),
                        style = MaterialTheme.typography.labelMedium,
                        color = ink,
                    )
                    Text(
                        date.dayOfMonth.toString(),
                        style = MaterialTheme.typography.titleMedium,
                        color = ink,
                    )
                    Box(
                        Modifier.padding(top = 4.dp)
                            .size(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(
                                if (count > 0) ink
                                else androidx.compose.ui.graphics.Color.Transparent
                            )
                    )
                }
            }
        }
    }
}

@Composable
private fun MealObjectRow(
    title: String,
    subtitle: String,
    icon: ImageVector,
    photo: String? = null,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (!photo.isNullOrBlank())
                AsyncImage(
                    photo,
                    null,
                    Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop,
                )
            else
                Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (subtitle.isNotBlank())
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
            }
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                null,
                Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MealActionRow(
    label: String,
    icon: ImageVector,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Row(
            Modifier.padding(vertical = 12.dp, horizontal = 4.dp).heightIn(min = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(icon, null, Modifier.size(24.dp))
            Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyLarge)
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, Modifier.size(20.dp))
        }
    }
}

@Composable
internal fun MealPortionStepper(value: Double, onChange: (Double) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(mealText("Servings", "Portions"), Modifier.weight(1f))
        IconButton({ onChange((value - 0.5).coerceAtLeast(0.5)) }, enabled = value > 0.5) {
            Icon(Icons.Default.Remove, mealText("Fewer servings", "Moins de portions"))
        }
        Text(
            if (value % 1.0 == 0.0) value.toInt().toString() else value.toString(),
            style = MaterialTheme.typography.titleMedium,
        )
        IconButton({ onChange((value + 0.5).coerceAtMost(100.0)) }, enabled = value < 100.0) {
            Icon(Icons.Default.Add, mealText("More servings", "Plus de portions"))
        }
    }
}

@Composable
private fun MealPlanComposer(
    state: BuddyState,
    vm: BuddyViewModel,
    date: String,
    edit: JsonObject?,
    external: Boolean,
    onSaved: (String) -> Unit,
) {
    val draftId =
        rememberSaveable(edit?.value("id")) { edit?.value("id") ?: UUID.randomUUID().toString() }
    var recipeId by
        rememberSaveable(edit?.value("id")) { mutableStateOf(edit?.value("recipeId") ?: "") }
    var title by rememberSaveable(edit?.value("id")) { mutableStateOf(edit?.value("title") ?: "") }
    var slot by
        rememberSaveable(edit?.value("id")) { mutableStateOf(edit?.value("slot") ?: "dinner") }
    var servings by
        rememberSaveable(edit?.value("id")) {
            mutableStateOf(edit?.get("servings")?.jsonPrimitive?.doubleOrNull ?: 2.0)
        }
    var selectedDate by
        rememberSaveable(edit?.value("id")) { mutableStateOf(edit?.value("date") ?: date) }
    var diners by
        rememberSaveable(edit?.value("id")) {
            mutableStateOf(
                (edit?.get("diners") as? JsonArray)?.map { it.jsonPrimitive.content }
                    ?: emptyList<String>()
            )
        }
    var locked by
        rememberSaveable(edit?.value("id")) {
            mutableStateOf(edit?.get("locked")?.jsonPrimitive?.booleanOrNull == true)
        }
    var query by rememberSaveable { mutableStateOf("") }
    var anotherMeal by rememberSaveable(edit?.value("id")) { mutableStateOf(external) }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        if (edit == null)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    !anotherMeal,
                    {
                        anotherMeal = false
                        recipeId = ""
                        title = ""
                    },
                    label = { Text(mealText("Saved recipe", "Recette enregistrée")) },
                )
                FilterChip(
                    anotherMeal,
                    {
                        anotherMeal = true
                        recipeId = ""
                        title = ""
                    },
                    label = { Text(mealText("Another meal", "Autre repas")) },
                )
            }
        if (
            !anotherMeal &&
                recipeId.isBlank() &&
                (edit == null || edit.value("recipeId").isNotBlank())
        ) {
            MealField(
                mealText("Search your recipes", "Rechercher une recette"),
                query,
                { query = it },
            )
            state.allRecipes
                .filter { it.title.contains(query, true) }
                .forEach { recipe ->
                    MealObjectRow(
                        recipe.title,
                        recipe.servings.toString() + " " + mealText("servings", "portions"),
                        Icons.Default.MenuBook,
                        recipe.imageUrl,
                    ) {
                        recipeId = recipe.id
                        title = recipe.title
                        servings = recipe.servings.toDouble()
                    }
                }
            if (state.allRecipes.isEmpty())
                Text(
                    mealText(
                        "Save a recipe first, or plan another meal.",
                        "Enregistrez une recette ou prévoyez un autre repas.",
                    )
                )
        } else {
            if (recipeId.isBlank())
                MealField(mealText("Meal name", "Nom du repas"), title, { title = it })
            else {
                Text(title, style = MaterialTheme.typography.titleLarge)
                KitchenTextButton({ recipeId = "" }) {
                    Text(mealText("Change recipe", "Changer de recette"))
                }
            }
            Text(
                LocalDate.parse(selectedDate)
                    .format(
                        DateTimeFormatter.ofPattern(
                            "EEE d MMM",
                            if (LocalMealLanguage.current == "fr") Locale.FRANCE else Locale.UK,
                        )
                    ),
                style = MaterialTheme.typography.bodyMedium,
            )
            if (edit != null)
                MealDateProperty(
                    mealText("Move to day", "Déplacer au jour"),
                    selectedDate,
                    { selectedDate = it },
                )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("breakfast", "lunch", "dinner", "snack").forEach { key ->
                    FilterChip(
                        slot == key,
                        { slot = key },
                        label = { Text(mealEnum(key).replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            MealPortionStepper(servings, { servings = it })
            val people = state.meals?.list("diners") ?: emptyList()
            if (people.isNotEmpty()) {
                Text(
                    mealText("For whom?", "Pour qui ?"),
                    style = MaterialTheme.typography.titleSmall,
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    people.forEach { p ->
                        FilterChip(
                            p.value("id") in diners,
                            {
                                diners =
                                    if (p.value("id") in diners) diners - p.value("id")
                                    else diners + p.value("id")
                            },
                            label = { Text(p.value("name")) },
                        )
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(mealText("Keep this meal fixed", "Garder ce repas fixe"), Modifier.weight(1f))
                Switch(locked, { locked = it })
            }
            KitchenButton(
                {
                    val id = draftId
                    onSaved(id)
                    vm.mealChange(
                        "plan",
                        buildJsonObject {
                            edit?.filterKeys { it != "recipeId" }?.forEach { (k, v) -> put(k, v) }
                            put("id", id)
                            put("date", selectedDate)
                            put("slot", slot)
                            put("title", title)
                            if (recipeId.isNotBlank()) put("recipeId", recipeId)
                            put("servings", servings)
                            put("diners", JsonArray(diners.map(::JsonPrimitive)))
                            put("locked", locked)
                        },
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.busy && title.isNotBlank(),
            ) {
                Text(mealText("Save meal", "Enregistrer le repas"))
            }
        }
    }
}

@Composable
private fun MealIngredientComposer(
    state: BuddyState,
    vm: BuddyViewModel,
    batch: JsonObject?,
    details: Boolean = false,
    onSaved: (String) -> Unit,
) {
    val draftId =
        rememberSaveable(batch?.value("id")) { batch?.value("id") ?: UUID.randomUUID().toString() }
    var name by rememberSaveable(batch?.value("id")) { mutableStateOf(batch?.value("name") ?: "") }
    var quantity by
        rememberSaveable(batch?.value("id")) { mutableStateOf(batch?.value("quantity") ?: "") }
    var unit by rememberSaveable(batch?.value("id")) { mutableStateOf(batch?.value("unit") ?: "g") }
    var brand by
        rememberSaveable(batch?.value("id")) { mutableStateOf(batch?.value("brand") ?: "") }
    var label by
        rememberSaveable(batch?.value("id")) { mutableStateOf(batch?.value("label") ?: "") }
    var storage by
        rememberSaveable(batch?.value("id")) { mutableStateOf(batch?.value("storage") ?: "pantry") }
    var packageDate by
        rememberSaveable(batch?.value("id")) { mutableStateOf(batch?.value("date") ?: "") }
    var dateType by
        rememberSaveable(batch?.value("id")) {
            mutableStateOf(batch?.value("dateType") ?: "unknown")
        }
    var packageSize by
        rememberSaveable(batch?.value("id")) {
            mutableStateOf(batch?.value("packageSize")?.takeIf { it != "null" } ?: "")
        }
    var opened by
        rememberSaveable(batch?.value("id")) {
            mutableStateOf(batch?.value("opened")?.takeIf { it != "null" } ?: "")
        }
    var frozen by
        rememberSaveable(batch?.value("id")) {
            mutableStateOf(batch?.value("frozen")?.takeIf { it != "null" } ?: "")
        }
    var evidence by remember { mutableStateOf(batch?.get("evidence") ?: JsonNull) }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        MealField(mealText("Ingredient", "Ingrédient"), name, { name = it })
        MealField(
            mealText("Quantity (optional)", "Quantité (facultative)"),
            quantity,
            { quantity = it },
            keyboardType = KeyboardType.Decimal,
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("g", "ml", "piece").forEach { key ->
                FilterChip(
                    unit == key,
                    { unit = key },
                    label = { Text(if (key == "piece") mealText("pieces", "pièces") else key) },
                )
            }
        }
        FilterChip(
            unit !in listOf("g", "ml", "piece"),
            { unit = "" },
            label = { Text(mealText("Other unit", "Autre unité")) },
        )
        if (unit !in listOf("g", "ml", "piece"))
            MealField(mealText("Unit", "Unité"), unit, { unit = it })
        if (details) {
            MealField(
                mealText("Pack size", "Format"),
                packageSize,
                { packageSize = it },
                keyboardType = KeyboardType.Decimal,
            )
            MealDateProperty(mealText("Opened", "Ouvert"), opened, { opened = it }, optional = true)
            MealDateProperty(
                mealText("Frozen", "Congelé"),
                frozen,
                { frozen = it },
                optional = true,
            )
            MealProductControls(vm) { product ->
                name = product["name"]!!.jsonPrimitive.content
                brand = product["brand"]!!.jsonPrimitive.content
                label = product["label"]!!.jsonPrimitive.content
                evidence = product
            }
            MealField(mealText("Brand / variant", "Marque / variante"), brand, { brand = it })
            MealField(
                mealText("Composition & allergens", "Composition et allergènes"),
                label,
                { label = it },
            )
            MealChoice(
                mealText("Storage", "Stockage"),
                listOf(
                    "pantry" to mealText("Pantry", "Garde-manger"),
                    "fridge" to mealText("Fridge", "Réfrigérateur"),
                    "freezer" to mealText("Freezer", "Congélateur"),
                ),
                storage,
                { storage = it },
            )
            MealDateProperty(
                mealText("Package date", "Date de l’emballage"),
                packageDate,
                { packageDate = it },
                optional = true,
            )
            MealChoice(
                mealText("Date type", "Type de date"),
                listOf(
                    "unknown" to mealText("Unknown", "Inconnue"),
                    "use-by" to mealText("Use by", "Date limite"),
                    "best-before" to mealText("Best before", "Durabilité minimale"),
                ),
                dateType,
                { dateType = it },
            )
            Text(
                mealText(
                    "Labels and dates do not certify safety. Cross-contact remains unknown.",
                    "Étiquettes et dates ne certifient pas la sécurité. Contaminations croisées inconnues.",
                ),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        KitchenButton(
            {
                val id = draftId
                onSaved(id)
                vm.mealChange(
                    "pantry",
                    buildJsonObject {
                        batch?.forEach { (k, v) -> put(k, v) }
                        put("id", id)
                        put("name", name)
                        put("quantity", quantity.toDoubleOrNull()?.let(::JsonPrimitive) ?: JsonNull)
                        put("unit", unit)
                        if (details) {
                            put(
                                "packageSize",
                                packageSize.toDoubleOrNull()?.let(::JsonPrimitive) ?: JsonNull,
                            )
                            put(
                                "opened",
                                opened.takeIf { it.isNotBlank() }?.let(::JsonPrimitive) ?: JsonNull,
                            )
                            put(
                                "frozen",
                                frozen.takeIf { it.isNotBlank() }?.let(::JsonPrimitive) ?: JsonNull,
                            )
                            put("brand", brand)
                            put("label", label)
                            put("storage", storage)
                            put(
                                "date",
                                packageDate.takeIf { it.isNotBlank() }?.let(::JsonPrimitive)
                                    ?: JsonNull,
                            )
                            put("dateType", dateType)
                            put("evidence", evidence)
                        }
                        if (batch == null) {
                            if (!details) {
                                put("storage", "pantry")
                                put("dateType", "unknown")
                            }
                            put("crossContact", "unknown")
                        }
                    },
                )
            },
            enabled =
                !state.busy &&
                    name.isNotBlank() &&
                    (quantity.isBlank() || quantity.toDoubleOrNull()?.let { it >= 0 } == true) &&
                    (packageSize.isBlank() || packageSize.toDoubleOrNull()?.let { it > 0 } == true),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(mealText("Save ingredient", "Enregistrer l’ingrédient"))
        }
    }
}

@Composable
private fun MealStockCorrection(state: BuddyState, vm: BuddyViewModel, id: String) {
    var open by rememberSaveable(id) { mutableStateOf(false) }
    var delta by rememberSaveable(id) { mutableStateOf("") }
    KitchenTextButton({ open = !open }) {
        Text(mealText("Use, discard or correct quantity", "Utiliser, jeter ou corriger"))
    }
    if (open) {
        MealField(
            mealText("Quantity change (− to use)", "Variation (− pour utiliser)"),
            delta,
            { delta = it },
        )
        KitchenOutlinedButton(
            {
                vm.mealChange(
                    "stock",
                    buildJsonObject {
                        put("id", id)
                        put("delta", delta.toDouble())
                        put("reason", "correction")
                    },
                    false,
                )
            },
            enabled = !state.busy && delta.toDoubleOrNull() != null,
        ) {
            Text(mealText("Update stock", "Actualiser le stock"))
        }
    }
}

@Composable
private fun MealEatingComposer(
    state: BuddyState,
    vm: BuddyViewModel,
    date: String,
    plan: JsonObject? = null,
    onSaved: (String) -> Unit,
) {
    val people = state.meals?.list("profiles") ?: emptyList()
    var person by rememberSaveable {
        mutableStateOf(if (people.size == 1) people.first().value("id") else "")
    }
    var title by rememberSaveable { mutableStateOf(plan?.value("title") ?: "") }
    var slot by rememberSaveable { mutableStateOf(plan?.value("slot") ?: "dinner") }
    var amount by rememberSaveable { mutableStateOf<Double?>(null) }
    val recordId = rememberSaveable { UUID.randomUUID().toString() }
    var planId by rememberSaveable { mutableStateOf(plan?.value("id") ?: "") }
    val plans = (state.meals?.get("state") as? JsonObject)?.mealRows("plans") ?: emptyList()
    val chosenPlan = plans.find { it.mealValue("id") == planId }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text(date, color = MaterialTheme.colorScheme.onSurfaceVariant)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            plans
                .filter { it.mealValue("date") == date }
                .forEach { p ->
                    FilterChip(
                        planId == p.mealValue("id"),
                        {
                            planId = p.mealValue("id")
                            title = p.mealValue("title")
                            slot = p.mealValue("slot")
                        },
                        label = { Text(p.mealValue("title")) },
                    )
                }
        }
        MealField(
            mealText("Food", "Aliment"),
            title,
            {
                title = it
                planId = ""
            },
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            people.forEach { p ->
                FilterChip(
                    person == p.value("id"),
                    { person = p.value("id") },
                    label = { Text((p["data"] as? JsonObject)?.value("name") ?: "") },
                )
            }
        }
        MealChoice(
            mealText("Meal", "Repas"),
            listOf("breakfast", "lunch", "dinner", "snack").map { it to mealEnum(it) },
            slot,
            { slot = it },
        )
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(mealText("Servings", "Portions"), Modifier.weight(1f))
            IconButton(
                { amount = amount?.let { if (it <= .5) null else it - .5 } },
                enabled = amount != null,
            ) {
                Icon(Icons.Default.Remove, mealText("Fewer servings", "Moins de portions"))
            }
            Text(amount?.toString() ?: mealText("Unknown", "Inconnu"))
            IconButton(
                { amount = minOf(100.0, (amount ?: 0.0) + .5) },
                enabled = (amount ?: 0.0) < 100,
            ) {
                Icon(Icons.Default.Add, mealText("More servings", "Plus de portions"))
            }
        }
        if (people.isEmpty())
            Text(mealText("Add a person in Household first.", "Ajoutez une personne dans Foyer."))
        KitchenButton(
            {
                val id = recordId
                onSaved(id)
                vm.mealChange(
                    "eat",
                    buildJsonObject {
                        put("id", id)
                        put("personId", person)
                        put("date", date)
                        put("slot", slot)
                        put("title", title)
                        put("amount", amount?.let { JsonPrimitive(it) } ?: JsonNull)
                        chosenPlan?.mealValue("id")?.let { put("planId", it) }
                        chosenPlan
                            ?.value("cookedId")
                            ?.takeIf { it.isNotBlank() }
                            ?.let { put("occasionId", it) }
                    },
                    false,
                )
            },
            enabled = !state.busy && person.isNotBlank() && title.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(Icons.Default.Check, null)
            Spacer(Modifier.width(8.dp))
            Text(mealText("Save", "Enregistrer"))
        }
    }
}

@Composable
fun MealShoppingDestination(state: BuddyState, vm: BuddyViewModel) {
    var recipes by rememberSaveable { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            FilterChip(
                !recipes,
                { recipes = false },
                label = { Text(mealText("Week", "Semaine")) },
                leadingIcon = { Icon(Icons.Default.CalendarMonth, null) },
            )
            FilterChip(
                recipes,
                { recipes = true },
                label = { Text(mealText("Recipes", "Recettes")) },
                leadingIcon = { Icon(Icons.Default.MenuBook, null) },
            )
        }
        if (recipes) ShoppingScreen(state, vm) else MealsScreen(state, vm, "shopping")
    }
}
