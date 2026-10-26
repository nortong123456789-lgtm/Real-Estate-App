package com.realestate.ingest.data

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {

    private const val PREFS_NAME = "real_estate_ingest_prefs"
    private const val KEY_BASE_URL = "base_url"
    const val DEFAULT_BASE_URL = "http://47.129.153.29/"

    fun getBaseUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var savedUrl = prefs.getString(KEY_BASE_URL, null)

        // Clear stale local/emulator IP if previously saved
        if (savedUrl.isNullOrBlank() || savedUrl.contains("10.0.2.2") || savedUrl.contains("localhost")) {
            savedUrl = DEFAULT_BASE_URL
            setBaseUrl(context, DEFAULT_BASE_URL)
        }

        if (!savedUrl.startsWith("http://") && !savedUrl.startsWith("https://")) {
            savedUrl = "http://$savedUrl"
        }

        return if (savedUrl.endsWith("/")) savedUrl else "$savedUrl/"
    }

    fun setBaseUrl(context: Context, url: String) {
        var formattedUrl = url.trim()
        if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
            formattedUrl = "http://$formattedUrl"
        }
        if (!formattedUrl.endsWith("/")) {
            formattedUrl = "$formattedUrl/"
        }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_BASE_URL, formattedUrl).apply()
    }

    fun provideApiService(context: Context): ApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .build()

        val baseUrl = getBaseUrl(context)

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        return retrofit.create(ApiService::class.java)
    }
}
