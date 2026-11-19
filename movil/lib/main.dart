import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'api_client.dart';
import 'auth_screen.dart';
import 'home_shell.dart';

const _forest = Color(0xFF173D2A);
const _green = Color(0xFF287A51);
const _cream = Color(0xFFFDFBF7);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('es_MX');
  runApp(const SicpesApp());
}

class SicpesApp extends StatelessWidget {
  const SicpesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SICPES',
      debugShowCheckedModeBanner: false,
      locale: const Locale('es', 'MX'),
      supportedLocales: const [Locale('es', 'MX')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: _cream,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _green,
          primary: _green,
          surface: Colors.white,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: _cream,
          foregroundColor: _forest,
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: const BorderSide(color: Color(0xFFE9E4D7)),
            borderRadius: BorderRadius.circular(18),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFFCFBF6),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFDDD9CB)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFDDD9CB)),
          ),
        ),
      ),
      home: const AppBootstrap(),
    );
  }
}

class AppBootstrap extends StatefulWidget {
  const AppBootstrap({super.key});

  @override
  State<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<AppBootstrap> {
  final _api = ApiClient();
  Map<String, dynamic>? _user;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final startedAt = DateTime.now();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final token = await _api.readToken();
      if (token != null) {
        final result = await _api.get('/mobile/session');
        if (result is Map<String, dynamic>) {
          _user = result;
        } else {
          await _api.clearToken();
        }
      }
    } on ApiException catch (error) {
      if (error.message.contains('Token') ||
          error.message.contains('autenticado') ||
          error.message.contains('expirado')) {
        await _api.clearToken();
      } else {
        _error = error.message;
      }
    } finally {
      const minimumSplashTime = Duration(milliseconds: 800);
      final elapsed = DateTime.now().difference(startedAt);
      if (elapsed < minimumSplashTime) {
        await Future<void>.delayed(minimumSplashTime - elapsed);
      }
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onAuthenticated(Map<String, dynamic> user) {
    setState(() => _user = user);
  }

  Future<void> _logout() async {
    await _api.clearToken();
    if (mounted) setState(() => _user = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _error != null) {
      return SplashScreen(
        loading: _loading,
        error: _error,
        onRetry: _restoreSession,
      );
    }

    if (_user == null) {
      return AuthScreen(api: _api, onAuthenticated: _onAuthenticated);
    }

    return HomeShell(user: _user!, api: _api, onLogout: _logout);
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({
    required this.loading,
    required this.error,
    required this.onRetry,
    super.key,
  });

  final bool loading;
  final String? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 24, 22, 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const _BrandLockup(),
                      const SizedBox(height: 22),
                      const _Eyebrow('PREPARANDO TU ESPACIO'),
                      const SizedBox(height: 8),
                      Text(
                        loading
                            ? 'Sincronizando tu residencia'
                            : error == null
                            ? 'Tu espacio está listo'
                            : 'No se pudo conectar',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: _forest,
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        error ?? 'Estamos conectando tus reservaciones, pagos y avisos.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Color(0xFF66766A),
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 18),
                      if (loading)
                        const LinearProgressIndicator(
                          minHeight: 5,
                          borderRadius: BorderRadius.all(Radius.circular(99)),
                        )
                      else if (error != null)
                        FilledButton.icon(
                          onPressed: onRetry,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Intentar de nuevo'),
                        )
                      else
                        const LinearProgressIndicator(
                          value: 1,
                          minHeight: 5,
                          borderRadius: BorderRadius.all(Radius.circular(99)),
                        ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            loading
                                ? 'Conectando con SICPES'
                                : 'Conexión lista',
                            style: const TextStyle(
                              color: Color(0xFF66766A),
                              fontSize: 10,
                            ),
                          ),
                          Text(
                            loading
                                ? '...'
                                : error == null
                                ? '100%'
                                : '',
                            style: const TextStyle(
                              color: _green,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Wrap(
                        spacing: 6,
                        children: [
                          _SyncStep(
                            icon: Icons.check,
                            label: 'Cuenta',
                            active: true,
                          ),
                          _SyncStep(icon: Icons.history, label: 'Reservación'),
                          _SyncStep(
                            icon: Icons.payments_outlined,
                            label: 'Pagos',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BrandLockup extends StatelessWidget {
  const _BrandLockup();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFFEAF6EC),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.apartment_rounded, color: _green, size: 23),
        ),
        const SizedBox(width: 9),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SICPES',
              style: TextStyle(
                color: _forest,
                fontSize: 14,
                fontWeight: FontWeight.w800,
                height: 1,
              ),
            ),
            SizedBox(height: 3),
            Text(
              'RESIDENCIAL',
              style: TextStyle(
                color: Color(0xFF5F7065),
                fontSize: 8,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Eyebrow extends StatelessWidget {
  const _Eyebrow(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        color: Color(0xFF4C7A5F),
        fontSize: 9,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.15,
      ),
    );
  }
}

class _SyncStep extends StatelessWidget {
  const _SyncStep({
    required this.icon,
    required this.label,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final foreground = active
        ? const Color(0xFF287A51)
        : const Color(0xFF66766A);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: active ? const Color(0xFFEAF6EC) : const Color(0xFFFCFBF6),
        border: Border.all(color: const Color(0xFFE9E4D7)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: foreground),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: foreground, fontSize: 9)),
        ],
      ),
    );
  }
}
