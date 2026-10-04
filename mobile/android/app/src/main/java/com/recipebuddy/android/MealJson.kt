package com.recipebuddy.android
import kotlinx.serialization.json.*
internal fun JsonObject.mealValue(key:String,fallback:String=""):String=(get(key) as? JsonPrimitive)?.takeIf{it!=JsonNull}?.content?:fallback
internal fun JsonObject.mealRows(key:String):List<JsonObject> =(get(key) as? JsonArray)?.mapNotNull{it as? JsonObject}?:emptyList()

@androidx.compose.runtime.Composable internal fun mealEnum(value:String):String=when(value){
 "pantry"->mealText("pantry","garde-manger");"fridge"->mealText("fridge","réfrigérateur");"freezer"->mealText("freezer","congélateur");"breakfast"->mealText("breakfast","petit-déjeuner");"lunch"->mealText("lunch","déjeuner");"dinner"->mealText("dinner","dîner");"snack"->mealText("snack","collation");"Ready to cook"->mealText("Ready to cook","Ingrédients disponibles");"Missing ingredients"->mealText("Missing ingredients","Ingrédients manquants");"Check quantities"->mealText("Check quantities","Vérifier les quantités");else->value
}
@androidx.compose.runtime.Composable internal fun mealReasonText(reason:String):String {
 val fixed=when(reason){
  "recent-actual-meal"->"Recently eaten" to "Consommé récemment";"already-planned"->"Already planned" to "Déjà prévu";"selected-pantry-ingredient"->"Uses selected pantry ingredients" to "Utilise les ingrédients sélectionnés";"instructions-mention-unlisted-oven"->"Instructions mention an unlisted oven" to "La recette mentionne un four non indiqué";"source-time-exceeds-daily-context"->"Source cooking time exceeds available time" to "La durée de la source dépasse le temps disponible";"cooking-time-unknown"->"Cooking time unknown" to "Durée de cuisson inconnue";"prices-unavailable"->"Prices unavailable" to "Prix indisponibles";"health-check-precedes-preferences"->"Restrictions checked before preferences" to "Restrictions vérifiées avant les préférences";
  "Use recorded batch leftovers; raw ingredients are not deducted again"->reason to "Utilise les restes enregistrés ; les ingrédients crus ne sont pas déduits à nouveau";"Storage dates do not certify food safety; confirm the actual batch before eating"->reason to "Les dates ne certifient pas la sécurité ; vérifiez le lot avant de manger";else->null
 }
 if(fixed!=null)return mealText(fixed.first,fixed.second)
 Regex("^Source cooking time: (\\d+(?:\\.\\d+)?) minutes$").matchEntire(reason)?.let{return mealText(reason,"Durée de la source : ${it.groupValues[1]} minutes")}
 Regex("^(\\d+) ingredient quantities need review or shopping$").matchEntire(reason)?.let{return mealText(reason,"${it.groupValues[1]} quantités d'ingrédients à vérifier ou acheter")}
 return reason
}
