package io.trigger.forge.android.modules.flx_toggle_keyboard;

import io.trigger.forge.android.core.ForgeApp;
import io.trigger.forge.android.core.ForgeTask;
import android.content.Context;
import android.view.inputmethod.InputMethodManager;

public class API {
	public static void showKeyboard(final ForgeTask task) {
		InputMethodManager imm = (InputMethodManager) ForgeApp.getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
		imm.toggleSoftInput(InputMethodManager.SHOW_IMPLICIT,0);
	}
	
	public static void hideKeyboard(final ForgeTask task) {
		InputMethodManager imm = (InputMethodManager) ForgeApp.getActivity().getSystemService(Context.INPUT_METHOD_SERVICE);
		//imm.toggleSoftInput(InputMethodManager.HIDE_IMPLICIT_ONLY,0);
		imm.hideSoftInputFromWindow(ForgeApp.getActivity().getCurrentFocus().getApplicationWindowToken(), 0);
	}
}
