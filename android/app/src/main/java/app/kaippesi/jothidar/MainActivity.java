package app.kaippesi.jothidar;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  /** window.ThunaiNative.print(title): Android's own Print screen, which also offers "Save as PDF". */
  public class NativeBridge {
    @JavascriptInterface
    public void print(final String title) {
      runOnUiThread(() -> {
        WebView web = getBridge() != null ? getBridge().getWebView() : null;
        if (web == null) return;
        String name = (title == null || title.isEmpty()) ? "Thunai" : title;
        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
        PrintDocumentAdapter adapter = web.createPrintDocumentAdapter(name);
        pm.print(name, adapter, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
      });
    }
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Android scales WebView text by the phone's system font size on top of the app's own sizes, which made
    // headings and sub-headings overlap on phones with a larger system font. The app has its own
    // "Large text" setting (Settings → Large text) that enlarges text without breaking the layout.
    if (getBridge() != null && getBridge().getWebView() != null) {
      WebView web = getBridge().getWebView();
      WebSettings s = web.getSettings();
      s.setTextZoom(100);
      // window.print() does nothing inside an Android WebView, so Print / PDF goes through this bridge.
      web.addJavascriptInterface(new NativeBridge(), "ThunaiNative");
      float scale = getResources().getConfiguration().fontScale;
      // Tell the app the phone uses large fonts, so it can switch on its own Large text mode the first time.
      final String js = "window.KJ_SYSTEM_FONT_SCALE=" + scale + ";document.dispatchEvent(new Event('kj:fontscale'));";
      web.post(() -> web.evaluateJavascript(js, null));
    }
  }
}
