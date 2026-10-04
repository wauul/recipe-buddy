package com.recipebuddy.android



import androidx.compose.foundation.layout.*

import androidx.compose.foundation.lazy.LazyColumn

import androidx.compose.foundation.lazy.items

import androidx.compose.material3.*

import androidx.compose.runtime.*

import androidx.compose.runtime.saveable.rememberSaveable

import androidx.compose.ui.Modifier

import androidx.compose.ui.platform.LocalConfiguration

import androidx.compose.ui.unit.dp

import kotlinx.serialization.json.*

import java.time.LocalDate

import java.util.UUID

import coil.compose.AsyncImage

import androidx.compose.ui.layout.ContentScale



val LocalMealLanguage = staticCompositionLocalOf { "en" }

@Composable fun mealText(en: String, fr: String): String = if(LocalMealLanguage.current=="fr") fr else en

private fun JsonObject.text(key:String, fallback:String="") = this[key]?.jsonPrimitive?.contentOrNull ?: fallback

private fun JsonObject.rows(key:String) = this[key]?.jsonArray?.map { it.jsonObject } ?: emptyList()

@Composable internal fun MealField(label:String,value:String,change:(String)->Unit) { OutlinedTextField(value,change,label={Text(label)},modifier=Modifier.fillMaxWidth(),singleLine=true) }

@Composable internal fun MealChoice(label:String,choices:List<Pair<String,String>>,value:String,change:(String)->Unit) {

    var expanded by remember { mutableStateOf(false) }

    Column { Text(label,style=MaterialTheme.typography.labelLarge);KitchenOutlinedButton(onClick={expanded=true},modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)) { Text(choices.firstOrNull { it.first==value }?.second ?: label) };DropdownMenu(expanded,{expanded=false}) { choices.forEach { (key,text)->DropdownMenuItem(text={Text(text)},onClick={change(key);expanded=false}) } } }

}

