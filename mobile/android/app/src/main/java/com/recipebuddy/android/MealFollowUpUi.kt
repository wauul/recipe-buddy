package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.serialization.json.*
import java.time.LocalDate
import java.util.UUID
@OptIn(ExperimentalLayoutApi::class)
@Composable fun MealEatingFollowUp(state:BuddyState,vm:BuddyViewModel,draft:JsonObject) {
 var open by rememberSaveable {mutableStateOf(false)};var person by rememberSaveable {mutableStateOf("")};var date by rememberSaveable {mutableStateOf(LocalDate.now().toString())};var slot by rememberSaveable {mutableStateOf("dinner")};var amount by rememberSaveable {mutableStateOf("")};var leftover by rememberSaveable {mutableStateOf("")}
 val profiles=state.meals?.get("profiles")?.jsonArray ?: JsonArray(emptyList())
 Column(verticalArrangement=Arrangement.spacedBy(12.dp)) {
  KitchenTextButton(onClick={open=!open}){Text(mealText("I also ate this / keep leftovers","J’ai aussi mangé ce plat / conserver des restes"))}
  if(open) {
   profiles.forEach { raw->val profile=raw.jsonObject;Row {RadioButton(person==profile["id"]!!.jsonPrimitive.content,{person=profile["id"]!!.jsonPrimitive.content});Text(profile["data"]!!.jsonObject["name"]!!.jsonPrimitive.content)} }
   OutlinedTextField(date,{date=it},label={Text(mealText("Eating date","Date du repas mangé"))},modifier=Modifier.fillMaxWidth(),singleLine=true)
   FlowRow(horizontalArrangement=Arrangement.spacedBy(8.dp)) {listOf("breakfast","lunch","dinner","snack").forEach { key->FilterChip(slot==key,{slot=key},label={Text(when(key){"breakfast"->mealText("Breakfast","Petit-déjeuner");"lunch"->mealText("Lunch","Déjeuner");"dinner"->mealText("Dinner","Dîner");else->mealText("Snack","Collation")})}) } }
   OutlinedTextField(amount,{amount=it},label={Text(mealText("Amount · optional servings","Quantité · portions facultatives"))},modifier=Modifier.fillMaxWidth(),singleLine=true)
   KitchenOutlinedButton(onClick={vm.mealChange("eat",buildJsonObject{put("id",UUID.randomUUID().toString());put("personId",person);put("date",date);put("slot",slot);put("title",draft["title"]!!);put("occasionId",draft["id"]!!);put("amount",amount.toDoubleOrNull()?.let(::JsonPrimitive)?:JsonNull)},false)},enabled=person.isNotBlank()&&!state.busy){Text(mealText("Record eating","Enregistrer le repas mangé"))}
   OutlinedTextField(leftover,{leftover=it},label={Text(mealText("Leftover servings remaining","Portions restantes"))},modifier=Modifier.fillMaxWidth(),singleLine=true)
   KitchenTextButton(onClick={vm.mealChange("leftover",buildJsonObject{put("id",UUID.randomUUID().toString());put("occasionId",draft["id"]!!);put("title",draft["title"]!!);put("remaining",leftover.toDouble());put("storage","fridge");put("date",JsonNull)},false)},enabled=leftover.toDoubleOrNull()?.let{it>=0}==true&&!state.busy){Text(mealText("Save leftover batch","Enregistrer un lot de restes"))}
  }
 }
}
