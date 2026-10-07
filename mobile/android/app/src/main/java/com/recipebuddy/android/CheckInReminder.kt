package com.recipebuddy.android

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.*
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.*

fun checkInReminderDue(time: String, quietStart: String, quietEnd: String, now: String): Boolean {
    val quiet =
        if (quietStart == quietEnd) false
        else if (quietStart < quietEnd) now >= quietStart && now < quietEnd
        else now >= quietStart || now < quietEnd
    return now >= time && !quiet
}

object CheckInReminderScheduler {
    fun schedule(context: Context, account: String, kitchenId: String) {
        val data = workDataOf("account" to account, "kitchenId" to kitchenId)
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(
                "check-in:$account:$kitchenId",
                ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<CheckInReminderWorker>(15, TimeUnit.MINUTES)
                    .setInputData(data)
                    .addTag("check-in-reminder")
                    .setConstraints(
                        Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
                    )
                    .build(),
            )
    }

    fun cancel(context: Context, account: String, kitchenId: String) {
        WorkManager.getInstance(context).cancelUniqueWork("check-in:$account:$kitchenId")
        context
            .getSystemService(NotificationManager::class.java)
            .cancel("check-in:$account:$kitchenId".hashCode())
    }

    fun clear(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag("check-in-reminder")
        val manager=context.getSystemService(NotificationManager::class.java)
        manager.activeNotifications.filter{it.notification.channelId=="kitchen_check_in"}.forEach{manager.cancel(it.id)}
    }
}

class CheckInReminderWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext as BuddyApp
        val account = inputData.getString("account") ?: return Result.success()
        val kitchenId = inputData.getString("kitchenId") ?: return Result.success()
        if (app.api.session?.userId != account) return Result.success()
        if (
            app.database.entries().entries(account, "outbox").any {
                it.payload.contains("_checkIn")
            }
        )
            return Result.success()
        try {
            val reply =
                buddyJson
                    .parseToJsonElement(
                        app.api.request(
                            "meals/check-in?kitchenId=${android.net.Uri.encode(kitchenId)}"
                        )
                    )
                    .jsonObject
            val check = reply["checkIn"] as? JsonObject ?: return Result.success()
            val r = check["reminder"]!!.jsonObject
            if (r["enabled"]?.jsonPrimitive?.booleanOrNull != true) {
                CheckInReminderScheduler.cancel(app, account, kitchenId)
                return Result.success()
            }
            if ((check["total"]?.jsonPrimitive?.intOrNull ?: 0) == 0) {
                app.getSystemService(NotificationManager::class.java)
                    .cancel("check-in:$account:$kitchenId".hashCode())
                return Result.success()
            }
            val now = ZonedDateTime.now(ZoneId.of(r.mealValue("timezone")))
            if (
                !checkInReminderDue(
                    r.mealValue("time"),
                    r.mealValue("quietStart"),
                    r.mealValue("quietEnd"),
                    now.toLocalTime().toString().take(5),
                )
            )
                return Result.success()
            val date = now.toLocalDate().toString()
            val dao = app.database.entries()
            if (dao.entry(account, "check-in-notification", kitchenId)?.payload == date)
                return Result.success()
            if (
                Build.VERSION.SDK_INT >= 33 &&
                    app.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) !=
                        android.content.pm.PackageManager.PERMISSION_GRANTED
            )
                return Result.success()
            if (app.api.session?.userId != account) return Result.success()
            val manager = app.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(
                NotificationChannel(
                    "kitchen_check_in",
                    app.getString(R.string.check_in_title),
                    NotificationManager.IMPORTANCE_DEFAULT,
                )
            )
            val id = "check-in:$account:$kitchenId".hashCode()
            val open =
                PendingIntent.getActivity(
                    app,
                    id,
                    Intent(app, MainActivity::class.java)
                        .putExtra("account", account)
                        .putExtra("recipe", "checkin:$kitchenId"),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
            manager.notify(
                id,
                NotificationCompat.Builder(app, "kitchen_check_in")
                    .setSmallIcon(R.drawable.chef_hat)
                    .setContentTitle(app.getString(R.string.check_in_title))
                    .setContentText(app.getString(R.string.check_in_notification))
                    .setContentIntent(open)
                    .setAutoCancel(true)
                    .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                    .build(),
            )
            if (app.api.session?.userId == account)
                dao.put(LocalEntry(account, "check-in-notification", kitchenId, date))
            return Result.success()
        } catch (e: ApiFailure) {
            if (e.status in listOf(401, 403, 404)) {
                CheckInReminderScheduler.cancel(app, account, kitchenId)
                return Result.success()
            }
            return Result.retry()
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (_: Exception) {
            return Result.retry()
        }
    }
}
