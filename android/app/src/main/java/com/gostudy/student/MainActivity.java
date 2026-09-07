package com.gostudy.student;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.gostudy.student.plugins.AppInstaller;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppInstaller.class);
        super.onCreate(savedInstanceState);
        // Allow Chrome DevTools → chrome://inspect while debugging blank screen
        WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // Enable JavaScript (required)
            settings.setJavaScriptEnabled(true);

            // Enable DOM storage (required for modern web apps)
            settings.setDomStorageEnabled(true);

            // Enable database storage
            settings.setDatabaseEnabled(true);

            // Allow file access (required for Capacitor + local PDF on older Android)
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Mixed content mode for Android 5.0+ (API 21+)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            }

            // Existing settings
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setSupportZoom(false);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);

            // Better caching for offline support
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            webView.setLongClickable(false);
            webView.setHapticFeedbackEnabled(false);

            // Add console message handler for debugging
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                    Log.d(TAG, "WebView Console: " + consoleMessage.message() +
                        " -- From line " + consoleMessage.lineNumber() +
                        " of " + consoleMessage.sourceId());
                    return true;
                }
            });

            Log.d(TAG, "WebView configured successfully");
        }
    }
}
