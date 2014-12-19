package io.trigger.forge.android.modules.flx_polar_h7;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeTask;
import android.content.Intent;
import android.util.Log;

public class API {
	
	public static void startService(final ForgeTask task) {
		Log.d(PolarH7Service.LOG_TAG, "API: startService()");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(ForgeApp.getActivity(), PolarH7Service.class);
				ForgeApp.getActivity().startService(intent);
				task.success();
			}
		});
	}
	
	public static void stopService(final ForgeTask task) {
		Log.d(PolarH7Service.LOG_TAG, "API: endService()");
		task.performAsync(new Runnable() {
			@Override
			public void run() {
				Intent intent = new Intent(ForgeApp.getActivity(), PolarH7Service.class);
				ForgeApp.getActivity().stopService(intent);
				task.success();
			}
		});
	}
	
}
