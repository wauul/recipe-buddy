package com.recipebuddy.android
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import kotlinx.serialization.json.*
import java.time.LocalDate
import java.util.UUID
@Composable fun MealLeftoverControls(state:BuddyState,vm:BuddyViewModel){
 var open by rememberSaveable{mutableStateOf(false)};var amount by rememberSaveable{mutableStateOf("1")};var date by rememberSaveable{mutableStateOf(LocalDate.now().toString())};var person by rememberSaveable{mutableStateOf("")}
 val leftovers=state.meals?.get("state")?.jsonObject?.get("leftovers")?.jsonArray ?: JsonArray(emptyList())
 if(leftovers.isEmpty())return
 Column{KitchenTextButton(onClick={open=!open}){Text(mealText("Leftovers","Restes"))};if(open){
  OutlinedTextField(date,{date=it},label={Text(mealText("Date","Date"))});OutlinedTextField(amount,{amount=it},label={Text(mealText("Servings","Portions"))})
  state.meals?.get("profiles")?.jsonArray?.forEach{raw->val p=raw.jsonObject;Row{RadioButton(person==p["id"]!!.jsonPrimitive.content,{person=p["id"]!!.jsonPrimitive.content});Text(p["data"]!!.jsonObject["name"]!!.jsonPrimitive.content)}}
  leftovers.forEach {raw->val l=raw.jsonObject;Text(l["title"]!!.jsonPrimitive.content+" · "+l["remaining"]!!.jsonPrimitive.content)
   KitchenOutlinedButton(onClick={vm.mealChange("plan",buildJsonObject{put("id",UUID.randomUUID().toString());put("leftoverId",l["id"]!!);put("title",l["title"]!!);put("date",date);put("slot","lunch");put("servings",amount.toDouble());put("diners",JsonArray(if(person.isBlank())emptyList()else listOf(JsonPrimitive(person))))})},enabled=amount.toDoubleOrNull()?.let{it>0}==true&&!state.busy){Text(mealText("Plan leftovers","Planifier les restes"))}
   KitchenOutlinedButton(onClick={vm.mealChange("eat",buildJsonObject{put("id",UUID.randomUUID().toString());put("leftoverId",l["id"]!!);put("title",l["title"]!!);put("personId",person);put("date",date);put("slot","lunch");put("amount",amount.toDouble())},false)},enabled=person.isNotBlank()&&amount.toDoubleOrNull()?.let{it>0}==true&&!state.busy){Text(mealText("Record eating leftovers","Enregistrer les restes mangés"))}
   KitchenTextButton(onClick={vm.mealChange("remove-leftover",buildJsonObject{put("id",l["id"]!!)},false)}){Text(mealText("Remove leftover batch","Retirer le lot de restes"))}
  }
 }}
}
