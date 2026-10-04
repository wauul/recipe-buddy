package com.recipebuddy.android

import android.content.ContentValues
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.provider.MediaStore
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import kotlinx.serialization.json.*
import org.junit.*
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class MealPhotoTest {
 @get:Rule val compose=createAndroidComposeRule<MainActivity>()
 private val vm get()=ViewModelProvider(compose.activity)[BuddyViewModel::class.java]
 private val app get()=compose.activity.application as BuddyApp
 private fun settle(){compose.waitUntil(45000){!vm.state.value.busy};compose.waitForIdle()}
 @Test fun galleryAndPermissionRecovery(){
  Assert.assertTrue(BuildConfig.APPLICATION_ID.endsWith(".meals"))
  val device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
  val resolver=app.contentResolver
  val values=ContentValues().apply{put(MediaStore.Images.Media.DISPLAY_NAME,"recipe-buddy-meal-test.jpg");put(MediaStore.Images.Media.MIME_TYPE,"image/jpeg");put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/RecipeBuddyMealTest");put(MediaStore.Images.Media.IS_PENDING,1)}
  val uri=resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values)!!
  try {
   val image=Bitmap.createBitmap(400,300,Bitmap.Config.ARGB_8888)
   Canvas(image).drawColor(Color.rgb(61,106,82))
   resolver.openOutputStream(uri)!!.use{Assert.assertTrue(image.compress(Bitmap.CompressFormat.JPEG,90,it))};image.recycle()
   resolver.update(uri,ContentValues().apply{put(MediaStore.Images.Media.IS_PENDING,0)},null,null)
   compose.runOnUiThread{vm.login("meal-a@example.test","MealTestOnly-2026")}
   compose.waitUntil(45000){vm.state.value.me?.email=="meal-a@example.test"&&!vm.state.value.busy}
   compose.runOnUiThread{vm.preference("language","en");vm.preference("theme","light");vm.loadMeals()};settle()
   compose.waitUntil(45000){vm.state.value.meals!=null&&vm.state.value.language=="en"}
   val occasion=vm.state.value.meals!!["state"]!!.jsonObject["occasions"]!!.jsonArray.map{it.jsonObject}.last{it.containsKey("recipeId")&&it["undone"]?.jsonPrimitive?.booleanOrNull!=true&&it["photo"]?.jsonPrimitive?.contentOrNull.isNullOrBlank()}
   compose.runOnUiThread{vm.followMeal(occasion)};settle()
   compose.waitUntil(10000){vm.state.value.mealDraft.containsKey("recipeId")}
   compose.waitUntil(10000){compose.onAllNodes(hasScrollToIndexAction()).fetchSemanticsNodes().isNotEmpty()}
   compose.onAllNodes(hasScrollToIndexAction()).onLast().performScrollToNode(hasText("Add photo"))
   device.executeShellCommand("pm revoke ${BuildConfig.APPLICATION_ID} android.permission.CAMERA")
   device.executeShellCommand("pm clear-permission-flags ${BuildConfig.APPLICATION_ID} android.permission.CAMERA user-set user-fixed")
   compose.onNodeWithText("Add photo").performScrollTo().performClick()
   compose.onNodeWithText("Take a photo").performClick()
   val deny=device.wait(Until.findObject(By.res(java.util.regex.Pattern.compile(".*:id/permission_deny_button"))),10000)
   Assert.assertNotNull("System camera permission prompt",deny);deny.click()
   compose.waitUntil(10000){compose.onAllNodesWithText("Photo unavailable. Try the gallery.").fetchSemanticsNodes().isNotEmpty()}
   val dir=File(app.getExternalFilesDir(null),"meals").apply{mkdirs()}
   Assert.assertTrue(device.takeScreenshot(File(dir,"09-camera-denied-recovery.png")))
   compose.onNodeWithText("Add photo").performScrollTo().performClick()
   compose.onNodeWithText("Choose photo").performClick()
   compose.waitUntil(10000){device.currentPackageName!=BuildConfig.APPLICATION_ID}
   device.waitForIdle()
   device.dumpWindowHierarchy(File(dir,"picker.xml"));Assert.assertTrue(device.takeScreenshot(File(dir,"09-system-picker.png")))
   val photo=device.wait(Until.findObject(By.descStartsWith("Photo taken on")),10000)
   Assert.assertNotNull("Actual system picker thumbnail",photo);photo.click()
   device.waitForIdle();device.dumpWindowHierarchy(File(dir,"picker-selected.xml"))
   val done=device.wait(Until.findObject(By.text("Done")),10000)
   Assert.assertNotNull("Confirm selected photo",done);done.click()
   compose.waitUntil(15000){device.currentPackageName==BuildConfig.APPLICATION_ID}
   compose.waitUntil(15000){runCatching{compose.onAllNodesWithText("Change photo").fetchSemanticsNodes().isNotEmpty()}.getOrDefault(false)}
   compose.onNodeWithText("Save optional details").performScrollTo().performClick();settle()
   compose.waitUntil(45000){vm.state.value.meals!!["state"]!!.jsonObject["occasions"]!!.jsonArray.any{it.jsonObject["id"]==occasion["id"]&&it.jsonObject["photo"]?.jsonPrimitive?.contentOrNull?.startsWith("/api/meals/")==true}}
   Assert.assertTrue(device.takeScreenshot(File(dir,"10-gallery-photo-saved.png")))
  }finally{resolver.delete(uri,null,null)}
 }
}
