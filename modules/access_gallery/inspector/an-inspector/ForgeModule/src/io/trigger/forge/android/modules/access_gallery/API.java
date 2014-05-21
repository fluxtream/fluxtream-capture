package io.trigger.forge.android.modules.access_gallery;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeTask;
import android.database.Cursor;
import android.provider.MediaStore;
import android.provider.MediaStore.Images.ImageColumns;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class API {
	/**
	 * Creates a JSON list of the pictures available on the device's local image gallery
	 * Each picture object will have the following information:
	 * - id: the identifier of the picture
	 * - uri: the local URI of the picture
	 * - orientation: the orientation of the picture in degrees (0, 90, 180 or 270)
	 * - thumb_id: the identifier of the picture's thumbnail (if any)
	 * - thumb_uri: the local URI of the picture's thumbnail (if any)
	 */
	public static void getPictureList(final ForgeTask task) {
		task.performAsync(new Runnable() {
			public void run() {
				// Get all images
				Cursor cursor = ForgeApp.getActivity().getContentResolver().query(
						MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
						new String[] { ImageColumns._ID, ImageColumns.ORIENTATION },
						null, null, null);
				// JSON result container
				JsonArray pictureList = new JsonArray();
				// Construct result be adding each image
				while (cursor != null && cursor.moveToNext()) {
					JsonObject imageObject = new JsonObject();
					int imageId = cursor.getInt(0);
					imageObject.addProperty("id", imageId);
					imageObject.addProperty("uri", "content://media/external/images/media/" + imageId);
					imageObject.addProperty("orientation", cursor.getInt(1));
					// Get thumbnail if any
					Cursor thumbCursor = ForgeApp.getActivity().getContentResolver().query(
							MediaStore.Images.Thumbnails.EXTERNAL_CONTENT_URI,
							new String[] { ImageColumns._ID },
							MediaStore.Images.Thumbnails.IMAGE_ID + " = ?",
							new String[] { imageId + "" },
							null);
					if (thumbCursor != null && thumbCursor.moveToFirst()) {
						int thumbnailId = thumbCursor.getInt(0);
						imageObject.addProperty("thumb_id", thumbnailId);
						imageObject.addProperty("thumb_uri", "content://media/external/images/thumbnails/" + thumbnailId);
					}
					// Add picture to list
					pictureList.add(imageObject);
				}
				// Return picture list
				task.success(pictureList.toString());
			}
		});
	}
}
