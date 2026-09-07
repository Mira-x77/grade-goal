package com.gostudy.student.plugins;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "AppInstaller")
public class AppInstaller extends Plugin {

    @PluginMethod
    public void checkInstallPermission(PluginCall call) {
        boolean canInstall = true;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canInstall = getContext().getPackageManager().canRequestPackageInstalls();
        }
        
        JSObject result = new JSObject();
        result.put("canInstall", canInstall);
        call.resolve(result);
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                startActivityForResult(call, intent, INSTALL_PERMISSION_REQUEST_CODE);
                return;
            }
        }
        
        JSObject result = new JSObject();
        result.put("granted", true);
        call.resolve(result);
    }

    @PluginMethod
    public void installAPK(PluginCall call) {
        String filePath = call.getString("filePath");
        
        if (filePath == null) {
            call.reject("File path is required");
            return;
        }

        try {
            File apkFile = new File(filePath);
            
            if (!apkFile.exists()) {
                call.reject("APK file not found at: " + filePath);
                return;
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Use FileProvider for Android 7+
                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                // Direct file URI for older Android versions
                Uri apkUri = Uri.fromFile(apkFile);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            }
            
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("Failed to install APK: " + e.getMessage());
        }
    }

    private static final int INSTALL_PERMISSION_REQUEST_CODE = 1001;

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        
        PluginCall savedCall = getSavedCall();
        if (savedCall == null) {
            return;
        }

        if (requestCode == INSTALL_PERMISSION_REQUEST_CODE) {
            boolean granted = false;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                granted = getContext().getPackageManager().canRequestPackageInstalls();
            }
            
            JSObject result = new JSObject();
            result.put("granted", granted);
            savedCall.resolve(result);
        }
    }
}