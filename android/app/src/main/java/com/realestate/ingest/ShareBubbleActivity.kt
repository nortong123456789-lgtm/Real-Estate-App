package com.realestate.ingest

import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.realestate.ingest.data.MediaRepository
import com.realestate.ingest.ui.MediaGridScreen
import com.realestate.ingest.ui.theme.RealEstateIngestTheme
import kotlinx.coroutines.launch

class ShareBubbleActivity : ComponentActivity() {

    private lateinit var repository: MediaRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = MediaRepository(this)

        val uris = extractUrisFromIntent()
        val mediaItems = uris.mapNotNull { repository.extractMediaItem(it) }

        setContent {
            RealEstateIngestTheme {
                var isUploading by remember { mutableStateOf(false) }
                val coroutineScope = rememberCoroutineScope()

                MediaGridScreen(
                    mediaItems = mediaItems,
                    isUploading = isUploading,
                    onSendToDrafts = {
                        isUploading = true
                        coroutineScope.launch {
                            val result = repository.uploadMediaDump(mediaItems)
                            isUploading = false

                            result.onSuccess { response ->
                                Toast.makeText(
                                    this@ShareBubbleActivity,
                                    getString(R.string.upload_success),
                                    Toast.LENGTH_LONG
                                ).show()
                                finish() // Instantly collapse client UI
                            }.onFailure { error ->
                                Toast.makeText(
                                    this@ShareBubbleActivity,
                                    getString(R.string.upload_failed, error.message ?: "Unknown error"),
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    },
                    onDismiss = {
                        finish()
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }

    private fun extractUrisFromIntent(): List<Uri> {
        val uris = LinkedHashSet<Uri>()
        val currentIntent = intent ?: return emptyList()

        // 1. Check intent.clipData
        currentIntent.clipData?.let { clipData ->
            for (i in 0 until clipData.itemCount) {
                val item = clipData.getItemAt(i)
                item.uri?.let { uris.add(it) }
            }
        }

        // 2. Check EXTRA_STREAM
        when (currentIntent.action) {
            android.content.Intent.ACTION_SEND -> {
                val uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    currentIntent.getParcelableExtra(android.content.Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    currentIntent.getParcelableExtra<Parcelable>(android.content.Intent.EXTRA_STREAM) as? Uri
                }
                uri?.let { uris.add(it) }
            }
            android.content.Intent.ACTION_SEND_MULTIPLE -> {
                val parcelableList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    currentIntent.getParcelableArrayListExtra(android.content.Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    currentIntent.getParcelableArrayListExtra<Parcelable>(android.content.Intent.EXTRA_STREAM)?.filterIsInstance<Uri>()
                }
                parcelableList?.let { uris.addAll(it) }
            }
        }

        // 3. Check intent.data
        currentIntent.data?.let { uris.add(it) }

        return uris.toList()
    }
}
