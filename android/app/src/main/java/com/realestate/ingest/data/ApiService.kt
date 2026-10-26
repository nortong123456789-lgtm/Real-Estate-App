package com.realestate.ingest.data

import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

data class MediaDumpResponse(
    val id: String?,
    val status: String?,
    val media_count: Int?,
    val message: String?
)

interface ApiService {
    @Multipart
    @POST("api/listings/media-dump")
    suspend fun uploadMediaDump(
        @Part files: List<MultipartBody.Part>
    ): Response<MediaDumpResponse>
}
