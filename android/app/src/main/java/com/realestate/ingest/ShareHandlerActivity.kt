package com.realestate.ingest

import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import com.realestate.ingest.utils.BubbleHelper

class ShareHandlerActivity : ComponentActivity() {

    private companion object {
        private const val TAG = "ShareHandlerActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val uris = extractUrisFromIntent(intent)

        if (uris.isEmpty()) {
            Toast.makeText(this, R.string.no_media_selected, Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                BubbleHelper.showBubbleNotification(this, uris)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Notification bubble skipped", e)
        }

        try {
            // Direct launch into ShareBubbleActivity overlay with explicit ClipData and URI read permission grants
            val bubbleIntent = Intent(this, ShareBubbleActivity::class.java).apply {
                action = intent.action
                type = intent.type
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                if (intent.clipData != null) {
                    clipData = intent.clipData
                } else if (uris.isNotEmpty()) {
                    val firstUri = uris[0]
                    val clip = ClipData.newRawUri("shared_media", firstUri)
                    for (i in 1 until uris.size) {
                        clip.addItem(ClipData.Item(uris[i]))
                    }
                    clipData = clip
                }
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            startActivity(bubbleIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Error launching ShareBubbleActivity", e)
            Toast.makeText(this, "Could not open media preview", Toast.LENGTH_SHORT).show()
        } finally {
            finish()
        }
    }

    private fun extractUrisFromIntent(intent: Intent?): ArrayList<Uri> {
        val uris = LinkedHashSet<Uri>()
        if (intent == null) return ArrayList(uris)

        // 1. Primary Source: Check intent.clipData (Google Photos, Samsung Gallery, Xiaomi Gallery)
        intent.clipData?.let { clipData ->
            for (i in 0 until clipData.itemCount) {
                val item = clipData.getItemAt(i)
                item.uri?.let { uris.add(it) }
            }
        }

        // 2. Secondary Source: EXTRA_STREAM for ACTION_SEND / ACTION_SEND_MULTIPLE
        when (intent.action) {
            Intent.ACTION_SEND -> {
                val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra<Parcelable>(Intent.EXTRA_STREAM) as? Uri
                }
                uri?.let { uris.add(it) }
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                val parcelableList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableArrayListExtra<Parcelable>(Intent.EXTRA_STREAM)?.filterIsInstance<Uri>()
                }
                parcelableList?.let { uris.addAll(it) }
            }
        }

        // 3. Fallback Source: intent.data
        intent.data?.let { uris.add(it) }

        return ArrayList(uris)
    }
}
