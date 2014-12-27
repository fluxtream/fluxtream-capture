package io.trigger.forge.android.modules.flx_polar_h7;

import io.trigger.forge.android.core.ForgeApp;

import java.util.UUID;

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
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import com.google.gson.JsonObject;

/**
 * Service that monitors the heart rate from a Bluetooth LE device, communicates with the Forge
 * application and uploads the data to the Fluxtream server in the background
 * 
 * @author Julien Dupuis
 */
public class PolarH7Service extends Service {
	
	// Debug log tag
	public static final String LOG_TAG = "flx_polar_h7";
	
	// Bluetooth
	private BluetoothManager bluetoothManager;
	private BluetoothAdapter bluetoothAdapter;
	private BluetoothGatt bluetoothGatt;
	private BluetoothDevice bluetoothDevice;
	
	// Runnable that uploads the data
	private DataUploader dataUploader;
	
	// Preferences containing the access token and upload url
	protected SharedPreferences prefs;
	
	@Override
	public int onStartCommand(Intent intent, int flags, int startId) {
		
		if (intent == null) {
			return 0;
		}
		
		// Get access token from prefs
		prefs = getSharedPreferences("org.fluxtream.flx_polar_h7_upload_config", Context.MODE_PRIVATE);
		String accessToken = prefs.getString("accessToken", null);
		String uploadURL = prefs.getString("uploadURL", null);
		Log.i(LOG_TAG, "Initially, accessToken = " + accessToken);
		
		// Read access token from extras
		Bundle extras = intent.getExtras();
		if (extras != null) {
			Object accessTokenFromExtras = extras.get("accessToken");
			Object uploadURLFromExtras = extras.get("uploadURL");
			if (accessTokenFromExtras != null && uploadURLFromExtras != null) {
				accessToken = (String)accessTokenFromExtras;
				uploadURL = (String)uploadURLFromExtras;
				// Get preferences editor
				Editor prefEditor = prefs.edit();
				prefEditor.putString("accessToken", accessToken);
				prefEditor.putString("uploadURL", uploadURL);
				prefEditor.apply();
			}
		}
		
		Log.i(LOG_TAG, "Now, accessToken = " + accessToken);
		
		// Start synchronization thread
		if (accessToken != null && accessToken.length() != 0 && uploadURL != null && uploadURL.length() != 0) {
			if (dataUploader == null) {
				dataUploader = new DataUploader(this, uploadURL, accessToken);
				dataUploader.startThread();
			} else {
				Log.i(LOG_TAG, "Data uploader thread already running");
				dataUploader.setParameters(uploadURL, accessToken);
			}
		} else {
			Log.e(LOG_TAG, "Starting service with empty upload url or access token");
		}
		
		// Start discovering devices
		boolean discoveryStarted = initialize();
		
		// Debug: generate random data
//		new Thread(new Runnable() {
//			@Override
//			public void run() {
//				try {
//					while (true) {
//						int beatSpacing = (int)(Math.random() * 1000 + 500);
//						Thread.sleep(beatSpacing);
//						if (Math.random() < 0.1) {
//							Log.i(LOG_TAG, "Sleeping for 5 seconds");
//							Thread.sleep(5000);
//						}
//						int heartBeat = 60000 / beatSpacing;
//						dataUploader.addDataToUpload(heartBeat, beatSpacing);
//					}
//				} catch (Exception e) {
//				}
//			}
//		}).start();
		
		Log.d(LOG_TAG, "Polar H7 background service started: " + discoveryStarted);
		
		return START_STICKY;
	}
	
	@Override
	public IBinder onBind(Intent intent) {
		return null;
	}
	
	/**
	 * Initializes the bluetooth adapter.
	 * Returns whether bluetooth device discovery has been started.
	 */
	public boolean initialize() {
		// Create bluetooth manager
		if (bluetoothManager == null) {
			bluetoothManager = (BluetoothManager) this.getSystemService(Context.BLUETOOTH_SERVICE);
			if (bluetoothManager == null) {
				Log.e(LOG_TAG, "Unable to initialize BluetoothManager");
				ForgeApp.event("heartrate.error", eventDataForError("Unable to initialize BluetoothManager"));
				return false;
			}
		}
		
		// Get bluetooth manager
		bluetoothAdapter = bluetoothManager.getAdapter();
		if (bluetoothAdapter == null) {
			Log.e(LOG_TAG, "Unable to obtain a BluetoothAdapter");
			ForgeApp.event("heartrate.error", eventDataForError("Unable to obtain a BluetoothAdapter"));
			return false;
		}
		
		// Register to bluetooth device found broadcast event
		IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_FOUND);
		registerReceiver(bluetoothBroadcastEventReceiver, filter);
		
		// Register to bluetooth discovery ended broadcast event
		filter = new IntentFilter(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
		registerReceiver(bluetoothBroadcastEventReceiver, filter);
		
		filter = new IntentFilter("io.trigger.forge.android.modules.flx_polar_h7.BLUETOOTH_ENABLED");
		registerReceiver(bluetoothBroadcastEventReceiver, filter);
		
		// Enable bluetooth if not enabled
		if (!bluetoothAdapter.isEnabled()) {
			// Start activity that will ask the user to enable bluetooth
			Intent enableBluetoothIntent = new Intent(ForgeApp.getActivity().getBaseContext(), EnableBluetoothActivity.class);
			enableBluetoothIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
			ForgeApp.getActivity().startActivity(enableBluetoothIntent);
			return false;
		} else {
			// Start discovering devices
			return startDiscovery();
		}
	}
	
