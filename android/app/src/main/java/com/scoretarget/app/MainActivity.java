package com.scoretarget.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure WebView to prevent zoom
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setSupportZoom(false);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            
            // Disable text selection and long press
            webView.setLongClickable(false);
            webView.setHapticFeedbackEnabled(false);
        }
    }
}
