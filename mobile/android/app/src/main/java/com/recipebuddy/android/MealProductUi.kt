package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*
@Composable fun MealProductControls(vm:BuddyViewModel,confirmed:(JsonObject)->Unit){
 var barcode by rememberSaveable{mutableStateOf("")};var product by remember{mutableStateOf<JsonObject?>(null)};var failed by remember{mutableStateOf(false)};var busy by remember{mutableStateOf(false)};val scope=rememberCoroutineScope()
 Column {
  OutlinedTextField(barcode,{barcode=it},label={Text(mealText("Barcode","Code-barres"))},singleLine=true)
  KitchenTextButton(onClick={scope.launch{busy=true;failed=false;runCatching{buddyJson.parseToJsonElement(vm.api.request("meals/product","POST",buildJsonObject{put("barcode",barcode)}.toString())).jsonObject}.onSuccess{product=it}.onFailure{failed=true};busy=false}},enabled=barcode.matches(Regex("\\d{8,14}"))&&!busy){Text(mealText("Look up barcode","Chercher le code-barres"))}
  if(failed)Text(mealText("Barcode lookup is unavailable. Enter the package label manually.","Recherche indisponible. Saisissez l’étiquette manuellement."))
  product?.let {p->Text(p["name"]!!.jsonPrimitive.content);Text(p["label"]!!.jsonPrimitive.content);Text("Open Food Facts · ODbL / Database Contents License");Text(mealText("Check the actual package. Cross-contact remains unknown.","Vérifiez l’emballage réel. Contaminations croisées inconnues."));KitchenOutlinedButton(onClick={confirmed(p);product=null}){Text(mealText("Confirm product details","Confirmer les détails du produit"))}}
 }
}
