package io.trigger.forge.android.modules.flx_photoupload;

import io.trigger.forge.android.core.ForgeApp;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Queue;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.HttpMultipartMode;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.entity.mime.content.FileBody;
import org.apache.http.entity.mime.content.StringBody;
import org.apache.http.impl.client.DefaultHttpClient;
import org.json.JSONObject;

import android.content.ContentResolver;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.database.Cursor;
import android.database.CursorIndexOutOfBoundsException;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Log;

import com.google.gson.JsonObject;

/**
 * This class uploads photos to the Fluxtream server. It emits
 * "photoupload.started", "photoupload.uploaded", "photoupload.failed" and
 * "photoupload.canceled" events for the Forge app.
 * 
 * @author Julien Dupuis
 */
public class PhotoUploader {
	
	// Mutex to prevent concurrency issues
	private static Object mutex = new Object();
	
	/* Parameters */
	
	// The shared preferences where the upload status of each photo is stored
	private static SharedPreferences prefs;
	
	// Id of the currently connected user
	private static String userId;
	
	// Fluxtream server's URL at which the photos must be uploaded
	private static String uploadURL;
	
	// Authentication string used to add authentication to the http requests
	private static String authentication = null;
	
	// The (optional) access token to access the server instead of using authentication
	private static String accessToken = null;
	
	// The expiration date (UTC timestamp) of the access token (optional)
	private static long accessTokenExpiration = 0;
	
	// URL at which a new access token can be fetched
	private static String accessTokenUpdateURL;
	
	/* Photo upload */
	
	// List of photo ids in the waiting queue
	private static Queue<Integer> pendingPhotos = new PriorityQueue<Integer>();
	
	// Photo id of the photo that is currently being uploaded
	private static int currentPhoto = -1;
	
	// Thread used to upload the photos (reset to null when there are no more
	// photos to upload)
	private static Thread uploadThread = null;
	
	// Whether the current upload should be canceled
	private static boolean cancelCurrentUpload = false;
	
	/* Public methods */
	
	/**
	 * Sets the parameters for uploading. These need to be set before
	 * uploadPhoto() is called.
	 * 
	 * @param prefs
	 *            The shared preferences where the photo upload status is stored
	 * @param params
	 *            The list of parameters (upload_url, authentication, userId, access_token, access_token_expiration)
	 */
	public static void initialize(SharedPreferences prefs, Map<String, Object> params) {
		Log.i("flx_photoupload", "Initializing PhotoUploader");
		synchronized (mutex) {
			PhotoUploader.prefs = prefs;
			// User id
			Object userId = params.get("userId");
			if (userId != null && userId instanceof String)
				PhotoUploader.userId = (String)userId;
			// Upload URL
			Object uploadURL = params.get("upload_url");
			if (uploadURL != null && uploadURL instanceof String) {
				Log.i("flx_photoupload", "Setting photo url: '" + uploadURL + "'");
				PhotoUploader.uploadURL = (String)uploadURL;
			} else
				Log.i("flx_photoupload", "Upload url is not a string: " + uploadURL);
			// Authentication
			Object authentication = params.get("authentication");
			if (authentication != null && authentication instanceof String)
				PhotoUploader.authentication = (String)authentication;
			// Access token
			Object accessToken = params.get("access_token");
			PhotoUploader.accessToken = null;
			if (accessToken != null && accessToken instanceof String)
				PhotoUploader.accessToken = (String)accessToken;
			// Access token expiration date
			Object accessTokenExpiration = params.get("access_token_expiration");
			if (accessTokenExpiration != null && accessTokenExpiration instanceof Long)
				PhotoUploader.accessTokenExpiration = (Long)accessTokenExpiration;
			// Access token update URL
			Object accessTokenUpdateURL = params.get("access_token_update_url");
			PhotoUploader.accessTokenUpdateURL = null;
			if (accessTokenUpdateURL != null && accessTokenUpdateURL instanceof String)
				PhotoUploader.accessTokenUpdateURL = (String)accessTokenUpdateURL;
			// Device id
			Object deviceId = params.get("device_id");
			if (deviceId != null && deviceId instanceof String)
				ParseLog.setDeviceId((String)deviceId);
		}
	}
	
