package com.realestate.ingest.data

import android.net.Uri

data class MediaItem(
    val uri: Uri,
    val mimeType: String,
    val displayName: String,
    val sizeBytes: Long,
    val isVideo: Boolean
)
