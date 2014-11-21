package io.trigger.forge.android.modules.flx_photoupload;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeParam;
import io.trigger.forge.android.core.ForgeTask;

import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.provider.MediaStore;
import android.provider.MediaStore.Images.ImageColumns;
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
	 * Creates a JSON list of the photos available on the device's local photo gallery
	 * Each photo object will have the following information:
	 * - id: the identifier of the photo
	 * - uri: the local URI of the photo
	 * - orientation: the orientation of the photo ("landscape" or "portrait")
	 * - date_taken: the timestamp (UTC in seconds) of the photo
	 * - thumb_id: the identifier of the photo's thumbnail (if any)
	 * - thumb_uri: the local URI of the photo's thumbnail (if any)
	 */
	public static void getPhotoList(final ForgeTask task) {
		task.performAsync(new Runnable() {
			public void run() {
				// Get all images
				Cursor cursor = ForgeApp.getActivity().getContentResolver().query(
						MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
						new String[] {
								MediaStore.Images.Media._ID,
								MediaStore.Images.Media.WIDTH,
								MediaStore.Images.Media.HEIGHT,
								MediaStore.Images.Media.DATE_TAKEN,
								MediaStore.Images.Media.ORIENTATION
								},
						null, null, null);
				// JSON result container
				JsonArray photoList = new JsonArray();
				// Construct result be adding each photo
				while (cursor != null && cursor.moveToNext()) {
					// Get photo info
					int photoId = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID));
					int width = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH));
					int height = cursor.getInt(cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT));
					long dateTaken = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)) / 1000;
					int orientationTag = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.ORIENTATION));
					// Swap width and height if orientationTag is set to 90 or 270
					if (orientationTag == 90 || orientationTag == 270) {
						int tmp = width;
						width = height;
						height = tmp;
					}
					// Construct json object
					JsonObject photoObject = new JsonObject();
					photoObject.addProperty("id", photoId);
					photoObject.addProperty("uri", "content://media/external/images/media/" + photoId);
					photoObject.addProperty("orientation", width > height ? "landscape" : "portrait");
					photoObject.addProperty("orientation_tag", orientationTag);
					photoObject.addProperty("date_taken", dateTaken);
					// Get thumbnail if any
					Cursor thumbCursor = ForgeApp.getActivity().getContentResolver().query(
							MediaStore.Images.Thumbnails.EXTERNAL_CONTENT_URI,
							new String[] { ImageColumns._ID },
							MediaStore.Images.Thumbnails.IMAGE_ID + " = ?",
							new String[] { photoId + "" },
							null);
					if (thumbCursor != null) {
						if (!thumbCursor.moveToFirst()) {
							// Thumbnail does not exist
							// Force generation of thumbnail
							Log.i("flx_photos", "Generate thumbnail for photo " + photoId);
							MediaStore.Images.Thumbnails.getThumbnail(
									ForgeApp.getActivity().getContentResolver(),
									photoId,
									MediaStore.Images.Thumbnails.MINI_KIND,
									null);
							// Get thumbnail again
							thumbCursor = ForgeApp.getActivity().getContentResolver().query(
									MediaStore.Images.Thumbnails.EXTERNAL_CONTENT_URI,
									new String[] { ImageColumns._ID },
									MediaStore.Images.Thumbnails.IMAGE_ID + " = ?",
									new String[] { photoId + "" },
									null);
						}
						if (thumbCursor.moveToFirst()) {
							int thumbnailId = thumbCursor.getInt(0);
							photoObject.addProperty("thumb_id", thumbnailId);
							photoObject.addProperty("thumb_uri", "content://media/external/images/thumbnails/" + thumbnailId);
						}
					}
					// Add photo to list
					photoList.add(photoObject);
				}
				// Return photo list
				task.success(photoList.toString());
			}
		});
	}
	
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
	public static void setUploadParameters(final ForgeTask task, @ForgeParam("params") final JsonObject params) {
		Log.i("flx_photoupload", "API: setUploadParameters");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				SharedPreferences prefs = ForgeApp.getActivity().getApplicationContext().getSharedPreferences("flxAutoUploadPreferences", Activity.MODE_PRIVATE);
				// Convert params to map
				Map<String, Object> map = new HashMap<String, Object>(){{
					for (Entry<String, JsonElement> param : params.entrySet()) {
						if (param.getValue().isJsonPrimitive()) {
							if (param.getValue().getAsJsonPrimitive().isString()) {
								put(param.getKey(), param.getValue().getAsString());
								Log.i("flx_photoupload", "Set string " + param.getKey() + " = " + param.getValue());
							} else if (param.getValue().getAsJsonPrimitive().isNumber()) {
								put(param.getKey(), param.getValue().getAsLong());
								Log.i("flx_photoupload", "Set long " + param.getKey() + " = " + param.getValue());
							} 
						}
					}
				}};
				// Initialize photo uploader with parameters
				PhotoUploader.initialize(prefs, map);
				task.success();
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
				Log.i("flx_photoupload", "Received autoupload params: " + params.toString());
				// Add parameters to intent
				for (Entry<String, JsonElement> param : params.entrySet()) {
					if (param.getValue().isJsonPrimitive()) {
						Log.i("flx_photoupload", "Autoupload parameter received: " + param.getKey() + " = " + param.getValue());
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
	 * Logs out the current user and stops all uploads
	 */
	public static void logoutUser(final ForgeTask task) {
		Log.i("flx_photoupload", "API: logoutUser");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				stopAutouploadService(task);
				PhotoUploader.logoutUser();
				UploadService.forgetCurrentUser();
			}
		});
	}
	
	/**
	 * Adds a photo to the pending upload list, and starts the upload process if it was idle
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
	 * Marks an uploaded photo as unuploaded. If 'delete' is non-zero, deletes the photo from local storage.
	 */
	public static void markPhotoAsUnuploaded(final ForgeTask task, @ForgeParam("photoId") final int photoId, @ForgeParam("delete") final int delete) {
		Log.i("flx_photoupload", "API: markPhotoAsUnuploaded(" + photoId + ", " + delete + ")");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				PhotoUploader.markPhotoAsUnuploaded(photoId, delete != 0);
				task.success();
			}
		});
	}
	
	/**
	 * This method takes a list of photo ids and produces a list of booleans, in the same order, telling
	 * if each photo has already been uploaded or not
	 * 
	 * @deprecated Use getPhotoStatuses instead
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
					boolean isPhotoUploaded = PhotoUploader.getPhotoStatus(photoId).equals("uploaded");
					isUploadedArray.add(new JsonPrimitive(isPhotoUploaded));
				}
				task.success(isUploadedArray);
			}
		});
	}
	
	/**
	 * This method takes a list of photo ids and produces a list of strings, in the same order, giving the
	 * status of each photo ("none", "pending" or "uploaded")
	 * 
	 * @param task
	 * @param photoIds
	 */
	public static void getPhotoStatuses(final ForgeTask task, @ForgeParam("photoIds") final JsonArray photoIds) {
		Log.i("flx_photoupload", "API: arePhotosUploaded");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				// Determine which are already uploaded
				JsonArray isUploadedArray = new JsonArray();
				for (JsonElement jsonElement : photoIds) {
					int photoId = jsonElement.getAsInt();
					String isPhotoUploaded = PhotoUploader.getPhotoStatus(photoId);
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
	
	/**
	 * Returns the facet id for the given photo
	 */
	public static void getFacetId(final ForgeTask task, @ForgeParam("photoId") final int photoId) {
		Log.i("flx_photoupload", "API: getFacetId(" + photoId + ")");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				String facetId = PhotoUploader.getFacetId(photoId);
				if (facetId != null) {
					task.success(facetId);
				} else {
					task.error("Photo " + photoId + " has no recorded facet id");
				}
			}
		});
	}
	
}
