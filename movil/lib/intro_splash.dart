import 'dart:async';

import 'package:flutter/material.dart';

import 'sicpes_widgets.dart';

const _cream = Color(0xFFFDFBF7);
const _creamMuted = Color(0xB3FDFBF7);
const _gradientTop = Color(0xFF2F8A5C);
const _accentLight = Color(0xFFB9E3C6);

/// Estado de la restauración de sesión mientras corre la splash.
enum IntroStatus { restoring, noSession, hasSession, error }

/// Splash de SICPES: fondo degradado verde, ícono de la app flotando,
/// nombre, lema y barra de carga. Al terminar continúa sola: a la app si hay
/// sesión guardada o a la pantalla de inicio si no la hay.
class IntroSplash extends StatefulWidget {
  const IntroSplash({
    required this.status,
    required this.onContinue,
    required this.onRetry,
    this.error,
    super.key,
  });

  final IntroStatus status;
  final String? error;
  final VoidCallback onContinue;
  final VoidCallback onRetry;

  @override
  State<IntroSplash> createState() => _IntroSplashState();
}

class _IntroSplashState extends State<IntroSplash>
    with TickerProviderStateMixin {
  static const _minimumTime = Duration(milliseconds: 2200);

  late final AnimationController _enter = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 850),
  )..forward();
  late final AnimationController _float = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2400),
  )..repeat(reverse: true);
  late final AnimationController _bar = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  Timer? _timer;
  bool _ready = false;
  bool _autoContinued = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer(_minimumTime, () {
      if (!mounted) return;
      setState(() => _ready = true);
      _maybeAutoContinue();
    });
  }

  @override
  void didUpdateWidget(covariant IntroSplash oldWidget) {
    super.didUpdateWidget(oldWidget);
    _maybeAutoContinue();
  }

  void _maybeAutoContinue() {
    final done = widget.status == IntroStatus.hasSession ||
        widget.status == IntroStatus.noSession;
    if (_autoContinued || !_ready || !done) return;
    _autoContinued = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onContinue();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _enter.dispose();
    _float.dispose();
    _bar.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: forestGreen,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [_gradientTop, forestGreen],
          ),
        ),
        child: Stack(
          children: [
            // Resplandor suave detrás del ícono.
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -0.3),
                    radius: .9,
                    colors: [
                      _accentLight.withValues(alpha: .18),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 48, 24, 28),
                child: Column(
                  children: [
                    Expanded(child: Center(child: _buildCenter())),
                    _buildFooter(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCenter() {
    final curved = CurvedAnimation(parent: _enter, curve: Curves.easeOutCubic);
    return AnimatedBuilder(
      animation: curved,
      builder: (context, child) => Opacity(
        opacity: curved.value,
        child: Transform.translate(
          offset: Offset(0, 14 * (1 - curved.value)),
          child: Transform.scale(scale: .92 + .08 * curved.value, child: child),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _float,
            builder: (context, child) => Transform.translate(
              offset: Offset(0, -5 * Curves.easeInOut.transform(_float.value)),
              child: child,
            ),
            child: Container(
              width: 104,
              height: 104,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _cream,
                borderRadius: BorderRadius.circular(28),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x59000000),
                    blurRadius: 40,
                    offset: Offset(0, 18),
                  ),
                ],
              ),
              child: Image.asset(
                'assets/images/sicpes_logo.png',
                fit: BoxFit.contain,
              ),
            ),
          ),
          const SizedBox(height: 22),
          const Text(
            'SICPES',
            style: TextStyle(
              color: _cream,
              fontSize: 30,
              fontWeight: FontWeight.w800,
              letterSpacing: 3,
              height: 1,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tu residencia, en un solo lugar.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _creamMuted, fontSize: 13.5),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    final Widget content;
    if (widget.status == IntroStatus.error) {
      content = Column(
        key: const ValueKey('error'),
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'No se pudo conectar',
            style: TextStyle(
              color: _cream,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.error ?? 'Revisa tu conexión e inténtalo de nuevo.',
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: _creamMuted, fontSize: 12),
          ),
          const SizedBox(height: 14),
          _CreamButton(label: 'Intentar de nuevo', onPressed: widget.onRetry),
        ],
      );
    } else {
      content = Column(
        key: const ValueKey('loading'),
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 120,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0x1FFFFFFF),
              borderRadius: BorderRadius.circular(99),
            ),
            clipBehavior: Clip.antiAlias,
            child: AnimatedBuilder(
              animation: _bar,
              builder: (context, _) => Align(
                alignment: Alignment(-1.1 + 3.2 * _bar.value, 0),
                child: FractionallySizedBox(
                  widthFactor: .45,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(99),
                      gradient: const LinearGradient(
                        colors: [brandGreen, _accentLight],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            widget.status == IntroStatus.hasSession
                ? 'Entrando a tu cuenta...'
                : 'Conectando con SICPES...',
            style: const TextStyle(color: _creamMuted, fontSize: 12),
          ),
        ],
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          alignment: Alignment.bottomCenter,
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: content,
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'v1.0.0',
          style: TextStyle(
            color: Color(0x80FDFBF7),
            fontSize: 11,
            letterSpacing: .6,
          ),
        ),
      ],
    );
  }
}

class _CreamButton extends StatelessWidget {
  const _CreamButton({required this.label, required this.onPressed, super.key});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: _cream,
          foregroundColor: forestGreen,
          minimumSize: const Size.fromHeight(50),
          elevation: 3,
          shadowColor: Colors.black45,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        child: Text(label),
      ),
    );
  }
}