	/**
	 * Logs out the current user and stops all uploads
	 */
	public static void logoutUser() {
		Log.i("flx_photoupload", "Call to logoutUser()");
		synchronized (mutex) {
			Log.i("flx_photoupload", "Logging out user");
			ParseLog.logEvent("Logging out user");
			PhotoUploader.userId = null;
			PhotoUploader.uploadURL = null;
			PhotoUploader.authentication = null;
			currentPhoto = -1;
			cancelCurrentUpload = true;
			pendingPhotos.clear();
			uploadThread.interrupt();
			Log.i("flx_photoupload", "User was logged out");
		}
	}
	
	/**
	 * Returns whether a given photo has already been successfully uploaded
	 */
	public static boolean isPhotoUploaded(int photoId) {
		return prefs.getBoolean("user." + userId + ".photo." + photoId
				+ ".uploaded", false);
	}
	
	/**
	 * Adds a photo to the upload queue, and starts the uploading thread if it
	 * is not started
	 * 
	 * @param photoId
	 */
	public static void uploadPhoto(int photoId) {
		Log.i("flx_photoupload", "Call to PhotoUploader.uploadPhoto(" + photoId + ")");
		ParseLog.logEvent("Calling uploadPhoto", "photo " + photoId);
		synchronized (mutex) {
			// Check if the photo is currently being uploaded
			if (currentPhoto == photoId) {
				Log.i("flx_photoupload", "Upload of photo " + photoId + " already in progress");
				ParseLog.logEvent("Upload already in progress", "photo " + photoId);
				ForgeApp.event("photoupload.started", eventDataForPhotoId(photoId));
				return;
			}
			// Check if the photo is already in the queue
			if (pendingPhotos.contains(photoId)) {
				Log.i("flx_photoupload", "Photo " + photoId + " already in upload queue");
				ParseLog.logEvent("Photo already in queue", "photo " + photoId);
				return;
			}
			// Check if the photo is already uploaded
			if (isPhotoUploaded(photoId)) {
				Log.i("flx_photoupload", "Photo " + photoId + " is already uploaded");
				ParseLog.logEvent("Photo already uploaded", "photo " + photoId);
				ForgeApp.event("photoupload.uploaded", eventDataForPhotoId(photoId));
				return;
			}

			// Add the photo to the upload queue
			Log.i("flx_photoupload", "Adding photo " + photoId + " to pending photo list");
			ParseLog.logEvent("Adding photo to upload queue", "photo " + photoId);
			pendingPhotos.add(photoId);

			// Start upload if it is not started yet
			startUploading();
		}
	}
	
	/**
	 * Cancels the upload of the photoId (if not too late).
	 * 
	 * Warning: if the photo has already been uploaded, but the server's
	 * response has not yet arrived, the photo might be marked as not uploaded
	 * though it has been uploaded.
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
				if (uploadThread != null)
					uploadThread.interrupt();
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
		return prefs.getString("user." + userId + ".photo." + photoId
				+ ".facetId", null);
	}
	
	/* Private methods */
	
