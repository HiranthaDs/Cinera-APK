package com.hichweb.cinera;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import org.json.JSONObject;

import java.util.Arrays;

public final class MainActivity extends Activity {
    private static final int AUDIO_PERMISSION_REQUEST = 1201;
    private static final int BACKGROUND = Color.rgb(8, 8, 8);
    private static final int ACCENT = Color.rgb(228, 59, 79);

    private FrameLayout root;
    private WebView webView;
    private ProgressBar progressBar;
    private View errorView;
    private TextView errorMessage;
    private FrameLayout fullscreenContainer;
    private View fullscreenView;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private PermissionRequest pendingAudioRequest;
    private boolean television;
    private boolean mainFrameFailed;
    private boolean backDispatchPending;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setBackgroundDrawableResource(com.hichweb.cinera.R.color.cinera_background);
        television = isTelevisionDevice();

        buildLayout();
        createWebView();
        enterImmersiveMode();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerModernBackCallback();
        }

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            loadStartPage();
        }
    }

    private void buildLayout() {
        root = new FrameLayout(this);
        root.setBackgroundColor(BACKGROUND);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3),
                Gravity.TOP
        );
        progressBar.setLayoutParams(progressParams);

        errorView = createErrorView();
        errorView.setVisibility(View.GONE);

        fullscreenContainer = new FrameLayout(this);
        fullscreenContainer.setBackgroundColor(Color.BLACK);
        fullscreenContainer.setVisibility(View.GONE);

        setContentView(root);
    }

    private View createErrorView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(32), dp(32), dp(32), dp(32));
        panel.setBackgroundColor(BACKGROUND);

        TextView title = new TextView(this);
        title.setText(com.hichweb.cinera.R.string.offline_title);
        title.setTextColor(Color.WHITE);
        title.setTextSize(television ? 30 : 24);
        title.setGravity(Gravity.CENTER);

        errorMessage = new TextView(this);
        errorMessage.setText(com.hichweb.cinera.R.string.offline_message);
        errorMessage.setTextColor(Color.rgb(180, 180, 184));
        errorMessage.setTextSize(television ? 17 : 15);
        errorMessage.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
                television ? dp(620) : ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        messageParams.setMargins(0, dp(14), 0, dp(24));
        errorMessage.setLayoutParams(messageParams);

        Button retry = new Button(this);
        retry.setText(com.hichweb.cinera.R.string.retry);
        retry.setTextColor(Color.WHITE);
        retry.setTextSize(15);
        retry.setAllCaps(false);
        retry.setBackgroundTintList(android.content.res.ColorStateList.valueOf(ACCENT));
        retry.setMinWidth(television ? dp(220) : dp(150));
        retry.setMinHeight(television ? dp(64) : dp(52));
        retry.setFocusable(true);
        retry.setOnClickListener(view -> {
            errorView.setVisibility(View.GONE);
            if (webView.getUrl() == null) {
                loadStartPage();
            } else {
                webView.reload();
            }
        });

        panel.addView(title);
        panel.addView(errorMessage);
        panel.addView(retry);
        return panel;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(BACKGROUND);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString()
                + " CineraAndroid/1.1"
                + (television ? " AndroidTV" : ""));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new CineraWebViewClient());
        webView.setWebChromeClient(new CineraWebChromeClient());

        root.addView(webView, 0, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        if (errorView.getParent() == null) {
            root.addView(errorView, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
            ));
        }
        if (progressBar.getParent() == null) {
            root.addView(progressBar, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    dp(3),
                    Gravity.TOP
            ));
        }
        if (fullscreenContainer.getParent() == null) {
            root.addView(fullscreenContainer, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
            ));
        }

        webView.requestFocus(View.FOCUS_DOWN);
    }

    private void loadStartPage() {
        Uri base = Uri.parse(BuildConfig.CINERA_URL);
        Uri.Builder builder = base.buildUpon().appendQueryParameter("native", "1");
        if (television) {
            builder.appendQueryParameter("tv", "1");
        }
        webView.loadUrl(builder.build().toString());
    }

    private boolean isTelevisionDevice() {
        PackageManager manager = getPackageManager();
        return manager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
                || manager.hasSystemFeature(PackageManager.FEATURE_TELEVISION);
    }

    private boolean isTrustedAppUri(Uri uri) {
        Uri appUri = Uri.parse(BuildConfig.CINERA_URL);
        return uri != null
                && "https".equalsIgnoreCase(uri.getScheme())
                && appUri.getHost() != null
                && appUri.getHost().equalsIgnoreCase(uri.getHost());
    }

    private boolean openOutsideApp(Uri uri) {
        if (uri == null) {
            return false;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            if (intent.resolveActivity(getPackageManager()) != null) {
                startActivity(intent);
                return true;
            }
        } catch (ActivityNotFoundException ignored) {
            // The current WebView is used as a compatibility fallback below.
        }

        String scheme = uri.getScheme();
        if ("https".equalsIgnoreCase(scheme)) {
            webView.loadUrl(uri.toString());
            return true;
        }
        if ("http".equalsIgnoreCase(scheme)) {
            return true;
        }
        return false;
    }

    private boolean routeNavigation(Uri uri) {
        if (uri == null) {
            return false;
        }
        String scheme = uri.getScheme();
        if (isTrustedAppUri(uri)) {
            return false;
        }
        if ("http".equalsIgnoreCase(scheme)
                || "https".equalsIgnoreCase(scheme)
                || "mailto".equalsIgnoreCase(scheme)
                || "tel".equalsIgnoreCase(scheme)) {
            return openOutsideApp(uri);
        }
        if ("intent".equalsIgnoreCase(scheme)) {
            return openIntentUri(uri.toString());
        }
        return true;
    }

    private boolean openIntentUri(String value) {
        try {
            Intent intent = Intent.parseUri(value, Intent.URI_INTENT_SCHEME);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            intent.setSelector(null);
            if (intent.resolveActivity(getPackageManager()) != null) {
                startActivity(intent);
                return true;
            }
            String fallback = intent.getStringExtra("browser_fallback_url");
            if (fallback != null) {
                Uri fallbackUri = Uri.parse(fallback);
                String scheme = fallbackUri.getScheme();
                if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) {
                    return openOutsideApp(fallbackUri);
                }
            }
        } catch (Exception ignored) {
            return true;
        }
        return true;
    }

    private void showLoadError(boolean secureConnection) {
        mainFrameFailed = true;
        progressBar.setVisibility(View.GONE);
        errorMessage.setText(secureConnection
                ? com.hichweb.cinera.R.string.secure_connection_error
                : com.hichweb.cinera.R.string.offline_message);
        errorView.setVisibility(View.VISIBLE);
        errorView.bringToFront();
        progressBar.bringToFront();
    }

    private void showFullscreenView(View view, WebChromeClient.CustomViewCallback callback) {
        if (fullscreenView != null) {
            callback.onCustomViewHidden();
            return;
        }
        fullscreenView = view;
        fullscreenCallback = callback;
        fullscreenContainer.addView(view, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        fullscreenContainer.setVisibility(View.VISIBLE);
        fullscreenContainer.bringToFront();
        webView.setVisibility(View.INVISIBLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (!television) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        }
        enterImmersiveMode();
    }

    private void hideFullscreenView() {
        if (fullscreenView == null) {
            return;
        }
        fullscreenContainer.removeView(fullscreenView);
        fullscreenContainer.setVisibility(View.GONE);
        fullscreenView = null;
        webView.setVisibility(View.VISIBLE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (!television) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
        if (fullscreenCallback != null) {
            fullscreenCallback.onCustomViewHidden();
            fullscreenCallback = null;
        }
        webView.requestFocus(View.FOCUS_DOWN);
        enterImmersiveMode();
    }

    private void enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }

    private void dispatchBrowserBack() {
        if (backDispatchPending) {
            return;
        }
        backDispatchPending = true;
        String script = "(function(){try{"
                + "var e=new KeyboardEvent('keydown',{key:'BrowserBack',code:'BrowserBack',"
                + "keyCode:4,which:4,bubbles:true,cancelable:true});"
                + "window.dispatchEvent(e);return e.defaultPrevented;"
                + "}catch(_){return false;}})();";
        webView.evaluateJavascript(script, handled -> {
            backDispatchPending = false;
            if ("true".equals(handled)) {
                return;
            }
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                moveTaskToBack(true);
            }
        });
    }

    @android.annotation.TargetApi(Build.VERSION_CODES.TIRAMISU)
    private void registerModernBackCallback() {
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleSystemBack
        );
    }

    private void handleSystemBack() {
        if (fullscreenView != null) {
            hideFullscreenView();
            return;
        }
        dispatchBrowserBack();
    }

    private void sendRemoteKey(String key) {
        String safeKey = JSONObject.quote(key);
        String script = "(function(){var k=" + safeKey + ";"
                + "window.dispatchEvent(new KeyboardEvent('keydown',{key:k,code:k,bubbles:true,cancelable:true}));"
                + "window.dispatchEvent(new KeyboardEvent('keyup',{key:k,code:k,bubbles:true,cancelable:true}));"
                + "})();";
        webView.evaluateJavascript(script, null);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
            switch (event.getKeyCode()) {
                case KeyEvent.KEYCODE_MEDIA_PLAY:
                case KeyEvent.KEYCODE_MEDIA_PAUSE:
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                    sendRemoteKey("MediaPlayPause");
                    return true;
                case KeyEvent.KEYCODE_MEDIA_REWIND:
                    sendRemoteKey("ArrowLeft");
                    return true;
                case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                    sendRemoteKey("ArrowRight");
                    return true;
                case KeyEvent.KEYCODE_BUTTON_A:
                    sendRemoteKey("Enter");
                    return true;
                default:
                    break;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        handleSystemBack();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterImmersiveMode();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        enterImmersiveMode();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (pendingAudioRequest != null) {
            pendingAudioRequest.deny();
            pendingAudioRequest = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != AUDIO_PERMISSION_REQUEST || pendingAudioRequest == null) {
            return;
        }
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            pendingAudioRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            pendingAudioRequest.deny();
        }
        pendingAudioRequest = null;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class CineraWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return request.isForMainFrame() && routeNavigation(request.getUrl());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return routeNavigation(Uri.parse(url));
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            mainFrameFailed = false;
            errorView.setVisibility(View.GONE);
            progressBar.setVisibility(View.VISIBLE);
            progressBar.setProgress(8);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
            if (!mainFrameFailed) {
                errorView.setVisibility(View.GONE);
            }
            view.evaluateJavascript(
                    "document.documentElement.classList.add('android-native');",
                    null
            );
            view.requestFocus(View.FOCUS_DOWN);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showLoadError(false);
            }
        }

        @Override
        @SuppressWarnings("deprecation")
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            if (failingUrl != null && failingUrl.equals(view.getUrl())) {
                showLoadError(false);
            }
        }

        @Override
        public void onReceivedHttpError(
                WebView view,
                WebResourceRequest request,
                WebResourceResponse errorResponse
        ) {
            if (request.isForMainFrame() && errorResponse.getStatusCode() >= 400) {
                showLoadError(false);
            }
        }

        @Override
        public void onReceivedSslError(
                WebView view,
                SslErrorHandler handler,
                android.net.http.SslError error
        ) {
            handler.cancel();
            showLoadError(true);
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || view != webView) {
                return false;
            }
            root.removeView(webView);
            webView.destroy();
            webView = null;
            createWebView();
            loadStartPage();
            return true;
        }
    }

    private final class CineraWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            showFullscreenView(view, callback);
        }

        @Override
        public void onHideCustomView() {
            hideFullscreenView();
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                boolean requestsAudio = Arrays.asList(request.getResources())
                        .contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                if (!requestsAudio || !isTrustedAppUri(request.getOrigin())) {
                    request.deny();
                    return;
                }
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                        || checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    return;
                }
                if (pendingAudioRequest != null) {
                    pendingAudioRequest.deny();
                }
                pendingAudioRequest = request;
                requestPermissions(
                        new String[]{Manifest.permission.RECORD_AUDIO},
                        AUDIO_PERMISSION_REQUEST
                );
            });
        }

        @Override
        public void onPermissionRequestCanceled(PermissionRequest request) {
            if (request == pendingAudioRequest) {
                pendingAudioRequest = null;
            }
        }

        @Override
        public boolean onCreateWindow(
                WebView view,
                boolean isDialog,
                boolean isUserGesture,
                Message resultMsg
        ) {
            if (!isUserGesture) {
                return false;
            }
            WebView popup = new WebView(MainActivity.this);
            popup.setWebViewClient(new WebViewClient() {
                private boolean routed;

                private void route(String url) {
                    if (routed) {
                        return;
                    }
                    routed = true;
                    Uri uri = Uri.parse(url);
                    if (isTrustedAppUri(uri)) {
                        webView.loadUrl(url);
                    } else {
                        openOutsideApp(uri);
                    }
                    popup.destroy();
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView ignored, WebResourceRequest request) {
                    route(request.getUrl().toString());
                    return true;
                }

                @Override
                @SuppressWarnings("deprecation")
                public boolean shouldOverrideUrlLoading(WebView ignored, String url) {
                    route(url);
                    return true;
                }

                @Override
                public void onPageStarted(WebView ignored, String url, Bitmap favicon) {
                    route(url);
                }
            });
            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(popup);
            resultMsg.sendToTarget();
            return true;
        }
    }
}
