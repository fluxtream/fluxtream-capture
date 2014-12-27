package io.trigger.forge.android.modules.flx_polar_h7;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeParam;
import io.trigger.forge.android.core.ForgeTask;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.util.Log;

/**
 * @author Julien Dupuis
 */
public class API {
	
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
	
}
