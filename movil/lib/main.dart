import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'api_client.dart';
import 'auth_screen.dart';
import 'home_shell.dart';
import 'intro_splash.dart';
import 'landing_screen.dart';
import 'sync_screen.dart';

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

enum _Stage { intro, landing, auth, sync, home }

class AppBootstrap extends StatefulWidget {
  const AppBootstrap({super.key});

  @override
  State<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<AppBootstrap> {
  final _api = ApiClient();
  Map<String, dynamic>? _user;
  _Stage _stage = _Stage.intro;
  IntroStatus _introStatus = IntroStatus.restoring;
  String? _error;
  bool _startWithRegister = false;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    setState(() {
      _introStatus = IntroStatus.restoring;
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
      _introStatus = _user == null
          ? IntroStatus.noSession
          : IntroStatus.hasSession;
    } on ApiException catch (error) {
      if (error.message.contains('Token') ||
          error.message.contains('autenticado') ||
          error.message.contains('expirado')) {
        await _api.clearToken();
        _introStatus = IntroStatus.noSession;
      } else {
        _error = error.message;
        _introStatus = IntroStatus.error;
      }
    }
    if (mounted) setState(() {});
  }

  void _afterIntro() {
    setState(() => _stage = _user == null ? _Stage.landing : _Stage.sync);
  }

  void _openAuth({required bool register}) {
    setState(() {
      _startWithRegister = register;
      _stage = _Stage.auth;
    });
  }

  void _onAuthenticated(Map<String, dynamic> user) {
    setState(() {
      _user = user;
      _stage = _Stage.sync;
    });
  }

  Future<void> _logout() async {
    await _api.clearToken();
    if (mounted) {
      setState(() {
        _user = null;
        _stage = _Stage.landing;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 420),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeIn,
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, .04),
            end: Offset.zero,
          ).animate(animation),
          child: child,
        ),
      ),
      child: KeyedSubtree(key: ValueKey(_stage), child: _buildStage()),
    );
  }

  Widget _buildStage() {
    switch (_stage) {
      case _Stage.intro:
        return IntroSplash(
          status: _introStatus,
          error: _error,
          onContinue: _afterIntro,
          onRetry: _restoreSession,
        );
      case _Stage.landing:
        return LandingScreen(
          api: _api,
          onLogin: () => _openAuth(register: false),
          onRegister: () => _openAuth(register: true),
        );
      case _Stage.auth:
        return AuthScreen(
          api: _api,
          initialRegister: _startWithRegister,
          onBack: () => setState(() => _stage = _Stage.landing),
          onAuthenticated: _onAuthenticated,
        );
      case _Stage.sync:
        return SyncScreen(
          api: _api,
          user: _user!,
          onDone: () => setState(() => _stage = _Stage.home),
          onLogout: _logout,
        );
      case _Stage.home:
        return HomeShell(user: _user!, api: _api, onLogout: _logout);
    }
  }
}