@Composable fun MealsScreen(state:BuddyState,vm:BuddyViewModel,initial:String="agenda",recognition:()->Unit={}) {

    LaunchedEffect(Unit) { vm.loadMeals() }

    var section by rememberSaveable { mutableStateOf(initial) }

    var name by rememberSaveable { mutableStateOf("") };var quantityEstimated by rememberSaveable {mutableStateOf(false)};var quantity by rememberSaveable { mutableStateOf("") };var unit by rememberSaveable { mutableStateOf("g") }

    var date by rememberSaveable { mutableStateOf(LocalDate.now().toString()) };var servings by rememberSaveable { mutableStateOf("2") };var recipeId by rememberSaveable { mutableStateOf("") }

    var person by rememberSaveable { mutableStateOf("") };var slot by rememberSaveable { mutableStateOf("dinner") };var age by rememberSaveable { mutableStateOf("adult") }

    var country by rememberSaveable { mutableStateOf("FR") };var allergies by rememberSaveable { mutableStateOf("") };var intolerances by rememberSaveable { mutableStateOf("") }

    var caregiver by rememberSaveable {mutableStateOf(false)};var dislikes by rememberSaveable{mutableStateOf("")};var equipment by rememberSaveable{mutableStateOf("")};var routine by rememberSaveable{mutableStateOf("")};var otherConditions by rememberSaveable{mutableStateOf("")};var consent by rememberSaveable { mutableStateOf(false) };var coeliac by rememberSaveable { mutableStateOf(false) };var pregnancy by rememberSaveable { mutableStateOf(false) };var breastfeeding by rememberSaveable { mutableStateOf(false) }

    var diabetes by rememberSaveable { mutableStateOf("none") };var clinician by rememberSaveable { mutableStateOf("") };var advanced by rememberSaveable { mutableStateOf(false) }

    var locked by rememberSaveable { mutableStateOf(false) };var editId by rememberSaveable { mutableStateOf("") }

    var addingMeal by rememberSaveable { mutableStateOf(false) };var viewDays by rememberSaveable {mutableStateOf(7)};var windowStart by rememberSaveable {mutableStateOf(LocalDate.now().toString())}
    LaunchedEffect(state.mealFrom,state.mealDays){if(state.mealFrom.isNotBlank()){windowStart=state.mealFrom;viewDays=state.mealDays}}

    var selectedDiners by rememberSaveable {mutableStateOf(listOf<String>())}

    var productEvidence by remember{mutableStateOf<JsonObject?>(null)};var brand by rememberSaveable {mutableStateOf("")};var label by rememberSaveable {mutableStateOf("")};var storage by rememberSaveable {mutableStateOf("pantry")};var packageDate by rememberSaveable {mutableStateOf("")};var dateType by rememberSaveable {mutableStateOf("unknown")};var opened by rememberSaveable {mutableStateOf("")};var frozen by rememberSaveable {mutableStateOf("")};var crossContact by rememberSaveable {mutableStateOf("unknown")};var packageSize by rememberSaveable {mutableStateOf("")}

    val snapshot=state.meals;val kitchen=snapshot?.get("state")?.jsonObject;val diners=snapshot?.rows("diners") ?: emptyList();val profiles=snapshot?.rows("profiles") ?: emptyList()

    val labelAgenda=mealText("Agenda","Agenda");val labelPantry=mealText("Pantry","Garde-manger");val labelHistory=mealText("Cooking & eating","Cuisine et repas");val labelDiners=mealText("Diners","Convives");val labelShopping=mealText("Shopping","Courses")

    fun change(action:String,data:JsonObject,version:Boolean=true) {vm.mealChange(action,data,version)}

    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {

        item { MealChoice(mealText("Meal tools","Outils repas"),listOf("agenda" to labelAgenda,"pantry" to labelPantry,"shopping" to labelShopping,"history" to labelHistory,"profiles" to labelDiners),section,{section=it;editId=""}) }

        item {SyncProblemCard(state,vm)}

        item { if(state.offline) Text(mealText("Offline · changes wait for sync; checks may be stale.","Hors ligne · modifications en attente ; vérifications potentiellement anciennes."));if(state.pendingChanges>0) Text(mealText("Pending changes: ","Modifications en attente : ")+state.pendingChanges);KitchenTextButton(onClick=vm::refreshMeals,enabled=!state.busy){Text(mealText("Refresh kitchen","Actualiser la cuisine"))} }

        if(state.mealSuggestionLimited) item {Text(mealText("No recipe has enough reviewed restriction evidence for these diners. Manual planning remains available.","Aucune recette n’a de preuves validées suffisantes pour ces convives. La planification manuelle reste disponible."))}

        if(snapshot==null) { item { Text(mealText("Your kitchen is loading. Retry when connected.","Chargement de la cuisine. Réessayez une fois connecté.")) };return@LazyColumn }

        if(section=="agenda") item {

            Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {

                MealField(mealText("From","À partir du"),windowStart,{windowStart=it})

                Row { FilterChip(viewDays==1,{viewDays=1},label={Text(mealText("Day","Jour"))});Spacer(Modifier.width(12.dp));FilterChip(viewDays==7,{viewDays=7},label={Text(mealText("Week","Semaine"))}) }
                KitchenOutlinedButton(enabled=!state.busy&&runCatching{LocalDate.parse(windowStart).toString()==windowStart}.getOrDefault(false),onClick={vm.selectMealWindow(windowStart,viewDays)}){Text(mealText("Update dates and shopping needs","Actualiser les dates et les besoins"))}

                KitchenButton(onClick={addingMeal=!addingMeal},modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(mealText("Add a meal","Ajouter un repas"))}
                KitchenOutlinedButton(enabled=!state.busy,onClick={vm.mealSuggestions(false,windowStart,servings.toDoubleOrNull()?:2.0,selectedDiners,slot)},modifier=Modifier.fillMaxWidth()){Text(mealText("What should I cook?","Que cuisiner ?"))}
                KitchenTextButton(enabled=!state.busy,onClick={vm.mealSuggestions(true,windowStart,servings.toDoubleOrNull()?:2.0,selectedDiners,slot)}){Text(mealText("Plan my week","Planifier ma semaine"))}

            }

        }

        if(section=="pantry" || section=="agenda") item {MealCheckInControls(state,vm)}
        if(section=="pantry") item {

            KitchenTextButton(onClick={advanced=!advanced}){Text(mealText("Product, label & dates","Produit, étiquette et dates"))}

            if(advanced) Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {

                MealProductControls(vm){p->name=p["name"]!!.jsonPrimitive.content;brand=p["brand"]!!.jsonPrimitive.content;label=p["label"]!!.jsonPrimitive.content;productEvidence=p};MealField(mealText("Brand / variant","Marque / variante"),brand,{brand=it});MealField(mealText("Composition & allergens","Composition et allergènes"),label,{label=it})

                MealChoice(mealText("Storage","Stockage"),listOf("pantry" to mealText("Pantry","Garde-manger"),"fridge" to mealText("Fridge","Réfrigérateur"),"freezer" to mealText("Freezer","Congélateur")),storage,{storage=it})

                MealField(mealText("Package size","Taille de l’emballage"),packageSize,{packageSize=it});MealField(mealText("Package date · YYYY-MM-DD","Date emballage · AAAA-MM-JJ"),packageDate,{packageDate=it})

                MealChoice(mealText("Date type","Type de date"),listOf("unknown" to mealText("Unknown","Inconnue"),"use-by" to mealText("Use by","Date limite de consommation"),"best-before" to mealText("Best before","Durabilité minimale")),dateType,{dateType=it})

                MealField(mealText("Opened date","Date d’ouverture"),opened,{opened=it});MealField(mealText("Frozen date","Date de congélation"),frozen,{frozen=it})

                Text(mealText("Labels and dates do not certify safety. Cross-contact remains unknown.","Étiquettes et dates ne certifient pas la sécurité. Contaminations croisées inconnues."))

            }

        }

        if(section=="pantry") {

            item { Text(labelPantry,style=MaterialTheme.typography.headlineMedium);KitchenTextButton(onClick=recognition){Text(mealText("Recognize ingredients","Reconnaître des ingrédients"))} }

            item { Column(verticalArrangement=Arrangement.spacedBy(12.dp)) { MealField(mealText("Ingredient","Ingrédient"),name,{name=it});MealField(mealText("Quantity · blank means presence","Quantité · vide indique la présence"),quantity,{quantity=it});MealField(mealText("Unit","Unité"),unit,{unit=it});KitchenButton(onClick={change("pantry",buildJsonObject { put("id",editId.ifBlank{UUID.randomUUID().toString()});put("name",name);put("quantity",quantity.toDoubleOrNull()?.let(::JsonPrimitive) ?: JsonNull);put("quantityEstimated",quantityEstimated);put("unit",unit);put("brand",brand);put("label",label);put("storage",storage);put("packageSize",packageSize.toDoubleOrNull()?.let(::JsonPrimitive)?:JsonNull);put("date",packageDate.takeIf{it.isNotBlank()}?.let(::JsonPrimitive)?:JsonNull);put("dateType",dateType);put("opened",opened.takeIf{it.isNotBlank()}?.let(::JsonPrimitive)?:JsonNull);put("frozen",frozen.takeIf{it.isNotBlank()}?.let(::JsonPrimitive)?:JsonNull);put("crossContact",crossContact);put("evidence",productEvidence?:JsonNull) });},enabled=!state.busy&&name.isNotBlank()&&(quantity.isBlank()||quantity.toDoubleOrNull()?.let{it>=0}==true),modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(if(editId.isBlank())mealText("Add batch","Ajouter un lot")else mealText("Save batch","Enregistrer le lot"))} } }

            items(kitchen?.rows("pantry") ?: emptyList(),key={it.text("id")}) { batch -> Column { Text(batch.text("name"),style=MaterialTheme.typography.titleLarge);if(batch["quantityEstimated"]?.jsonPrimitive?.booleanOrNull==true)Text(mealText("Estimate · review required","Estimation · à vérifier"));KitchenTextButton(onClick={editId=batch.text("id");name=batch.text("name");quantityEstimated=batch["quantityEstimated"]?.jsonPrimitive?.booleanOrNull==true;quantity=batch.text("quantity");unit=batch.text("unit");brand=batch.text("brand");label=batch.text("label");storage=batch.text("storage");packageDate=batch.text("date");dateType=batch.text("dateType");opened=batch.text("opened");frozen=batch.text("frozen");packageSize=batch.text("packageSize");productEvidence=batch["evidence"]?.takeIf{it!=JsonNull}?.jsonObject;advanced=true}){Text(mealText("Edit batch","Modifier le lot"))};Text(batch.text("quantity",mealText("Presence only","Présence seule"))+" "+batch.text("unit")+" · "+mealEnum(batch.text("storage")));var delta by rememberSaveable(batch.text("id")) {mutableStateOf("")};MealField(mealText("Change quantity · negative to use","Variation · négative pour utiliser"),delta,{delta=it});KitchenTextButton(onClick={change("stock",buildJsonObject {put("id",batch.text("id"));put("delta",delta.toDouble());put("reason","correction")},false)},enabled=delta.toDoubleOrNull()!=null&&!state.busy){Text(mealText("Use / discard / correct","Utiliser / jeter / corriger"))};HorizontalDivider() } }

        }

        if(section=="agenda") {

            item {MealLeftoverControls(state,vm)}

            item {MealContextControls(vm,windowStart)}
            item {MealPreparationControls(state,vm,windowStart)}
            item {MealRescueControls(state,vm,windowStart)}

            item { MealDiscoveryControls(state,vm,selectedDiners,servings.toDoubleOrNull()?:2.0) }
            item { MealWeekPreviewControls(state,vm) }
            item { MealQuickCandidates(state,vm,date,slot,selectedDiners,servings.toDoubleOrNull()?:2.0) }

            if(addingMeal) item { Column(verticalArrangement=Arrangement.spacedBy(12.dp)) { MealField(mealText("Local date","Date locale"),date,{date=it});MealField(mealText("Servings prepared","Portions préparées"),servings,{servings=it});MealChoice(mealText("Meal slot","Repas"),listOf("breakfast" to mealText("Breakfast","Petit-déjeuner"),"lunch" to mealText("Lunch","Déjeuner"),"dinner" to mealText("Dinner","Dîner"),"snack" to mealText("Snack","Collation")),slot,{slot=it});MealChoice(mealText("Recipe or external meal","Recette ou repas extérieur"),listOf("" to mealText("External meal / eating out","Repas extérieur / restaurant"))+state.allRecipes.map {it.id to it.title},recipeId,{recipeId=it});if(recipeId.isBlank())MealField(mealText("Meal description","Description du repas"),name,{name=it});diners.forEach{d->Row{Checkbox(selectedDiners.contains(d.text("id")),{selectedDiners=if(it)(selectedDiners+d.text("id")).distinct() else selectedDiners-d.text("id")});Text(d.text("name"))}};Row { Checkbox(locked,{locked=it});Text(mealText("Lock meal","Verrouiller le repas")) };KitchenButton(onClick={change("plan",buildJsonObject {put("id",editId.ifBlank{UUID.randomUUID().toString()});put("date",date);put("slot",slot);put("title",if(recipeId.isBlank())name else state.allRecipes.firstOrNull{it.id==recipeId}?.title ?: name);if(recipeId.isNotBlank())put("recipeId",recipeId);put("servings",servings.toDouble());put("diners",JsonArray(selectedDiners.map(::JsonPrimitive)));put("locked",locked)})},enabled=!state.busy&&servings.toDoubleOrNull()?.let{it>0}==true&&(recipeId.isNotBlank()||name.isNotBlank()),modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(mealText("Save meal","Enregistrer le repas"))};KitchenOutlinedButton(onClick={vm.mealSuggestions(false,date,servings.toDoubleOrNull()?:2.0,selectedDiners,slot)},enabled=!state.busy){Text(mealText("What should I cook?","Que cuisiner ?"))};KitchenTextButton(onClick={vm.mealSuggestions(true,date,servings.toDoubleOrNull()?:2.0,selectedDiners,slot)},enabled=!state.busy){Text(mealText("Plan my week","Planifier ma semaine"))} } }

            items(kitchen?.rows("plans")?.filter{it.text("date")>=windowStart && it.text("date")<runCatching{LocalDate.parse(windowStart).plusDays(viewDays.toLong()).toString()}.getOrDefault(windowStart)}?.sortedBy{it.text("date")} ?: emptyList(),key={it.text("id")}) { meal -> Column { Text(meal.text("date")+" · "+mealEnum(meal.text("slot")),style=MaterialTheme.typography.labelLarge);Text(meal.text("title"),style=MaterialTheme.typography.titleLarge);MealRepeatControls(meal,state,vm);Text(meal.text("servings")+" · "+mealEnum(snapshot["shopping"]?.jsonObject?.get("readiness")?.jsonObject?.get(meal.text("id"))?.jsonPrimitive?.content ?: "Check quantities"));KitchenTextButton(onClick={addingMeal=true;editId=meal.text("id");name=meal.text("title");date=meal.text("date");slot=meal.text("slot");recipeId=meal.text("recipeId");servings=meal.text("servings");locked=meal["locked"]?.jsonPrimitive?.booleanOrNull ?: false}){Text(mealText("Edit / move / swap","Modifier / déplacer / remplacer"))};Row { KitchenTextButton(onClick={change("remove-plan",buildJsonObject{put("id",meal.text("id"))})}){Text(mealText("Remove","Retirer"))};KitchenTextButton(onClick={change("plan",JsonObject(meal+mapOf("id" to JsonPrimitive(UUID.randomUUID().toString()),"date" to JsonPrimitive(LocalDate.parse(meal.text("date")).plusWeeks(1).toString()))))}){Text(mealText("Repeat","Répéter"))} };HorizontalDivider() } }

        }

        if(section=="shopping") {
            item {MealCommerceControls(state,vm,windowStart)}

            item { Text(labelShopping,style=MaterialTheme.typography.headlineMedium);Text(mealText("Generated needs use virtual stock. Prices unavailable.","Besoins calculés avec les stocks réservés. Prix indisponibles.")) }

            items(snapshot["shopping"]?.jsonObject?.rows("needs") ?: emptyList()) { need -> Column { Text(need.text("name"),style=MaterialTheme.typography.titleLarge);Text(need.text("quantity",mealText("Check quantities","Vérifier les quantités"))+" "+need.text("unit"));var amount by rememberSaveable {mutableStateOf("")};MealField(mealText("Actual purchase quantity","Quantité réellement achetée"),amount,{amount=it});KitchenTextButton(onClick={change("purchase",buildJsonObject {put("id",UUID.randomUUID().toString());put("name",need.text("name"));put("quantity",amount.toDouble());put("unit",need.text("unit"));put("date",LocalDate.now().toString())},false)},enabled=!state.busy&&amount.toDoubleOrNull()?.let{it>0}==true){Text(mealText("Purchase & add to pantry once","Acheter et ajouter au stock une fois"))};HorizontalDivider() } }

            item { MealField(mealText("Manual item","Article manuel"),name,{name=it});KitchenTextButton(onClick={change("manual-shopping",buildJsonObject{put("id",UUID.randomUUID().toString());put("name",name);put("quantity","");put("checked",false)})},enabled=name.isNotBlank()&&!state.busy){Text(mealText("Add item","Ajouter un article"))} }

            items(kitchen?.rows("manualShopping") ?: emptyList(),key={it.text("id")}) { item -> Row { Checkbox(item["checked"]?.jsonPrimitive?.booleanOrNull ?: false,{checked->change("manual-shopping",JsonObject(item+mapOf("checked" to JsonPrimitive(checked))))});Text(item.text("name"),Modifier.weight(1f));KitchenTextButton(onClick={change("remove-shopping",buildJsonObject{put("id",item.text("id"))})}){Text(mealText("Remove","Retirer"))} } }

        }

        if(section=="profiles") {

            item {MealHouseholdControls(state,vm)}

            item { Text(labelDiners,style=MaterialTheme.typography.headlineMedium);Text(mealText("Only you manage these private profiles. Country/age/condition modules need qualified review. Infant and therapeutic diets are unsupported.","Vous seul gérez ces profils privés. Les modules pays/âge/condition nécessitent une validation professionnelle. Régimes des nourrissons et thérapeutiques non pris en charge.")) }

            item { Column(verticalArrangement=Arrangement.spacedBy(12.dp)) { MealField(mealText("Diner name","Nom du convive"),name,{name=it});MealChoice(mealText("Age band","Tranche d’âge"),listOf("adult" to mealText("Adult","Adulte"),"child" to mealText("Child 5–17","Enfant 5–17"),"under5" to mealText("Under five","Moins de cinq ans"),"infant" to mealText("Infant · unsupported","Nourrisson · non pris en charge")),age,{age=it});MealField(mealText("Guidance country","Pays des recommandations"),country,{country=it});KitchenTextButton(onClick={advanced=!advanced}){Text(mealText("Restrictions & clinician instructions","Restrictions et instructions médicales"))};if(advanced){MealField(mealText("Allergies · comma separated","Allergies · séparées par des virgules"),allergies,{allergies=it});MealField(mealText("Intolerances","Intolérances"),intolerances,{intolerances=it});Row{Checkbox(coeliac,{coeliac=it});Text(mealText("Coeliac disease","Maladie cœliaque"))};Row{Checkbox(pregnancy,{pregnancy=it});Text(mealText("Pregnancy","Grossesse"))};Row{Checkbox(breastfeeding,{breastfeeding=it});Text(mealText("Breastfeeding","Allaitement"))};MealChoice(mealText("Diabetes","Diabète"),listOf("none" to mealText("None","Aucun"),"type1" to "Type 1","type2" to "Type 2","gestational" to mealText("Gestational","Gestationnel"),"preexisting-pregnancy" to mealText("Predating pregnancy","Antérieur à la grossesse")),diabetes,{diabetes=it});MealField(mealText("Clinician instructions","Instructions médicales"),clinician,{clinician=it})};if(age!="adult")Row{Checkbox(caregiver,{caregiver=it});Text(mealText("I am authorized to manage this child profile.","Je suis autorisé à gérer ce profil enfant."))};MealField(mealText("Disliked ingredients","Ingrédients non appréciés"),dislikes,{dislikes=it});MealField(mealText("Cooking equipment","Équipement"),equipment,{equipment=it});MealField(mealText("Practical routine","Organisation pratique"),routine,{routine=it});MealField(mealText("Other declared conditions","Autres situations déclarées"),otherConditions,{otherConditions=it});Row{Checkbox(consent,{consent=it});Text(mealText("I agree to private restriction checks. No health data is sent to AI or friends. Delete the profile to withdraw.","J’accepte les vérifications privées. Aucune donnée de santé n’est envoyée à l’IA ou aux amis. Supprimez le profil pour retirer cet accord."))};KitchenButton(onClick={change("profile",buildJsonObject{put("id",editId.ifBlank{UUID.randomUUID().toString()});put("name",name);put("ageBand",age);put("country",country);put("consent",true);put("caregiverAuthorized",caregiver);put("dislikes",JsonArray(dislikes.split(',').map{it.trim()}.filter{it.isNotBlank()}.map(::JsonPrimitive)));put("equipment",equipment);put("routine",routine);put("otherConditions",otherConditions);put("allergies",JsonArray(allergies.split(',').map{it.trim()}.filter{it.isNotBlank()}.map(::JsonPrimitive)));put("intolerances",JsonArray(intolerances.split(',').map{it.trim()}.filter{it.isNotBlank()}.map(::JsonPrimitive)));put("coeliac",coeliac);put("pregnancy",pregnancy);put("breastfeeding",breastfeeding);put("diabetes",diabetes);put("clinicianInstructions",clinician)})},enabled=consent&&(age=="adult"||caregiver)&&name.isNotBlank()&&!state.busy,modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(mealText("Save diner","Enregistrer le convive"))} } }

            items(profiles,key={it.text("id")}) { profile -> Column { Text(profile["data"]!!.jsonObject.text("name"),style=MaterialTheme.typography.titleLarge);KitchenTextButton(onClick={val p=profile["data"]!!.jsonObject;editId=p.text("id");name=p.text("name");age=p.text("ageBand");country=p.text("country");allergies=p["allergies"]!!.jsonArray.joinToString(", "){it.jsonPrimitive.content};intolerances=p["intolerances"]!!.jsonArray.joinToString(", "){it.jsonPrimitive.content};coeliac=p["coeliac"]!!.jsonPrimitive.boolean;pregnancy=p["pregnancy"]!!.jsonPrimitive.boolean;breastfeeding=p["breastfeeding"]!!.jsonPrimitive.boolean;diabetes=p.text("diabetes");clinician=p.text("clinicianInstructions");caregiver=p["caregiverAuthorized"]?.jsonPrimitive?.booleanOrNull?:false;dislikes=p["dislikes"]?.jsonArray?.joinToString(", "){it.jsonPrimitive.content}?:"";equipment=p.text("equipment");routine=p.text("routine");otherConditions=p.text("otherConditions");consent=true;advanced=true}){Text(mealText("Edit","Modifier"))};KitchenTextButton(onClick={change("delete-profile",buildJsonObject{put("id",profile.text("id"))})}){Text(mealText("Delete profile & eating history","Supprimer le profil et son historique"))} } }

        }

        if(section=="history") {
            item {MealNutritionControls(state,vm)}
            items(kitchen?.rows("history")?.filter{it.text("action")=="stock"&&it["reversed"]?.jsonPrimitive?.booleanOrNull!=true}?.takeLast(20) ?: emptyList(),key={"stock-"+it.text("id")}) { event->KitchenTextButton(onClick={vm.mealChange("undo-stock",buildJsonObject{put("id",event["id"]!!)},false)},enabled=!state.busy){Text(mealText("Undo stock correction","Annuler la correction de stock")+" · "+event.text("date").substringBefore('T'))} }


            item {MealLeftoverControls(state,vm)}

            item { Text(labelHistory,style=MaterialTheme.typography.headlineMedium);Text(mealText("Cooking is separate from eating. Unlogged meals remain unknown.","Cuisiner est distinct de manger. Les repas non enregistrés restent inconnus."));MealChoice(mealText("Person","Personne"),profiles.map{it.text("id") to it["data"]!!.jsonObject.text("name")},person,{person=it});MealField(mealText("Date","Date"),date,{date=it});MealField(mealText("Meal description","Description du repas"),name,{name=it});KitchenButton(onClick={change("eat",buildJsonObject{put("id",UUID.randomUUID().toString());put("personId",person);put("date",date);put("slot",slot);put("title",name);put("amount",JsonNull)},false)},enabled=person.isNotBlank()&&name.isNotBlank()&&!state.busy){Text(mealText("Record eating","Enregistrer le repas mangé"))} }

            items(kitchen?.rows("occasions")?.reversed() ?: emptyList(),key={it.text("id")}) { occasion -> Column { Text(occasion.text("title"),style=MaterialTheme.typography.titleLarge);Text(occasion.text("date")+" · "+occasion.text("servings"));if(occasion.rows("unresolved").isNotEmpty())Text(mealText("Pantry reconciliation needed","Stock à vérifier"));if(occasion["undone"]?.jsonPrimitive?.boolean!=true){KitchenTextButton(onClick={vm.followMeal(occasion)}){Text(mealText("Photo, personal rating & follow-up","Photo, appréciation et suivi"))};KitchenTextButton(onClick={change("undo-cook",buildJsonObject{put("id",occasion.text("id"))},false)}){Text(mealText("Undo cooking","Annuler la cuisson"))}};HorizontalDivider() } }

            items(kitchen?.rows("eaten") ?: emptyList(),key={it.text("id")}) { eaten -> Column {Text(eaten.text("title"));Text(eaten.text("date"));KitchenTextButton(onClick={change("remove-eaten",buildJsonObject{put("id",eaten.text("id"))},false)}){Text(mealText("Remove eating record","Retirer le repas mangé"))}} }

        }

    }

}



