import 'package:flutter/material.dart';

/// Pide confirmación y, si el usuario acepta, muestra la animación de salida
/// y cierra la sesión.
Future<void> confirmAndLogout(
  BuildContext context,
  Future<void> Function() onLogout,
) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Cerrar sesión'),
      content: const Text('¿Seguro que quieres salir de tu cuenta?'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancelar'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text(
            'Salir',
            style: TextStyle(color: Color(0xFFA93830)),
          ),
        ),
      ],
    ),
  );
  if (ok != true || !context.mounted) return;

  await Navigator.of(context, rootNavigator: true).push(
    PageRouteBuilder<void>(
      opaque: true,
      transitionDuration: const Duration(milliseconds: 250),
      reverseTransitionDuration: const Duration(milliseconds: 450),
      pageBuilder: (_, _, _) => _LogoutOverlay(onLogout: onLogout),
      transitionsBuilder: (_, animation, _, child) =>
          FadeTransition(opacity: animation, child: child),
    ),
  );
}

const _bgTop = Color(0xFF2F8A5C);
const _bgBottom = Color(0xFF17432D);
const _accent2 = Color(0xFF81C784);
const _textMain = Color(0xFFFDFBF7);
const _textMuted = Color(0xFFC7CCB9);
const _logoDark = Color(0xFF1B5436);

/// Pantalla de cierre de sesión: caja crema que "respira", puerta con flecha
/// que sale en bucle, título, subtítulo y tres puntos que rebotan.
class _LogoutOverlay extends StatefulWidget {
  const _LogoutOverlay({required this.onLogout});

  final Future<void> Function() onLogout;

  @override
  State<_LogoutOverlay> createState() => _LogoutOverlayState();
}

class _LogoutOverlayState extends State<_LogoutOverlay>
    with TickerProviderStateMixin {
  /// Tiempo mínimo que se ve la animación aunque el cierre sea instantáneo.
  static const _minimumTime = Duration(milliseconds: 1800);

  // box-breathe: ciclo de 2.4 s (sube y baja).
  late final AnimationController _breathe = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  )..repeat(reverse: true);

  // door-exit: 0.85 s alternado.
  late final AnimationController _door = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 850),
  )..repeat(reverse: true);

  // dot-bounce: ciclo de 0.9 s.
  late final AnimationController _dots = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void initState() {
    super.initState();
    _run();
  }

  Future<void> _run() async {
    try {
      await Future.wait([
        Future<void>.delayed(_minimumTime),
        widget.onLogout(),
      ]);
    } finally {
      if (mounted) Navigator.of(context).pop();
    }
  }

  @override
  void dispose() {
    _breathe.dispose();
    _door.dispose();
    _dots.dispose();
    super.dispose();
  }

  /// Keyframes 0%, 40%, 80%, 100% => escala .75, 1.15, .75, .75 (y opacidad
  /// .45, 1, .45, .45) con ease-in-out entre cada tramo.
  double _dotPhase(double delaySeconds) {
    const cycle = 0.9;
    final t = ((_dots.value * cycle - delaySeconds) / cycle) % 1.0;
    final p = t < 0 ? t + 1 : t;
    if (p < .4) return Curves.easeInOut.transform(p / .4);
    if (p < .8) return 1 - Curves.easeInOut.transform((p - .4) / .4);
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: _bgBottom,
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [_bgTop, _bgBottom],
            ),
          ),
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: const Alignment(0, -.16),
                radius: .9,
                colors: [
                  _accent2.withValues(alpha: .22),
                  Colors.transparent,
                ],
                stops: const [0, .6],
              ),
            ),
            child: SafeArea(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildIconBox(),
                      const SizedBox(height: 20),
                      const Text(
                        'Cerrando sesión...',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: _textMain,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -.5,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ConstrainedBox(
                        constraints: BoxConstraints(maxWidth: 260),
                        child: Text(
                          'Limpiando datos locales de forma segura',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: _textMuted,
                            fontSize: 14.7,
                            height: 1.45,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      _buildDots(),
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

  Widget _buildIconBox() {
    return AnimatedBuilder(
      animation: _breathe,
      builder: (context, child) => Transform.translate(
        offset: Offset(0, -4 * Curves.easeInOut.transform(_breathe.value)),
        child: child,
      ),
      child: Container(
        width: 92,
        height: 92,
        decoration: BoxDecoration(
          color: _textMain,
          borderRadius: BorderRadius.circular(26),
          boxShadow: const [
            BoxShadow(
              color: Color(0x6B0A2014),
              blurRadius: 36,
              offset: Offset(0, 18),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: AnimatedBuilder(
          animation: _door,
          builder: (context, child) {
            final t = Curves.easeInOut.transform(_door.value);
            return Opacity(
              opacity: .85 + .15 * t,
              child: Transform.translate(
                offset: Offset(-3 + 8 * t, 0),
                child: child,
              ),
            );
          },
          child: const Icon(Icons.logout_rounded, size: 44, color: _logoDark),
        ),
      ),
    );
  }

  Widget _buildDots() {
    return AnimatedBuilder(
      animation: _dots,
      builder: (context, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < 3; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              Builder(
                builder: (_) {
                  final k = _dotPhase(.15 * i);
                  return Opacity(
                    opacity: .45 + .55 * k,
                    child: Transform.scale(
                      scale: .75 + .4 * k,
                      child: Container(
                        width: 9,
                        height: 9,
                        decoration: const BoxDecoration(
                          color: _accent2,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ],
        );
      },
    );
  }
}
