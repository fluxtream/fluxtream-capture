package io.trigger.forge.android.modules.flx_polar_h7;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeParam;
import io.trigger.forge.android.core.ForgeTask;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

/**
 * @author Julien Dupuis
 */
public class API {
	
	public static void isBLESupported(final ForgeTask task) {
		Log.d(PolarH7Service.LOG_TAG, "API: isBLESupported");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				boolean supported = true;
				try {
					if (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR2) {
						// Android API version < 18, BLE does not exist
						supported = false;
					} else if (!ForgeApp.getActivity().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)) {
						// BLE not supported on this device
						supported = false;
					}
				} catch (Exception e) {
					supported = false;
				}
				task.success(supported);
			}
		});
	}
	
	/**
	 * Starts the heart rate monitoring service
	 * 
	 * @param uploadURL URL at which the data will be uploaded
	 * @param accessToken Access token for the upload authentication
	 */
	public static void startService(final ForgeTask task,
			@ForgeParam("uploadURL") final String uploadURL,
			@ForgeParam("accessToken") final String accessToken) {
		Log.d(PolarH7Service.LOG_TAG, "API: startService()");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(ForgeApp.getActivity(), PolarH7Service.class);
				intent.putExtra("uploadURL", uploadURL);
				intent.putExtra("accessToken", accessToken);
				ForgeApp.getActivity().startService(intent);
				task.success();
			}
		});
	}
	
	/**
	 * Stops the heart rate monitoring service and erases the recorded access token
	 */
	public static void stopService(final ForgeTask task) {
		Log.d(PolarH7Service.LOG_TAG, "API: endService()");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				// Stop service
				Intent intent = new Intent(ForgeApp.getActivity(), PolarH7Service.class);
				ForgeApp.getActivity().stopService(intent);
				// Remove access token from prefs
				SharedPreferences prefs = ForgeApp.getActivity().getSharedPreferences("org.fluxtream.fluxtream.flx_polar_h7_upload_config", Context.MODE_PRIVATE);
				Editor editor = prefs.edit();
				editor.remove("accessToken");
				editor.apply();
				// Notify success
				task.success();
			}
		});
	}
	
	/**
	 * Stores the current heart rate device's address and make sure only this device will get connected
	 */
	public static void lockCurrentDevice(final ForgeTask task) {
		Log.d(PolarH7Service.LOG_TAG, "API: lockCurrentDevice()");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				// Stop service
				Intent intent = new Intent(ForgeApp.getActivity(), PolarH7Service.class);
				intent.putExtra("action", "lock");
				ForgeApp.getActivity().startService(intent);
				// Notify success
				task.success();
			}
		});
	}
	
	/**
	 * Removes the limitation on a single device, allowing to connect to any device
	 */
	public static void unlockCurrentDevice(final ForgeTask task) {
		Log.d(PolarH7Service.LOG_TAG, "API: unlockCurrentDevice()");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				// Stop service
				Intent intent = new Intent(ForgeApp.getActivity(), PolarH7Service.class);
				intent.putExtra("action", "unlock");
				ForgeApp.getActivity().startService(intent);
				// Notify success
				task.success();
			}
		});
	}
	
}
