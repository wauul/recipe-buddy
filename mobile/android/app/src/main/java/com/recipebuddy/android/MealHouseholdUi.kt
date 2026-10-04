package com.recipebuddy.android
import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*
@Composable fun MealHouseholdControls(state:BuddyState,vm:BuddyViewModel){
 var open by rememberSaveable{mutableStateOf(false)};var friend by rememberSaveable{mutableStateOf("")};var role by rememberSaveable{mutableStateOf("planner")};val scope=rememberCoroutineScope();val context=LocalContext.current;var exportError by remember{mutableStateOf(false)}
 Column {
  KitchenTextButton(onClick={open=!open}){Text(mealText("Household & private export","Foyer et export privé"))}
  if(open){
   state.meals?.get("kitchens")?.jsonArray?.forEach{raw->val k=raw.jsonObject;KitchenOutlinedButton(onClick={vm.selectMealKitchen(k["id"]!!.jsonPrimitive.content)},enabled=!state.busy){Text(k["owner"]!!.jsonObject["username"]!!.jsonPrimitive.content)}}
   state.meals?.get("members")?.jsonArray?.forEach{raw->val m=raw.jsonObject;Text(m["user"]!!.jsonObject["username"]!!.jsonPrimitive.content+" · "+m["role"]!!.jsonPrimitive.content);if(m["role"]!!.jsonPrimitive.content!="owner")KitchenTextButton(onClick={vm.mealChange("remove-member",buildJsonObject{put("userId",m["userId"]!!)},true)}){Text(mealText("Remove household access","Retirer l’accès au foyer"))}}
   state.friends.filter{it.status=="accepted"}.forEach{f->Row{RadioButton(friend==f.friend.id,{friend=f.friend.id});Text(f.friend.username)}}
   listOf("planner","shopper","member").forEach{r->Row{RadioButton(role==r,{role=r});Text(when(r){"planner"->mealText("Planner","Planificateur");"shopper"->mealText("Shopper","Courses");else->mealText("Adult member / caregiver","Membre adulte / responsable")})}}
   KitchenOutlinedButton(onClick={vm.mealChange("member",buildJsonObject{put("userId",friend);put("role",role)})},enabled=friend.isNotBlank()&&!state.busy){Text(mealText("Grant household role","Accorder le rôle au foyer"))}
   Text(mealText("Only the profile manager can read, edit or delete private health and eating records.","Seul le gestionnaire peut lire, modifier ou supprimer santé et repas privés."))
   KitchenOutlinedButton(onClick={scope.launch {runCatching {val data=vm.api.request("meals/export");context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("application/json").putExtra(Intent.EXTRA_TEXT,data),mealExportLabel(state.language)))}.onFailure{exportError=true}}},enabled=!state.busy){Text(mealText("Export my private meal data","Exporter mes données repas privées"))}
   if(exportError)Text(mealText("Export failed. Retry when connected.","Échec de l’export. Réessayez une fois connecté."))
  }
 }
}
private fun mealExportLabel(language:String)=if(language=="fr")"Export privé" else "Private export"
