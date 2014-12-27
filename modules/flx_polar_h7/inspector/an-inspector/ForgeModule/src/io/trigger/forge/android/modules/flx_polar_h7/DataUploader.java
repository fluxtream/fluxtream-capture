package io.trigger.forge.android.modules.flx_polar_h7;

import io.trigger.forge.android.core.ForgeApp;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.apache.http.HttpResponse;
import org.apache.http.NameValuePair;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.HttpConnectionParams;
import org.apache.http.params.HttpParams;
import org.apache.http.protocol.HTTP;
import org.json.JSONObject;

import com.google.gson.JsonArray;
import com.google.gson.JsonPrimitive;

import android.content.Context;
import android.content.ContextWrapper;
import android.content.SharedPreferences;
import android.content.SharedPreferences.Editor;
import android.util.Log;

/**
 * This class receives heart rate data to be uploaded, and uploads it within a separated thread.
 * 
 * @author Julien Dupuis
 */
public class DataUploader implements Runnable {
	
	// Number of data samples to accumulate before a flush
	public static final int BUNCH_SIZE = 30;
	
	// Max number of samples sent in one request
	public static final int MAX_BUNCH_SIZE = 60;
	
	// The thread running this instance
	protected Thread thread;
	
	// The preferences containing the data to upload
	protected SharedPreferences prefs;
	
	// Counts the number of unuploaded samples
	protected int dataCounter;
	
	// The URL to which to data is uploaded
	protected String uploadURL;
	
	// The authentication token that is given as a parameter in the upload requests
	protected String accessToken;
	
	/**
	 * Constructor
	 * 
	 * @param context Context used to get the preferences containing the data
	 */
	public DataUploader(ContextWrapper context, String uploadURL, String accessToken) {
		prefs = context.getSharedPreferences("org.fluxtream.flx_polar_h7_data", Context.MODE_PRIVATE);
		dataCounter = prefs.getAll().size();
		setParameters(uploadURL, accessToken);
	}
	
	public void setParameters(String uploadURL, String accessToken) {
		this.uploadURL = uploadURL;
		this.accessToken = accessToken;
	}
	
	/**
	 * Starts an independant thread running this instance. This should be called once.
	 */
	public synchronized void startThread() {
		thread = new Thread(this);
		thread.start();
	}
	
	/**
	 * Stops the thread running this instance
	 */
	public synchronized void stopThread() {
		if (thread != null) {
			thread.interrupt();
			thread = null;
		}
	}
	
	@Override
	public void run() {
		Log.i(PolarH7Service.LOG_TAG, "Starting HR upload thread");
		while (true) {
			try {
				// Record the number of data before waiting for 5 seconds to see if new data has arrived in the meantime
				int dataCountBeforeWait = dataCounter;
				// Wait for 5 seconds (unless data size is already worth uploading)
				if (dataCounter < BUNCH_SIZE) {
					synchronized (this) {
						// Wait for 5 seconds. This will get notified if data comes in.
						this.wait(5000);
					}
				}
				// Check if data should be uploaded (i.e. if no data has been added over the last 5 seconds, or the bunch size has been reached)
				if (dataCounter != 0 && (dataCounter == dataCountBeforeWait || dataCounter >= BUNCH_SIZE)) {
					// No data received for 5 seconds or data bunch size reached
					synchronizeNextDataBunch();
				}
			} catch (InterruptedException e) {
				// Thread interrupted, it must be stopped
				Log.i(PolarH7Service.LOG_TAG, "Stopping data uploader thread");
				return;
			} catch (Exception e) {
				Log.e(PolarH7Service.LOG_TAG, "Error on the sync thread: " + e.toString());
				ForgeApp.event("heartrate.uploadError");
				try {
					// Sleep for 20 seconds, to avoid looping over failing requests
					Log.i(PolarH7Service.LOG_TAG, "Pausing HR upload thread for 20 seconds");
					Thread.sleep(20000); 
				} catch (InterruptedException ie) {
					// Thread interrupted, it must be stopped
					Log.i(PolarH7Service.LOG_TAG, "Stopping data uploader thread");
					return;
				}
			}
		}
	}
	
	/**
	 * Adds the given data to the upload queue. This may trigger an upload if the bunch size is reached.
	 */
	public synchronized void addDataToUpload(int heartBeat, int beatSpacing) {
		Editor editor = prefs.edit();
		editor.putString("" + System.currentTimeMillis(), encodeData(heartBeat, beatSpacing));
		editor.apply();
		dataCounter++;
		Log.i(PolarH7Service.LOG_TAG, "Adding data (" + heartBeat + ", " + beatSpacing + ") ; Data counter = " + dataCounter);
		this.notify();
	}
	
