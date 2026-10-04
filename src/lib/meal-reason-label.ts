export function mealReasonLabel(reason:string,locale:string) {
 const labels:Record<string,[string,string]>={
  "recent-actual-meal":["Recently eaten","Consommé récemment"],"already-planned":["Already planned","Déjà prévu"],"selected-pantry-ingredient":["Uses selected pantry ingredients","Utilise les ingrédients sélectionnés"],"instructions-mention-unlisted-oven":["Instructions mention an unlisted oven","La recette mentionne un four non indiqué"],"source-time-exceeds-daily-context":["Source cooking time exceeds available time","La durée de la source dépasse le temps disponible"],"cooking-time-unknown":["Cooking time unknown","Durée de cuisson inconnue"],"prices-unavailable":["Prices unavailable","Prix indisponibles"],"health-check-precedes-preferences":["Restrictions checked before preferences","Restrictions vérifiées avant les préférences"],
  "Use recorded batch leftovers; raw ingredients are not deducted again":[reason,"Utilise les restes enregistrés ; les ingrédients crus ne sont pas déduits à nouveau"],"Storage dates do not certify food safety; confirm the actual batch before eating":[reason,"Les dates ne certifient pas la sécurité ; vérifiez le lot avant de manger"]
 };
 const fixed=labels[reason];if(fixed)return fixed[locale==="fr"?1:0];
 const time=reason.match(/^Source cooking time: (\d+(?:\.\d+)?) minutes$/);if(time)return locale==="fr"?`Durée de la source : ${time[1]} minutes`:reason;
 const needs=reason.match(/^(\d+) ingredient quantities need review or shopping$/);if(needs)return locale==="fr"?`${needs[1]} quantités d’ingrédients à vérifier ou acheter`:reason;
 return reason;
}
