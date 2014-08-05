package io.trigger.forge.android.modules.flx_photoupload;

import io.trigger.forge.android.core.ForgeApp;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Queue;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.entity.mime.content.StringBody;
import org.apache.http.impl.client.DefaultHttpClient;
import org.json.JSONObject;

import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.database.Cursor;
import android.database.CursorIndexOutOfBoundsException;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import com.google.gson.JsonObject;

/**
 * This class uploads photos to the Fluxtream server.
 * It emits "photoupload.started", "photoupload.uploaded", "photoupload.failed" and "photoupload.canceled" events
 * for the Forge app.
 * 
 * @author Julien Dupuis
 */
public class PhotoUploader {
	
	// Mutex to prevent concurrency issues
	private static Object mutex = new Object();
	
	
	/* Parameters */
	
	// The shared preferences where the upload status of each photo is stored
	private static SharedPreferences prefs;
	
	// Fluxtream server's URL at which the photos must be uploaded 
	private static String uploadURL;
	
	// Authentication string used to add authentication to the http requests
	private static String authentication;
	
	
	/* Photo upload */
	
	// List of photo ids in the waiting queue
	private static Queue<Integer> pendingPhotos = new PriorityQueue<Integer>();
	
	// Photo id of the photo that is currently being uploaded
	private static int currentPhoto = -1;
	
	// Thread used to upload the photos (reset to null when there are no more photos to upload)
	private static Thread uploadThread = null;
	
	// Whether the current upload should be canceled
	private static boolean cancelCurrentUpload = false;
	
	
	/* Public methods */
	
	/**
	 * Sets the parameters for uploading. These need to be set before uploadPhoto() is called.
	 * 
	 * @param prefs The shared preferences where the photo upload status is stored
	 * @param uploadURL The URL to which to photos will be uploaded
	 * @param authentication The authentication string for basic authentication
	 */
	public static void initialize(SharedPreferences prefs, String uploadURL, String authentication) {
		Log.i("flx_photoupload", "Initializing PhotoUploader");
		PhotoUploader.prefs = prefs;
		PhotoUploader.uploadURL = uploadURL;
		PhotoUploader.authentication = authentication;
	}
	
	/**
	 * Returns whether a given photo has already been successfully uploaded
	 */
	public static boolean isPhotoUploaded(int photoId) {
		return prefs.getBoolean("photo_" + photoId + "_uploaded", false);
	}
	
	/**
	 * Adds a photo to the upload queue, and starts the uploading thread if it is not started
	 * @param photoId
	 */
	public static void uploadPhoto(int photoId) {
		Log.i("flx_photoupload", "Call to PhotoUploader.uploadPhoto(" + photoId + ")");
		synchronized (mutex) {
			// Check if the photo is currently being uploaded
			if (currentPhoto == photoId) {
				Log.i("flx_photoupload", "Upload of photo " + photoId + " already in progress");
				ForgeApp.event("photoupload.started", eventDataForPhotoId(photoId));
				return;
			}
			// Check if the photo is already in the queue
			if (pendingPhotos.contains(photoId)) {
				Log.i("flx_photoupload", "Photo " + photoId + " already in upload queue");
				return;
			}
			// Check if the photo is already uploaded
			if (isPhotoUploaded(photoId)) {
				Log.i("flx_photoupload", "Photo " + photoId + " is already uploaded");
				ForgeApp.event("photoupload.uploaded", eventDataForPhotoId(photoId));
				return;
			}
			
			// Add the photo to the upload queue
			pendingPhotos.add(photoId);
			
			// Start upload if it not started yet
			startUploading();
		}
	}
	
	/**
	 * Cancels the upload of the photoId (if not too late).
	 * 
	 * Warning: if the photo has already been uploaded, but the server's response has not yet arrived, the
	 * photo might be marked as not uploaded though it has been uploaded.
	 */
	public static void cancelUpload(int photoId) {
		Log.i("flx_photoupload", "Call to PhotoUploader.cancelUpload(" + photoId + ")");
		synchronized (mutex) {
			// Remove from pending upload queue
			pendingPhotos.remove(photoId);
			// Check if the photo is being uploaded
			if (currentPhoto == photoId) {
				// This photo is currently being uploaded, interrupt upload
				cancelCurrentUpload = true;
				if (uploadThread != null) uploadThread.interrupt();
			}
		}
	}
	
	/**
	 * Returns whether a photo is currently being uploaded
	 */
	public static boolean isUploading() {
		return uploadThread != null;
	}
	
	/**
	 * Returns the facet id of a given uploaded photo
	 */
	public static String getFacetId(int photoId) {
		return prefs.getString("photo_" + photoId + "_facetId", null);
	}
	
	/* Private methods */
	
	/**
	 * Starts the upload thread if it is not yet started
	 */
	private static void startUploading() {
		synchronized (mutex) {
			// Check if upload thread already exists
			if (uploadThread != null) {
				uploadThread.interrupt();
				return;
			}
			// Create upload thread
			uploadThread = new UploadThread();
			// Start upload thread
			uploadThread.start();
		}
	}
	
	/**
	 * Mark a photo as uploaded, it won't be uploaded in the future
	 */
	private static void setPhotoUploaded(int photoId, String facetId) {
		Log.i("flx_photoupload", "Marking photo " + photoId + " as uploaded");
		Editor editor = prefs.edit();
		editor.putBoolean("photo_" + photoId + "_uploaded", true);
		editor.putString("photo_" + photoId + "_facetId", facetId);
		editor.apply();
	}
	
