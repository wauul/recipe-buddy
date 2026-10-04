import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
}
android {
    namespace = "com.recipebuddy.android"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.recipebuddy.android"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "0.1.2"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "BACKEND_URL", "\"${providers.gradleProperty("backendUrl").getOrElse("https://recipe-buddy-wauul.vercel.app")}\"")
        manifestPlaceholders["appLinkHost"] = providers.gradleProperty("appLinkHost").getOrElse("recipe-buddy-wauul.vercel.app")
    }
    buildFeatures { compose = true; buildConfig = true }
    // Both languages must remain available after an in-app locale switch in a Play install.
    bundle { language { enableSplit = false } }
    bundle { language { enableSplit = false } }
    buildTypes.getByName("debug") {
        if (providers.gradleProperty("motionReview").orNull == "true") applicationIdSuffix = ".motion"
        // UI reviews can coexist with an installed app without replacing its private data.
        if (providers.gradleProperty("designReview").orNull == "true") applicationIdSuffix = ".design"
        buildConfigField("String", "BACKEND_URL", "\"${providers.gradleProperty("debugBackendUrl").orElse(providers.gradleProperty("backendUrl")).getOrElse("https://recipe-buddy-wauul.vercel.app")}\"")
    }
    val uploadPath = providers.environmentVariable("RECIPEBUDDY_UPLOAD_KEYSTORE").orNull
    if (uploadPath != null) signingConfigs.create("upload") {
        storeFile = file(uploadPath)
        storePassword = providers.environmentVariable("RECIPEBUDDY_UPLOAD_STORE_PASSWORD").get()
        keyAlias = providers.environmentVariable("RECIPEBUDDY_UPLOAD_KEY_ALIAS").get()
        keyPassword = providers.environmentVariable("RECIPEBUDDY_UPLOAD_KEY_PASSWORD").get()
    }
    buildTypes.getByName("release") {
        isMinifyEnabled = true
        isShrinkResources = true
        proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        if (uploadPath != null) signingConfig = signingConfigs.getByName("upload")
    }
    if (gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = true) }) {
        val releaseUrl = URI(providers.gradleProperty("backendUrl").getOrElse("https://recipe-buddy-wauul.vercel.app"))
        require(releaseUrl.scheme == "https" && releaseUrl.host != null && releaseUrl.userInfo == null && releaseUrl.query == null && releaseUrl.fragment == null) { "Release builds require a clean HTTPS backend URL" }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}
dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.09.01"))
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.navigation:navigation-compose:2.9.5")
    implementation("androidx.datastore:datastore-preferences:1.1.7")
    implementation("androidx.room:room-runtime:2.8.1")
    implementation("androidx.room:room-ktx:2.8.1")
    implementation("androidx.work:work-runtime-ktx:2.10.5")
    implementation("com.android.billingclient:billing-ktx:8.0.0")
    ksp("androidx.room:room-compiler:2.8.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("androidx.exifinterface:exifinterface:1.4.1")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("androidx.browser:browser:1.9.0")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.2.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    androidTestImplementation(platform("androidx.compose:compose-bom:2025.09.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
    androidTestImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
