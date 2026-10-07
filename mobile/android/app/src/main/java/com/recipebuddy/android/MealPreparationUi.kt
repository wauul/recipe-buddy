package com.recipebuddy.android

import android.content.Intent
import android.provider.CalendarContract
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import java.time.*
import java.util.UUID
import kotlinx.serialization.json.*

@Composable
@OptIn(ExperimentalLayoutApi::class, androidx.compose.foundation.ExperimentalFoundationApi::class)
fun MealPreparationControls(state: BuddyState, vm: BuddyViewModel, date: String) {
    val root = state.meals ?: return
    val kitchen = root["state"]!!.jsonObject
    val tasks = kitchen.mealRows("preparation")
    val plans = kitchen.mealRows("plans")
    val context = LocalContext.current
    val reminderTitle = mealText("Recipe Buddy preparation", "Préparation Recipe Buddy")
    var description by rememberSaveable { mutableStateOf("") }
    var taskDate by rememberSaveable { mutableStateOf(date) }
    var time by rememberSaveable { mutableStateOf("") }
    var active by rememberSaveable { mutableStateOf("0") }
    var passive by rememberSaveable { mutableStateOf("0") }
    var planId by rememberSaveable { mutableStateOf("") }
    var editing by rememberSaveable { mutableStateOf(UUID.randomUUID().toString()) }
    var dependencies by rememberSaveable { mutableStateOf(listOf<String>()) }
    var assignee by rememberSaveable { mutableStateOf(root.mealValue("actorId")) }
    var override by rememberSaveable { mutableStateOf(false) }
    var savingVersion by rememberSaveable { mutableStateOf("") }
    var previousDraft by rememberSaveable { mutableStateOf("") }
    val taskFocus = remember { FocusRequester() }
    val taskView = remember { BringIntoViewRequester() }
    LaunchedEffect(previousDraft.isNotBlank()) {
        if (previousDraft.isNotBlank()) {
            taskView.bringIntoView()
            taskFocus.requestFocus()
        }
    }
    LaunchedEffect(root.mealValue("version")) {
        if (
            savingVersion.isNotBlank() &&
                savingVersion != root.mealValue("version") &&
                tasks.any {
                    it.mealValue("id") == editing && it.mealValue("description") == description
                }
        ) {
            savingVersion = ""
            previousDraft = ""
            editing = UUID.randomUUID().toString()
            description = ""
            planId = ""
            time = ""
            active = "0"
            passive = "0"
            dependencies = emptyList()
            assignee = root.mealValue("actorId")
            override = false
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        run {
            if (previousDraft.isNotBlank())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    KitchenTextButton(
                        enabled = !state.busy,
                        onClick = {
                            val old = buddyJson.parseToJsonElement(previousDraft).jsonObject
                            editing = old.mealValue("id")
                            description = old.mealValue("description")
                            taskDate = old.mealValue("date")
                            time = old.mealValue("time")
                            active = old.mealValue("active")
                            passive = old.mealValue("passive")
                            planId = old.mealValue("planId")
                            assignee = old.mealValue("assignee")
                            dependencies =
                                old["dependencies"]!!.jsonArray.map { it.jsonPrimitive.content }
                            override = old["override"]!!.jsonPrimitive.boolean
                            previousDraft = ""
                        },
                    ) {
                        Text(mealText("Cancel", "Annuler"))
                    }
                    Text(
                        mealText("Edit task", "Modifier la tâche"),
                        style = MaterialTheme.typography.titleSmall,
                    )
                }
            MealField(
                mealText("Task", "Tâche"),
                description,
                { description = it },
                modifier = Modifier.bringIntoViewRequester(taskView).focusRequester(taskFocus),
            )
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(
                        Triple(
                            mealText("Chop vegetables", "Couper les légumes"),
                            mealText("Chop", "Couper"),
                            Icons.Default.ContentCut,
                        ),
                        Triple(
                            mealText("Mix ingredients", "Mélanger les ingrédients"),
                            mealText("Mix", "Mélanger"),
                            Icons.Default.SoupKitchen,
                        ),
                        Triple(
                            mealText("Portion food", "Répartir les portions"),
                            mealText("Portion", "Répartir"),
                            Icons.Default.Inventory2,
                        ),
                    )
                    .forEach { (value, label, icon) ->
                        MealVisualChoice(label, icon, description == value) { description = value }
                    }
            }
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                MealDateProperty(
                    mealText("Day", "Jour"),
                    taskDate,
                    {
                        taskDate = it
                        if (planId.isNotBlank()) override = true
                    },
                )
                KitchenTextButton(
                    onClick = {
                        val initial =
                            runCatching { LocalTime.parse(time) }.getOrDefault(LocalTime.now())
                        android.app
                            .TimePickerDialog(
                                context,
                                { _, hour, minute -> time = "%02d:%02d".format(hour, minute) },
                                initial.hour,
                                initial.minute,
                                true,
                            )
                            .show()
                    }
                ) {
                    Icon(Icons.Default.Schedule, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(time.ifBlank { "—" })
                }
                if (time.isNotBlank())
                    IconButton(onClick = { time = "" }) {
                        Icon(Icons.Default.Close, mealText("Clear time", "Effacer l’heure"))
                    }
            }
            val eligiblePlans =
                plans.filter {
                    it.mealValue("cookedId").isBlank() &&
                        (it.mealValue("date") == taskDate || it.mealValue("id") == planId)
                }
            if (eligiblePlans.isNotEmpty()) {
                Text(mealText("Meal", "Repas"), style = MaterialTheme.typography.labelLarge)
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    eligiblePlans.forEach { plan ->
                        FilterChip(
                            selected = planId == plan.mealValue("id"),
                            onClick = {
                                planId =
                                    if (planId == plan.mealValue("id")) "" else plan.mealValue("id")
                                if (planId.isNotBlank()) {
                                    taskDate = plan.mealValue("date")
                                    override = false
                                }
                            },
                            label = { Text(plan.mealValue("title")) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        )
                    }
                }
            }
            val linked = plans.firstOrNull { it.mealValue("id") == planId }
            val recipe = state.allRecipes.firstOrNull { it.id == linked?.mealValue("recipeId") }
            if (recipe != null)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    recipe.steps.forEachIndexed { index, instruction ->
                        FilterChip(
                            selected = description == instruction,
                            onClick = { description = instruction },
                            label = { Text((index + 1).toString()) },
                            modifier =
                                Modifier.heightIn(min = 48.dp).semantics {
                                    contentDescription = instruction
                                },
                        )
                    }
                }
            MealMinuteStepper(mealText("Active", "Actif"), active, { active = it })
            MealMinuteStepper(mealText("Waiting", "Attente"), passive, { passive = it }, 10080)
            val members = root.mealRows("members")
            if (members.size > 1) {
                Text(mealText("Who", "Qui"), style = MaterialTheme.typography.labelLarge)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    members.forEach { member ->
                        FilterChip(
                            selected = assignee == member.mealValue("userId"),
                            onClick = { assignee = member.mealValue("userId") },
                            label = { Text(member["user"]!!.jsonObject.mealValue("username")) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        )
                    }
                }
            }
            val previousTasks =
                tasks.filter {
                    it.mealValue("id") != editing &&
                        it.mealValue("status") != "dismissed" &&
                        ((it.mealValue("date") == taskDate &&
                            it.mealValue("status") != "completed") ||
                            it.mealValue("id") in dependencies)
                }
            if (previousTasks.isNotEmpty()) {
                Text(mealText("After", "Après"), style = MaterialTheme.typography.labelLarge)
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    previousTasks.forEach { task ->
                        val id = task.mealValue("id")
                        FilterChip(
                            selected = id in dependencies,
                            onClick = {
                                dependencies =
                                    if (id in dependencies) dependencies - id else dependencies + id
                            },
                            label = { Text(task.mealValue("description")) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        )
                    }
                }
            }
            if (planId.isNotBlank())
                FilterChip(
                    selected = override,
                    onClick = { override = !override },
                    label = { Text(mealText("Fixed day", "Jour fixe")) },
                    leadingIcon = { Icon(Icons.Default.Lock, null) },
                    modifier = Modifier.heightIn(min = 48.dp),
                )
            KitchenButton(
                enabled =
                    !state.busy &&
                        description.isNotBlank() &&
                        runCatching { LocalDate.parse(taskDate) }.isSuccess &&
                        (time.isBlank() || runCatching { LocalTime.parse(time) }.isSuccess),
                onClick = {
                    savingVersion = root.mealValue("version")
                    vm.mealChange(
                        "preparation",
                        buildJsonObject {
                            put("id", editing.ifBlank { UUID.randomUUID().toString() })
                            put("description", description)
                            if (planId.isNotBlank()) put("planId", planId)
                            put("date", taskDate)
                            put(
                                "time",
                                time.takeIf { it.isNotBlank() }?.let(::JsonPrimitive) ?: JsonNull,
                            )
                            put("timezone", kitchen.mealValue("timezone"))
                            put(
                                "activeMinutes",
                                active.toIntOrNull()?.let(::JsonPrimitive) ?: JsonNull,
                            )
                            put(
                                "passiveMinutes",
                                passive.toIntOrNull()?.let(::JsonPrimitive) ?: JsonNull,
                            )
                            put("assignee", assignee)
                            put("dependencies", JsonArray(dependencies.map(::JsonPrimitive)))
                            put("override", override)
                            put(
                                "reminder",
                                tasks.find { it.mealValue("id") == editing }?.get("reminder")
                                    ?: JsonPrimitive(false),
                            )
                        },
                    )
                },
            ) {
                Icon(Icons.Default.Check, null)
                Spacer(Modifier.width(8.dp))
                Text(mealText("Save", "Enregistrer"))
            }
            tasks
                .filter { previousDraft.isBlank() }
                .filter { it.mealValue("date") == taskDate || it.mealValue("id") == editing }
                .sortedBy { it.mealValue("date") + it.mealValue("time") }
                .forEach { task ->
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            task.mealValue("description"),
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            task.mealValue("time") +
                                " · " +
                                when (task.mealValue("status")) {
                                    "completed" -> mealText("Completed", "Terminée")
                                    "dismissed" -> mealText("Dismissed", "Écartée")
                                    else -> mealText("Planned", "Prévue")
                                }
                        )
                        if (task["reviewNeeded"]?.jsonPrimitive?.booleanOrNull == true)
                            Text(
                                mealText(
                                    "Meal changed. Review this task.",
                                    "Repas modifié. Vérifiez cette tâche.",
                                )
                            )
                        if (task.mealValue("status") == "planned")
                            KitchenTextButton(
                                enabled = !state.busy,
                                onClick = {
                                    previousDraft =
                                        buildJsonObject {
                                                put("id", editing)
                                                put("description", description)
                                                put("date", taskDate)
                                                put("time", time)
                                                put("active", active)
                                                put("passive", passive)
                                                put("planId", planId)
                                                put("assignee", assignee)
                                                put("override", override)
                                                put(
                                                    "dependencies",
                                                    JsonArray(dependencies.map(::JsonPrimitive)),
                                                )
                                            }
                                            .toString()
                                    editing = task.mealValue("id")
                                    description = task.mealValue("description")
                                    taskDate = task.mealValue("date")
                                    time = task.mealValue("time")
                                    active =
                                        (task.mealValue("activeMinutes").toIntOrNull() ?: 0)
                                            .toString()
                                    passive =
                                        (task.mealValue("passiveMinutes").toIntOrNull() ?: 0)
                                            .toString()
                                    planId = task.mealValue("planId")
                                    assignee = task.mealValue("assignee")
                                    dependencies =
                                        task["dependencies"]!!.jsonArray.map {
                                            it.jsonPrimitive.content
                                        }
                                    override = task["override"]!!.jsonPrimitive.boolean
                                },
                            ) {
                                Icon(Icons.Default.Edit, null)
                                Spacer(Modifier.width(8.dp))
                                Text(mealText("Edit", "Modifier"))
                            }
                        if (task.mealValue("status") == "planned") {
                            MealPreparationComplete(task, state, vm)
                            KitchenTextButton(
                                enabled = !state.busy,
                                onClick = {
                                    vm.mealChange(
                                        "dismiss-preparation",
                                        buildJsonObject { put("id", task.mealValue("id")) },
                                    )
                                },
                            ) {
                                Icon(Icons.Default.Close, null)
                                Spacer(Modifier.width(8.dp))
                                Text(mealText("Dismiss", "Écarter"))
                            }
                            if (task.mealValue("time").isNotBlank())
                                KitchenTextButton(
                                    onClick = {
                                        runCatching {
                                            val start =
                                                LocalDateTime.parse(
                                                        task.mealValue("date") +
                                                            "T" +
                                                            task.mealValue("time")
                                                    )
                                                    .atZone(ZoneId.of(task.mealValue("timezone")))
                                                    .toInstant()
                                                    .toEpochMilli()
                                            context.startActivity(
                                                Intent(Intent.ACTION_INSERT)
                                                    .setData(CalendarContract.Events.CONTENT_URI)
                                                    .putExtra(
                                                        CalendarContract.Events.TITLE,
                                                        reminderTitle,
                                                    )
                                                    .putExtra(
                                                        CalendarContract.EXTRA_EVENT_BEGIN_TIME,
                                                        start,
                                                    )
                                                    .putExtra(
                                                        CalendarContract.EXTRA_EVENT_END_TIME,
                                                        start + 15 * 60000,
                                                    )
                                                    .putExtra(
                                                        CalendarContract.Events.EVENT_TIMEZONE,
                                                        task.mealValue("timezone"),
                                                    )
                                            )
                                        }
                                    }
                                ) {
                                    Text(mealText("Reminder", "Rappel"))
                                }
                        } else
                            KitchenTextButton(
                                enabled = !state.busy && task.mealValue("cookedId").isBlank(),
                                onClick = {
                                    vm.mealChange(
                                        "undo-preparation",
                                        buildJsonObject { put("id", task.mealValue("id")) },
                                    )
                                },
                            ) {
                                Icon(Icons.Default.Undo, null)
                                Spacer(Modifier.width(8.dp))
                                Text(mealText("Undo", "Annuler"))
                            }
                        HorizontalDivider()
                    }
                }
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun MealPreparationComplete(task: JsonObject, state: BuddyState, vm: BuddyViewModel) {
    var rows by rememberSaveable(task.mealValue("id")) { mutableStateOf(emptyList<String>()) }
    var open by rememberSaveable(task.mealValue("id")) { mutableStateOf(false) }
    val pantry = (state.meals?.get("state") as? JsonObject)?.mealRows("pantry") ?: emptyList()
    val choices =
        pantry
            .filter { it.mealValue("quantity") != "0" }
            .distinctBy { it.mealValue("name") to it.mealValue("unit") }
    val ingredients = rows.map { buddyJson.parseToJsonElement(it).jsonObject }
    fun complete() =
        vm.mealChange(
            "complete-preparation",
            buildJsonObject {
                put("id", task.mealValue("id"))
                put(
                    "ingredients",
                    JsonArray(
                        if (open)
                            ingredients.map {
                                JsonObject(
                                    it.filterKeys { key ->
                                        key in listOf("name", "quantity", "unit")
                                    }
                                )
                            }
                        else emptyList()
                    ),
                )
            },
        )
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        KitchenTextButton(onClick = { open = true }, enabled = !state.busy) {
            Icon(Icons.Default.Inventory2, null)
            Spacer(Modifier.width(8.dp))
            Text(mealText("Stock used", "Stock utilisé"))
        }
        if (!open)
            KitchenButton(onClick = { complete() }, enabled = !state.busy) {
                Icon(Icons.Default.Check, null)
                Spacer(Modifier.width(8.dp))
                Text(mealText("Done", "Terminé"))
            }
    }
    if (open)
        Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    mealText("Stock used", "Stock utilisé"),
                    Modifier.weight(1f),
                    style = MaterialTheme.typography.titleSmall,
                )
                IconButton(
                    onClick = {
                        rows = emptyList()
                        open = false
                    },
                    enabled = !state.busy,
                ) {
                    Icon(
                        Icons.Default.Close,
                        mealText("Cancel stock changes", "Annuler le stock utilisé"),
                    )
                }
            }
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                choices.forEach { batch ->
                    val selected = ingredients.any { it.mealValue("id") == batch.mealValue("id") }
                    FilterChip(
                        selected,
                        {
                            rows =
                                if (selected)
                                    rows.filter {
                                        buddyJson
                                            .parseToJsonElement(it)
                                            .jsonObject
                                            .mealValue("id") != batch.mealValue("id")
                                    }
                                else
                                    rows +
                                        buildJsonObject {
                                                put("id", batch.mealValue("id"))
                                                put("name", batch.mealValue("name"))
                                                put("unit", batch.mealValue("unit"))
                                                put("quantity", "")
                                            }
                                            .toString()
                        },
                        enabled = !state.busy && (selected || rows.size < 100),
                        label = { Text(batch.mealValue("name")) },
                        modifier = Modifier.heightIn(min = 48.dp),
                    )
                }
            }
            rows.forEachIndexed { i, raw ->
                val row = buddyJson.parseToJsonElement(raw).jsonObject
                fun update(field: String, value: String) {
                    rows =
                        rows.mapIndexed { j, old ->
                            if (j == i)
                                JsonObject(row + mapOf(field to JsonPrimitive(value))).toString()
                            else old
                        }
                }
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (row["custom"]?.jsonPrimitive?.booleanOrNull == true)
                            Box(Modifier.weight(1f)) {
                                MealField(
                                    mealText("Ingredient", "Ingrédient"),
                                    row.mealValue("name"),
                                    { update("name", it) },
                                )
                            }
                        else
                            Text(
                                row.mealValue("name"),
                                Modifier.weight(1f),
                                style = MaterialTheme.typography.titleSmall,
                            )
                        IconButton(
                            onClick = { rows = rows.filterIndexed { j, _ -> j != i } },
                            enabled = !state.busy,
                        ) {
                            Icon(
                                Icons.Default.Close,
                                mealText("Remove", "Retirer") + " · " + row.mealValue("name"),
                            )
                        }
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.weight(1f)) {
                            MealField(
                                mealText("Quantity used", "Quantité utilisée"),
                                row.mealValue("quantity"),
                                { update("quantity", it) },
                                keyboardType = KeyboardType.Decimal,
                            )
                        }
                        if (
                            row["custom"]?.jsonPrimitive?.booleanOrNull == true ||
                                row.mealValue("unit").isBlank() ||
                                row.mealValue("editable") == "true"
                        )
                            Box(Modifier.weight(1f)) {
                                MealField(
                                    mealText("Unit", "Unité"),
                                    row.mealValue("unit"),
                                    { update("unit", it) },
                                )
                            }
                        else
                            KitchenTextButton(
                                enabled = !state.busy,
                                onClick = { update("editable", "true") },
                            ) {
                                Text(row.mealValue("unit"))
                            }
                    }
                }
            }
            KitchenTextButton(
                enabled = !state.busy && rows.size < 100,
                onClick = {
                    rows = rows + "{\"name\":\"\",\"quantity\":\"\",\"unit\":\"g\",\"custom\":true}"
                },
            ) {
                Icon(Icons.Default.Add, null)
                Spacer(Modifier.width(8.dp))
                Text(mealText("Other ingredient", "Autre ingrédient"))
            }
            KitchenButton(
                enabled =
                    !state.busy &&
                        ingredients.isNotEmpty() &&
                        ingredients.all {
                            it.mealValue("name").isNotBlank() &&
                                it.mealValue("quantity").isNotBlank() &&
                                it.mealValue("unit").isNotBlank()
                        },
                onClick = { complete() },
            ) {
                Icon(Icons.Default.Check, null)
                Spacer(Modifier.width(8.dp))
                Text(mealText("Done", "Terminé"))
            }
        }
}
