package io.trigger.forge.android.modules.flx_polar_h7;

import java.util.HashMap;
import java.util.UUID;

import com.google.gson.JsonObject;

import io.trigger.forge.android.core.ForgeApp;
import android.app.Service;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.IBinder;
import android.util.Log;

public class PolarH7Service extends Service {
	
	public static final String LOG_TAG = "flx_polar_h7";
	
	private BluetoothManager bluetoothManager;
	private BluetoothAdapter bluetoothAdapter;
	private BluetoothGatt bluetoothGatt;
	private BluetoothDevice bluetoothDevice;
	
	@Override
	public int onStartCommand(Intent intent, int flags, int startId) {
		if (intent == null) {
			return 0;
		}
		
		initialize();
		
		Log.d(LOG_TAG, "Polar H7 background service started");
		
		return START_STICKY;
	}
	
	@Override
	public IBinder onBind(Intent intent) {
		return null;
	}
	
	public boolean initialize() {
		if (bluetoothManager == null) {
			bluetoothManager = (BluetoothManager) this.getSystemService(Context.BLUETOOTH_SERVICE);
			if (bluetoothManager == null) {
				Log.e(LOG_TAG, "Unable to initialize BluetoothManager");
				return false;
			}
		}
		
		bluetoothAdapter = bluetoothManager.getAdapter();
		if (bluetoothAdapter == null) {
			Log.e(LOG_TAG, "Unable to obtain a BluetoothAdapter");
			return false;
		}
		
		// Register to bluetooth device found broadcast event
		IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_FOUND);
		registerReceiver(bluetoothBroadcastEventReceiver, filter);
		
		// Register to bluetooth discovery ended broadcast event
		filter = new IntentFilter(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
		registerReceiver(bluetoothBroadcastEventReceiver, filter);
		
//		if (!bluetoothAdapter.isEnabled()) {
//			Intent enableBlutoothIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
//			ForgeApp.getActivity().startActivityForResult(enableBlutoothIntent, 27);
//			Intent discoverIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
//			discoverIntent.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 300);
//			ForgeApp.getActivity().startActivity(discoverIntent);
//		}
		
		boolean res = bluetoothAdapter.startDiscovery();
		Log.d(LOG_TAG, "startDiscovery result: " + res);
		
		return true;
	}
	
	private final BroadcastReceiver bluetoothBroadcastEventReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			if (BluetoothDevice.ACTION_FOUND.equals(intent.getAction())) {
				// Bluetooth device found
				bluetoothDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
				connect(bluetoothDevice.getAddress());
			} else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(intent.getAction())) {
				// End of discovery, restart it if the device was not found
				if (bluetoothDevice == null) {
					boolean res = bluetoothAdapter.startDiscovery();
					Log.d(LOG_TAG, "Restarting bluetooth device discovery: " + res);
				}
			}
		}
	};
	
	@Override
	public void onDestroy() {
		if (bluetoothGatt != null) {
			bluetoothGatt.close();
		}
		super.onDestroy();
	}
	
	public boolean connect(final String address) {
		Log.d(LOG_TAG, "Connecting " + address);
		
		if (bluetoothAdapter == null || address == null) {
			Log.w(LOG_TAG, "Bluetooth adapter not initialized or unspecified address");
			return false;
		}
		
		bluetoothDevice = bluetoothAdapter.getRemoteDevice(address);
		if (bluetoothDevice == null) {
			Log.w(LOG_TAG, "Device not found, unable to connect");
			return false;
		}
		
		Log.d(LOG_TAG, "Connecting to device " + address);
		bluetoothGatt = bluetoothDevice.connectGatt(this, false, gattCallback);
		bluetoothGatt.connect();
		bluetoothGatt.discoverServices();
		Log.i(LOG_TAG, "Listing services:");
		for (BluetoothGattService service : bluetoothGatt.getServices()) {
			Log.i(LOG_TAG, "- " + service.toString());
		}
		return true;
	}
	
	private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
		
		@Override
		public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
			if (newState == BluetoothProfile.STATE_CONNECTED) {
				Log.d(LOG_TAG, "State is connected");
				bluetoothGatt.discoverServices();
			} else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
				// Attempt to reconnect to the device
				bluetoothGatt.connect();
			}
		};
		
		@Override
		public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
