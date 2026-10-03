package com.recipebuddy.android

import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.lifecycle.ViewModelProvider
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import org.junit.*
import org.junit.Assert.*
import org.junit.runner.RunWith

// Run stage, force-stop the isolated design package with adb, then run recover.
@RunWith(AndroidJUnit4::class)
class NativeProcessDeathTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val app get() = compose.activity.application as BuddyApp
    private val vm get() = ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
    private fun waitFor(test: () -> Boolean) = compose.waitUntil(60_000, test)
    private fun backend(value: String) {
        runBlocking { app.preferences.edit { it[stringPreferencesKey("backend")] = value } }
        app.api.configure(value)
    }
    @Test fun stage() {
        assertTrue(app.packageName.endsWith(".design")); assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL)
        backend(BuildConfig.BACKEND_URL)
        compose.runOnUiThread { vm.refresh() }
        waitFor { vm.state.value.me != null && vm.state.value.allRecipes.isNotEmpty() && vm.state.value.pendingChanges == 0 }
        backend("http://127.0.0.1:3999")
        val recipe = Recipe(title = "Process death fixture", ingredients = listOf(Ingredient("tomato", "2", "piece")), steps = listOf("Slice.", "Serve."))
        compose.runOnUiThread { vm.updateDraft(recipe); vm.save(); vm.addShopping(ShoppingItem("process-death-item", "Tomato", "2 piece")) }
        waitFor { vm.state.value.allRecipes.any { it.title == recipe.title } && vm.state.value.pendingChanges >= 2 }
        val saved = vm.state.value.allRecipes.first { it.title == recipe.title }
        app.vault.write("processDeathRecipe", saved.id)
        compose.runOnUiThread { vm.progress(saved, 1, 4) }
        waitFor { vm.state.value.pendingChanges >= 3 && vm.state.value.progress[saved.id]?.servings == 4 }
    }
    @Test fun recover() {
        assertTrue(app.packageName.endsWith(".design")); assertEquals("http://127.0.0.1:3002", BuildConfig.BACKEND_URL)
        val id = app.vault.read("processDeathRecipe") ?: error("Run stage before the external force-stop")
        waitFor { vm.state.value.me != null && vm.state.value.allRecipes.any { it.id == id } && vm.state.value.shopping.any { it.id == "process-death-item" } && vm.state.value.progress[id]?.servings == 4 }
        assertEquals("http://127.0.0.1:3999", app.api.baseUrl)
        assertTrue(vm.state.value.pendingChanges >= 3)
        backend(BuildConfig.BACKEND_URL); compose.runOnUiThread { vm.refresh() }
        waitFor { vm.state.value.pendingChanges == 0 }
        assertEquals("Process death fixture", runBlocking { buddyJson.decodeFromString<Recipe>(app.api.request("recipes/$id")) }.title)
        compose.runOnUiThread { vm.delete(vm.state.value.allRecipes.first { it.id == id }); vm.deleteShopping(vm.state.value.shopping.first { it.id == "process-death-item" }) }
        waitFor { vm.state.value.pendingChanges == 0 }
        app.vault.write("processDeathRecipe", null)
    }
}