	/**
	 * Encodes the data as a string to be stored
	 */
	protected String encodeData(int heartBeat, int beatSpacing) {
		return heartBeat + "," + beatSpacing;
	}
	
	/**
	 * Decodes the data from a string to a (heartBeat, beatSpacing) pair
	 */
	protected int[] decodeData(String data) {
		try {
			String[] strings = data.split(",");
			int[] ints = new int[2];
			if (ints.length >= 1) {
				ints[0] = Integer.parseInt(strings[0]);
			}
			if (ints.length >= 2) {
				ints[1] = Integer.parseInt(strings[1]);
			}
			return ints;
		} catch (Exception e) {
			Log.e(PolarH7Service.LOG_TAG, "Error while parsing data (" + data + ")");
			return new int[]{0, 0};
		}
	}
	
	/**
	 * Reads in the prefs the set of data to be uploaded next
	 */
	protected synchronized Map<String, int[]> getDataToSynchronize() {
		Map<String, int[]> data = new HashMap<String, int[]>();
		for (Entry<String, ?> entry : prefs.getAll().entrySet()) {
			String stringValue = (String)entry.getValue();
			data.put(entry.getKey(), decodeData(stringValue));
			if (data.size() >= MAX_BUNCH_SIZE) {
				break;
			}
		}
		return data;
	}
	
	/**
	 * Removes from the prefs the data when it has been uploaded
	 */
	protected synchronized void removeDataFromQueue(Map<String, ?> data) {
		Editor editor = prefs.edit();
		for (String key : data.keySet()) {
			editor.remove(key);
		}
		editor.apply();
		dataCounter = prefs.getAll().size();
	}
	
	/**
	 * Send an http request to upload the next bunch of data
	 * 
	 * @throws Exception
	 */
	protected void synchronizeNextDataBunch() throws Exception {
		Log.i(PolarH7Service.LOG_TAG, "Synchronizing now");
		ForgeApp.event("heartrate.startUpload");
		
		// Collect data to upload
		Map<String, int[]> data = getDataToSynchronize();
		
		// Construct data string
		JsonArray json = new JsonArray();
		for (String key : data.keySet()) {
			int[] ints = data.get(key);
			JsonArray dataArray = new JsonArray();
			dataArray.add(new JsonPrimitive(Long.parseLong(key) / 1000)); // Convert milliseconds to seconds
			dataArray.add(new JsonPrimitive(ints[0]));
			dataArray.add(new JsonPrimitive(ints[1]));
			json.add(dataArray);
			
		}
		String dataString = json.toString();
		Log.i(PolarH7Service.LOG_TAG, "Data to send: " + dataString);
		
		// Create list of parameters
		List<NameValuePair> params = new ArrayList<NameValuePair>();
		params.add(new BasicNameValuePair("dev_nickname", "PolarStrap"));
		params.add(new BasicNameValuePair("channel_names", "[\"HeartBeat\",\"BeatSpacing\"]"));
		params.add(new BasicNameValuePair("data", dataString));
		params.add(new BasicNameValuePair("access_token", accessToken));
		
		// Create request
		HttpPost httpPost = new HttpPost(uploadURL);
		httpPost.setEntity(new UrlEncodedFormEntity(params, HTTP.UTF_8));
		
		// Execute request with a timeout of 30 seconds
		HttpParams httpParams = new BasicHttpParams();
		HttpConnectionParams.setConnectionTimeout(httpParams, 30000);
		HttpConnectionParams.setSoTimeout(httpParams, 30000);
		HttpClient httpClient = new DefaultHttpClient(httpParams);
		HttpResponse response = httpClient.execute(httpPost);
		
		// Check response status code
		int statusCode = response.getStatusLine().getStatusCode();
		Log.i(PolarH7Service.LOG_TAG, "Response status code: " + statusCode);
		if (statusCode / 100 != 2) {
			throw new Exception("Wrong http response received when fetching access token (" + statusCode + ")");
		}
		// Read response
		BufferedReader reader = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
		String line = null;
		String responseBody = "";
		while ((line = reader.readLine()) != null) {
			responseBody = responseBody + line;
		}
		Log.i(PolarH7Service.LOG_TAG, "Upload response: " + responseBody);
		// Parse response
		JSONObject jsonResponse = new JSONObject(responseBody);
		// Get whether the request was successful
		String successfulRecords = jsonResponse.getString("successful_records");
		boolean success = (Integer.parseInt(successfulRecords) != 0);
		if (success) {
			// The request was successful, remove data from queue
			removeDataFromQueue(data);
			if (dataCounter < BUNCH_SIZE) {
				ForgeApp.event("heartrate.uploadDone");
			}
		}
	}
	
}






