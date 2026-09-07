import os

sdk_adb = r"C:\Users\Skydrake\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if os.path.exists(sdk_adb):
    print("Found SDK ADB:", sdk_adb)
else:
    print("SDK ADB not found at default path")
