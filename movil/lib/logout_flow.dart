import 'package:flutter/material.dart';

import 'sicpes_widgets.dart';

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

class _LogoutOverlay extends StatefulWidget {
  const _LogoutOverlay({required this.onLogout});

  final Future<void> Function() onLogout;

  @override
  State<_LogoutOverlay> createState() => _LogoutOverlayState();
}

class _LogoutOverlayState extends State<_LogoutOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1500),
  );

  @override
  void initState() {
    super.initState();
    _run();
  }

  Future<void> _run() async {
    await _controller.forward();
    await widget.onLogout();
    if (mounted) Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: forestGreen,
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          double step(double from, double to, Curve curve) => curve.transform(
            ((_controller.value - from) / (to - from)).clamp(0.0, 1.0),
          );
          final pop = step(0.0, 0.4, Curves.elasticOut);
          final slide = step(0.35, 0.8, Curves.easeInOutCubic);
          final text = step(0.2, 0.55, Curves.easeOut);

          return Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [brandGreen, forestGreen],
              ),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Transform.scale(
                    scale: pop,
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: ClipOval(
                        child: Transform.translate(
                          offset: Offset(slide * 70, 0),
                          child: Opacity(
                            opacity: 1 - slide,
                            child: const Icon(
                              Icons.logout_rounded,
                              size: 44,
                              color: brandGreen,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Opacity(
                    opacity: text,
                    child: Transform.translate(
                      offset: Offset(0, 10 * (1 - text)),
                      child: const Column(
                        children: [
                          Text(
                            'Hasta pronto',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Cerrando tu sesión...',
                            style: TextStyle(
                              color: Color(0xCCFFFFFF),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
