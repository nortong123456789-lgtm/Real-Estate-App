package com.realestate.ingest.data

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okio.BufferedSink
import okio.source
import java.io.IOException

class MediaRepository(private val context: Context) {

    private val apiService by lazy {
        NetworkModule.provideApiService(context)
    }

    fun extractMediaItem(uri: Uri): MediaItem? {
        val contentResolver = context.contentResolver
        val mimeType = contentResolver.getType(uri) ?: "application/octet-stream"
        val isVideo = mimeType.startsWith("video/")

        var displayName = "file_${System.currentTimeMillis()}"
        var sizeBytes: Long = 0L

        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)

                if (nameIndex != -1) {
                    displayName = cursor.getString(nameIndex) ?: displayName
                }
                if (sizeIndex != -1) {
                    sizeBytes = cursor.getLong(sizeIndex)
                }
            }
        }

        return MediaItem(
            uri = uri,
            mimeType = mimeType,
            displayName = displayName,
            sizeBytes = sizeBytes,
            isVideo = isVideo
        )
    }

    suspend fun uploadMediaDump(items: List<MediaItem>): Result<MediaDumpResponse> = withContext(Dispatchers.IO) {
        try {
            if (items.isEmpty()) {
                return@withContext Result.failure(IllegalArgumentException("No items to upload"))
            }

            val parts = mutableListOf<MultipartBody.Part>()

            for (item in items) {
                val requestBody = ContentUriRequestBody(context.contentResolver, item.uri, item.mimeType)
                val part = MultipartBody.Part.createFormData("files", item.displayName, requestBody)
                parts.add(part)
            }

            val response = apiService.uploadMediaDump(parts)

            if (response.isSuccessful || response.code() == 202) {
                val body = response.body() ?: MediaDumpResponse(
                    id = "draft_${System.currentTimeMillis()}",
                    status = "draft",
                    media_count = items.size,
                    message = "202 Accepted"
                )
                Result.success(body)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "HTTP ${response.code()} ${response.message()}"
                Result.failure(RuntimeException(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Streaming RequestBody that writes ContentResolver input streams directly into Okio sink,
     * supporting large video files up to 2GB without heap memory pressure.
     */
    private class ContentUriRequestBody(
        private val contentResolver: ContentResolver,
        private val uri: Uri,
        private val mimeType: String
    ) : RequestBody() {

        override fun contentType(): MediaType? = mimeType.toMediaTypeOrNull()

        @Throws(IOException::class)
        override fun writeTo(sink: BufferedSink) {
            val inputStream = contentResolver.openInputStream(uri)
                ?: throw IOException("Unable to open input stream for URI: $uri")
            inputStream.use { stream ->
                sink.writeAll(stream.source())
            }
        }
    }
}