@OptIn(ExperimentalMaterial3Api::class)

@Composable fun MealCookingSheet(state:BuddyState,vm:BuddyViewModel) {

    val draft=state.mealDraft

    val follow=draft["followUp"]?.jsonPrimitive?.booleanOrNull ?: false

    var servings by rememberSaveable(draft.text("id"),draft.text("recipeId")) {mutableStateOf(draft.text("servings","2"))}

    var photo by rememberSaveable(draft.text("id")) {mutableStateOf(draft.text("photo"))};var rating by rememberSaveable(draft.text("id")){mutableStateOf(draft.text("rating"))};var comment by rememberSaveable(draft.text("id")){mutableStateOf(draft.text("comment"))};var caption by rememberSaveable{mutableStateOf("")};var publishPhoto by rememberSaveable{mutableStateOf(false)};var publishRating by rememberSaveable{mutableStateOf(false)}

    var date by rememberSaveable(draft.text("id")){mutableStateOf(draft.text("date",LocalDate.now().toString()))}

    var timezone by rememberSaveable(draft.text("id")){mutableStateOf(draft.text("timezone",java.time.ZoneId.systemDefault().id))}

    var advanced by rememberSaveable {mutableStateOf(false)}

    val recipe=state.allRecipes.firstOrNull{it.id==draft.text("recipeId")}

    var actual: List<JsonObject> by remember(draft.text("id"),draft.text("recipeId")){mutableStateOf(draft["ingredients"]?.jsonArray?.map{it.jsonObject} ?: recipe?.ingredients?.map{buildJsonObject{put("name",it.name);put("quantity",it.quantity);put("unit",it.unit)}} ?: emptyList<JsonObject>())}

    KitchenBottomSheet(sheetState=rememberModalBottomSheetState(skipPartiallyExpanded=true),onDismissRequest={vm.saveMealDraft(JsonObject(emptyMap()))}) {

        LazyColumn(contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(16.dp),modifier=Modifier.fillMaxWidth()) {

            item { Text(draft.text("title"),style=MaterialTheme.typography.headlineMedium);Text(mealText("Cooking updates pantry once. Eating is recorded separately.","La cuisson met à jour le stock une fois. Les repas mangés sont distincts.")) }

            item { KitchenTextButton(onClick={advanced=!advanced}){Text(mealText("Date, substitutions & actual quantities","Date, substitutions et quantités réelles"))} }

            if(advanced) {

                item {MealField(mealText("Date · YYYY-MM-DD","Date · AAAA-MM-JJ"),date,{date=it});MealField(mealText("Timezone","Fuseau horaire"),timezone,{timezone=it})}

                items(actual.indices.toList()) { index -> val ingredient=actual[index]

                    Column(verticalArrangement=Arrangement.spacedBy(8.dp)) {

                        fun update(key:String,value:JsonElement){actual=actual.mapIndexed{n,row->if(n==index)JsonObject(row+mapOf(key to value))else row}}

                        MealField(mealText("Actual ingredient","Ingrédient réel"),ingredient.text("name"),{update("name",JsonPrimitive(it))});MealField(mealText("Reference recipe quantity","Quantité de référence de la recette"),ingredient.text("quantity"),{update("quantity",JsonPrimitive(it))});MealField(mealText("Unit","Unité"),ingredient.text("unit"),{update("unit",JsonPrimitive(it))})

                        Row {Checkbox(ingredient["omitted"]?.jsonPrimitive?.booleanOrNull?:false,{update("omitted",JsonPrimitive(it))});Text(mealText("Not used","Non utilisé"))}

                    }

                }

                if(follow) item {MealField(mealText("Servings prepared","Portions préparées"),servings,{servings=it});KitchenOutlinedButton(onClick={vm.mealChange("edit-cook",buildJsonObject{put("id",draft.text("id"));put("recipeId",draft.text("recipeId"));put("servings",servings.toDouble());put("date",date);put("timezone",timezone);put("ingredients",JsonArray(actual))},false)},enabled=!state.busy&&servings.toDoubleOrNull()?.let{it>0}==true){Text(mealText("Correct cooking & reconcile stock","Corriger la cuisson et le stock"))}}

            }

            if(!follow) item { MealField(mealText("Servings prepared","Portions préparées"),servings,{servings=it});KitchenButton(onClick={vm.mealChange("cook",buildJsonObject {put("id",draft.text("id"));put("recipeId",draft.text("recipeId"));put("servings",servings.toDouble());put("date",date);put("timezone",timezone);put("ingredients",JsonArray(actual))},false);vm.saveMealDraft(JsonObject(emptyMap()))},enabled=!state.busy&&servings.toDoubleOrNull()?.let{it>0}==true,modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(mealText("Confirm cooking","Confirmer la cuisson"))} }

            else {

                item { MealEatingFollowUp(state,vm,draft) }

                item { if(photo.startsWith("/api/"))Text(mealText("Photo needs a connection. Other optional details can still be saved.","La photo nécessite une connexion. Les autres détails peuvent être enregistrés."));PhotoActions(photo=photo.takeIf{it.startsWith("data:")},onRemove={photo=""},onPhoto={photo=it});MealField(mealText("Personal rating 1–5 · optional","Appréciation 1–5 · facultative"),rating,{rating=it});MealField(mealText("Private comment","Commentaire privé"),comment,{comment=it});KitchenButton(onClick={vm.mealChange("follow-up",buildJsonObject{put("id",draft.text("id"));put("photo",photo);put("rating",rating.toIntOrNull()?.let(::JsonPrimitive)?:JsonNull);put("comment",comment)},false)},enabled=!state.busy&&(rating.isBlank()||rating.toIntOrNull() in 1..5),modifier=Modifier.fillMaxWidth().heightIn(min=48.dp)){Text(mealText("Save optional details","Enregistrer les détails facultatifs"))} }

                item { Text(mealText("Publish selected fields","Publier les champs sélectionnés"),style=MaterialTheme.typography.titleLarge);MealField(mealText("Published caption","Légende publiée"),caption,{caption=it});Row{Checkbox(publishPhoto,{publishPhoto=it});Text(mealText("Publish photo","Publier la photo"))};Row{Checkbox(publishRating,{publishRating=it});Text(mealText("Publish personal rating","Publier l’appréciation"))};Text(mealText("Private comments, health and eating data stay private. Recipe access is separate.","Commentaires privés, santé et repas restent privés. L’accès à la recette est distinct."));KitchenOutlinedButton(onClick={vm.publishOccasion(buildJsonObject{put("id",draft.text("id"));put("photo",photo);put("rating",rating.toIntOrNull()?.let(::JsonPrimitive)?:JsonNull);put("comment",comment)},buildJsonObject{put("id",UUID.randomUUID().toString());put("kitchenId",state.meals!!.text("kitchenId"));put("occasionId",draft.text("id"));put("caption",caption);put("includePhoto",publishPhoto);put("includeRating",publishRating);put("includeRecipe",false)})},enabled=!state.busy&&caption.isNotBlank()){Text(mealText("Share with friends","Partager avec les amis"))} }

            }

            item { KitchenTextButton(onClick={vm.saveMealDraft(JsonObject(emptyMap()))}){Text(mealText("Close","Fermer"))} }

        }

    }

}



