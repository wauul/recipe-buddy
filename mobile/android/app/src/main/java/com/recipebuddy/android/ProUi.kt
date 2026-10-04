package com.recipebuddy.android

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.android.billingclient.api.*
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*

@Serializable data class ProStatus(val active: Boolean = false, val expiresAt: String? = null, val billingReady: Boolean = false,
    val accountId: String = "", val productId: String = "recipe_buddy_pro", val basePlanId: String = "monthly", val state: String = "FREE", val basePlanIds: List<String> = listOf("monthly", "yearly"))
private data class ProOffer(val product: ProductDetails, val token: String, val price: String, val plan: String)
private fun Context.activity(): Activity? = when(this) { is Activity -> this; is ContextWrapper -> baseContext.activity(); else -> null }

@Composable fun ProLabel() { Surface(Modifier.padding(start = 8.dp), shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.secondaryContainer) { Text("PRO", Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall) } }
@Composable fun ProProfileCard(state: BuddyState, vm: BuddyViewModel) {
    Surface(onClick = vm::showPro, shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.primaryContainer) {
        Row(Modifier.fillMaxWidth().padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Icon(Icons.Outlined.AutoAwesome, null, Modifier.size(28.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) { Text("Recipe Buddy Pro", style = MaterialTheme.typography.titleLarge); SmallNote(stringResource(if(state.me?.pro?.active == true) R.string.pro_active else R.string.pro_profile_note)) }
            Icon(Icons.Outlined.ChevronRight, null)
        }
    }
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun ProSheet(state: BuddyState, vm: BuddyViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var offers by remember { mutableStateOf<List<ProOffer>>(emptyList()) }
    var selectedPlan by remember { mutableStateOf("monthly") }
    var message by remember { mutableStateOf<String?>(null) }
    var verifying by remember { mutableStateOf(false) }
    val pro = state.me?.pro ?: ProStatus()
    val offer = offers.firstOrNull { it.plan == selectedPlan } ?: offers.firstOrNull()
    fun verify(purchases: List<Purchase>) { purchases.filter { it.purchaseState == Purchase.PurchaseState.PURCHASED && pro.productId in it.products }.forEach { purchase -> scope.launch {
        verifying = true
        try { vm.api.request("pro/verify", "POST", buildJsonObject { put("purchaseToken", purchase.purchaseToken) }.toString()); vm.refresh(); message = context.getString(R.string.pro_restored) }
        catch (_: Exception) { message = context.getString(R.string.pro_verify_retry) }
        finally { verifying = false }
    } } }
    val billing = remember(context, state.account) { BillingClient.newBuilder(context).setListener { result, purchases ->
        if(result.responseCode == BillingClient.BillingResponseCode.OK) verify(purchases ?: emptyList())
        else if(result.responseCode != BillingClient.BillingResponseCode.USER_CANCELED) message = context.getString(R.string.pro_checkout_unavailable)
    }.enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build() }
    DisposableEffect(billing, pro.billingReady) {
        if(pro.billingReady) billing.startConnection(object : BillingClientStateListener {
            override fun onBillingServiceDisconnected() { offers = emptyList() }
            override fun onBillingSetupFinished(result: BillingResult) {
                if(result.responseCode != BillingClient.BillingResponseCode.OK) return
                val query = QueryProductDetailsParams.newBuilder().setProductList(listOf(QueryProductDetailsParams.Product.newBuilder().setProductId(pro.productId).setProductType(BillingClient.ProductType.SUBS).build())).build()
                billing.queryProductDetailsAsync(query) { _, data ->
                    val product = data.productDetailsList.firstOrNull()
                    offers = product?.subscriptionOfferDetails?.mapNotNull { option ->
                        val phase = option.pricingPhases.pricingPhaseList.lastOrNull()
                        val period = if(option.basePlanId == "yearly") "P1Y" else "P1M"
                        if(option.basePlanId !in pro.basePlanIds || option.offerId != null || phase == null || phase.billingPeriod != period || phase.recurrenceMode != ProductDetails.RecurrenceMode.INFINITE_RECURRING) null
                        else ProOffer(product, option.offerToken, phase.formattedPrice, option.basePlanId)
                    } ?: emptyList()
                }
            }
        })
        onDispose { billing.endConnection() }
    }
    KitchenBottomSheet(onDismissRequest = vm::dismissPro, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(KitchenGutter, 0.dp, KitchenGutter, 28.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { Text("Recipe Buddy Pro", Modifier.weight(1f), style = MaterialTheme.typography.headlineSmall); IconButton(onClick = vm::dismissPro) { Icon(Icons.Outlined.Close, stringResource(R.string.dismiss)) } }
            SmallNote(stringResource(R.string.pro_profile_note))
            listOf(R.string.pro_explain to Icons.Outlined.AutoAwesome, R.string.pro_commands to Icons.Outlined.Mic, R.string.pro_vision to Icons.Outlined.PhotoCamera).forEach { (text, icon) -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary); Text(stringResource(text), style = MaterialTheme.typography.bodyLarge) } }
            SmallNote(stringResource(R.string.pro_free_note))
            if(pro.active) {
                Text(stringResource(R.string.pro_active), style = MaterialTheme.typography.titleMedium)
                KitchenOutlinedButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/account/subscriptions?sku=${Uri.encode(pro.productId)}&package=com.recipebuddy.android"))) }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.pro_manage)) }
            } else {
                offers.sortedBy { if(it.plan == "monthly") 0 else 1 }.forEach { choice ->
                    Surface(onClick = { selectedPlan = choice.plan }, shape = RoundedCornerShape(16.dp), color = if(offer == choice) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLow) {
                        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = offer == choice, onClick = { selectedPlan = choice.plan })
                            Column(Modifier.weight(1f)) {
                                Text(stringResource(if(choice.plan == "yearly") R.string.pro_yearly else R.string.pro_monthly), style = MaterialTheme.typography.titleMedium)
                                Text(stringResource(if(choice.plan == "yearly") R.string.pro_yearly_price else R.string.pro_monthly_price, choice.price), style = MaterialTheme.typography.bodyLarge)
                            }
                        }
                    }
                }
                if(offer != null) SmallNote(stringResource(if(offer.plan == "yearly") R.string.pro_yearly_terms else R.string.pro_billing_terms))
                KitchenButton(onClick = { val choice = offer ?: return@KitchenButton; val activity = context.activity() ?: return@KitchenButton
                    val params = BillingFlowParams.newBuilder().setObfuscatedAccountId(pro.accountId).setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(choice.product).setOfferToken(choice.token).build())).build()
                    val result = billing.launchBillingFlow(activity, params)
                    if(result.responseCode != BillingClient.BillingResponseCode.OK) message = context.getString(R.string.pro_checkout_unavailable)
                }, enabled = pro.billingReady && offer != null && !verifying, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text(stringResource(R.string.pro_upgrade)) }
                if(!pro.billingReady || offer == null) SmallNote(stringResource(R.string.pro_checkout_unavailable))
            }
            KitchenTextButton(onClick = { if(billing.isReady) billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()) { result, purchases -> if(result.responseCode == BillingClient.BillingResponseCode.OK) { if(purchases.isEmpty()) message = context.getString(R.string.pro_no_purchase) else verify(purchases) } } }, enabled = billing.isReady && !verifying, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text(stringResource(R.string.pro_restore)) }
            if(verifying) BuddyLoader(Modifier.fillMaxWidth())
            message?.let { SmallNote(it) }
        }
    }
}