//			Log.d(LOG_TAG, "Characteristic changed: " + characteristic.getUuid());
			int length = characteristic.getValue().length;
			if (BluetoothUUIDs.HEART_RATE_MEASUREMENT.equals(characteristic.getUuid().toString())) {
				for (int i=1; i<length/2; i++) {
    				String rrValue = String.valueOf(characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT16, i*2));
    				int heartRate = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT8, 1);
    				Log.d(LOG_TAG, "HR = " + heartRate + ", RR = " + rrValue);
    				// Generate Forge event
    				JsonObject eventData = new JsonObject();
    				eventData.addProperty("heart_rate", heartRate);
    				eventData.addProperty("rr", rrValue);
    				ForgeApp.event("heartrate.data", eventData);
    			}
			} else {
				Log.d(LOG_TAG, BluetoothUUIDs.HEART_RATE_MEASUREMENT + " != " + characteristic.getUuid().toString());
			}
		}
		
		@Override
		public void onCharacteristicRead(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
			Log.d(LOG_TAG, "Characteristic read: " + characteristic + ", " + status);
		}
		
		@Override
		public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
			Log.d(LOG_TAG, "Characteristic write: " + characteristic + ", " + status);
		}
		
		@Override
		public void onDescriptorRead(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
			Log.d(LOG_TAG, "Descriptor read: " + descriptor + ", " + status);
		}
		
		@Override
		public void onDescriptorWrite(BluetoothGatt gatt, BluetoothGattDescriptor descriptor, int status) {
			Log.d(LOG_TAG, "Descriptor write: " + descriptor + ", " + status);
		}
		
		@Override
		public void onReadRemoteRssi(BluetoothGatt gatt, int rssi, int status) {
			Log.d(LOG_TAG, "Remote RSSI: " + rssi + ", " + status);
		}
		
		@Override
		public void onServicesDiscovered(BluetoothGatt gatt, int status) {
			Log.d(LOG_TAG, "Services discovered: " + status);
			// Try to find heartrate service
			BluetoothGattService service = gatt.getService(UUID.fromString(BluetoothUUIDs.SERVICE_HEARTRATE));
			if (service != null) {
				// Register to heartrate notifications
				registerHeartrateCharacteristicNotifications(service);
			}
		}
		
	};
	
	private void registerHeartrateCharacteristicNotifications(BluetoothGattService heartrateService) {
		BluetoothGattCharacteristic characteristic = heartrateService.getCharacteristic(UUID.fromString(BluetoothUUIDs.HEART_RATE_MEASUREMENT));
		if (characteristic != null) {
			bluetoothGatt.setCharacteristicNotification(characteristic, true);
    		BluetoothGattDescriptor descriptor = characteristic.getDescriptor(UUID.fromString(BluetoothUUIDs.CLIENT_CHARACTERISTIC_CONFIG));
    		descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
    		bluetoothGatt.writeDescriptor(descriptor);
		}
	}
	
	public static class BluetoothUUIDs {
		
		// Services
		public static final String SERVICE_HEARTRATE = "0000180d-0000-1000-8000-00805f9b34fb";
		public static final String SERVICE_DEVICE_INFORMATION = "0000180a-0000-1000-8000-00805f9b34fb";
		public static final String SERVICE_GENERIC_ACCESS = "00001800-0000-1000-8000-00805f9b34fb";
		public static final String SERVICE_GENERIC_ATTRIBUTE = "0000180a-0000-1000-8000-00805f9b34fb";
		public static final String SERVICE_BATTERY_INFORMATION = "0000180f-0000-1000-8000-00805f9b34fb";
		
		// Characteristics
	    public static String HEART_RATE_MEASUREMENT = "00002a37-0000-1000-8000-00805f9b34fb";
	    public static String CLIENT_CHARACTERISTIC_CONFIG = "00002902-0000-1000-8000-00805f9b34fb";
	    public static String BATTERY_LEVEL = "00002a19-0000-1000-8000-00805f9b34fb";
	    
	}
	
}
