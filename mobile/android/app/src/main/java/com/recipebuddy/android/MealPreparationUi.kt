package com.recipebuddy.android

import android.content.Intent
import android.provider.CalendarContract
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.*
import androidx.compose.ui.unit.dp
import java.time.*
import java.util.UUID
import kotlinx.serialization.json.*

@Composable
@OptIn(ExperimentalLayoutApi::class)
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
    LaunchedEffect(root.mealValue("version")) {
        if (
            savingVersion.isNotBlank() &&
                savingVersion != root.mealValue("version") &&
                tasks.any {
                    it.mealValue("id") == editing && it.mealValue("description") == description
                }
        ) {
            savingVersion = ""
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
            MealField(mealText("Task", "Tâche"), description, { description = it })
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
                .filter { it.mealValue("date") == taskDate || it.mealValue("id") == editing }
                .sortedBy { it.mealValue("date") + it.mealValue("time") }
                .forEach { task ->
                    Text(
                        task.mealValue("description"),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        task.mealValue("date") +
                            " " +
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
                    if (task.mealValue("status") != "completed")
                        KitchenTextButton(
                            onClick = {
                                editing = task.mealValue("id")
                                description = task.mealValue("description")
                                taskDate = task.mealValue("date")
                                time = task.mealValue("time")
                                active =
                                    (task.mealValue("activeMinutes").toIntOrNull() ?: 0).toString()
                                passive =
                                    (task.mealValue("passiveMinutes").toIntOrNull() ?: 0).toString()
                                planId = task.mealValue("planId")
                                assignee = task.mealValue("assignee")
                                dependencies =
                                    task["dependencies"]!!.jsonArray.map {
                                        it.jsonPrimitive.content
                                    }
                                override = task["override"]!!.jsonPrimitive.boolean
                            }
                        ) {
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
                            Text(mealText("Undo", "Annuler"))
                        }
                    HorizontalDivider()
                }
        }
    }
}

@Composable
private fun MealPreparationComplete(task: JsonObject, state: BuddyState, vm: BuddyViewModel) {
    var rows by rememberSaveable(task.mealValue("id")) { mutableStateOf(emptyList<String>()) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
            MealField(
                mealText("Ingredient", "Ingrédient"),
                row.mealValue("name"),
                { update("name", it) },
            )
            MealField(
                mealText("Actual quantity", "Quantité réelle"),
                row.mealValue("quantity"),
                { update("quantity", it) },
            )
            MealField(mealText("Unit", "Unité"), row.mealValue("unit"), { update("unit", it) })
            TextButton(onClick = { rows = rows.filterIndexed { j, _ -> j != i } }) {
                Text(mealText("Remove", "Retirer"))
            }
        }
        TextButton(onClick = { rows = rows + "{\"name\":\"\",\"quantity\":\"\",\"unit\":\"g\"}" }) {
            Icon(Icons.Default.Kitchen, null)
            Spacer(Modifier.width(8.dp))
            Text(mealText("Stock used", "Stock utilisé"))
        }
        val ingredients =
            rows
                .map { buddyJson.parseToJsonElement(it).jsonObject }
                .filter { it.mealValue("name").isNotBlank() }
        KitchenButton(
            enabled = !state.busy && ingredients.all { it.mealValue("quantity").isNotBlank() },
            onClick = {
                vm.mealChange(
                    "complete-preparation",
                    buildJsonObject {
                        put("id", task.mealValue("id"))
                        put("ingredients", JsonArray(ingredients))
                    },
                )
            },
        ) {
            Icon(Icons.Default.Check, null)
            Spacer(Modifier.width(8.dp))
            Text(mealText("Done", "Terminé"))
        }
    }
}
