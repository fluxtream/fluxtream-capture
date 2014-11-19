package io.trigger.forge.android.modules.flx_photoupload;

import io.trigger.forge.android.core.ForgeApp;

import java.util.HashMap;

import android.app.Activity;
import android.app.Service;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.database.ContentObserver;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.provider.MediaStore;
import android.provider.MediaStore.Images.Media;
import android.util.Log;

/**
 * This Android Service runs in the background and uploads photos automatically
 * if they correspond to a given filter (landscape/portrait). 
 * 
 * When starting this service, the intent can carry the following parameters in its extras:
 * - "upload_landscape":            whether landscape photos are automatically uploaded
 * - "upload_portrait":             whether portrait photos are automatically uploaded
 * - "landscape_minimum_timestamp": minimum timestamp of the landscape photos for automatic upload
 * - "portrait_minimum_timestamp":  minimum timestamp of the landscape photos for automatic upload
 * - "upload_url":                  URL at which the photos will be uploaded
 * - "authentication":              a base64 encoding of "{username}:{password}" for authentication
 * 
 * @author Julien Dupuis
 */
public class UploadService extends Service {
	
	private static ContentResolver contentResolver;
	
	// The userId of the currently connected user
	private String userId;
	
	// Whether landscape photos are being uploaded automatically
	private boolean uploadLandscape = false;
	
	// Whether portrait photos are being uploaded automatically
	private boolean uploadPortrait = false;
	
	// Only photos after this timestamp will be uploaded automatically
	private int landscapeMinimumTimestamp = 0;
	private int portraitMinimumTimestamp = 0;
	
	// Fluxtream server URL at which the photos will be uploaded
	private String uploadURL = "";
	
	// The shared preferences containing the configuration and the upload status of each photo
	private SharedPreferences prefs = null;
	
	// The thread checking periodically for new photos to upload
	private AutoUploadThread mAutoUploadThread;
	
	// Waiting delay in milliseconds when the photo uploader is active
	private final long WAIT_ON_ACTIVE = 2000; // 2 seconds
	
	// Waiting delay in milliseconds when no photo was found for upload
	private final long WAIT_ON_NO_PHOTO = 600000; // 10 minutes
	
	// Waiting delay in milliseconds when a photo is sent for upload
	private final long WAIT_ON_UPLOAD = 2000; // 2 seconds
	
	// Waiting delay in milliseconds when autoupload is disabled
	private final long WAIT_ON_DISABLED = 60000; // 1 minute
	
	// Waiting delay in milliseconds when an error occurred
	private final long WAIT_ON_ERROR = 60000; // 1 minute
	
	public static ContentResolver getServiceContentResolver() {
		return contentResolver;
	}
	
	@Override
	public void onCreate() {
		// Load preferences
		prefs = getApplicationContext().getSharedPreferences("flxAutoUploadPreferences", Activity.MODE_PRIVATE);
		readAutouploadParameters();
		
		// Start photo checker thread thread
		mAutoUploadThread = new AutoUploadThread();
		mAutoUploadThread.start();
		
		// Subscribe to new photo event
		contentResolver = getContentResolver();
		contentResolver.registerContentObserver(Media.EXTERNAL_CONTENT_URI, true,
				new ContentObserver(new Handler()) {
			@Override
			public void onChange(boolean selfChange, Uri uri) {
				Log.i("flx_photoupload", "A new photo was taken");
				ParseLog.logEvent("A new photo was taken");
				mAutoUploadThread.interrupt();
			}
		});
		
//		// DEBUG CODE
//		new Thread() {
//			public void run() {
//				Log.i("flx_test", "STARTING SERVICE -----------------------------------------------------------------");
//				while (true) {
//					try {
//						Thread.sleep(1000);
//						Log.i("flx_test", "I am still alive at " + System.currentTimeMillis());
//					} catch (InterruptedException e) {
//					}
//				}
//			};
//		}.start();
	}
	
	@Override
	public int onStartCommand(Intent intent, int flags, int startId) {
		// Save parameters
		this.saveParameters(intent);
		// Interrupt autoupload thread
		synchronized (mAutoUploadThread) {
			mAutoUploadThread.notify();
		}
		// Make sure the service if restarted after being killed
		return START_STICKY;
	}
	
