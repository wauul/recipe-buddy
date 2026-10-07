package com.recipebuddy.android

import android.app.NotificationManager
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.*
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import org.junit.*
import org.junit.runner.RunWith

// Run stage, force-stop the isolated package, then recover. No production identity or URL.
@RunWith(AndroidJUnit4::class)
class CheckInRestartTest {
    @get:Rule val compose=createAndroidComposeRule<MainActivity>()
    private val app get()=compose.activity.application as BuddyApp
    private val vm get()=ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
    private fun guard(){Assert.assertEquals("http://127.0.0.1:3003",BuildConfig.BACKEND_URL);Assert.assertTrue(BuildConfig.APPLICATION_ID.endsWith(".meals"))}
    @Test fun stageOffline(){
        guard()
        compose.waitUntil(45000){vm.state.value.me!=null&&!vm.state.value.busy}
        compose.runOnUiThread{vm.loadMeals()}
        compose.waitUntil(45000){vm.state.value.meals!=null&&!vm.state.value.busy}
        val root=vm.state.value.meals!!
        val q=root["checkIn"]!!.jsonObject.mealRows("questions").first{it.mealValue("kind")=="pantry"&&it["quantity"]!=JsonNull}
        val op=java.util.UUID.randomUUID().toString()
        app.vault.write("checkInOfflineOperation",op)
        app.vault.write("checkInOfflineBatch",q.mealValue("sourceId"))
        app.vault.write("checkInOfflineAmount",(q["quantity"]!!.jsonPrimitive.double-1).toString())
        app.api.configure("http://127.0.0.1:3999")
        compose.runOnUiThread{
            vm.saveMealCheckIn(buildJsonObject{put(root.mealValue("kitchenId"),buildJsonObject{put("title","Offline stock answer");put("operationId",op);put("pending",true);put("question",q)})})
            vm.submitCheckIn("stock",buildJsonObject{put("id",q.mealValue("sourceId"));put("delta",-1);put("quantityEstimated",true);put("reason","correction");put("_checkIn",q)},op)
        }
        compose.waitUntil(45000){vm.state.value.pendingChanges>0&&!vm.state.value.busy}
    }
    @Test fun recoverOffline(){
        guard()
        compose.waitUntil(45000){vm.state.value.me!=null&&!vm.state.value.busy}
        Assert.assertTrue(vm.state.value.mealCheckIn.toString().contains("Offline stock answer"))
        compose.runOnUiThread{vm.refresh();vm.loadMeals()}
        compose.waitUntil(45000){vm.state.value.pendingChanges==0&&vm.state.value.meals!=null&&!vm.state.value.busy}
        compose.runOnUiThread{vm.refreshMeals()}
        compose.waitUntil(45000){vm.state.value.meals?.get("state")?.jsonObject?.mealRows("history")?.any{it.mealValue("id")==app.vault.read("checkInOfflineOperation")}==true}
        val state=vm.state.value.meals!!["state"]!!.jsonObject
        Assert.assertEquals(app.vault.read("checkInOfflineAmount")!!.toDouble(),state.mealRows("pantry").first{it.mealValue("id")==app.vault.read("checkInOfflineBatch")}["quantity"]!!.jsonPrimitive.double,0.0)
        Assert.assertEquals(1,state.mealRows("history").count{it.mealValue("id")==app.vault.read("checkInOfflineOperation")})
    }
    @Test fun stage(){
        guard()
        compose.runOnUiThread{if(app.api.session==null)vm.login("checkin-a@example.test","CheckInTestOnly-2026")else vm.refresh()}
        compose.waitUntil(45000){vm.state.value.me?.email=="checkin-a@example.test"&&!vm.state.value.busy}
        compose.runOnUiThread{vm.loadMeals()}
        compose.waitUntil(45000){vm.state.value.meals!=null&&!vm.state.value.busy}
        val id=vm.state.value.meals!!.mealValue("kitchenId")
        compose.runOnUiThread{
            vm.saveMealCheckIn(buildJsonObject{put(id,buildJsonObject{put("title","Process restart draft");put("mode","food")})})
            vm.mealChange("check-in-reminder",buildJsonObject{put("enabled",true);put("time","00:00");put("quietStart","00:00");put("quietEnd","00:00");put("timezone","Europe/Paris")},false)
        }
        compose.waitUntil(45000){!vm.state.value.busy&&vm.state.value.pendingChanges==0}
        CheckInReminderScheduler.schedule(app,app.api.session!!.userId,id)
        val work=WorkManager.getInstance(app).getWorkInfosForUniqueWork("check-in:${app.api.session!!.userId}:$id").get()
        Assert.assertTrue(work.isNotEmpty())
    }
    @Test fun recover(){
        guard()
        compose.waitUntil(45000){vm.state.value.me!=null&&!vm.state.value.busy}
        Assert.assertTrue(vm.state.value.mealCheckIn.toString().contains("Process restart draft"))
        val account=app.api.session!!.userId
        val id=vm.state.value.mealCheckIn.keys.first()
        val wm=WorkManager.getInstance(app)
        Assert.assertTrue(wm.getWorkInfosForUniqueWork("check-in:$account:$id").get().isNotEmpty())
        runBlocking{app.database.entries().delete(account,"check-in-notification",id)}
        val request=OneTimeWorkRequestBuilder<CheckInReminderWorker>().setInputData(workDataOf("account" to account,"kitchenId" to id)).build()
        wm.enqueue(request).result.get()
        compose.waitUntil(45000){wm.getWorkInfoById(request.id).get()?.state?.isFinished==true}
        Assert.assertEquals(WorkInfo.State.SUCCEEDED,wm.getWorkInfoById(request.id).get()!!.state)
        Assert.assertNotNull(runBlocking{app.database.entries().entry(account,"check-in-notification",id)})
        val notifications=app.getSystemService(NotificationManager::class.java)
        Assert.assertTrue(notifications.activeNotifications.any{it.notification.channelId=="kitchen_check_in"})
        compose.runOnUiThread{vm.loadMeals()}
        compose.waitUntil(45000){!vm.state.value.busy&&vm.state.value.meals!=null}
        compose.runOnUiThread{vm.mealChange("check-in-reminder",buildJsonObject{put("enabled",false);put("time","18:00");put("quietStart","21:00");put("quietEnd","08:00");put("timezone","Europe/Paris")},false)}
        compose.waitUntil(45000){!vm.state.value.busy&&vm.state.value.pendingChanges==0}
        CheckInReminderScheduler.cancel(app,account,id)
        Assert.assertFalse(notifications.activeNotifications.any{it.notification.channelId=="kitchen_check_in"})
    }
}
