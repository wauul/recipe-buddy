package com.recipebuddy.android

import java.text.Normalizer
import java.util.Locale

enum class ChefCommand { NEXT, PREVIOUS, REPEAT, EXPLAIN, INGREDIENTS, PREVIEW, PAUSE, UNKNOWN }
fun chefCommand(words: String): ChefCommand {
    val normalized = Normalizer.normalize(words.lowercase(Locale.ROOT), Normalizer.Form.NFD).replace(Regex("\\p{M}"), "")
        .replace(Regex("[^a-z ]"), " ").trim().replace(Regex("\\s+"), " ")
    // Exact phrases only: a casual sentence mentioning "next" must never skip a step.
    return when (normalized) {
        "next", "next step", "chef next", "suivant", "etape suivante", "termine" -> ChefCommand.NEXT
        "back", "previous", "previous step", "retour", "precedent", "etape precedente" -> ChefCommand.PREVIOUS
        "repeat", "say again", "repete", "repeter" -> ChefCommand.REPEAT
        "explain", "explain this", "help", "how", "explique", "expliquer", "aide", "comment" -> ChefCommand.EXPLAIN
        "ingredients", "what do i need", "what do i need now", "de quoi ai je besoin" -> ChefCommand.INGREDIENTS
        "what s next", "what is next", "preview", "ensuite", "apres" -> ChefCommand.PREVIEW
        "pause", "stop", "stop listening", "arrete", "arret" -> ChefCommand.PAUSE
        else -> ChefCommand.UNKNOWN
    }
}

// Local coaching adds technique context, never invents cooking times, temperatures,
// substitutions or changes to the recipe. The original instruction stays visible.
fun chefExplanation(instruction: String, language: String): String {
    val lower = instruction.lowercase(Locale.ROOT)
    val french = language == "fr"
    val tips = mutableListOf<String>()
    fun tip(pattern: String, en: String, fr: String) { if (Regex(pattern).containsMatchIn(lower)) tips += if (french) fr else en }
    tip("\\b(chop|dice|mince|slice|cut)\\b|hach|emin|coup|taill", "Aim for similar-sized pieces so they cook evenly. Set them aside before moving on.", "Faites des morceaux de taille similaire pour une cuisson uniforme. Réservez-les avant de continuer.")
    tip("saute|sauté|faire revenir|faites revenir", "Sautéing means cooking in a shallow pan with a little fat. Keep the food moving and watch its color; use the recipe's heat and timing.", "Faire revenir consiste à cuire dans une poêle avec un peu de matière grasse. Remuez et surveillez la couleur ; suivez la chaleur et la durée de la recette.")
    tip("simmer|mijot|frém", "Look for small, gentle bubbles rather than a rolling boil. Follow the recipe's time and keep an eye on the liquid.", "Cherchez de petites bulles douces, pas une forte ébullition. Respectez la durée indiquée et surveillez le liquide.")
    tip("boil|bouillir|ébullition", "A boil has bubbles rising continuously across the surface. Stay nearby and follow the recipe's timing; the timer does not check doneness.", "L'ébullition produit des bulles continues à la surface. Restez à proximité et suivez la durée ; le minuteur ne vérifie pas la cuisson.")
    tip("whisk|beat|fouett|batt", "Whisk with steady, quick movements to combine the mixture evenly. Scrape the edges of the bowl as you go.", "Fouettez avec des mouvements réguliers et rapides pour homogénéiser le mélange. Raclez les bords du bol.")
    tip("fold|incorpor.*délicat", "Folding means lifting the mixture from underneath and turning it over gently, rather than beating it, to preserve air.", "Incorporer délicatement consiste à soulever le mélange par-dessous et à le retourner doucement pour préserver l'air.")
    tip("knead|pétr", "Kneading means pressing and folding the dough repeatedly to develop its structure. Follow the texture and duration specified in your recipe.", "Pétrir consiste à presser et replier la pâte pour développer sa structure. Suivez la texture et la durée indiquées.")
    tip("preheat|préchauff", "Let the oven reach the temperature written in the recipe before putting the food in. Check the oven mode too.", "Attendez que le four atteigne la température indiquée avant d'enfourner. Vérifiez aussi le mode du four.")
    tip("bake|roast|enfourn|rôt|au four", "Use the oven temperature and position specified in the recipe. Start checking at its stated time; ovens can vary.", "Utilisez la température et la position indiquées. Commencez à vérifier à l'heure prévue ; les fours peuvent varier.")
    tip("drain|égout", "Set a colander securely in the sink first, then pour slowly and keep your hands away from the steam.", "Placez d'abord une passoire stable dans l'évier, versez lentement et gardez les mains loin de la vapeur.")
    tip("mix|stir|mélang|remu", "Work through the whole mixture, including the bottom and sides, so everything combines evenly.", "Mélangez jusqu'au fond et sur les côtés pour répartir les ingrédients uniformément.")
    return tips.distinct().take(2).joinToString(" ").ifBlank {
        if (french) "Préparez ce que demande cette étape avant de commencer. Suivez les quantités et les indications affichées. Vous pouvez demander les ingrédients ou l'étape suivante ; je ne peux pas voir ni vérifier votre cuisson."
        else "Get everything this step needs ready before starting. Follow the amounts and cues shown on screen. You can ask for ingredients or a preview of the next step; I cannot see or verify your food."
    }
}
fun chefSpeech(recipe: Recipe, step: Int, language: String, roast: Boolean, explainOnly: Boolean = false): String {
    val instruction = recipe.text(recipe.steps.getOrElse(step) { "" }, language)
    val fr = language == "fr"
    val intro = if (roast) {
        val lines = if (fr) listOf("Allez chef, cette casserole ne va pas se cuisiner toute seule.", "On se concentre. Le dîner mérite mieux qu'une improvisation totale.", "Votre planche n'est pas un objet de décoration. Au travail.")
        else listOf("Come on, chef. That pan is not going to cook itself.", "Focus. Dinner deserves better than freestyle chaos.", "That chopping board is not a decorative accessory. Let's get to work.")
        lines[step.mod(lines.size)] + " "
    } else ""
    val header = if (fr) "Étape ${step + 1} sur ${recipe.steps.size}. " else "Step ${step + 1} of ${recipe.steps.size}. "
    return intro + (if (explainOnly) "" else header + instruction + " ") + chefExplanation(instruction, language)
}
fun chefIngredients(recipe: Recipe, servings: Int, language: String): String {
    val fr = language == "fr"
    val amounts = recipe.ingredients.joinToString(". ") { ingredient ->
        listOf(recipe.text(scaledQuantity(ingredient.quantity, servings.toDouble() / recipe.servings.coerceAtLeast(1)), language), recipe.text(ingredient.unit, language), recipe.text(ingredient.name, language)).filter { it.isNotBlank() }.joinToString(" ")
    }
    return (if (fr) "Pour toute la recette, prévoyez : " else "For the whole recipe, have ready: ") + amounts + if (fr) ". Les quantités sont pour $servings portions ; vérifiez les unités et les éléments qui ne se multiplient pas simplement." else ". These amounts are for $servings servings; check units and ingredients that do not scale directly."
}
