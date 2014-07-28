package io.trigger.forge.android.modules.flx_photoupload;

import io.trigger.forge.android.core.ForgeApp;
import android.app.Activity;
import android.app.Service;
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
import android.widget.Toast;

/**
 * This Android Service runs in the background and uploads photos automatically
 * if they correspond to a given filter (landscape/portrait). 
 * 
 * When starting this service, the intent can carry the following parameters in its extras:
 * - "upload_landscape":       whether landscape photos are automatically uploaded
 * - "upload_portrait":        whether portrait photos are automatically uploaded
 * - "autoupload_enabled":     whether autoupload is enabled
 * - "upload_after_timestamp": minimum timestamp of the photos to automatically upload
 * - "upload_url":             URL at which the photos will be uploaded
 * - "authentication":         a base64 encoding of "{username}:{password}" for authentication
 * 
 * @author Julien Dupuis
 */
public class UploadService extends Service {
	
	// Whether this service is enabled (if false, the service should be stopped)
	private boolean autouploadEnabled = false;
	
	// Whether landscape photos are being uploaded automatically
	private boolean uploadLandscape = false;
	
	// Whether portrait photos are being uploaded automatically
	private boolean uploadPortrait = false;
	
	// Fluxtream server URL at which the photos will be uploaded
	private String uploadURL = "";
	
	// Only photos after this timestamp will be uploaded automatically
	private int uploadAfterTimestamp = 0;
	
	// The shared preferences containing the configuration and the upload status of each photo
	private SharedPreferences prefs = null;
	
	// The thread checking periodically for new photos to upload
	private AutoUploadThread mAutoUploadThread;
	
	@Override
	public void onCreate() {
		// Load preferences
		prefs = getApplicationContext().getSharedPreferences("flxAutoUploadPreferences", Activity.MODE_PRIVATE);
		readAutouploadParameters();
		
		// Start photo checker thread thread
		mAutoUploadThread = new AutoUploadThread();
		mAutoUploadThread.start();
		
		// Subscribe to new photo event
		getContentResolver().registerContentObserver(Media.EXTERNAL_CONTENT_URI, true,
				new ContentObserver(new Handler()) {
			@Override
			public void onChange(boolean selfChange, Uri uri) {
				mAutoUploadThread.interrupt();
			}
		});
	}
	
	@Override
	public int onStartCommand(Intent intent, int flags, int startId) {
		// Save parameters
		this.saveParameters(intent);
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
	}
	
	/**
	 * Retrieves the autoupload parameters from the user preferences
	 */
	public void readAutouploadParameters() {
		// Read parameters from preferences
		this.uploadLandscape = prefs.getBoolean("upload_landscape", false);
		this.uploadPortrait = prefs.getBoolean("upload_portrait", false);
		this.autouploadEnabled = prefs.getBoolean("autoupload_enabled", false);
		this.uploadAfterTimestamp = prefs.getInt("upload_after_timestamp", 0);
		this.uploadURL = prefs.getString("upload_url", "");
		String authentication = prefs.getString("authentication", "");
		// Send parameters to PhotoUploader
		PhotoUploader.initialize(prefs, uploadURL, authentication);
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
		
		// Save boolean parameters
		for (String paramName : new String[]{"upload_landscape", "upload_portrait", "autoupload_enabled"}) {
			Object paramValue = intent.getExtras().get(paramName);
			if (paramValue != null) {
				prefEditor.putBoolean(paramName, (Boolean)paramValue);
				Toast.makeText(this, "Set parameter " + paramName + ": " + paramValue, Toast.LENGTH_SHORT).show();
			}
		}
		
		// Save integer parameters
		for (String paramName : new String[]{"upload_after_timestamp"}) {
			Object paramValue = intent.getExtras().get(paramName);
			if (paramValue != null) prefEditor.putInt(paramName, (Integer)paramValue);
		}
		
		// Save string parameters
		for (String paramName : new String[]{"upload_url", "authentication"}) {
			Object paramValue = intent.getExtras().get(paramName);
			if (paramValue != null) prefEditor.putString(paramName, (String)paramValue);
		}
		
		// Save preferences
		prefEditor.apply();
		
		// Apply parameters
		readAutouploadParameters();
	}
	
	/**
	 * Reads the photo storage library and checks if unuploaded photos should be uploaded
	 */
	private synchronized void checkForNewPhotos() {
		if (autouploadEnabled) {
			Log.i("flx_photoupload", "Checking for new photos");
			// Get all images
			Cursor cursor = ForgeApp.getActivity().getContentResolver().query(
					MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
					new String[] {
							MediaStore.Images.Media._ID,
							MediaStore.Images.Media.WIDTH,
							MediaStore.Images.Media.HEIGHT,
							MediaStore.Images.Media.DATE_TAKEN
							},
					null, null, null);
			// Check for each image if it must be uploaded
			while (cursor != null && cursor.moveToNext()) {
				// Get photo info
				int photoId = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID));
				int width = cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH));
				int height = cursor.getInt(cursor.getColumnIndex(MediaStore.Images.Media.HEIGHT));
				long dateTaken = cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)) / 1000;
				// Check if photo needs to be uploaded
				boolean mustBeUploaded = true;
				if (!this.uploadLandscape && width >= height) mustBeUploaded = false;
				if (!this.uploadPortrait && height >= width) mustBeUploaded = false;
				if (dateTaken < this.uploadAfterTimestamp) mustBeUploaded = false;
				if (PhotoUploader.isPhotoUploaded(photoId)) mustBeUploaded = false;
				// Enqueue photo for upload if needed
				if (mustBeUploaded) {
					PhotoUploader.uploadPhoto(photoId);
				}
			}
		}
	}
	
	/**
	 * This thread will periodically check if new photos are available.
	 * New photos should be detected by the observer, this thread is just a
	 * security in case the observer was inactive when a new photo was taken.
	 */
	private class AutoUploadThread extends Thread {
		
		// Set this to true when the thread should terminate 
		boolean mTerminated = false;
		
		@Override
		public void run() {
			while (!mTerminated) {
				// Check for new photos
				try {
					checkForNewPhotos();
				} catch (Exception e) {
					Log.e("flx_autoupload", "Error while running autoupload thread", e);
				}
				// Sleep for 10 minutes
				synchronized (this) {
					try {
						wait(6000); // 10 minutes  // TODO 600000
					} catch (InterruptedException e) {
					}
				}
			}
			Log.i("flx_photoupload", "Autoupload thread terminated");
		}
	}
	
}
