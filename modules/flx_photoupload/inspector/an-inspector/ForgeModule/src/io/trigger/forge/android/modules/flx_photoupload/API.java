package io.trigger.forge.android.modules.flx_photoupload;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeParam;
import io.trigger.forge.android.core.ForgeTask;

import java.util.Map.Entry;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

/**
 * This API provides tools to automatically upload photos to the Fluxtream server
 * in a background service, and to manually upload individual photos.
 * 
 * If the service is enabled, photos will be automatically uploaded upon some criteria:
 * - Whether it is in landscape/portrait mode
 * - Whether it has been taken after a given date and time
 */
public class API {
	
	/**
	 * Starts the service that will automatically upload photos to the Fluxtream server
	 */
	public static void startAutouploadService(final ForgeTask task) {
		Log.i("flx_photoupload", "API: startUptouploadService");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(ForgeApp.getActivity(), UploadService.class);
				ForgeApp.getActivity().startService(intent);
			}
		});
	}
	
	/**
	 * Sets the upload parameters (used for automatic upload and regular upload)
	 * 
	 * @param uploadURL The URL at which the photos will be sent
	 * @param authentication The basic authentication string (base64 of "{username}:{password}")
	 */
	public static void setUploadParameters(final ForgeTask task, @ForgeParam("uploadURL") final String uploadURL, @ForgeParam("authentication") final String authentication) {
		Log.i("flx_photoupload", "API: setUploadParameters(" + uploadURL + ", " + authentication + ")");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				SharedPreferences prefs = ForgeApp.getActivity().getApplicationContext().getSharedPreferences("flxAutoUploadPreferences", Activity.MODE_PRIVATE);
				PhotoUploader.initialize(prefs, uploadURL, authentication);
			}
		});
	}
	
	/**
	 * Sets parameters for the photo autoupload feature. See {@link UploadService} documentation
	 * for the list of allowed parameters. 
	 */
	public static void setAutouploadOptions(final ForgeTask task, @ForgeParam("params") final JsonObject params) {
		Log.i("flx_photoupload", "API: setAutouploadOptions");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				// Create intent to start service
				Intent intent = new Intent(ForgeApp.getActivity(), UploadService.class);
				// Add parameters to intent
				for (Entry<String, JsonElement> param : params.entrySet()) {
					if (param.getValue().isJsonPrimitive()) {
						if (param.getValue().getAsJsonPrimitive().isBoolean()) {
							intent.putExtra(param.getKey(), param.getValue().getAsBoolean());
						} else if (param.getValue().getAsJsonPrimitive().isNumber()) {
							intent.putExtra(param.getKey(), param.getValue().getAsInt());
						} else if (param.getValue().getAsJsonPrimitive().isString()) {
							intent.putExtra(param.getKey(), param.getValue().getAsString());
						}
					} else {
						Log.e("flx_photoupload", "Non-primitive element in autoupload options");
					}
				}
				// Start service with parameters
				ForgeApp.getActivity().startService(intent);
			}
		});
	}
	
	/**
	 * Stops the autoupload background service
	 */
	public static void stopAutouploadService(final ForgeTask task) {
		Log.i("flx_photoupload", "API: stopAutouploadService");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(ForgeApp.getActivity(), UploadService.class);
				ForgeApp.getActivity().stopService(intent);
				task.success();
			}
		});
	}
	
	/**
	 * Adds a photo to the pending upload list, and starts the upload process if it was idleoId
	 */
	public static void uploadPhoto(final ForgeTask task, @ForgeParam("photoId") final int photoId) {
		Log.i("flx_photoupload", "API: uploadPhoto(" + photoId + ")");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				PhotoUploader.uploadPhoto(photoId);
				task.success();
			}
		});
	}
	
	/**
	 * This method takes a list of photo ids and produces a list of booleans, in the same order, telling
	 * if each photo has already been uploaded or not
	 * 
	 * @param task
	 * @param photoIds
	 */
	public static void arePhotosUploaded(final ForgeTask task, @ForgeParam("photoIds") final JsonArray photoIds) {
		Log.i("flx_photoupload", "API: arePhotosUploaded");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				// Determine which are already uploaded
				JsonArray isUploadedArray = new JsonArray();
				for (JsonElement jsonElement : photoIds) {
					int photoId = jsonElement.getAsInt();
					boolean isPhotoUploaded = PhotoUploader.isPhotoUploaded(photoId);
					isUploadedArray.add(new JsonPrimitive(isPhotoUploaded));
				}
				task.success(isUploadedArray);
			}
		});
	}
	
	/**
	 * Tries canceling a photo upload, if it is not too late
	 */
	public static void cancelUpload(final ForgeTask task, @ForgeParam("photoId") final int photoId) {
		Log.i("flx_photoupload", "API: cancelUpload(" + photoId + ")");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				PhotoUploader.cancelUpload(photoId);
			};
		});
	}
	
}
