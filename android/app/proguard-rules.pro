# The app is intentionally a small platform-WebView shell. Keep JavaScript
# bridge methods if one is introduced in a future release.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
