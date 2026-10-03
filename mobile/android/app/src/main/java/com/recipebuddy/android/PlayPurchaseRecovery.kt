package com.recipebuddy.android

import com.android.billingclient.api.*
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.sync.Mutex
import kotlinx.serialization.json.*
import kotlin.coroutines.resume

private val purchaseRecovery = Mutex()
private val recoveredAt = mutableMapOf<String, Long>()
// Play retains completed purchases if the process/sheet closes before verification.
// Recover them on returning to the app; only the authenticated backend grants Pro.
suspend fun recoverPlayPurchases(app: BuddyApp, pro: ProStatus): Boolean {
    if(!pro.billingReady || !purchaseRecovery.tryLock()) return false
    val account = app.api.session?.userId
    val billing = BillingClient.newBuilder(app).setListener { _, _ -> }
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .enableAutoServiceReconnection().build()
    return try {
        if(account != null && android.os.SystemClock.elapsedRealtime() - (recoveredAt[account] ?: -300_000L) < 300_000L) return false
        withTimeout(15_000) {
            val ready = suspendCancellableCoroutine<Boolean> { continuation ->
                billing.startConnection(object: BillingClientStateListener {
                    override fun onBillingServiceDisconnected() { }
                    override fun onBillingSetupFinished(result: BillingResult) { if(continuation.isActive) continuation.resume(result.responseCode == BillingClient.BillingResponseCode.OK) }
                })
            }
            if(!ready || account == null || app.api.session?.userId != account) return@withTimeout false
            val purchases = suspendCancellableCoroutine<List<Purchase>> { continuation ->
                billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()) { result, values ->
                    if(continuation.isActive) continuation.resume(if(result.responseCode == BillingClient.BillingResponseCode.OK) values else emptyList())
                }
            }
            var verified = false
            for(purchase in purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED && pro.productId in it.products }) {
                if(app.api.session?.userId != account) break
                app.api.request("pro/verify", "POST", buildJsonObject { put("purchaseToken", purchase.purchaseToken) }.toString())
                verified = true
            }
            recoveredAt[account] = android.os.SystemClock.elapsedRealtime()
            verified
        }
    } finally { billing.endConnection(); purchaseRecovery.unlock() }
}
