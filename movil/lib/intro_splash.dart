import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'sicpes_widgets.dart';

const _cream = Color(0xFFFDFBF7);

/// Estado de la restauración de sesión mientras corre la animación.
enum IntroStatus { restoring, noSession, hasSession, error }

/// Splash animada de SICPES: el nombre aparece, un círculo verde crece sobre él,
/// llena la pantalla y por abajo sube un panel curvo con el botón "Continuar".
/// Si ya hay una sesión guardada, continúa sola al terminar la animación.
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
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3400),
  );
  bool _autoContinued = false;

  @override
  void initState() {
    super.initState();
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) _maybeAutoContinue();
    });
    _controller.forward();
  }

  @override
  void didUpdateWidget(covariant IntroSplash oldWidget) {
    super.didUpdateWidget(oldWidget);
    _maybeAutoContinue();
  }

  void _maybeAutoContinue() {
    if (_autoContinued ||
        !_controller.isCompleted ||
        widget.status != IntroStatus.hasSession) {
      return;
    }
    _autoContinued = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onContinue();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _cream,
      body: LayoutBuilder(
        builder: (context, box) {
          final width = box.maxWidth;
          final height = box.maxHeight;
          final center = Offset(width / 2, height / 2);
          final coverRadius =
              math.sqrt(width * width + height * height) / 2 + 4;
          final panelHeight = math.max(220.0, height * 0.3);

          return AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              final t = _controller.value;
              double step(double from, double to, Curve curve) =>
                  curve.transform(((t - from) / (to - from)).clamp(0.0, 1.0));

              final fade = step(0.0, 0.18, Curves.easeOut);
              final grow = step(0.20, 0.42, Curves.easeOutCubic);
              final expand = step(0.52, 0.74, Curves.easeInOutCubic);
              final panel = step(0.74, 1.0, Curves.easeOutCubic);

              const baseRadius = 112.0;
              final radius =
                  baseRadius * grow + (coverRadius - baseRadius) * expand;
              final align = Alignment(0, -0.26 * panel);

              return Stack(
                children: [
                  // 1. Nombre en verde sobre fondo crema
                  Positioned.fill(
                    child: Opacity(
                      opacity: fade,
                      child: Align(
                        alignment: align,
                        child: const _Wordmark(color: brandGreen),
                      ),
                    ),
                  ),
                  // 2. Círculo verde que crece
                  if (radius > 0)
                    Positioned.fill(
                      child: CustomPaint(
                        painter: _CirclePainter(center, radius),
                      ),
                    ),
                  // 3. Nombre en blanco, visible solo dentro del círculo
                  Positioned.fill(
                    child: ClipPath(
                      clipper: _CircleClipper(center, radius),
                      child: Opacity(
                        opacity: fade,
                        child: Align(
                          alignment: align,
                          child: const _Wordmark(color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                  // 4. Lema
                  Positioned.fill(
                    child: Opacity(
                      opacity: panel,
                      child: Align(
                        alignment: align,
                        child: Transform.translate(
                          offset: const Offset(0, 46),
                          child: const Text(
                            'Tu residencia, en un solo lugar.',
                            style: TextStyle(
                              color: Color(0xCCFFFFFF),
                              fontSize: 13,
                              letterSpacing: .3,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // 5. Panel curvo inferior con el botón
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: -(1 - panel) * (panelHeight + 40),
                    height: panelHeight,
                    child: ClipPath(
                      clipper: _PanelClipper(),
                      child: Container(
                        color: _cream,
                        padding: const EdgeInsets.fromLTRB(32, 52, 32, 0),
                        alignment: Alignment.topCenter,
                        child: _PanelContent(
                          status: widget.status,
                          error: widget.error,
                          onContinue: widget.onContinue,
                          onRetry: widget.onRetry,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(
      'SICPES',
      style: TextStyle(
        color: color,
        fontSize: 46,
        fontWeight: FontWeight.w900,
        letterSpacing: 3,
        height: 1,
      ),
    );
  }
}

class _PanelContent extends StatelessWidget {
  const _PanelContent({
    required this.status,
    required this.error,
    required this.onContinue,
    required this.onRetry,
  });

  final IntroStatus status;
  final String? error;
  final VoidCallback onContinue;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final Widget child;
    switch (status) {
      case IntroStatus.noSession:
        child = _PanelButton(
          key: const ValueKey('continue'),
          label: 'Continuar',
          onPressed: onContinue,
        );
      case IntroStatus.error:
        child = Column(
          key: const ValueKey('error'),
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'No se pudo conectar',
              style: TextStyle(
                color: forestGreen,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              error ?? 'Revisa tu conexión e inténtalo de nuevo.',
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: mutedGreen, fontSize: 12),
            ),
            const SizedBox(height: 12),
            _PanelButton(label: 'Intentar de nuevo', onPressed: onRetry),
          ],
        );
      case IntroStatus.restoring:
      case IntroStatus.hasSession:
        child = Column(
          key: const ValueKey('loading'),
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
            const SizedBox(height: 10),
            Text(
              status == IntroStatus.hasSession
                  ? 'Entrando a tu cuenta...'
                  : 'Conectando con SICPES...',
              style: const TextStyle(color: mutedGreen, fontSize: 12),
            ),
          ],
        );
    }

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 300),
      child: child,
    );
  }
}

class _PanelButton extends StatelessWidget {
  const _PanelButton({required this.label, required this.onPressed, super.key});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: brandGreen,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          elevation: 3,
          shadowColor: Colors.black45,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        child: Text(label),
      ),
    );
  }
}

class _CirclePainter extends CustomPainter {
  const _CirclePainter(this.center, this.radius);

  final Offset center;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawCircle(center, radius, Paint()..color = brandGreen);
  }

  @override
  bool shouldRepaint(covariant _CirclePainter oldDelegate) =>
      oldDelegate.radius != radius || oldDelegate.center != center;
}

class _CircleClipper extends CustomClipper<Path> {
  const _CircleClipper(this.center, this.radius);

  final Offset center;
  final double radius;

  @override
  Path getClip(Size size) =>
      Path()..addOval(Rect.fromCircle(center: center, radius: radius));

  @override
  bool shouldReclip(covariant _CircleClipper oldClipper) =>
      oldClipper.radius != radius || oldClipper.center != center;
}

/// Panel blanco con el borde superior curvado hacia adentro (centro más bajo).
class _PanelClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    return Path()
      ..moveTo(0, 0)
      ..quadraticBezierTo(size.width / 2, 40, size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