	@Override
	public IBinder onBind(Intent intent) {
		// No binding, this Service never stops
		return null;
	}
	
	@Override
	public void onDestroy() {
		// End the autoupload thread
		if (mAutoUploadThread != null) {
			mAutoUploadThread.mTerminated = true;
			mAutoUploadThread.interrupt();
		}
		Log.i("flx_photoupload", "Autoupload service terminated");
		ParseLog.logEvent("Photoupload service terminated");
	}
	
	/**
	 * Retrieves the autoupload parameters from the user preferences
	 */
	public void readAutouploadParameters() {
		// Read parameters from preferences
		this.userId = prefs.getString("autoupload.current_user_id", null);
		Log.i("flx_photoupload", "Autoupload user id = " + this.userId);
		this.uploadLandscape = prefs.getBoolean("user." + userId + ".autoupload." + "upload_landscape", false);
		this.uploadPortrait = prefs.getBoolean("user." + userId + ".autoupload." + "upload_portrait", false);
		Log.i("flx_photoupload", "UploadPortrait is now " + this.uploadPortrait);
		this.landscapeMinimumTimestamp = prefs.getInt("user." + userId + ".autoupload." + "landscape_minimum_timestamp", 0);
		this.portraitMinimumTimestamp = prefs.getInt("user." + userId + ".autoupload." + "portrait_minimum_timestamp", 0);
		this.uploadURL = prefs.getString("user." + userId + ".autoupload." + "upload_url", "");
		final String authentication = prefs.getString("user." + userId + ".autoupload." + "authentication", "");
		final String accessTokenUpdateURL = prefs.getString("user." + userId + ".autoupload." + "access_token_update_url", null);
		final String deviceId = prefs.getString("user." + userId + ".autoupload." + "device_id", null);
		// Send parameters to PhotoUploader
		Log.i("flx_photoupload", "Sending parameters from upload service to photo uploader");
		PhotoUploader.initialize(prefs, new HashMap<String, Object>(){{
			put("userId", UploadService.this.userId);
			put("upload_url", UploadService.this.uploadURL);
			put("authentication", authentication);
			put("access_token_update_url", accessTokenUpdateURL);
			put("device_id", deviceId);
		}});
	}
	
	/**
	 * Saves the parameters from an intent to the user preferences
	 * 
	 * @param intent The intent containing the parameters in its extras
	 */
	private void saveParameters(Intent intent) {
		// Make sure intent exists and has extras
		if (intent == null) return;
		Bundle extras = intent.getExtras();
		if (extras == null) return;
		
		// Get preferences editor
		Editor prefEditor = prefs.edit();
		
		// Get user id from parameters
		String userId = intent.getExtras().getString("userId");
		
		if (userId != null && userId.length() != 0) {
			
			this.userId = userId;
			prefEditor.putString("autoupload.current_user_id", userId);
		
			// Save boolean parameters
			for (String paramName : new String[]{"upload_landscape", "upload_portrait"}) {
				Object paramValue = intent.getExtras().get(paramName);
				if (paramValue != null) {
					prefEditor.putBoolean("user." + userId + ".autoupload." + paramName, (Boolean)paramValue);
				}
			}
			
			// Save integer parameters
			for (String paramName : new String[]{"landscape_minimum_timestamp", "portrait_minimum_timestamp"}) {
				Object paramValue = intent.getExtras().get(paramName);
				if (paramValue != null) prefEditor.putInt("user." + userId + ".autoupload." + paramName, (Integer)paramValue);
			}
			
			// Save string parameters
			for (String paramName : new String[]{"upload_url", "authentication", "access_token_update_url", "device_id"}) {
				Object paramValue = intent.getExtras().get(paramName);
				if (paramValue != null) {
					prefEditor.putString("user." + userId + ".autoupload." + paramName, (String)paramValue);
					Log.i("flx_photoupload", "Save to prefs: " + paramName + " = " + paramValue);
				} else {
					Log.i("flx_photoupload", "Not saving to prefs because null: " + paramName);
				}
			}
			
			// Save preferences
			prefEditor.apply();
			
			// Apply parameters
			readAutouploadParameters();
		} else {
			// No user id
			prefEditor.putString("autoupload.current_user_id", null);
			prefEditor.apply();
		}
	}
	
