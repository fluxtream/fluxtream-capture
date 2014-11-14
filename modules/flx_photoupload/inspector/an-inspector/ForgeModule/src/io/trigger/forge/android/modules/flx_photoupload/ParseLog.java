package io.trigger.forge.android.modules.flx_photoupload;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.Serializable;
import java.util.LinkedList;
import java.util.Queue;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.DefaultHttpClient;

import android.util.Log;

import com.google.gson.JsonObject;

public class ParseLog {
	
	private static boolean DEBUG_ACTIVE = false;
	
	private static Queue<Event> uploadQueue = new LinkedList<ParseLog.Event>();
	private static String deviceId = null;
	
	static {
		if (DEBUG_ACTIVE) {
			new Thread() {
				@Override
				public void run() {
					while (true) {
						try {
							Thread.sleep(5000);
						} catch (InterruptedException e) {}
						uploadNext();
					}
				}
			}.start();
		}
	}
	
	public static void setDeviceId(String deviceId) {
		ParseLog.deviceId = deviceId;
	}
	
	public static void logEvent(String event) {
		logEvent(event, null);
	}
	
	public static void logEvent(String event, String data) {
		if (!DEBUG_ACTIVE) return;
		uploadQueue.add(new Event(event, data, System.currentTimeMillis()));
		uploadNext();
	}
	
	private static synchronized void uploadNext() {
		
		Log.i("flx_photoupload", "Calling ParseLog.uploadNext()");
		
		if (deviceId == null) {
			Log.i("flx_photoupload", "deviceId not set in ParseLog.uploadNext()");
			return;
		}
		
		Event event = uploadQueue.poll();
		if (event == null) {
			Log.i("flx_photoupload", "No pending event to upload in ParseLog.uploadNext()");
			return;
		}
		
		try {
			
			HttpClient httpClient = new DefaultHttpClient();
			HttpPost post = new HttpPost("https://api.parse.com/1/classes/PhotoUploadDebugLog");
			post.addHeader("content-type", "application/json");
			post.addHeader("X-Parse-Application-Id", "qsK84A6Xu0MZEnrg2cbokXOI9OKEcqKqB0B4zIXu");
			post.addHeader("X-Parse-REST-API-Key", "1l7lapwBEMwNxC1puytTFcrIMUrsyiHF0h8jnOkk");
			JsonObject json = new JsonObject();
			json.addProperty("device", deviceId);
			json.addProperty("timestamp", event.timestamp);
			json.addProperty("language", "java");
			json.addProperty("event", event.event);
			json.addProperty("data", event.data);
			StringEntity params = new StringEntity(json.toString());
			post.setEntity(params);
			HttpResponse response = httpClient.execute(post);
			
			// Check response status code
			int statusCode = response.getStatusLine().getStatusCode();
			Log.i("flx_photoupload", "Status code is " + statusCode);
			
			// Read response
			BufferedReader reader = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
			String line = null;
			String responseBody = "";
			while ((line = reader.readLine()) != null) {
				responseBody = responseBody + line;
			}
			Log.i("flx_photoupload", "Upload response: " + responseBody);
			
			if (statusCode / 100 != 2) {
				throw new Exception("Wrong http response received when fetching access token: " + statusCode);
			}
			
			Log.i("flx_photoupload", "Uploading Parse log successful");
			
		} catch (Exception e) {
			Log.e("flx_photoupload", "Error", e);
			uploadQueue.add(event);
		}
		
	}
	
	private static class Event implements Serializable {

		private static final long serialVersionUID = -3678184697078715946L;
		
		private String event;
		private String data;
		private long timestamp;
		
		public Event(String event, String data, long timestamp) {
			super();
			this.event = event;
			this.data = data;
			this.timestamp = timestamp;
		}
		
	}
	
}
