package com.recipebuddy.android

import android.app.Application
import androidx.room.Room
import androidx.datastore.preferences.preferencesDataStore

val android.content.Context.preferences by preferencesDataStore(name = "preferences")
class BuddyApp : Application() {
    lateinit var database: BuddyDatabase; private set
    lateinit var vault: SecureVault; private set
    lateinit var api: BuddyApi; private set
    lateinit var kitchen: OfflineKitchen; private set
    override fun onCreate() {
        super.onCreate()
        database = Room.databaseBuilder(this, BuddyDatabase::class.java, "kitchen.db").build()
        vault = SecureVault(this)
        api = BuddyApi(vault)
        kitchen = OfflineKitchen(this)
        CookingWidget.refresh(this)
    }
}
