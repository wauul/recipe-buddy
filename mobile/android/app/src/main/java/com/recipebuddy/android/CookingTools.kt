package com.recipebuddy.android

import android.app.*
import android.content.*
import android.os.Build
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import kotlinx.serialization.encodeToString

fun quantityValue(raw: String): Double? {
    val values = mapOf('½' to "1/2", '¼' to "1/4", '¾' to "3/4", '⅓' to "1/3", '⅔' to "2/3", '⅛' to "1/8")
    val text = raw.map { values[it]?.let { f -> " $f" } ?: it.toString() }.joinToString("").trim().replace(',', '.')
    if (Regex("^\\d+(\\.\\d+)?$").matches(text)) return text.toDoubleOrNull()
    val match = Regex("^(?:(\\d+)\\s+)?(\\d+)/(\\d+)$").matchEntire(text) ?: return null
    val denominator = match.groupValues[3].toDouble()
    if (denominator == 0.0) return null
    return (match.groupValues[1].toDoubleOrNull() ?: 0.0) + match.groupValues[2].toDouble() / denominator
}
fun scaledQuantity(raw: String, ratio: Double): String = if (ratio == 1.0) raw else quantityValue(raw)?.let {
    java.math.BigDecimal.valueOf(it * ratio).setScale(3, java.math.RoundingMode.HALF_UP).stripTrailingZeros().toPlainString()
} ?: raw
data class ExplicitDuration(val label: String, val seconds: Long)
fun explicitDurations(step: String): List<ExplicitDuration> {
    // Ranges, approximate durations and unsupported wording require manual confirmation.
    val regex = Regex("(?<![\\d.])\\b(\\d{1,3})\\s*(seconds?|secondes?|minutes?|mins?|heures?|hours?)\\b", RegexOption.IGNORE_CASE)
    return regex.findAll(step).mapNotNull { match ->
        val before = step.take(match.range.first).takeLast(24)
        if (Regex("(?:\\d\\s*[-–à]\\s*|about\\s+|approximately\\s+|environ\\s+|around\\s+|to\\s+)$", RegexOption.IGNORE_CASE).containsMatchIn(before)) return@mapNotNull null
        val amount = match.groupValues[1].toLong(); val unit = match.groupValues[2].lowercase()
        val seconds = amount * if (unit.startsWith("hour") || unit.startsWith("heure")) 3600 else if (unit.startsWith("min")) 60 else 1
        if (seconds in 1..604800) ExplicitDuration(match.value, seconds) else null
    }.toList()
}
object TimerScheduler {
    private fun pending(context: Context, timer: KitchenTimer) = PendingIntent.getBroadcast(context, timer.id.hashCode(),
        Intent(context, TimerReceiver::class.java).putExtra("timer", timer.id), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun schedule(context: Context, timer: KitchenTimer) {
        if (timer.delivered) return
        val alarms = context.getSystemService(AlarmManager::class.java)
        val deadline = maxOf(System.currentTimeMillis() + 1000, timer.deadline)
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, deadline, pending(context, timer))
        else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, deadline, pending(context, timer))
    }
    fun cancel(context: Context, timer: KitchenTimer) { context.getSystemService(AlarmManager::class.java).cancel(pending(context, timer)); context.getSystemService(NotificationManager::class.java).cancel(timer.id.hashCode()) }
    fun cancelAll(context: Context, timers: List<KitchenTimer>) { timers.forEach { cancel(context, it) }; context.getSystemService(NotificationManager::class.java).cancelAll() }
}
class TimerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as BuddyApp
                val account = app.api.session?.userId ?: return@launch
                val row = app.database.entries().entries(account, "timer").find { it.id == intent.getStringExtra("timer") } ?: return@launch
                val timer = buddyJson.decodeFromString<KitchenTimer>(row.payload)
                if (timer.delivered) return@launch
                val manager = context.getSystemService(NotificationManager::class.java)
                manager.createNotificationChannel(NotificationChannel("cooking_timers", context.getString(R.string.timers), NotificationManager.IMPORTANCE_HIGH))
                if (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    val open = PendingIntent.getActivity(context, timer.id.hashCode(), Intent(context, MainActivity::class.java)
                        .putExtra("recipe", timer.recipeId).putExtra("account", account).putExtra("cook", true), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                    manager.notify(timer.id.hashCode(), NotificationCompat.Builder(context, "cooking_timers").setSmallIcon(R.drawable.chef_hat)
                        .setContentTitle(timer.name).setContentText(context.getString(R.string.timer_finished)).setContentIntent(open).setAutoCancel(true).build())
                }
                if (app.api.session?.userId == account) app.kitchen.kitchen("timer", timer.id, buddyJson.encodeToString(timer.copy(delivered = true)))
            } finally { pending.finish() }
        }
    }
}
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as BuddyApp; val account = app.api.session?.userId ?: return@launch
                app.database.entries().entries(account, "timer").forEach { TimerScheduler.schedule(context, buddyJson.decodeFromString(it.payload)) }
            } finally { pending.finish() }
        }
    }
}