@Composable fun SyncProblemCard(state: BuddyState, vm: BuddyViewModel) {
    val problem = state.syncProblems.firstOrNull() ?: return
    KitchenPanel {
        Text(stringResource(R.string.sync_review), style = MaterialTheme.typography.titleMedium)
        SmallNote(stringResource(R.string.sync_review_note))
        if(problem.kind == "recipe" && problem.localPayload != null) KitchenTextButton(onClick = { vm.resolveSync(problem.operationId, true) }) { Text(stringResource(R.string.sync_keep_copy)) }
        if(problem.path == "kitchen-state") KitchenTextButton(onClick = { vm.resolveSync(problem.operationId, true) }) { Text(stringResource(R.string.sync_keep_mine)) }
        if(problem.path=="meals" && problem.failure==409) {
            Text(mealText("Refresh the kitchen and compare your saved draft before applying it. Stock and permissions are checked again.","Actualisez la cuisine et comparez votre brouillon avant de l’appliquer. Stock et permissions seront revérifiés."))
            KitchenTextButton(onClick=vm::refreshMeals){Text(mealText("Refresh kitchen","Actualiser la cuisine"))}
            KitchenTextButton(onClick={vm.resolveSync(problem.operationId,true)}){Text(mealText("Apply my reviewed draft","Appliquer mon brouillon vérifié"))}
        }
        KitchenTextButton(onClick = { vm.resolveSync(problem.operationId, false) }) { Text(stringResource(R.string.sync_use_server)) }
    }
}
