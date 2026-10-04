package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalUriHandler
import kotlinx.serialization.json.*
@Composable fun MealDiscoveryControls(state:BuddyState,vm:BuddyViewModel,diners:List<String>,servings:Double) {
 val uri=LocalUriHandler.current
 var open by rememberSaveable{mutableStateOf(false)};var selected by rememberSaveable{mutableStateOf(listOf<String>())}
 Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {
  KitchenTextButton(onClick={open=!open}){Text(mealText("Use what I have","Utiliser mon stock"))}
  if(open) {
   state.meals?.get("state")?.jsonObject?.get("pantry")?.jsonArray?.forEach {raw->val row=raw.jsonObject;val name=row["name"]!!.jsonPrimitive.content;Row{Checkbox(selected.contains(name),{selected=if(it)(selected+name).distinct() else selected-name});Text(name)}}
   KitchenOutlinedButton(onClick={vm.pantryMatches(selected,diners,servings)},enabled=selected.isNotEmpty()&&!state.busy){Text(mealText("Find saved recipe matches","Trouver mes recettes"))}
   state.pantryMatches?.get("candidates")?.jsonArray?.forEach{raw->val c=raw.jsonObject;KitchenTextButton(onClick={vm.pendingDestination(state.account!!,c["id"]!!.jsonPrimitive.content,false)}){Text(c["title"]!!.jsonPrimitive.content)};Text(mealText("Missing / unresolved ingredients: ","Ingrédients manquants / non résolus : ")+(c["missing"]?.jsonArray?.joinToString{it.jsonObject["name"]!!.jsonPrimitive.content} ?: ""))}
   Text(mealText("Online search shares only ingredient names and country. Health data and your diary stay on the server.","La recherche transmet seulement ingrédients et pays. Santé et historique restent sur le serveur."))
   KitchenOutlinedButton(onClick={vm.discoverMeals(selected,diners,servings)},enabled=selected.isNotEmpty()&&!state.busy){Text(mealText("Find new recipes online · Pro","Trouver des recettes en ligne · Pro"))}
   state.mealDiscovery?.get("candidates")?.jsonArray?.forEach {raw->val c=raw.jsonObject;Text(c["title"]!!.jsonPrimitive.content,style=MaterialTheme.typography.titleLarge);Text(c["source"]!!.jsonObject["publisher"]!!.jsonPrimitive.content);Text(mealText("Health suitability is not established","L’adéquation médicale n’est pas établie"));KitchenButton(onClick={vm.importMealCandidate(c["token"]!!.jsonPrimitive.content)},enabled=!state.busy,modifier=Modifier.fillMaxWidth()){Text(mealText("Import this recipe","Importer cette recette"))}}
   if(state.mealDiscovery!=null && state.mealDiscovery["candidates"]!!.jsonArray.size<3)Text(mealText("Fewer than three eligible importable recipes were found.","Moins de trois recettes admissibles et importables ont été trouvées."))
   state.mealDiscovery?.mealRows("reviewSources")?.forEach{s->Text(mealText("Incomplete recipe · manual review","Recette incomplète · vérification manuelle"));Text(mealText("Quantities, servings or instructions are missing. Open the source and enter a complete recipe manually after review. No eligibility or import approved.","Quantités, portions ou instructions manquantes. Ouvrez la source puis saisissez une recette complète après vérification. Aucun import ni admissibilité approuvé."));TextButton(onClick={uri.openUri(s.mealValue("url"))}){Text(s.mealValue("publisher"))}}
  }
 }
}
