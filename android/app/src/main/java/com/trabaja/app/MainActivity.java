package com.trabaja.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";
    private static final int REQ_PICK = 4217;
    private static final int REQ_EXPORT = 4218;
    private static final int REQ_NOTIF = 73;
    private static final int BG = Color.rgb(7, 9, 16);

    private FrameLayout root;
    private WebView web;
    private WebViewAssetLoader assetLoader;
    private ValueCallback<Uri[]> filePathCallback;
    private String pendingExport;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);

        root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        // La app dibuja detrás de las barras del sistema (obligatorio desde Android 15):
        // el contenido se separa de ellas con el relleno que calcula este receptor.
        root.setOnApplyWindowInsetsListener(this::applyInsets);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Sirve los archivos de assets/www como https://appassets.androidplatform.net/...
        final WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", path -> {
                    WebResourceResponse r = assets.handle(path);
                    String mime = mimeFor(path);
                    if (r != null && mime != null) r.setMimeType(mime);
                    return r;
                })
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                openExternal(u);
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType(typeFor(params.getAcceptTypes()));
                pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                try {
                    startActivityForResult(Intent.createChooser(pick, "Selecciona un archivo"), REQ_PICK);
                } catch (Exception e) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new NativeBridge(this), "AndroidBridge");
        setContentView(root);
        if (saved == null) web.loadUrl(START_URL);
        else web.restoreState(saved);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /* ---------- márgenes de las barras del sistema ---------- */

    private WindowInsets applyInsets(View v, WindowInsets insets) {
        int l;
        int t;
        int r;
        int b;
        if (Build.VERSION.SDK_INT >= 30) {
            android.graphics.Insets in = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
            l = in.left;
            t = in.top;
            r = in.right;
            b = in.bottom;
            v.setPadding(l, t, r, b);
            return WindowInsets.CONSUMED;
        }
        l = insets.getSystemWindowInsetLeft();
        t = insets.getSystemWindowInsetTop();
        r = insets.getSystemWindowInsetRight();
        b = insets.getSystemWindowInsetBottom();
        v.setPadding(l, t, r, b);
        return insets.consumeSystemWindowInsets();
    }

    /** Pinta las barras con el color del tema y ajusta el color de sus iconos. */
    @SuppressWarnings("deprecation")
    private void setBars(String color, boolean lightBackground) {
        int c;
        try {
            c = Color.parseColor(color);
        } catch (Exception e) {
            return;
        }
        root.setBackgroundColor(c);
        if (web != null) web.setBackgroundColor(c);
        getWindow().setStatusBarColor(c);
        getWindow().setNavigationBarColor(c);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController ctl = getWindow().getInsetsController();
            if (ctl != null) {
                int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                ctl.setSystemBarsAppearance(lightBackground ? mask : 0, mask);
            }
        } else {
            View decor = getWindow().getDecorView();
            int flags = decor.getSystemUiVisibility();
            flags = lightBackground
                    ? flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    : flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) {
                flags = lightBackground
                        ? flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                        : flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            decor.setSystemUiVisibility(flags);
        }
    }

    /* ---------- utilidades ---------- */

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".js")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".html")) return "text/html";
        return null;
    }

    /** Tipo MIME para el selector de archivos según el atributo accept del input. */
    private static String typeFor(String[] accept) {
        ArrayList<String> mimes = new ArrayList<>();
        boolean extension = false;
        if (accept != null) {
            for (String a : accept) {
                if (a == null) continue;
                String t = a.trim();
                if (t.contains("/")) mimes.add(t);
                else if (t.startsWith(".")) extension = true;
            }
        }
        if (extension || mimes.size() != 1) return "*/*";
        return mimes.get(0);
    }

    private void openExternal(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception ignored) {
            // sin aplicación que lo abra
        }
    }

    private void js(final String code) {
        if (web != null) web.post(() -> {
            if (web != null) web.evaluateJavascript(code, null);
        });
    }

    /* ---------- permisos y notificaciones ---------- */

    boolean notificationsAllowed() {
        return Build.VERSION.SDK_INT < 33
                || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    void requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && !notificationsAllowed()) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        } else {
            sendPermissionResult(notificationsAllowed());
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_NOTIF) {
            sendPermissionResult(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED);
        }
    }

    private void sendPermissionResult(boolean granted) {
        js("window.onAndroidPermissionResult && window.onAndroidPermissionResult(" + granted + ")");
    }

    /* ---------- exportar respaldos ---------- */

    void startExport(String name, String mime, String text) {
        pendingExport = text;
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(mime == null || mime.isEmpty() ? "application/json" : mime);
        i.putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(i, REQ_EXPORT);
        } catch (ActivityNotFoundException e) {
            pendingExport = null;
            js("window.onAndroidExport && window.onAndroidExport(false)");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQ_PICK) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    ArrayList<Uri> picked = new ArrayList<>();
                    for (int i = 0; i < count; i++) picked.add(data.getClipData().getItemAt(i).getUri());
                    results = picked.toArray(new Uri[0]);
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }

        if (requestCode == REQ_EXPORT) {
            boolean ok = false;
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null && pendingExport != null) {
                try (OutputStream os = getContentResolver().openOutputStream(data.getData(), "wt")) {
                    if (os != null) {
                        os.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                        ok = true;
                    }
                } catch (Exception e) {
                    ok = false;
                }
            }
            pendingExport = null;
            if (resultCode == Activity.RESULT_OK) js("window.onAndroidExport && window.onAndroidExport(" + ok + ")");
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /* ---------- puente JavaScript ---------- */

    public static class NativeBridge {
        private final MainActivity activity;

        NativeBridge(MainActivity a) {
            activity = a;
        }

        @JavascriptInterface
        public void requestNotifications() {
            activity.runOnUiThread(activity::requestNotifications);
        }

        @JavascriptInterface
        public boolean hasNotificationsPermission() {
            return activity.notificationsAllowed();
        }

        @JavascriptInterface
        public void scheduleReminder(String id, String title, String time, int dayMask) {
            ReminderScheduler.daily(activity, id, title, time, dayMask);
        }

        @JavascriptInterface
        public void scheduleInterval(String id, String title, int minutes) {
            ReminderScheduler.interval(activity, id, title, minutes);
        }

        @JavascriptInterface
        public void scheduleOnce(String id, String title, int seconds) {
            ReminderScheduler.once(activity, id, title, seconds);
        }

        @JavascriptInterface
        public void cancelReminder(String id) {
            ReminderScheduler.cancel(activity, id);
        }

        @JavascriptInterface
        public boolean canExactAlarms() {
            return ReminderScheduler.canExact(activity);
        }

        @JavascriptInterface
        public void openExactAlarmSettings() {
            activity.runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT < 31) return;
                try {
                    Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                            Uri.parse("package:" + activity.getPackageName()));
                    activity.startActivity(i);
                } catch (Exception ignored) {
                    // el sistema no ofrece esa pantalla
                }
            });
        }

        @JavascriptInterface
        public void exportFile(String name, String mime, String text) {
            activity.runOnUiThread(() -> activity.startExport(name, mime, text));
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            long d = Math.max(5, Math.min(ms, 300));
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
            else v.vibrate(d);
        }

        @JavascriptInterface
        public void setBars(String color, boolean lightBackground) {
            activity.runOnUiThread(() -> activity.setBars(color, lightBackground));
        }

        @JavascriptInterface
        public void openTikTok(String url) {
            activity.runOnUiThread(() -> {
                try {
                    Intent app = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    app.setPackage("com.zhiliaoapp.musically");
                    activity.startActivity(app);
                } catch (Exception e) {
                    activity.openExternal(Uri.parse(url));
                }
            });
        }
    }
}
