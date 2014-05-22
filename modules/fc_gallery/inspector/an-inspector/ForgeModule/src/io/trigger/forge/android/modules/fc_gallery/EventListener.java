package io.trigger.forge.android.modules.fc_gallery;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeEventListener;

public class EventListener extends ForgeEventListener {
	@Override
	public void onRestart() {
		ForgeApp.event("fc_gallery.resume", null);
	}
}
