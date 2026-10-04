package com.recipebuddy.android

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

@Serializable data class Ingredient(val name: String = "", val quantity: String = "", val unit: String = "")
@Serializable data class Recipe(
    val id: String = "", val title: String = "", val imageUrl: String = "", val servings: Int = 2,
    val ingredients: List<Ingredient> = emptyList(), val steps: List<String> = emptyList(),
    val altTitle: String = "", val vibe: String = "cozy", val roastLine: String = "",
    val owned: Boolean = true, val sharedBy: String = "", val sharedChefId: String = "", val updatedAt: String = "",
    val translations: JsonObject? = null,
    val sourceProvenance: JsonObject? = null,
) {
    fun text(source: String, language: String): String = translations?.get(language)?.jsonObject?.get(source)?.jsonPrimitive?.content ?: source
    fun input() = RecipeInput(title, imageUrl, servings, ingredients, steps, altTitle, vibe)
}
@Serializable data class RecipeInput(val title: String, val imageUrl: String, val servings: Int,
    val ingredients: List<Ingredient>, val steps: List<String>, val altTitle: String, val vibe: String)
@Serializable data class RecipePage(val items: List<Recipe>, val nextCursor: String? = null)
@Serializable data class Session(val accessToken: String, val refreshToken: String, val userId: String, val expiresIn: Int = 600)
@Serializable data class ChefLevel(val name: String = "", val level: Int = 1, val points: Int = 0, val description: String = "")
@Serializable data class Chef(val points: Int = 0, val current: ChefLevel = ChefLevel(), val next: ChefLevel? = null, val recipeCount: Int = 0, val receivedAprons: Int = 0, val reviewCount: Int = 0, val averageAprons: Double? = null, val progress: Int = 0, val pointsToNext: Int = 0)
@Serializable data class Week(val count: Int = 0, val days: List<Boolean> = emptyList(), val mascot: String = "")
@Serializable data class Me(val id: String, val username: String, val email: String, val roastEnabled: Boolean, val chef: Chef = Chef(), val week: Week = Week(), val levels: List<ChefLevel> = emptyList(), val cookedToday: List<String> = emptyList(), val termsVersion: String = "", val pro: ProStatus = ProStatus())
@Serializable data class ChefProfile(val id: String, val username: String, val chef: Chef, val recipes: List<Recipe>)
@Serializable data class Take(val id: String, val authorId: String, val authorName: String, val title: String, val type: String, val change: String, val ingredient: String = "", val reason: String = "", val createdAt: String)
@Serializable data class RecipeComment(val id: String, val authorId: String, val authorName: String, val text: String, val takeId: String? = null, val createdAt: String)
@Serializable data class Discussion(val ownerId: String, val takes: List<Take> = emptyList(), val comments: List<RecipeComment> = emptyList())
@Serializable data class ApronReview(val id: String, val authorId: String, val chefName: String, val rating: Int, val text: String = "", val updatedAt: String)
@Serializable data class Reviews(val ownerId: String, val reviews: List<ApronReview> = emptyList())
@Serializable data class Community(val recipeId: String, val discussion: Discussion, val reviews: Reviews)
@Serializable data class RecipeRecipient(val recipientId: String)
@Serializable data class HelpAnswer(val question: String, val answer: String)
@Serializable data class TranslationResult(val translations: List<String>)
@Serializable data class FriendPerson(val id: String, val username: String, val email: String = "")
@Serializable data class Friend(val id: String, val friend: FriendPerson, val status: String)
@Serializable data class Invite(val url: String = "", val expiresAt: String = "", val chefName: String = "")
@Serializable data class RecipeMatch(val recipe: Recipe, val matched: Int, val required: Int, val missing: List<Ingredient>, val quantityCaveat: String, val allFound: Boolean)
@Serializable data class Suggestion(val canonical: String, val label: String, val quantity: String = "", val unit: String = "", val uncertain: Boolean)
@Serializable data class Suggestions(val suggestions: List<Suggestion>)
@Serializable data class ShoppingAmount(val name: String, val amounts: List<String>)
@Serializable data class ShoppingItem(val id: String, val name: String, val amount: String = "", val checked: Boolean = false)
@Serializable data class CookingProgress(val recipeId: String, val step: Int = 0, val servings: Int = 2)
@Serializable data class KitchenTimer(val id: String, val recipeId: String, val name: String, val deadline: Long, val step: Int, val delivered: Boolean = false)
@Serializable data class Download(val recipe: Recipe, val refreshedAt: Long)
@Serializable data class WidgetSelection(val account: String, val recipeId: String, val title: String, val recipe: Recipe? = null)
@Serializable data class BrowserAttempt(val state: String, val verifier: String)
@Serializable data class BrowserUrl(val url: String)
@Serializable data class ApprovalUrl(val redirect: String)
