package com.recipebuddy.android

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import java.util.UUID
import kotlinx.serialization.json.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MealCheckInControls(state: BuddyState, vm: BuddyViewModel) {

    val root = state.meals ?: return

    val check = root["checkIn"] as? JsonObject

    if (check == null) {
        Text(
            mealText(
                "Kitchen check-in is temporarily unavailable. Saved answers are retained.",
                "Le point cuisine est momentanément indisponible. Les réponses enregistrées sont conservées.",
            )
        )
        return
    }

    val availabilityLabel = mealText("Availability", "Disponibilités")

    val kitchen = root["state"]!!.jsonObject

    val kitchenId = root.mealValue("kitchenId")

    val draft = (state.mealCheckIn[kitchenId] as? JsonObject) ?: JsonObject(emptyMap())

    val question = draft["question"] as? JsonObject

    val mode = draft.mealValue("mode")

    val visited = draft["visited"]?.jsonPrimitive?.intOrNull ?: 0
    val pending = draft["pending"]?.jsonPrimitive?.booleanOrNull == true

    val profiles = root.mealRows("profiles").map { it["data"]!!.jsonObject }

    val skipped = draft["skipped"] as? JsonArray ?: JsonArray(emptyList())

    fun putDraft(value: JsonObject) {
        vm.saveMealCheckIn(JsonObject(state.mealCheckIn + mapOf(kitchenId to value)))
    }

    fun patch(vararg values: Pair<String, JsonElement>) {
        putDraft(JsonObject(draft + values.toMap()))
    }

    fun field(name: String, value: String) {
        patch(name to JsonPrimitive(value))
    }

    fun open(q: JsonObject? = null, kind: String = q?.mealValue("kind") ?: "food") {

        val date = q?.mealValue("date")?.ifEmpty { null } ?: check.mealValue("today")

        val context = kitchen.mealRows("contexts").find { it.mealValue("date") == date }

        putDraft(
            buildJsonObject {
                put("mode", kind)
                q?.let { put("question", it) }
                put("title", q?.mealValue("title") ?: "")

                put(
                    "quantity",
                    if (kind == "context") context?.mealValue("timeMinutes") ?: ""
                    else q?.mealValue("quantity") ?: "",
                )

                put("approximate", q?.get("approximate") ?: JsonPrimitive(true))

                put(
                    "personId",
                    q?.mealValue("personId")?.ifEmpty { null }
                        ?: profiles.firstOrNull()?.mealValue("id")
                        ?: "",
                )

                put("date", date)
                put("slot", q?.mealValue("slot")?.ifEmpty { null } ?: "snack")

                put("dayType", context?.mealValue("dayType") ?: "flexible")
                put("diners", context?.get("diners") ?: JsonArray(emptyList()))

                put("eatingOut", context?.get("eatingOut") ?: JsonPrimitive(false))

                put("operationId", UUID.randomUUID().toString())
                put("recordId", UUID.randomUUID().toString())
                put("skipped", skipped)
                put("visited", visited)
            }
        )
    }

    val operationId = draft.mealValue("operationId")

    val confirmed =
        check.mealRows("confirmations").any { it.mealValue("operationId") == operationId } ||
            kitchen.mealRows("eaten").any { it.mealValue("id") == draft.mealValue("recordId") }

    LaunchedEffect(confirmed, pending) {
        if (confirmed && pending)
            putDraft(
                buildJsonObject {
                    put("skipped", skipped)
                    put("saved", true)
                    put("visited", visited + 1)
                    put("done", visited + 1 >= 5)
                }
            )
    }

    fun submit(action: String, data: JsonObject) {

        patch("pending" to JsonPrimitive(true))
        vm.submitCheckIn(action, data, operationId)
    }

    fun guard() =
        question?.let { q ->
            buildJsonObject {
                listOf("kind", "sourceId", "personId", "sourceVersion").forEach { k ->
                    q[k]?.let { put(k, it) }
                }
            }
        }

    val quantity = draft.mealValue("quantity").replace(',', '.')

    val amount = quantity.toDoubleOrNull()

    val numberValid =
        quantity.isBlank() ||
            (amount != null &&
                amount.isFinite() &&
                amount >= 0 &&
                amount <= if (mode == "pantry") 1e7 else 1440.0)

    val food = mode in listOf("meal", "food", "eaten", "leftover-eat")

    val valid =
        numberValid &&
            (!(mode in listOf("pantry", "leftover", "leftover-eat")) || amount != null) &&
            (!food ||
                (draft.mealValue("personId").isNotBlank() &&
                    draft.mealValue("title").isNotBlank() &&
                    (amount == null || (amount > 0 && amount <= 100)))) &&
            (mode != "context" || amount == null || (amount >= 5 && amount % 1.0 == 0.0))

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            mealText(
                "A few optional questions. Skipped answers stay unknown.",
                "Quelques questions facultatives. Les réponses ignorées restent inconnues.",
            ),
            style = MaterialTheme.typography.bodyMedium,
        )

        Text(check.mealValue("timezone"), style = MaterialTheme.typography.bodySmall)

        if (draft["saved"]?.jsonPrimitive?.booleanOrNull == true)
            Text(
                mealText(
                    "Saved. You can correct it below.",
                    "Enregistré. Vous pouvez le corriger ci-dessous.",
                )
            )

        if (pending) {

            Text(
                mealText(
                    "Answer pending. Sync must confirm it before it is saved. Changed or already resolved records need review.",
                    "Réponse en attente. La synchronisation doit la confirmer. Les relevés modifiés ou déjà résolus nécessitent une vérification.",
                )
            )

            SyncProblemCard(state, vm)

            KitchenTextButton({ vm.refreshMeals() }) { Text(mealText("Refresh", "Actualiser")) }

            if (state.pendingChanges == 0)
                KitchenTextButton({
                    patch("pending" to JsonPrimitive(false), "mode" to JsonPrimitive(""))
                }) {
                    Text(mealText("Review current questions", "Vérifier les questions actuelles"))
                }
        }

        if (mode.isNotBlank()) {

            Text(
                if(mode=="context") availabilityLabel else question?.mealValue("title") ?: mealText("Food or drink", "Aliment ou boisson"),
                style = MaterialTheme.typography.titleLarge,
            )

            if (question != null)
                Text(
                    listOf(
                            question.mealValue("personName"),
                            question.mealValue("date"),
                            mealText(
                                question.mealValue("slot"),
                                when (question.mealValue("slot")) {
                                    "breakfast" -> "Petit-déjeuner"
                                    "lunch" -> "Déjeuner"
                                    "dinner" -> "Dîner"
                                    "snack" -> "Collation"
                                    else -> ""
                                },
                            ),
                        )
                        .filter { it.isNotBlank() }
                        .joinToString(" · ")
                )

            if (question?.containsKey("quantity") == true)
                Text(
                    mealText("Previous: ", "Avant : ") +
                        question.mealValue("quantity", mealText("Unknown", "Inconnu")) +
                        " " +
                        question.mealValue("unit") +
                        " · " +
                        if (question["approximate"]?.jsonPrimitive?.booleanOrNull == true)
                            mealText("Approximate", "Approximatif")
                        else if (question["quantity"] == JsonNull) mealText("Unknown", "Inconnu")
                        else mealText("Exact", "Exact")
                )

            if (!pending) {

                if (food) {

                    MealField(
                        mealText("What was eaten or drunk?", "Qu’avez-vous mangé ou bu ?"),
                        draft.mealValue("title"),
                        { field("title", it.take(160)) },
                    )

                    if (mode == "meal")
                        Text(
                            mealText(
                                "Keep the meal or describe what was actually eaten elsewhere.",
                                "Gardez le repas ou décrivez ce qui a réellement été consommé ailleurs.",
                            )
                        )

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        profiles.forEach { p ->
                            FilterChip(
                                selected = draft.mealValue("personId") == p.mealValue("id"),
                                onClick = { field("personId", p.mealValue("id")) },
                                enabled = question?.mealValue("personId").isNullOrBlank(),
                                label = { Text(p.mealValue("name")) },
                            )
                        }
                    }

                    MealField(
                        mealText("Date · YYYY-MM-DD", "Date · AAAA-MM-JJ"),
                        draft.mealValue("date"),
                        { field("date", it.take(10)) },
                    )

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                                "breakfast" to mealText("Breakfast", "Petit-déjeuner"),
                                "lunch" to mealText("Lunch", "Déjeuner"),
                                "dinner" to mealText("Dinner", "Dîner"),
                                "snack" to mealText("Snack / drink", "Collation / boisson"),
                            )
                            .forEach { (v, label) ->
                                FilterChip(
                                    draft.mealValue("slot") == v,
                                    { field("slot", v) },
                                    label = { Text(label) },
                                )
                            }
                    }

                    if (profiles.isEmpty())
                        Text(
                            mealText(
                                "Add a person through Household’s consent flow first.",
                                "Ajoutez d’abord une personne avec son consentement dans Foyer.",
                            )
                        )
                }

                if (mode == "context") {

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        check.mealRows("contexts").forEach { c ->
                            val date = c.mealValue("sourceId")
                            FilterChip(
                                draft.mealValue("date") == date,
                                {
                                    open(
                                        JsonObject(
                                            c +
                                                mapOf(
                                                    "date" to JsonPrimitive(date),
                                                    "title" to JsonPrimitive(availabilityLabel),
                                                )
                                        ),
                                        "context",
                                    )
                                },
                                label = { Text(date) },
                            )
                        }
                    }

                    Text(
                        mealText(
                            "Applies to this local date only; expires at the next midnight.",
                            "S’applique uniquement à cette date locale ; expire au prochain minuit.",
                        )
                    )

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(
                                "work" to mealText("Work", "Travail"),
                                "rest" to mealText("Rest", "Repos"),
                                "gym" to mealText("Workout", "Sport"),
                                "flexible" to mealText("Flexible", "Souple"),
                            )
                            .forEach { (v, label) ->
                                FilterChip(
                                    draft.mealValue("dayType") == v,
                                    { field("dayType", v) },
                                    label = { Text(label) },
                                )
                            }
                    }

                    Row {
                        Checkbox(
                            draft["eatingOut"]?.jsonPrimitive?.booleanOrNull == true,
                            { patch("eatingOut" to JsonPrimitive(it)) },
                        )
                        Text(mealText("Eating out", "Repas à l’extérieur"))
                    }

                    Text(mealText("Expected diners", "Convives prévus"))

                    val selected = draft["diners"]?.jsonArray ?: JsonArray(emptyList())

                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        root.mealRows("diners").forEach { p ->
                            val id = p["id"]!!
                            FilterChip(
                                selected.contains(id),
                                {
                                    patch(
                                        "diners" to
                                            JsonArray(
                                                if (selected.contains(id))
                                                    selected.filter { it != id }
                                                else selected + id
                                            )
                                    )
                                },
                                label = { Text(p.mealValue("name")) },
                            )
                        }
                    }
                }

                MealField(
                    when (mode) {
                        "context" ->
                            mealText(
                                "Available minutes · blank if unknown",
                                "Minutes disponibles · vide si inconnu",
                            )
                        "pantry" ->
                            mealText("New amount", "Nouvelle quantité") +
                                " · " +
                                question?.mealValue("unit")
                        "leftover" -> mealText("Remaining servings", "Portions restantes")
                        else ->
                            mealText("Servings · blank if unknown", "Portions · vide si inconnu")
                    },
                    draft.mealValue("quantity"),
                    { field("quantity", it.take(16)) },
                    KeyboardType.Decimal,
                )

                if (mode !in listOf("context", "leftover"))
                    Row {
                        Checkbox(
                            draft["approximate"]?.jsonPrimitive?.booleanOrNull != false,
                            { patch("approximate" to JsonPrimitive(it)) },
                        )
                        Text(mealText("Approximate amount", "Quantité approximative"))
                    }

                if (mode == "leftover") {

                    Text(
                        mealText(
                            "Correction or discard only changes remaining servings. Record eating separately.",
                            "Corriger ou jeter modifie seulement les portions restantes. Enregistrez la consommation séparément.",
                        )
                    )

                    KitchenTextButton({ field("quantity", "0") }) {
                        Text(mealText("Discard remaining servings", "Jeter les portions restantes"))
                    }

                    KitchenTextButton({
                        patch(
                            "mode" to JsonPrimitive("leftover-eat"),
                            "quantity" to JsonPrimitive(""),
                            "date" to check["today"]!!,
                        )
                    }) {
                        Text(
                            mealText("Record eating leftovers", "Enregistrer les restes consommés")
                        )
                    }
                }

                KitchenButton(
                    enabled = valid && !state.busy,
                    onClick = {
                        val id = question?.mealValue("sourceId")

                        val data = buildJsonObject {
                            guard()?.let { put("_checkIn", it) }

                            when (mode) {
                                "pantry" -> {
                                    val batch =
                                        kitchen.mealRows("pantry").first {
                                            it.mealValue("id") == id
                                        }
                                    val prior =
                                        question?.get("quantity")?.jsonPrimitive?.doubleOrNull

                                    if (prior == null) {
                                        batch.forEach { (k, v) -> put(k, v) }
                                        put("quantity", amount!!)
                                    } else {
                                        put("id", id!!)
                                        put("delta", amount!! - prior)
                                        put("reason", "correction")
                                    }
                                    put(
                                        "quantityEstimated",
                                        draft["approximate"] ?: JsonPrimitive(true),
                                    )
                                }

                                "leftover" -> {
                                    kitchen
                                        .mealRows("leftovers")
                                        .first { it.mealValue("id") == id }
                                        .forEach { (k, v) -> put(k, v) }
                                    put("remaining", amount!!)
                                }

                                "context" -> {
                                    val prior =
                                        kitchen.mealRows("contexts").find {
                                            it.mealValue("date") == draft.mealValue("date")
                                        }
                                    put("date", draft.mealValue("date"))
                                    put("timeMinutes", amount?.let(::JsonPrimitive) ?: JsonNull)
                                    put(
                                        "equipment",
                                        prior?.get("equipment") ?: JsonArray(emptyList()),
                                    )
                                    put(
                                        "appetite",
                                        prior?.get("appetite") ?: JsonPrimitive("unknown"),
                                    )
                                    put(
                                        "mealSize",
                                        prior?.get("mealSize") ?: JsonPrimitive("unknown"),
                                    )
                                    listOf("dayType", "diners", "eatingOut").forEach { k ->
                                        put(k, draft[k]!!)
                                    }
                                }

                                else -> {
                                    put(
                                        "id",
                                        if (mode == "eaten") id!! else draft.mealValue("recordId"),
                                    )
                                    listOf("title", "personId", "date", "slot", "approximate")
                                        .forEach { k -> put(k, draft[k]!!) }
                                    put("amount", amount?.let(::JsonPrimitive) ?: JsonNull)
                                    if (mode == "meal") put("planId", id!!)
                                    if (mode == "leftover-eat") put("leftoverId", id!!)
                                    if (mode == "eaten")
                                        kitchen
                                            .mealRows("eaten")
                                            .find { it.mealValue("id") == id }
                                            ?.let { previous ->
                                                previous["planId"]?.let { put("planId", it) }
                                                if (
                                                    previous.mealValue("title") ==
                                                        draft.mealValue("title")
                                                )
                                                    listOf("leftoverId", "occasionId", "recipeId")
                                                        .forEach { k ->
                                                            previous[k]?.let { put(k, it) }
                                                        }
                                            }
                                }
                            }
                        }

                        val action =
                            when (mode) {
                                "pantry" ->
                                    if (question?.get("quantity") == JsonNull) "pantry" else "stock"
                                "leftover" -> "leftover"
                                "context" -> "context"
                                "eaten" -> "edit-eaten"
                                else -> "eat"
                            }

                        submit(action, data)
                    },
                ) {
                    Icon(Icons.Default.Check, null)
                    Spacer(Modifier.width(8.dp))
                    Text(mealText("Save answer", "Enregistrer la réponse"))
                }

                if (mode == "eaten")
                    KitchenTextButton({
                        submit(
                            "remove-eaten",
                            buildJsonObject {
                                put("id", question!!.mealValue("sourceId"))
                                put("_checkIn", guard()!!)
                            },
                        )
                    }) {
                        Text(mealText("Undo this eating record", "Annuler ce relevé alimentaire"))
                    }

                KitchenTextButton({ field("mode", "") }) {
                    Text(mealText("Back to questions", "Retour aux questions"))
                }
            }
        } else {

            val questions =
                check.mealRows("questions").filter {
                    !skipped.contains(
                        JsonPrimitive(it.mealValue("id") + it.mealValue("sourceVersion"))
                    )
                }

            val done = draft["done"]?.jsonPrimitive?.booleanOrNull == true

            if (done)
                Text(
                    mealText(
                        "Done for now. Only saved answers changed your kitchen. This does not confirm a complete day’s intake.",
                        "Terminé pour le moment. Seules les réponses enregistrées ont modifié votre cuisine. Cela ne confirme pas une journée alimentaire complète.",
                    )
                )
            else {

                if (questions.isEmpty())
                    Text(
                        if (check.mealValue("total") == "0")
                            mealText(
                                "Nothing needs confirmation. Your check-in is optional.",
                                "Rien à confirmer. Votre point cuisine est facultatif.",
                            )
                        else
                            mealText(
                                "Skipped for now. Nothing was assumed.",
                                "Ignoré pour le moment. Rien n’a été déduit.",
                            )
                    )

                questions.take((5 - visited).coerceAtLeast(0)).forEach { q ->
                    Column {
                        KitchenTextButton({ open(q) }, enabled = !pending) {
                            Column(Modifier.fillMaxWidth()) {
                                Text(
                                    q.mealValue("title"),
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(
                                    listOf(
                                            q.mealValue("personName"),
                                            q.mealValue("date"),
                                            when (q.mealValue("kind")) {
                                                "pantry" ->
                                                    mealText(
                                                        "Check quantity",
                                                        "Vérifier la quantité",
                                                    )
                                                "leftover" ->
                                                    mealText(
                                                        "Check leftovers",
                                                        "Vérifier les restes",
                                                    )
                                                else ->
                                                    mealText("Confirm meal", "Confirmer le repas")
                                            },
                                        )
                                        .filter { it.isNotBlank() }
                                        .joinToString(" · "),
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }

                        KitchenTextButton({
                            patch(
                                "skipped" to
                                    JsonArray(
                                        skipped +
                                            JsonPrimitive(
                                                q.mealValue("id") + q.mealValue("sourceVersion")
                                            )
                                    ),
                                "visited" to JsonPrimitive(visited + 1),
                                "done" to JsonPrimitive(visited + 1 >= 5),
                            )
                        }) {
                            Text(mealText("Skip", "Passer"))
                        }
                    }
                }

                if (questions.size > 5)
                    Text(
                        mealText(
                            "${questions.size-5} more available afterward. None are required.",
                            "${questions.size-5} autres questions disponibles ensuite. Aucune n’est obligatoire.",
                        )
                    )
            }

            KitchenTextButton({ open() }, enabled = !pending) {
                Text(mealText("Add food or drink", "Ajouter un aliment ou une boisson"))
            }

            KitchenTextButton(
                {
                    val c = check["context"]!!.jsonObject
                    open(
                        JsonObject(
                            c +
                                mapOf(
                                    "date" to check["today"]!!,
                                    "title" to JsonPrimitive(availabilityLabel),
                                )
                        ),
                        "context",
                    )
                },
                enabled = !pending,
            ) {
                Text(mealText("Update availability", "Modifier les disponibilités"))
            }

            KitchenOutlinedButton({
                patch("done" to JsonPrimitive(!done), "visited" to JsonPrimitive(0))
            }) {
                Text(
                    if (done) mealText("Return to questions", "Revenir aux questions")
                    else mealText("Done for now", "Terminer pour le moment")
                )
            }

            if (skipped.isNotEmpty())
                KitchenTextButton({
                    patch("skipped" to JsonArray(emptyList()), "done" to JsonPrimitive(false))
                }) {
                    Text(mealText("Review skipped questions", "Revoir les questions ignorées"))
                }

            check["nextOffset"]?.jsonPrimitive?.intOrNull?.let { offset ->
                KitchenTextButton({ vm.moreCheckIn(offset) }) {
                    Text(mealText("More questions", "Autres questions"))
                }
            }
        }

        var history by remember { mutableStateOf(false) }

        KitchenTextButton({ history = !history }) {
            Text(
                mealText(
                    "Saved changes and corrections",
                    "Modifications enregistrées et corrections",
                )
            )
        }

        if (history) {

            check.mealRows("confirmations").take(10).forEach { c ->
                Text(
                    mealText("Saved: ", "Enregistré : ") +
                        c.mealValue("title") +
                        if (c.containsKey("after"))
                            " : " +
                                c.mealValue("before", mealText("Unknown", "Inconnu")) +
                                " → " +
                                c.mealValue("after") +
                                " " +
                                c.mealValue("unit")
                        else ""
                )
            }

            check.mealRows("corrections").forEach { q ->
                KitchenTextButton({ open(q) }, enabled = !pending) {
                    Text(mealText("Correct ", "Corriger ") + q.mealValue("title"))
                }
            }
        }

        CheckInReminderControls(check, root.mealValue("actorId"), kitchenId, vm)
    }
}

@Composable
private fun CheckInReminderControls(
    check: JsonObject,
    account: String,
    kitchenId: String,
    vm: BuddyViewModel,
) {

    val context = LocalContext.current

    val reminder = check["reminder"]!!.jsonObject

    var expanded by remember { mutableStateOf(false) }

    var enabled by
        remember(reminder) {
            mutableStateOf(reminder["enabled"]?.jsonPrimitive?.booleanOrNull == true)
        }

    var time by remember(reminder) { mutableStateOf(reminder.mealValue("time")) }

    var start by remember(reminder) { mutableStateOf(reminder.mealValue("quietStart")) }

    var end by remember(reminder) { mutableStateOf(reminder.mealValue("quietEnd")) }

    var denied by remember { mutableStateOf(false) }

    val permission =
        rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
            denied = !it
        }

    LaunchedEffect(reminder, account, kitchenId) {
        if (reminder["enabled"]?.jsonPrimitive?.booleanOrNull == true)
            CheckInReminderScheduler.schedule(context, account, kitchenId)
        else CheckInReminderScheduler.cancel(context, account, kitchenId)
    }

    KitchenTextButton({ expanded = !expanded }) {
        Text(mealText("Optional reminders", "Rappels facultatifs"))
    }

    if (expanded) {

        Text(
            mealText(
                "Checks in the background when connected, after this time and outside quiet hours. Battery settings can delay delivery.",
                "Vérifie en arrière-plan avec une connexion, après cette heure et hors des heures calmes. L’économie de batterie peut retarder l’envoi.",
            )
        )

        Row {
            Checkbox(enabled, { enabled = it })
            Text(mealText("Enable reminders", "Activer les rappels"))
        }

        MealField(mealText("After · HH:MM", "Après · HH:MM"), time, { time = it.take(5) })

        MealField(
            mealText("Quiet hours start · HH:MM", "Début des heures calmes · HH:MM"),
            start,
            { start = it.take(5) },
        )

        MealField(
            mealText("Quiet hours end · HH:MM", "Fin des heures calmes · HH:MM"),
            end,
            { end = it.take(5) },
        )

        Text(reminder.mealValue("timezone"))

        val valid =
            listOf(time, start, end).all { Regex("([01][0-9]|2[0-3]):[0-5][0-9]").matches(it) }

        KitchenOutlinedButton(
            enabled = valid,
            onClick = {
                if (
                    enabled &&
                        android.os.Build.VERSION.SDK_INT >= 33 &&
                        context.checkSelfPermission(
                            android.Manifest.permission.POST_NOTIFICATIONS
                        ) != android.content.pm.PackageManager.PERMISSION_GRANTED
                )
                    permission.launch(android.Manifest.permission.POST_NOTIFICATIONS)

                if (!enabled) CheckInReminderScheduler.cancel(context, account, kitchenId)

                vm.mealChange(
                    "check-in-reminder",
                    buildJsonObject {
                        put("enabled", enabled)
                        put("time", time)
                        put("quietStart", start)
                        put("quietEnd", end)
                        put("timezone", reminder.mealValue("timezone"))
                    },
                    false,
                )
            },
        ) {
            Text(mealText("Save reminder settings", "Enregistrer les rappels"))
        }

        if (denied)
            Text(
                mealText(
                    "Notification permission was denied. You can still check in at any time.",
                    "L’autorisation des notifications a été refusée. Le point cuisine reste disponible à tout moment.",
                )
            )
    }
}
