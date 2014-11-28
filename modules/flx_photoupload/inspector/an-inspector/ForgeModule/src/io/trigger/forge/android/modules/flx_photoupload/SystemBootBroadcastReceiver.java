package io.trigger.forge.android.modules.flx_photoupload;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class SystemBootBroadcastReceiver extends BroadcastReceiver {
	
	@Override
	public void onReceive(Context context, Intent intent) {
		Intent photoUploadIntent = new Intent(context, UploadService.class);
		context.startService(photoUploadIntent);
	}
	
}
