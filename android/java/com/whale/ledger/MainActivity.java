package com.whale.ledger;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Window;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ScrollView;
import android.widget.TextView;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * 轻量 WebView 壳。
 *
 * 网页产物放在 assets/www，App 启动时在 127.0.0.1 上开一个只服务本地资源的
 * 小 HTTP 服务，WebView 按普通网页加载。这样不依赖 shouldInterceptRequest
 * 对主文档的拦截（部分 WebView 版本不拦主框架，会把虚拟域名发到公网得到 404），
 * localStorage、ES module、相对路径都按正常 http 源处理。
 */
public class MainActivity extends Activity {

    private static final String BG = "#FFF2F3F7";
    private static final int PORT = 47121;

    private WebView web;
    private ServerSocket server;
    private int port;
    private volatile boolean running = true;
    private final StringBuilder log = new StringBuilder();

    private static final int REQ_CAMERA = 1001;
    private PermissionRequest pendingPermission;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        Window window = getWindow();
        window.setStatusBarColor(Color.parseColor(BG));
        window.setNavigationBarColor(Color.WHITE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        // 先确认资源在位，不在位就直接给出可读的诊断页
        if (resolve("www/index.html") == null) {
            showDiagnostics("找不到 assets/www/index.html");
            return;
        }

        try {
            startServer();
        } catch (IOException e) {
            showDiagnostics("本地服务启动失败：" + e);
            return;
        }

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor(BG));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, android.webkit.WebResourceRequest request,
                                        android.webkit.WebResourceError error) {
                note("加载失败 " + request.getUrl() + " → " + error.getDescription());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                view.postDelayed(() -> view.evaluateJavascript(
                        "(function(){var r=document.getElementById('root');" +
                                "if(!r)return 'noroot';" +
                                "return r.childElementCount>0?'ok':'empty';})()",
                        value -> {
                            if (value == null || !value.contains("ok")) {
                                showDiagnostics("根节点状态：" + value);
                            }
                        }), 2000);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                boolean wantsCamera = false;
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) wantsCamera = true;
                }
                if (!wantsCamera) {
                    request.deny();
                    return;
                }
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                        || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                } else {
                    pendingPermission = request;
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                }
            }
        });

        setContentView(web);
        web.loadUrl("http://127.0.0.1:" + port + "/index.html");
    }

    /* ---------------- 本地静态服务 ---------------- */

    private void startServer() throws IOException {
        // 端口必须固定：http 源的端口是 origin 的一部分，
        // 换了端口 localStorage 就是另一份数据，重启后就读不到之前的账了。
        IOException last = null;
        for (int attempt = 0; attempt < 6 && server == null; attempt++) {
            try {
                ServerSocket candidate = new ServerSocket();
                candidate.setReuseAddress(true);
                candidate.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), PORT), 16);
                server = candidate;
                port = PORT;
            } catch (IOException e) {
                last = e;
                try { Thread.sleep(250); } catch (InterruptedException ignored) { }
            }
        }
        if (server == null) {
            throw last != null ? last : new IOException("无法绑定本地端口 " + PORT);
        }

        Thread thread = new Thread(this::acceptLoop, "asset-server");
        thread.setDaemon(true);
        thread.start();
        note("本地服务端口 " + port);
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket client = server.accept();
                Thread worker = new Thread(() -> handle(client));
                worker.setDaemon(true);
                worker.start();
            } catch (IOException e) {
                break;
            }
        }
    }

    private void handle(Socket client) {
        try {
            client.setSoTimeout(4000);
            BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream(), "UTF-8"));
            String requestLine = in.readLine();
            if (requestLine == null) {
                client.close();
                return;
            }

            String[] parts = requestLine.split(" ");
            String path = parts.length > 1 ? parts[1] : "/";
            int query = path.indexOf('?');
            if (query >= 0) path = path.substring(0, query);
            if (path.isEmpty() || "/".equals(path)) path = "/index.html";

            byte[] body;
            String mime;
            try {
                String asset = resolve("www" + path);
                if (asset == null) throw new IOException("missing " + path);
                body = read(asset);
                mime = mimeOf(path);
            } catch (IOException missing) {
                note("资源缺失 www" + path);
                body = ("not found: " + path).getBytes("UTF-8");
                mime = "text/plain";
            }

            String header = "HTTP/1.1 200 OK\r\n"
                    + "Content-Type: " + mime + "; charset=utf-8\r\n"
                    + "Content-Length: " + body.length + "\r\n"
                    + "Cache-Control: no-store\r\n"
                    + "Connection: close\r\n\r\n";

            OutputStream out = client.getOutputStream();
            out.write(header.getBytes("UTF-8"));
            out.write(body);
            out.flush();
            client.close();
        } catch (IOException ignored) {
            // 单个请求失败不影响整体
        }
    }

    /**
     * aapt2 在 Windows 上可能把 assets 路径写成 www\index.html，
     * 这里两种分隔符都试一次，避免因为打包机的分隔符差异打不开文件。
     */
    private String resolve(String rel) {
        String slash = rel.replace('\\', '/');
        String back = slash.replace('/', '\\');
        for (String candidate : new String[]{slash, back}) {
            try {
                getAssets().open(candidate).close();
                return candidate;
            } catch (IOException ignored) {
                // 继续试下一种
            }
        }
        return null;
    }
    private byte[] read(String path) throws IOException {
        InputStream in = getAssets().open(path);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }

    private static String mimeOf(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    /* ---------------- 诊断 ---------------- */

    private void note(String line) {
        log.append(line).append('\n');
    }

    private void showDiagnostics(String reason) {
        StringBuilder text = new StringBuilder();
        text.append("鲸鱼记账 · 自检\n\n").append(reason).append("\n\n");
        text.append("assets 根目录：\n").append(describeAssets("")).append('\n');
        text.append("assets/www：\n").append(describeAssets("www")).append('\n');
        text.append("运行记录：\n").append(log.length() == 0 ? "（无）\n" : log.toString()).append('\n');
        try {
            text.append("WebView：\n").append(WebSettings.getDefaultUserAgent(this));
        } catch (Throwable ignored) {
            // 忽略
        }

        TextView view = new TextView(this);
        view.setText(text.toString());
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        view.setTypeface(Typeface.MONOSPACE);
        view.setTextColor(Color.parseColor("#0F172A"));
        view.setBackgroundColor(Color.parseColor(BG));
        view.setTextIsSelectable(true);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        view.setPadding(pad, pad, pad, pad);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(view);
        setContentView(scroll);
    }

    private String describeAssets(String dir) {
        StringBuilder sb = new StringBuilder();
        try {
            String[] list = getAssets().list(dir);
            if (list == null || list.length == 0) return "  （空）\n";
            for (String name : list) sb.append("  ").append(name).append('\n');
        } catch (IOException e) {
            sb.append("  读取失败：").append(e).append('\n');
        }
        return sb.toString();
    }

    /* ---------------- 生命周期 ---------------- */

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == REQ_CAMERA && pendingPermission != null) {
            boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) pendingPermission.grant(pendingPermission.getResources());
            else pendingPermission.deny();
            pendingPermission = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        running = false;
        try {
            if (server != null) server.close();
        } catch (IOException ignored) {
            // 忽略
        }
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
