package com.recipebuddy.android

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.CustomCredential
import androidx.credentials.ClearCredentialStateRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.serialization.Serializable

@Serializable data class GoogleAttempt(val attempt: String, val nonce: String, val clientId: String)

suspend fun nativeGoogleToken(context: Context, attempt: GoogleAttempt): String {
    val option = GetSignInWithGoogleOption.Builder(attempt.clientId).setNonce(attempt.nonce).build()
    val response = CredentialManager.create(context).getCredential(context, GetCredentialRequest.Builder().addCredentialOption(option).build())
    val credential = response.credential
    if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) throw ApiFailure(422)
    return GoogleIdTokenCredential.createFrom(credential.data).idToken
}
suspend fun clearGoogleCredential(context: Context) {
    runCatching { CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest()) }
}