	/**
	 * Starts the discovery of bluetooth devices (must be called when bluetooth has been enabled)
	 */
	private boolean startDiscovery() {
		boolean res = bluetoothAdapter.startDiscovery();
		Log.d(LOG_TAG, "startDiscovery result: " + res);
		if (res) {
			ForgeApp.event("heartrate.discoveryStarted");
		}
		return res;
	}
	
	// Broadcast event received
	private final BroadcastReceiver bluetoothBroadcastEventReceiver = new BroadcastReceiver() {
		@Override
		public void onReceive(Context context, Intent intent) {
			if (BluetoothDevice.ACTION_FOUND.equals(intent.getAction())) {
				// Bluetooth device found
				bluetoothDevice = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
				boolean connectionSuccessful = connect(bluetoothDevice.getAddress());
				if (!connectionSuccessful) {
					// Connection to device failed, restart discovery
					boolean res = bluetoothAdapter.startDiscovery();
					Log.d(LOG_TAG, "Restarting bluetooth device discovery: " + res);
				}
			} else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(intent.getAction())) {
				// End of discovery, restart it if the device was not found
				if (bluetoothDevice == null) {
					boolean res = bluetoothAdapter.startDiscovery();
					Log.d(LOG_TAG, "Restarting bluetooth device discovery: " + res);
				}
			} else if ("io.trigger.forge.android.modules.flx_polar_h7.BLUETOOTH_ENABLED".equals(intent.getAction())) {
				// The user has made a choice about enabling bluetooth
				if (intent.getExtras().getBoolean("enabled")) {
					Log.d(LOG_TAG, "Bluetooth has been enabled by user");
					startDiscovery();
				} else {
					Log.d(LOG_TAG, "Bluetooth has not been enabled by user");
				}
			}
		}
	};
	
	@Override
	public void onDestroy() {
		if (bluetoothGatt != null) {
			bluetoothGatt.close();
		}
		unregisterReceiver(bluetoothBroadcastEventReceiver);
		dataUploader.stopThread();
		super.onDestroy();
	}
	
	/**
	 * Connect to the device with the given address
	 */
	public boolean connect(final String address) {
		Log.d(LOG_TAG, "Connecting " + address);
		// Check data
		if (bluetoothAdapter == null || address == null) {
			Log.w(LOG_TAG, "Bluetooth adapter not initialized or unspecified address");
			return false;
		}
		
		// Get bluetooth device
		bluetoothDevice = bluetoothAdapter.getRemoteDevice(address);
		if (bluetoothDevice == null) {
			Log.w(LOG_TAG, "Device not found, unable to connect");
			return false;
		}
		
		// Connect to device
		Log.d(LOG_TAG, "Connecting to device " + address);
		bluetoothGatt = bluetoothDevice.connectGatt(this, false, gattCallback);
		boolean success = bluetoothGatt.connect();
		if (success) {
			// Start looking for services provided by the device
			bluetoothGatt.discoverServices();
		}
		return success;
	}
	
	// Gatt callback
	private final BluetoothGattCallback gattCallback = new BluetoothGattCallback() {
		
		@Override
		public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
			if (newState == BluetoothProfile.STATE_CONNECTED) {
				// Device is now connected
				Log.d(LOG_TAG, "State is connected");
				ForgeApp.event("heartrate.deviceConnected");
				bluetoothGatt.discoverServices();
			} else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
				// Attempt to reconnect to the device
				ForgeApp.event("heartrate.deviceDisconnected");
				bluetoothGatt.connect();
			}
		};
		
		@Override
		public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
			int length = characteristic.getValue().length;
			if (BluetoothUUIDs.HEART_RATE_MEASUREMENT.equals(characteristic.getUuid().toString())) {
				// List of heart rate measurements received, send them to the Forge app and save them for upload
				for (int i=1; i<length/2; i++) {
					int rrValue = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT16, i*2);
    				int heartRate = characteristic.getIntValue(BluetoothGattCharacteristic.FORMAT_UINT8, 1);
    				Log.d(LOG_TAG, "HR = " + heartRate + ", RR = " + rrValue);
    				// Add data to upload queue
    				if (dataUploader != null) {
    					dataUploader.addDataToUpload(heartRate, rrValue);
    				}
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
		public void onServicesDiscovered(BluetoothGatt gatt, int status) {
			Log.d(LOG_TAG, "Services discovered: " + status);
			// Try to find heartrate service
			BluetoothGattService service = gatt.getService(UUID.fromString(BluetoothUUIDs.SERVICE_HEARTRATE));
			if (service != null) {
				ForgeApp.event("heartrate.heartrateServiceFound");
				// Register to heartrate notifications
				registerHeartrateCharacteristicNotifications(service);
			}
		}
		
	};
	
	/**
	 * Registers to the heart rate measurement
	 */
	private void registerHeartrateCharacteristicNotifications(BluetoothGattService heartrateService) {
		BluetoothGattCharacteristic characteristic = heartrateService.getCharacteristic(UUID.fromString(BluetoothUUIDs.HEART_RATE_MEASUREMENT));
		if (characteristic != null) {
			bluetoothGatt.setCharacteristicNotification(characteristic, true);
    		BluetoothGattDescriptor descriptor = characteristic.getDescriptor(UUID.fromString(BluetoothUUIDs.CLIENT_CHARACTERISTIC_CONFIG));
    		descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
    		bluetoothGatt.writeDescriptor(descriptor);
		}
	}
	
	/**
	 * Generate Json object for an error event to be sent to the Forge app
	 */
	private JsonObject eventDataForError(String errorMessage) {
		JsonObject eventData = new JsonObject();
		eventData.addProperty("error", errorMessage);
		return eventData;
	}
	
	/**
	 * Bluetooth communication constants
	 */
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
