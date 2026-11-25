package com.gostudy.student.plugins;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "IncomingPdf", requestCodes = { IncomingPdf.PICK_PDF })
public class IncomingPdf extends Plugin {
    public static final int PICK_PDF = 2402;

    @PluginMethod
    public void consumeLaunchPdf(PluginCall call) {
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        Uri uri = uriFromIntent(intent);
        if (uri == null) {
            JSObject result = new JSObject();
            result.put("found", false);
            call.resolve(result);
            return;
        }
        copyUri(call, uri, true);
        clearIncomingIntent();
    }

    @PluginMethod
    public void readUri(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null || uriStr.isEmpty()) {
            call.reject("uri is required");
            return;
        }
        copyUri(call, Uri.parse(uriStr), false);
    }

    /** System folder browser (Downloads, Documents, SD card) for one or more PDFs. */
    @PluginMethod
    public void pickPdf(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
            "application/pdf",
            "application/x-pdf",
            "application/vnd.pdf"
        });
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "handlePickPdfResult");
    }

    @ActivityCallback
    private void handlePickPdfResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }
        processPickerIntentData(call, result.getData());
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_PDF) return;

        PluginCall call = getSavedCall();
        if (call == null) return;

        if (resultCode != Activity.RESULT_OK || data == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }
        processPickerIntentData(call, data);
    }

    private void processPickerIntentData(PluginCall call, Intent data) {
        List<Uri> uris = new ArrayList<>();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                Uri uri = clip.getItemAt(i).getUri();
                if (uri != null) uris.add(uri);
            }
        } else if (data.getData() != null) {
            uris.add(data.getData());
        }

        JSArray files = new JSArray();
        for (Uri uri : uris) {
            try {
                getContext().getContentResolver().takePersistableUriPermission(
                    uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) {
            }
            JSObject file = copyToCacheObject(uri);
            if (file != null) files.put(file);
        }

        JSObject result = new JSObject();
        result.put("cancelled", false);
        result.put("files", files);
        call.resolve(result);
    }

    private Uri uriFromIntent(Intent intent) {
        if (intent == null) return null;
        String action = intent.getAction();
        if (action == null) return null;
        if (!Intent.ACTION_VIEW.equals(action) && !Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) return null;

        Uri uri = intent.getData();
        if (uri == null && Intent.ACTION_SEND.equals(action)) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        } else if (uri == null && Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            List<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (uris != null && !uris.isEmpty()) {
                uri = uris.get(0);
            }
        }
        return uri;
    }

    private void clearIncomingIntent() {
        Activity activity = getActivity();
        if (activity == null) return;
        Intent cleaned = new Intent(activity.getIntent());
        cleaned.setAction(Intent.ACTION_MAIN);
        cleaned.setData(null);
        cleaned.removeExtra(Intent.EXTRA_STREAM);
        activity.setIntent(cleaned);
    }

    private void copyUri(PluginCall call, Uri uri, boolean markFound) {
        JSObject file = copyToCacheObject(uri);
        if (file == null) {
            call.reject("Could not read PDF");
            return;
        }
        if (markFound) file.put("found", true);
        call.resolve(file);
    }

    private JSObject copyToCacheObject(Uri uri) {
        try {
            String fileName = displayName(uri);
            File out = new File(getContext().getCacheDir(), "incoming-" + System.currentTimeMillis() + ".pdf");
            try (InputStream in = getContext().getContentResolver().openInputStream(uri);
                 FileOutputStream fos = new FileOutputStream(out)) {
                if (in == null) return null;
                byte[] buf = new byte[8192];
                int n;
                long total = 0;
                while ((n = in.read(buf)) > 0) {
                    fos.write(buf, 0, n);
                    total += n;
                }
                if (total == 0) return null;
            }
            JSObject result = new JSObject();
            result.put("path", out.getAbsolutePath());
            result.put("fileName", fileName);
            result.put("size", out.length());
            return result;
        } catch (Exception e) {
            return null;
        }
    }

    private String displayName(Uri uri) {
        String name = "Document.pdf";
        try (Cursor cursor = getContext().getContentResolver().query(
            uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) {
                    String value = cursor.getString(idx);
                    if (value != null && !value.isEmpty()) name = value;
                }
            }
        } catch (Exception ignored) {
        }
        if (!name.toLowerCase().endsWith(".pdf")) name = name + ".pdf";
        return name;
    }
}
