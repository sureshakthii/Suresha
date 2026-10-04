package app.kaippesi.jothidar;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Android scales WebView text by the phone's system font size on top of the app's own sizes, which made
    // headings and sub-headings overlap on phones with a larger system font. The app has its own
    // "Large text" setting (Settings → Large text) that enlarges text without breaking the layout.
    if (getBridge() != null && getBridge().getWebView() != null) {
      WebSettings s = getBridge().getWebView().getSettings();
      s.setTextZoom(100);
      float scale = getResources().getConfiguration().fontScale;
      // Tell the app the phone uses large fonts, so it can switch on its own Large text mode the first time.
      final String js = "window.KJ_SYSTEM_FONT_SCALE=" + scale + ";document.dispatchEvent(new Event('kj:fontscale'));";
      getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
    }
  }
}
