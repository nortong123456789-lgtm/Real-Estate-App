package com.realestate.ingest.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.graphics.drawable.IconCompat
import com.realestate.ingest.R
import com.realestate.ingest.ShareBubbleActivity

object BubbleHelper {

    private const val TAG = "BubbleHelper"
    private const val CHANNEL_ID = "apnaghar_drafts_channel"
    private const val CHANNEL_NAME = "ApnaGhar Drafts Overlay"
    private const val SHORTCUT_ID = "shortcut_drafts_ingest"
    private const val NOTIFICATION_ID = 1001

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Floating bubble overlay for quick media ingestion to ApnaGhar Drafts"
                    setAllowBubbles(true)
                }
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                notificationManager.createNotificationChannel(channel)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to create notification channel", e)
            }
        }
    }

    fun showBubbleNotification(context: Context, uris: ArrayList<Uri>) {
        try {
            createNotificationChannel(context)

            // Intent to launch floating ShareBubbleActivity
            val targetIntent = Intent(context, ShareBubbleActivity::class.java).apply {
                action = Intent.ACTION_SEND_MULTIPLE
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }

            val bubblePendingIntent = PendingIntent.getActivity(
                context,
                0,
                targetIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )

            val iconCompat = IconCompat.createWithResource(context, R.mipmap.ic_launcher)

            // Register Shortcut required for Bubbles on Android 11+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                try {
                    val shortcutManager = context.getSystemService(ShortcutManager::class.java)
                    val icon = Icon.createWithResource(context, R.mipmap.ic_launcher)
                    val shortcut = ShortcutInfo.Builder(context, SHORTCUT_ID)
                        .setLocusId(android.content.LocusId(SHORTCUT_ID))
                        .setShortLabel(context.getString(R.string.shortcut_share_short))
                        .setLongLabel(context.getString(R.string.shortcut_share_long))
                        .setIcon(icon)
                        .setIntent(targetIntent)
                        .setLongLived(true)
                        .build()

                    shortcutManager?.addDynamicShortcuts(listOf(shortcut))
                } catch (e: Exception) {
                    Log.w(TAG, "Could not add dynamic shortcut", e)
                }
            }

            // Build Notification.BubbleMetadata
            val bubbleData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                NotificationCompat.BubbleMetadata.Builder(bubblePendingIntent, iconCompat)
                    .setDesiredHeight(600)
                    .setAutoExpandBubble(true)
                    .setSuppressNotification(false)
                    .build()
            } else {
                NotificationCompat.BubbleMetadata.Builder(bubblePendingIntent, iconCompat)
                    .setDesiredHeight(600)
                    .setAutoExpandBubble(true)
                    .build()
            }

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setContentTitle(context.getString(R.string.send_to_drafts))
                .setContentText(context.getString(R.string.media_shared_title, uris.size))
                .setSmallIcon(R.mipmap.ic_launcher)
                .setBubbleMetadata(bubbleData)
                .setShortcutId(SHORTCUT_ID)
                .addPerson(
                    androidx.core.app.Person.Builder()
                        .setName("ApnaGhar")
                        .setKey("person_ingest")
                        .setIcon(iconCompat)
                        .setBot(true)
                        .build()
                )
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, builder.build())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to display bubble notification", e)
        }
    }
}
