package com.gostudy.student;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.gostudy.student.plugins.AppInstaller;
import com.gostudy.student.plugins.IncomingPdf;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppInstaller.class);
        registerPlugin(IncomingPdf.class);
        grantIncomingPdfUri(getIntent());
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        grantIncomingPdfUri(intent);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() ->
                getBridge().eval("window.dispatchEvent(new CustomEvent('gostudy-incoming-pdf'))", value -> {}));
        }
    }

    /** Keep the VIEW/SEND grant so JS Filesystem.readFile can load phone PDFs. */
    private void grantIncomingPdfUri(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (uri == null && Intent.ACTION_SEND.equals(intent.getAction())) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri != null) {
                intent.setDataAndType(uri, "application/pdf");
                setIntent(intent);
            }
        } else if (uri == null && Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
            java.util.ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (uris != null && !uris.isEmpty()) {
                for (Uri u : uris) {
                    if (u != null && "content".equals(u.getScheme())) {
                        try {
                            getContentResolver().takePersistableUriPermission(
                                u, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        } catch (SecurityException ignored) {}
                    }
                }
                if (uris.get(0) != null) {
                    uri = uris.get(0);
                    intent.setDataAndType(uri, "application/pdf");
                    setIntent(intent);
                }
            }
        }
        if (uri == null || !"content".equals(uri.getScheme())) return;
        try {
            getContentResolver().takePersistableUriPermission(
                uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException ignored) {
            // Temporary FLAG_GRANT_READ_URI_PERMISSION from Files is enough for this session.
        }
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

            // Do not replace WebChromeClient — Capacitor's client opens the
            // system folder picker for <input type="file">.

            Log.d(TAG, "WebView configured successfully");
        }
    }
}
