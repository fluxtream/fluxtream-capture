package io.trigger.forge.android.modules.flx_polar_h7;

import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

public class EnableBluetoothActivity extends Activity {
	
	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		Intent enableBluetoothIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
		startActivityForResult(enableBluetoothIntent, 1);
	}
	
	@Override
	protected void onActivityResult(int requestCode, int resultCode, Intent data) {
		if (requestCode == 1) {
			Log.d("flx_polar_h7", "Activity result: " + requestCode + ", " + resultCode + ", " + data);
			// Broadcast result
			Intent intent = new Intent();
			intent.setAction("io.trigger.forge.android.modules.flx_polar_h7.BLUETOOTH_ENABLED");
			intent.putExtra("enabled", resultCode == RESULT_OK);
			sendBroadcast(intent);
			// End this activity
			this.finish();
		}
	}
	
}
