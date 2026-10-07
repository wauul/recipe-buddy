package com.recipebuddy.android

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import java.time.LocalDate
import java.util.UUID
import kotlinx.serialization.json.*

val LocalMealLanguage = staticCompositionLocalOf { "en" }

@Composable
fun mealText(en: String, fr: String): String = if (LocalMealLanguage.current == "fr") fr else en

private fun JsonObject.text(key: String, fallback: String = "") =
    this[key]?.jsonPrimitive?.contentOrNull ?: fallback

private fun JsonObject.rows(key: String) =
    this[key]?.jsonArray?.map { it.jsonObject } ?: emptyList()

@Composable
internal fun MealField(
    label: String,
    value: String,
    change: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    modifier: Modifier = Modifier,
) {
    val focus = LocalFocusManager.current
    OutlinedTextField(
        value,
        change,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { focus.clearFocus() }),
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun MealChoice(
    label: String,
    choices: List<Pair<String, String>>,
    value: String,
    change: (String) -> Unit,
) {
    Column {
        Text(label, style = MaterialTheme.typography.labelLarge)
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            choices.forEach { (key, text) ->
                FilterChip(
                    value == key,
                    { change(key) },
                    label = { Text(text) },
                    modifier = Modifier.heightIn(min = 48.dp),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MealCookingSheet(state: BuddyState, vm: BuddyViewModel) {

    val draft = state.mealDraft

    val follow = draft["followUp"]?.jsonPrimitive?.booleanOrNull ?: false

    var servings by
        rememberSaveable(draft.text("id"), draft.text("recipeId")) {
            mutableStateOf(draft.text("servings", "2"))
        }

    var photo by rememberSaveable(draft.text("id")) { mutableStateOf(draft.text("photo")) }
    var rating by rememberSaveable(draft.text("id")) { mutableStateOf(draft.text("rating")) }
    var comment by rememberSaveable(draft.text("id")) { mutableStateOf(draft.text("comment")) }
    var caption by rememberSaveable { mutableStateOf("") }
    var publishPhoto by rememberSaveable { mutableStateOf(false) }
    var publishRating by rememberSaveable { mutableStateOf(false) }

    var date by
        rememberSaveable(draft.text("id")) {
            mutableStateOf(draft.text("date", LocalDate.now().toString()))
        }

    var timezone by
        rememberSaveable(draft.text("id")) {
            mutableStateOf(draft.text("timezone", java.time.ZoneId.systemDefault().id))
        }

    var advanced by rememberSaveable { mutableStateOf(false) }

    val recipe = state.allRecipes.firstOrNull { it.id == draft.text("recipeId") }

    var actual: List<JsonObject> by
        remember(draft.text("id"), draft.text("recipeId")) {
            mutableStateOf(
                draft["ingredients"]?.jsonArray?.map { it.jsonObject }
                    ?: recipe?.ingredients?.map {
                        buildJsonObject {
                            put("name", it.name)
                            put("quantity", it.quantity)
                            put("unit", it.unit)
                        }
                    }
                    ?: emptyList<JsonObject>()
            )
        }

    KitchenBottomSheet(
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        onDismissRequest = { vm.saveMealDraft(JsonObject(emptyMap())) },
    ) {
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            item {
                Text(draft.text("title"), style = MaterialTheme.typography.headlineMedium)
                Text(
                    mealText(
                        "Cooking updates pantry once. Eating is recorded separately.",
                        "La cuisson met à jour le stock une fois. Les repas mangés sont distincts.",
                    )
                )
            }

            item {
                KitchenTextButton(onClick = { advanced = !advanced }) {
                    Text(
                        mealText(
                            "Date, substitutions & actual quantities",
                            "Date, substitutions et quantités réelles",
                        )
                    )
                }
            }

            if (advanced) {

                item {
                    MealField(
                        mealText("Date · YYYY-MM-DD", "Date · AAAA-MM-JJ"),
                        date,
                        { date = it },
                    )
                    MealField(mealText("Timezone", "Fuseau horaire"), timezone, { timezone = it })
                }

                items(actual.indices.toList()) { index ->
                    val ingredient = actual[index]

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        fun update(key: String, value: JsonElement) {
                            actual =
                                actual.mapIndexed { n, row ->
                                    if (n == index) JsonObject(row + mapOf(key to value)) else row
                                }
                        }

                        MealField(
                            mealText("Actual ingredient", "Ingrédient réel"),
                            ingredient.text("name"),
                            { update("name", JsonPrimitive(it)) },
                        )
                        MealField(
                            mealText(
                                "Reference recipe quantity",
                                "Quantité de référence de la recette",
                            ),
                            ingredient.text("quantity"),
                            { update("quantity", JsonPrimitive(it)) },
                        )
                        MealField(
                            mealText("Unit", "Unité"),
                            ingredient.text("unit"),
                            { update("unit", JsonPrimitive(it)) },
                        )

                        Row {
                            Checkbox(
                                ingredient["omitted"]?.jsonPrimitive?.booleanOrNull ?: false,
                                { update("omitted", JsonPrimitive(it)) },
                            )
                            Text(mealText("Not used", "Non utilisé"))
                        }
                    }
                }

                if (follow)
                    item {
                        MealField(
                            mealText("Servings prepared", "Portions préparées"),
                            servings,
                            { servings = it },
                        )
                        KitchenOutlinedButton(
                            onClick = {
                                vm.mealChange(
                                    "edit-cook",
                                    buildJsonObject {
                                        put("id", draft.text("id"))
                                        put("recipeId", draft.text("recipeId"))
                                        put("servings", servings.toDouble())
                                        put("date", date)
                                        put("timezone", timezone)
                                        put("ingredients", JsonArray(actual))
                                    },
                                    false,
                                )
                            },
                            enabled =
                                !state.busy && servings.toDoubleOrNull()?.let { it > 0 } == true,
                        ) {
                            Text(
                                mealText(
                                    "Correct cooking & reconcile stock",
                                    "Corriger la cuisson et le stock",
                                )
                            )
                        }
                    }
            }

            if (!follow)
                item {
                    MealField(
                        mealText("Servings prepared", "Portions préparées"),
                        servings,
                        { servings = it },
                    )
                    KitchenButton(
                        onClick = {
                            vm.mealChange(
                                "cook",
                                buildJsonObject {
                                    put("id", draft.text("id"))
                                    put("recipeId", draft.text("recipeId"))
                                    put("servings", servings.toDouble())
                                    put("date", date)
                                    put("timezone", timezone)
                                    put("ingredients", JsonArray(actual))
                                },
                                false,
                            )
                            vm.saveMealDraft(JsonObject(emptyMap()))
                        },
                        enabled = !state.busy && servings.toDoubleOrNull()?.let { it > 0 } == true,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    ) {
                        Text(mealText("Confirm cooking", "Confirmer la cuisson"))
                    }
                }
            else {

                item { MealEatingFollowUp(state, vm, draft) }

                item {
                    if (photo.startsWith("/api/"))
                        Text(
                            mealText(
                                "Photo needs a connection. Other optional details can still be saved.",
                                "La photo nécessite une connexion. Les autres détails peuvent être enregistrés.",
                            )
                        )
                    PhotoActions(
                        photo = photo.takeIf { it.startsWith("data:") },
                        onRemove = { photo = "" },
                        onPhoto = { photo = it },
                    )
                    MealField(
                        mealText(
                            "Personal rating 1–5 · optional",
                            "Appréciation 1–5 · facultative",
                        ),
                        rating,
                        { rating = it },
                    )
                    MealField(
                        mealText("Private comment", "Commentaire privé"),
                        comment,
                        { comment = it },
                    )
                    KitchenButton(
                        onClick = {
                            vm.mealChange(
                                "follow-up",
                                buildJsonObject {
                                    put("id", draft.text("id"))
                                    put("photo", photo)
                                    put(
                                        "rating",
                                        rating.toIntOrNull()?.let(::JsonPrimitive) ?: JsonNull,
                                    )
                                    put("comment", comment)
                                },
                                false,
                            )
                        },
                        enabled = !state.busy && (rating.isBlank() || rating.toIntOrNull() in 1..5),
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    ) {
                        Text(
                            mealText("Save optional details", "Enregistrer les détails facultatifs")
                        )
                    }
                }

                item {
                    Text(
                        mealText("Publish selected fields", "Publier les champs sélectionnés"),
                        style = MaterialTheme.typography.titleLarge,
                    )
                    MealField(
                        mealText("Published caption", "Légende publiée"),
                        caption,
                        { caption = it },
                    )
                    Row {
                        Checkbox(publishPhoto, { publishPhoto = it })
                        Text(mealText("Publish photo", "Publier la photo"))
                    }
                    Row {
                        Checkbox(publishRating, { publishRating = it })
                        Text(mealText("Publish personal rating", "Publier l’appréciation"))
                    }
                    Text(
                        mealText(
                            "Private comments, health and eating data stay private. Recipe access is separate.",
                            "Commentaires privés, santé et repas restent privés. L’accès à la recette est distinct.",
                        )
                    )
                    KitchenOutlinedButton(
                        onClick = {
                            vm.publishOccasion(
                                buildJsonObject {
                                    put("id", draft.text("id"))
                                    put("photo", photo)
                                    put(
                                        "rating",
                                        rating.toIntOrNull()?.let(::JsonPrimitive) ?: JsonNull,
                                    )
                                    put("comment", comment)
                                },
                                buildJsonObject {
                                    put("id", UUID.randomUUID().toString())
                                    put("kitchenId", state.meals!!.text("kitchenId"))
                                    put("occasionId", draft.text("id"))
                                    put("caption", caption)
                                    put("includePhoto", publishPhoto)
                                    put("includeRating", publishRating)
                                    put("includeRecipe", false)
                                },
                            )
                        },
                        enabled = !state.busy && caption.isNotBlank(),
                    ) {
                        Text(mealText("Share with friends", "Partager avec les amis"))
                    }
                }
            }

            item {
                KitchenTextButton(onClick = { vm.saveMealDraft(JsonObject(emptyMap())) }) {
                    Text(mealText("Close", "Fermer"))
                }
            }
        }
    }
}

@Composable
fun MealActivityScreen(state: BuddyState, vm: BuddyViewModel) {

    LaunchedEffect(Unit) { vm.loadMealActivity() }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(
                mealText("Friends activity", "Activité des amis"),
                style = MaterialTheme.typography.headlineMedium,
            )
            KitchenTextButton(onClick = vm::loadMealActivity) {
                Text(mealText("Refresh", "Actualiser"))
            }
        }

        items(state.mealActivity?.rows("posts") ?: emptyList(), key = { it.text("id") }) { post ->
            Column {
                Text(post.text("author"), style = MaterialTheme.typography.titleLarge)
                Text(post.text("caption"))

                if (post.text("photo").isNotBlank()) {

                    var media by remember(post.text("id")) { mutableStateOf<String?>(null) }

                    LaunchedEffect(post.text("id")) {
                        media = runCatching { vm.mealPhoto(post.text("id")) }.getOrNull()
                    }

                    media?.let {
                        AsyncImage(
                            model =
                                coil.request.ImageRequest.Builder(
                                        androidx.compose.ui.platform.LocalContext.current
                                    )
                                    .data(imageSource(it))
                                    .memoryCachePolicy(coil.request.CachePolicy.DISABLED)
                                    .diskCachePolicy(coil.request.CachePolicy.DISABLED)
                                    .build(),
                            contentDescription =
                                mealText("Shared cooking result", "Résultat de cuisine partagé"),
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxWidth().heightIn(max = 320.dp),
                        )
                    }
                }

                post["rating"]?.jsonPrimitive?.contentOrNull?.let {
                    Text(
                        mealText("Personal enjoyment rating: ", "Appréciation personnelle : ") +
                            it +
                            "/5"
                    )
                }

                (post["recipe"] as? JsonObject)?.let { recipe ->
                    KitchenTextButton(
                        onClick = {
                            vm.pendingDestination(state.account!!, recipe.text("id"), false)
                        }
                    ) {
                        Text(mealText("View recipe", "Voir la recette"))
                    }
                }
                if (
                    post["owned"]?.jsonPrimitive?.booleanOrNull == true &&
                        post.text("photo").isNotBlank()
                )
                    KitchenTextButton(
                        onClick = {
                            vm.mealPost(
                                "meals/activity/${post.text("id")}/media",
                                buildJsonObject {},
                                "DELETE",
                            )
                        }
                    ) {
                        Text(mealText("Delete published photo", "Supprimer la photo publiée"))
                    }
                KitchenTextButton(
                    onClick = {
                        vm.mealPost(
                            "meals/activity/${post.text("id")}",
                            buildJsonObject {
                                put("react", post["reacted"]?.jsonPrimitive?.boolean != true)
                            },
                        )
                    }
                ) {
                    Text(mealText("React", "Réagir") + " · " + post.text("reactions"))
                }

                if (post["owned"]?.jsonPrimitive?.booleanOrNull == true)
                    KitchenTextButton(
                        onClick = {
                            vm.mealPost(
                                "meals/activity/${post.text("id")}",
                                buildJsonObject {},
                                "DELETE",
                            )
                        }
                    ) {
                        Text(mealText("Delete my post", "Supprimer ma publication"))
                    }

                HorizontalDivider()
            }
        }

        if (state.mealActivity?.get("nextCursor")?.jsonPrimitive?.contentOrNull != null)
            item {
                KitchenOutlinedButton(onClick = vm::moreMealActivity, enabled = !state.busy) {
                    Text(mealText("Load more", "Afficher la suite"))
                }
            }
    }
}