	/**
	 * Returns a pre-generated json object with the photoId as attribute
	 */
	private static JsonObject eventDataForPhotoId(int photoId) {
		JsonObject eventData = new JsonObject();
		eventData.addProperty("photoId", photoId);
		return eventData;
	}
	
	/**
	 * Uploads the given photo the the Fluxtream server. Returns the facet id of the photo.
	 */
	private static String uploadPhotoNow(int photoId) throws Exception {
		// Generate 'started' event
		ForgeApp.event("photoupload.started", eventDataForPhotoId(photoId));
		
		// Get photo data
		Uri uri = Uri.parse("content://media/external/images/media/" + photoId);
		Map<String, String> photoData = getPhotoData(uri);
		
		// Create file body
		FileBody fileBody = new FileBody(new File(photoData.get("path")));
		
		// Create multipart body builder
		MultipartEntityBuilder builder = MultipartEntityBuilder.create();
		builder.setMode(HttpMultipartMode.BROWSER_COMPATIBLE);
		builder.addPart("photo", fileBody);
		builder.addPart("metadata", new StringBody("{capture_time_secs_utc:" + photoData.get("timestamp") + "}", ContentType.TEXT_PLAIN));
		
		// Create post request
		HttpClient httpClient = new DefaultHttpClient();
		HttpPost httpPost = new HttpPost(uploadURL);
		httpPost.setHeader("Authorization", "Basic " + authentication);
		httpPost.setEntity(builder.build());
		
		// Send request
		HttpResponse response = httpClient.execute(httpPost);
		
		// Read response
		BufferedReader reader = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
		String line = null;
		String responseBody = "";
		while ((line = reader.readLine()) != null) {
			responseBody = responseBody + line;
		}
		Log.i("flx_photoupload", "Upload response: " + responseBody);
		
		// Parse response
		JSONObject json = new JSONObject(responseBody);
		String result = (String)json.get("result");
		// Make sure the photo was uploaded
		if (!result.equals("OK")) {
			throw new Exception("An error has occured: result=" + result + ", message=" + json.get("message"));
		}
		
		// Get facet id
		String facetId = ((JSONObject)json.get("payload")).get("id").toString();
		
		// Generate 'uploaded' event
		ForgeApp.event("photoupload.uploaded", eventDataForPhotoId(photoId));
		
		return facetId;
	}
	
	/**
	 * Returns the data associated with a given photo:
	 *   "path": the filesystem path of the photo
	 *   "timestamp": the utc timestamp in seconds of the photo
	 */
	private static Map<String, String> getPhotoData(Uri contentUri) {
		// Query file
        Cursor cursor = ForgeApp.getActivity().getContentResolver().query(
        		contentUri,
        		new String[] { MediaStore.Images.Media.DATA, MediaStore.Images.Media.DATE_TAKEN },
        		null, null, null);
        cursor.moveToFirst();
        // Create result
        Map<String, String> map = new HashMap<String, String>();
        map.put("path", cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA)));
        map.put("timestamp", cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)) / 1000 + "");
        // Return result map
        return map;
	}
	
	
	/* Private classes */
	
	/**
	 * This Thread loops through the pending upload queue and tries to upload the
	 * photos one by one. If an error occurs, the photo is sent back to the end of
	 * the list and the upload pauses for one minute.
	 */
	private static class UploadThread extends Thread {
		@Override
		public void run() {
			while (true) {
				// Get photo id
				int photoId;
				synchronized (mutex) {
					if (pendingPhotos.isEmpty()) {
						// No more photo to upload, close thread
						uploadThread = null;
						return;
					};
					photoId = pendingPhotos.poll();
					currentPhoto = photoId;
				}
				// Upload photo
				try {
					Log.i("flx_photoupload", "Uploading photo " + photoId);
					String facetId = uploadPhotoNow(photoId);
					// Mark photo as uploaded
					synchronized (mutex) {
						setPhotoUploaded(photoId, facetId);
						currentPhoto = -1;
					}
				} catch (CursorIndexOutOfBoundsException e) {
					// The photo does not exist anymore
					ForgeApp.event("photoupload.canceled", eventDataForPhotoId(photoId));
					synchronized (mutex) {
						currentPhoto = -1;
						cancelCurrentUpload = false;
					}
				} catch (Throwable e) {
					// An error occurred
					if (cancelCurrentUpload) {
						Log.i("flx_photoupload", "Upload of photo " + photoId + " canceled");
						// Generate 'canceled' event
						ForgeApp.event("photoupload.canceled", eventDataForPhotoId(photoId));
						synchronized (mutex) {
							currentPhoto = -1;
							cancelCurrentUpload = false;
						}
					} else {
						Log.e("flx_photoupload", "Error while uploading photo", e);
						// Generate 'failed' event
						JsonObject data = eventDataForPhotoId(photoId);
						data.addProperty("error", e.getMessage());
						ForgeApp.event("photoupload.failed", data);
						// Re-enqueue photo
						synchronized (mutex) {
							currentPhoto = -1;
							pendingPhotos.add(photoId);
						}
						// Wait 1 minute before continuing
						synchronized (this) {
							try {
								wait(10000); // TODO 60000
							} catch (InterruptedException ex) {
							}
						}
					}
				}
			}
		}
	}
	
}
