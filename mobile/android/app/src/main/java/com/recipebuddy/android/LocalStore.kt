package com.recipebuddy.android

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.room.*
import kotlinx.coroutines.flow.Flow
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

@Entity(primaryKeys = ["account", "kind", "id"])
data class LocalEntry(val account: String, val kind: String, val id: String, val payload: String, val updatedAt: Long = System.currentTimeMillis())
@Dao interface LocalDao {
    @Query("SELECT * FROM LocalEntry WHERE account = :account AND kind = :kind ORDER BY updatedAt, id")
    fun observe(account: String, kind: String): Flow<List<LocalEntry>>
    @Query("SELECT * FROM LocalEntry WHERE account = :account AND kind = :kind") suspend fun entries(account: String, kind: String): List<LocalEntry>
    @Query("SELECT * FROM LocalEntry WHERE account = :account AND kind = :kind AND id = :id") suspend fun entry(account: String, kind: String, id: String): LocalEntry?
    @Query("SELECT * FROM LocalEntry WHERE account = :account") suspend fun accountEntries(account: String): List<LocalEntry>
    @Query("SELECT * FROM LocalEntry WHERE account = :account ORDER BY updatedAt, id") fun observeAccount(account: String): Flow<List<LocalEntry>>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun put(entry: LocalEntry)
    @Query("DELETE FROM LocalEntry WHERE account = :account AND kind = :kind AND id = :id") suspend fun delete(account: String, kind: String, id: String)
    @Query("DELETE FROM LocalEntry") suspend fun purge()
}
@Database(entities = [LocalEntry::class], version = 1, exportSchema = false)
abstract class BuddyDatabase : RoomDatabase() { abstract fun entries(): LocalDao }

// Keystore holds the AES key; only ciphertext/IV is in app-private preferences.
class SecureVault(context: Context) {
    private val prefs = context.getSharedPreferences("secure_credentials", Context.MODE_PRIVATE)
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        return (store.getKey("recipe_buddy_session", null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder("recipe_buddy_session", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            generateKey()
        }
    }
    @Synchronized fun write(name: String, value: String?) {
        if (value == null) { prefs.edit().remove(name).commit(); return }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        prefs.edit().putString(name, Base64.encodeToString(cipher.iv + encrypted, Base64.NO_WRAP)).commit()
    }
    @Synchronized fun read(name: String): String? = try {
        prefs.getString(name, null)?.let {
            val bytes = Base64.decode(it, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12))) }
            cipher.doFinal(bytes.copyOfRange(12, bytes.size)).toString(Charsets.UTF_8)
        }
    } catch (_: Exception) { prefs.edit().remove(name).commit(); null }
    fun clear() { prefs.edit().clear().commit() }
}