	/**
	 * Removes the current user id from prefs
	 */
	public static void forgetCurrentUser() {
		SharedPreferences prefs = ForgeApp.getActivity().getApplicationContext().getSharedPreferences("flxAutoUploadPreferences", Activity.MODE_PRIVATE);
		Editor prefEditor = prefs.edit();
		prefEditor.putString("autoupload.current_user_id", null);
		prefEditor.apply();
	}
	
	/**
	 * Reads the photo storage library and checks if unuploaded photos should be uploaded.
	 * Returns the delay before the next check should be done.
	 */
	private synchronized long checkForNewPhotos() {
		if (PhotoUploader.isUploading()) {
			// Don't make simultaneous requests to the photo uploader
			return WAIT_ON_ACTIVE;
		}
		if (uploadLandscape || uploadPortrait) {
			Log.i("flx_photoupload", "Checking for new photos");
			// Get all images
			Cursor cursor = this.getContentResolver().query(
					MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
					new String[] {
							MediaStore.Images.Media._ID,
							MediaStore.Images.Media.WIDTH,
							MediaStore.Images.Media.HEIGHT,
							MediaStore.Images.Media.DATE_TAKEN,
							MediaStore.Images.Media.ORIENTATION
							},
					null, null, null);
			// Check for each image if it must be uploaded
			while (cursor != null && cursor.moveToNext()) {
				// Get photo info
				int photoId = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID));
				int width = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH));
				int height = cursor.getInt(cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT));
				long dateTaken = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)) / 1000;
				int orientationTag = cursor.getInt(cursor.getColumnIndex(MediaStore.Images.Media.ORIENTATION));
				// Swap width and height if orientationTag is set to 90 or 270
				if (orientationTag == 90 || orientationTag == 270) {
					int tmp = width;
					width = height;
					height = tmp;
				}
				// Check if photo needs to be uploaded
				boolean mustBeUploaded = true;
				if (width > height) {
					// Landscape
					if (!this.uploadLandscape) mustBeUploaded = false;
					if (dateTaken < this.landscapeMinimumTimestamp) mustBeUploaded = false;
				} else {
					// Portrait
					if (!this.uploadPortrait) mustBeUploaded = false;
					if (dateTaken < this.portraitMinimumTimestamp) mustBeUploaded = false;
				}
				if (PhotoUploader.isPhotoUploaded(photoId)) mustBeUploaded = false;
				// Enqueue photo for upload if needed
				if (mustBeUploaded) {
					Log.i("flx_photoupload", "Found a photo to upload: " + photoId);
					ParseLog.logEvent("Found a photo to upload", "photo " + photoId);
					PhotoUploader.uploadPhoto(photoId);
					cursor.close();
					return WAIT_ON_UPLOAD;
				}
			}
			cursor.close();
			return WAIT_ON_NO_PHOTO;
		}
		return WAIT_ON_DISABLED;
	}
	
	/**
	 * This thread will periodically check if new photos are available.
	 * New photos should be detected by the observer.
	 * This thread is just a useful if the observer was inactive when a new photo was taken,
	 * or if a photo is taken while another photo is being uploaded.
	 */
	private class AutoUploadThread extends Thread {
		
		// Set this to true when the thread should terminate 
		boolean mTerminated = false;
		
		@Override
		public void run() {
			while (!mTerminated) {
				// Check for new photos
				long waitTime;
				try {
					waitTime = checkForNewPhotos();
				} catch (Exception e) {
					Log.e("flx_photoupload", "Error while running autoupload thread", e);
					ParseLog.logEvent("Error while running autoupload thread", e.getMessage());
					waitTime = WAIT_ON_ERROR; // 1 minute
				}
				// Sleep for 10 minutes
				synchronized (this) {
					try {
						Log.i("flx_photoupload", "Sleeping for " + waitTime/1000.0 + " seconds");
						ParseLog.logEvent("Autoupload thread sleeping", waitTime/1000.0 + " seconds");
						wait(waitTime);
					} catch (InterruptedException e) {
					}
				}
			}
			Log.i("flx_photoupload", "Autoupload thread terminated");
			ParseLog.logEvent("Autoupload thread terminated");
		}
	}
	
}
