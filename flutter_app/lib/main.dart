import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform, kIsWeb;
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Register Android-specific implementation when running on Android.
  // Using defaultTargetPlatform avoids importing dart:io (which breaks web builds).
  if (defaultTargetPlatform == TargetPlatform.android) {
    try {
      WebViewPlatform.instance = AndroidWebViewPlatform();
    } catch (e) {
      // ignore - plugin might register itself in newer versions
      debugPrint('Could not set AndroidWebViewPlatform: $e');
    }
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebApp(),
    );
  }
}

class WebApp extends StatefulWidget {
  const WebApp({super.key});

  @override
  State<WebApp> createState() => _WebAppState();
}

class _WebAppState extends State<WebApp> {
  WebViewController? controller;
  bool isLoading = true;
  String? errorMessage;

  // Change this to your site when ready
  final String webUrl = "https://avk-events.vercel.app/";

  // Whether we can use webview_flutter on this platform
  bool get _webViewAvailable {
    // webview_flutter supports Android, iOS and web (via web implementation)
    return kIsWeb ||
        defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS;
  }

  @override
  void initState() {
    super.initState();

    if (!_webViewAvailable) {
      // Disable webview for unsupported platforms (Windows, macOS, Linux).
      setState(() {
        isLoading = false;
        errorMessage = null; // show placeholder UI rather than an error
      });
      return;
    }

    // Create controller and configure basic settings
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) {
            final uri = Uri.tryParse(request.url);

            // If parsing failed, prevent navigation
            if (uri == null) return NavigationDecision.prevent;

            // Allow internal navigation to your own domain
            // Check hostname, not the full URL string
            if (uri.host.contains("avk-events.vercel.app") ||
                uri.host.contains("vercel.app")) {
              return NavigationDecision.navigate;
            }

            // For any external URL open system browser instead
            _openInExternalBrowser(request.url);
            return NavigationDecision.prevent;
          },

          onPageStarted: (String url) {
            setState(() => isLoading = true);
          },

          onPageFinished: (String url) async {
            setState(() => isLoading = false);

            // Remove target="_blank" so links open in same WebView context (optional)
            try {
              await controller!.runJavaScript("""
                document.querySelectorAll('a[target="_blank"]').forEach(a => a.removeAttribute('target'));
              """);
            } catch (_) {
              // ignore errors from runJavaScript if not supported by version
            }
          },

          onWebResourceError: (WebResourceError error) {
            // Show a simple error UI so the user knows what happened and can retry
            debugPrint('WebView error: ${error.description}');
            setState(() {
              errorMessage = error.description;
              isLoading = false;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(webUrl));
  }

  Future<void> _openInExternalBrowser(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      debugPrint('Could not launch $url: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _webViewAvailable ? 'AVK Events (WebView)' : 'AVK Events';

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          if (_webViewAvailable)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () => controller?.reload(),
              tooltip: 'Reload',
            ),
        ],
        bottom: isLoading
            ? const PreferredSize(
                preferredSize: Size.fromHeight(3.0),
                child: LinearProgressIndicator(),
              )
            : null,
      ),
      body: SafeArea(
        child: _buildBody(context),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (!_webViewAvailable) {
      // Placeholder UI for unsupported platforms (Windows/macOS/Linux)
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.info_outline, size: 64),
              const SizedBox(height: 12),
              const Text(
                'WebView is not available on this platform.',
                style: TextStyle(fontSize: 18),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Open the site in your system browser instead.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => _openInExternalBrowser(webUrl),
                child: const Text('Open in browser'),
              ),
            ],
          ),
        ),
      );
    }

    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 12),
              Text(
                'Could not load page:',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                errorMessage!,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        errorMessage = null;
                        isLoading = true;
                      });
                      controller?.loadRequest(Uri.parse(webUrl));
                    },
                    child: const Text('Retry'),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: () => _openInExternalBrowser(webUrl),
                    child: const Text('Open in browser'),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    // Normal WebView UI
    return Stack(
      children: [
        // the WebView
        WebViewWidget(controller: controller!),

        // Loading overlay
        if (isLoading)
          const Center(
            child: CircularProgressIndicator(),
          ),
      ],
    );
  }
}
