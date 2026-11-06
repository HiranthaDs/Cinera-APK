# Cinera for Android and Android TV

This directory contains a universal native Android shell for the deployed Cinera app. The same APK supports touch phones, tablets, TV boxes, Google TV, and Android TV.

The current sideload build is version `1.1.0-debug` (`versionCode 2`). It uses safe-area phone navigation, touch-specific tablet layouts, and a dedicated ten-foot TV layout with visible primary-action autofocus.

## TV behavior

- Appears in the Android TV launcher through `LEANBACK_LAUNCHER`.
- Does not require a touchscreen or microphone.
- Detects lean-back/television hardware and enables Cinera's ten-foot UI automatically.
- Supports D-pad arrows, Select/OK, Back, Play/Pause, Rewind, Fast Forward, and compatible gamepad A buttons.
- Keeps focus inside the web interface, enters immersive mode, and supports native fullscreen video.
- Opens supported third-party playback links in an installed browser/app, with an in-app fallback when no handler exists.

The TV Home and Volume buttons remain owned by Android, as expected for an Android TV app.

## Build an installable development APK

From PowerShell:

```powershell
cd android
.\gradlew.bat clean :app:assembleDebug
```

The signed, directly installable APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The prepared workspace deliverable is also available at:

```text
releases/Cinera-Android-TV.apk
```

## Install on a phone or TV

Enable developer options and USB/network debugging on the device, then use one of these:

```powershell
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

```powershell
adb connect TV_IP_ADDRESS:5555
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

You can also copy the APK to a USB drive or cloud storage and open it with a trusted file manager after allowing installs from that source.

## Production signing

Generate and securely back up your own release keystore. Copy `signing.properties.example` to `signing.properties`, replace every placeholder, and run:

```powershell
.\gradlew.bat clean :app:assembleRelease
```

The real signing file and `keystore/` directory are ignored by Git. Never lose the release key: Android requires the same key for every future update.

## Point the APK at another deployment

The default deployment is `https://cinera-by-hich.hiranthadiass4.workers.dev/`. Override it at build time when needed:

```powershell
.\gradlew.bat :app:assembleDebug -PCINERA_URL=https://cinera.example.com/
```

Use an HTTPS deployment that serves both the React routes and `/api/*` endpoints. The native shell intentionally blocks cleartext HTTP.