	/**
	 * Starts the upload thread if it is not yet started
	 */
	private static void startUploading() {
		synchronized (mutex) {
			// Check if upload thread already exists
			if (uploadThread != null) {
				Log.i("flx_photoupload", "Photo upload thread already running, interrupt it");
				uploadThread.interrupt();
				return;
			}
			Log.i("flx_photoupload", "Starting a new photo upload thread");
			ParseLog.logEvent("Starting photo upload thread");
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
		ParseLog.logEvent("Mark photo as uploaded", "photo " + photoId);
		Editor editor = prefs.edit();
		editor.putBoolean("user." + userId + ".photo." + photoId + ".uploaded",
				true);
		editor.putString("user." + userId + ".photo." + photoId + ".facetId",
				facetId);
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
	 * Uploads the given photo the the Fluxtream server. Returns the facet id of
	 * the photo.
	 */
	private static String uploadPhotoNow(int photoId) throws Exception {
		// Generate 'started' event
		ForgeApp.event("photoupload.started", eventDataForPhotoId(photoId));
		
		// If using an access token, make sure it is up-to-date
		updateAccessTokenIfNeeded();
		
		// Get photo data
		Uri uri = Uri.parse("content://media/external/images/media/" + photoId);
		Map<String, String> photoData = getPhotoData(uri);
		
		// Create file body
		FileBody fileBody = new FileBody(new File(photoData.get("path")));
		
		// Create multipart body builder
		MultipartEntityBuilder builder = MultipartEntityBuilder.create();
		builder.setMode(HttpMultipartMode.BROWSER_COMPATIBLE);
		builder.addPart("photo", fileBody);
		builder.addPart("metadata", new StringBody("{capture_time_secs_utc:"
				+ photoData.get("timestamp") + "}", ContentType.TEXT_PLAIN));
		
		// Create post request
		HttpClient httpClient = new DefaultHttpClient();
		String uploadURL = PhotoUploader.uploadURL + (accessToken != null ? "&access_token=" + accessToken : "");
		HttpPost httpPost = new HttpPost(uploadURL);
		if (accessToken == null) {
			httpPost.setHeader("Authorization", "Basic " + authentication);
		}
		httpPost.setEntity(builder.build());
		
		// Send request
		ParseLog.logEvent("Uploading photo", "photo " + photoId);
		HttpResponse response = httpClient.execute(httpPost);
		
		// Check response status code
		int statusCode = response.getStatusLine().getStatusCode();
		ParseLog.logEvent("Photo upload done", "photo " + photoId + ", status " + statusCode);
		if (statusCode != 200) {
			if (statusCode == 401) {
				// Invalidate access token
				PhotoUploader.accessTokenExpiration = 0;
			}
			throw new Exception("Wrong http response received: " + statusCode);
		}
		
		// Read response
		BufferedReader reader = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
		String line = null;
		String responseBody = "";
		while ((line = reader.readLine()) != null) {
			responseBody = responseBody + line;
		}
		// Log.i("flx_photoupload", "Upload response: " + responseBody);
		
		// Parse response
		JSONObject json = new JSONObject(responseBody);
		
		// Get facet id
		String facetId = json.get("id").toString();
		
		// Generate 'uploaded' event
		synchronized (mutex) {
			if (userId != null) {
				ForgeApp.event("photoupload.uploaded", eventDataForPhotoId(photoId));
			}
		}
		
		return facetId;
	}
	
	private static void updateAccessTokenIfNeeded() throws Exception {
		Log.i("flx_photoupload", "Calling updateAccessTokenIfNeeded()");
		ParseLog.logEvent("Call updateAccessTokenIfNedded()");
		// If no access token, no need to update it
		if (authentication != null && authentication.length() != 0) {
			Log.i("flx_photoupload", "No need for an access token, return");
			ParseLog.logEvent("No need for an access token");
			return;
		}
		// Check if the access token is recent enough
		if (accessToken != null && accessTokenExpiration > System.currentTimeMillis() - 60000) {
			Log.i("flx_photoupload", "Access token still valid");
			ParseLog.logEvent("Access token still valid");
			return;
		}
		// Check that there is an URL to update the access token
		if (accessTokenUpdateURL == null || accessTokenUpdateURL.length() == 0) {
			Log.i("flx_photoupload", "No access token and access token renewal URL is unknown");
			throw new Exception("Unknown token renewal URL");
		}
		Log.i("flx_photoupload", "Sending request to get a new access token");
		ParseLog.logEvent("Requesting new access token");
		// Request a new access token
		HttpClient httpClient = new DefaultHttpClient();
		HttpGet httpGet = new HttpGet(accessTokenUpdateURL);
		HttpResponse response = httpClient.execute(httpGet);
		
		// Check response status code
		int statusCode = response.getStatusLine().getStatusCode();
		if (statusCode / 100 != 2) {
			throw new Exception("Wrong http response received when fetching access token: " + statusCode);
		}
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
		// Get access token
		String accessToken = json.getJSONObject("oauthInfo").getString("fluxtream_access_token");
		// Get expiration
		long accessTokenExpiration = json.getJSONObject("oauthInfo").getLong("fluxtream_access_token_expires");
		synchronized (mutex) {
			if (accessToken != null) {
				PhotoUploader.accessToken = accessToken;
				PhotoUploader.accessTokenExpiration = accessTokenExpiration;
				Log.i("flx_photoupload", "New access token: " + accessToken + " with expiration " + accessTokenExpiration);
				ParseLog.logEvent("New access token received");
			}
		}
	}
	
	/**
	 * Returns the data associated with a given photo: "path": the filesystem
	 * path of the photo "timestamp": the utc timestamp in seconds of the photo
	 */
	private static Map<String, String> getPhotoData(Uri contentUri) {
		// Query file
		ContentResolver contentResolver;
		if (ForgeApp.getActivity() != null) {
			// Current context is the Forge application
			contentResolver = ForgeApp.getActivity().getContentResolver();
		} else {
			// Current context is the background service
			contentResolver = UploadService.getServiceContentResolver();
		}
		Cursor cursor = contentResolver.query(contentUri, new String[] {
				MediaStore.Images.Media.DATA,
				MediaStore.Images.Media.DATE_TAKEN }, null, null, null);
		cursor.moveToFirst();
		// Create result
		Map<String, String> map = new HashMap<String, String>();
		map.put("path", cursor.getString(cursor
				.getColumnIndexOrThrow(MediaStore.Images.Media.DATA)));
		map.put("timestamp",
				cursor.getLong(cursor
						.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN))
						/ 1000 + "");
		cursor.close();
		// Return result map
		return map;
	}
	
	/* Private classes */
	
	/**
	 * This Thread loops through the pending upload queue and tries to upload
	 * the photos one by one. If an error occurs, the photo is sent back to the
	 * end of the list and the upload pauses for one minute.
	 */
	private static class UploadThread extends Thread {
		@Override
		public void run() {
			Log.i("flx_photoupload", "Starting upload thread");
			while (true) {
				// Check that there is a user connected
				if (userId == null) {
					Log.i("flx_photoupload", "User disconnected, stopping upload thread");
					ParseLog.logEvent("User is disconnected, stopping upload thread (1)");
					synchronized (mutex) {
						uploadThread = null;
					}
					return;
				}
				// Get photo id
				int photoId;
				synchronized (mutex) {
					if (pendingPhotos.isEmpty()) {
						// No more photo to upload, close thread
						uploadThread = null;
						return;
					}
					photoId = pendingPhotos.poll();
					currentPhoto = photoId;
				}
				// Upload photo
				try {
					Log.i("flx_photoupload", "Uploading photo " + photoId);
					ParseLog.logEvent("Uploading photo", "photo " + photoId);
					String facetId = uploadPhotoNow(photoId);
					// Mark photo as uploaded
					synchronized (mutex) {
						Log.i("flx_photoupload", "Photo upload done");
						if (userId == null) {
							Log.i("flx_photoupload", "User disconnected, stopping upload thread");
							ParseLog.logEvent("User disconnected, stopping upload thread (2)");
							uploadThread = null;
							return;
						}
						setPhotoUploaded(photoId, facetId);
						currentPhoto = -1;
					}
				} catch (CursorIndexOutOfBoundsException e) {
					// The photo does not exist anymore
					Log.i("flx_photoupload", "Photo " + photoId + " is no longer on the device (CursorIndexOutOfBounds). Removed from upload queue.");
					ForgeApp.event("photoupload.canceled", eventDataForPhotoId(photoId));
					synchronized (mutex) {
						currentPhoto = -1;
						cancelCurrentUpload = false;
					}
				} catch (FileNotFoundException e) {
					// The photo does not exist anymore
					Log.i("flx_photoupload", "Photo " + photoId + " is no longer on the device (FileNotFound). Removed from upload queue.");
					ForgeApp.event("photoupload.canceled", eventDataForPhotoId(photoId));
					synchronized (mutex) {
						currentPhoto = -1;
						cancelCurrentUpload = false;
					}
				} catch (Throwable e) {
					// Check if the thread should end
					if (userId == null) {
						Log.i("flx_photoupload", "User disconnected, stopping upload thread");
						ParseLog.logEvent("User disconnected, stopping upload thread (3)");
						synchronized (mutex) {
							uploadThread = null;
						}
						return;
					}
					// An error occurred
					if (cancelCurrentUpload) {
						Log.i("flx_photoupload", "Upload of photo " + photoId + " canceled");
						// Generate 'canceled' event
						ForgeApp.event("photoupload.canceled",
								eventDataForPhotoId(photoId));
						synchronized (mutex) {
							currentPhoto = -1;
							cancelCurrentUpload = false;
						}
					} else {
						Log.e("flx_photoupload", "Error while uploading photo", e);
						ParseLog.logEvent("Error while uploading photo", e.getMessage());
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
								wait(60000);
							} catch (InterruptedException ex) {
								Log.i("flx_photoupload", "Photo upload thread interrupted");
							}
						}
					}
				}
			}
		}
	}
	
}