@Composable fun MealActivityScreen(state:BuddyState,vm:BuddyViewModel) {

    LaunchedEffect(Unit){vm.loadMealActivity()}

    LazyColumn(contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {

        item {Text(mealText("Friends activity","Activité des amis"),style=MaterialTheme.typography.headlineMedium);KitchenTextButton(onClick=vm::loadMealActivity){Text(mealText("Refresh","Actualiser"))}}

        items(state.mealActivity?.rows("posts") ?: emptyList(),key={it.text("id")}) { post -> Column {

            Text(post.text("author"),style=MaterialTheme.typography.titleLarge);Text(post.text("caption"))

            if(post.text("photo").isNotBlank()) {

                var media by remember(post.text("id")){mutableStateOf<String?>(null)}

                LaunchedEffect(post.text("id")){media=runCatching{vm.mealPhoto(post.text("id"))}.getOrNull()}

                media?.let{AsyncImage(model=coil.request.ImageRequest.Builder(androidx.compose.ui.platform.LocalContext.current).data(imageSource(it)).memoryCachePolicy(coil.request.CachePolicy.DISABLED).diskCachePolicy(coil.request.CachePolicy.DISABLED).build(),contentDescription=mealText("Shared cooking result","Résultat de cuisine partagé"),contentScale=ContentScale.Fit,modifier=Modifier.fillMaxWidth().heightIn(max=320.dp))}

            }

            post["rating"]?.jsonPrimitive?.contentOrNull?.let{Text(mealText("Personal enjoyment rating: ","Appréciation personnelle : ")+it+"/5")}

            (post["recipe"] as? JsonObject)?.let{recipe->KitchenTextButton(onClick={vm.pendingDestination(state.account!!,recipe.text("id"),false)}){Text(mealText("View recipe","Voir la recette"))}}
            if(post["owned"]?.jsonPrimitive?.booleanOrNull==true && post.text("photo").isNotBlank())KitchenTextButton(onClick={vm.mealPost("meals/activity/${post.text("id")}/media",buildJsonObject{},"DELETE")}){Text(mealText("Delete published photo","Supprimer la photo publiée"))}
            KitchenTextButton(onClick={vm.mealPost("meals/activity/${post.text("id")}",buildJsonObject{put("react",post["reacted"]?.jsonPrimitive?.boolean!=true)})}){Text(mealText("React","Réagir")+" · "+post.text("reactions"))}

            if(post["owned"]?.jsonPrimitive?.booleanOrNull==true) KitchenTextButton(onClick={vm.mealPost("meals/activity/${post.text("id")}",buildJsonObject{},"DELETE")}){Text(mealText("Delete my post","Supprimer ma publication"))}

            HorizontalDivider()

        } }

        if(state.mealActivity?.get("nextCursor")?.jsonPrimitive?.contentOrNull!=null) item {KitchenOutlinedButton(onClick=vm::moreMealActivity,enabled=!state.busy){Text(mealText("Load more","Afficher la suite"))}}

    }

}

