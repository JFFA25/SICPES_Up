import 'package:flutter/material.dart';

import 'api_client.dart';
import 'sicpes_widgets.dart';

const _cream = Color(0xFFFDFBF7);

/// Pantalla "Sincronizando tu residencia": se muestra después de iniciar sesión.
/// Hace las primeras consultas reales (sesión, reservación, pagos y avisos)
/// y entra al inicio cuando terminan.
class SyncScreen extends StatefulWidget {
  const SyncScreen({
    required this.api,
    required this.user,
    required this.onDone,
    required this.onLogout,
    super.key,
  });

  final ApiClient api;
  final Map<String, dynamic> user;
  final VoidCallback onDone;
  final Future<void> Function() onLogout;

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  static const _minimumTime = Duration(milliseconds: 1800);

  int _done = 0; // pasos completados (0..3)
  String? _error;

  bool get _isAdmin => widget.user['rol'] == 'admin';

  List<String> get _labels => _isAdmin
      ? const ['Sesión JWT', 'Reservaciones', 'Pagos y ajustes']
      : const ['Sesión JWT', 'Reservación', 'Pagos y avisos'];

  List<String> get _messages => _isAdmin
      ? const [
          'Verificando tu sesión...',
          'Cargando reservaciones...',
          'Cargando pagos y ajustes...',
        ]
      : const [
          'Verificando tu sesión...',
          'Cargando tu reservación...',
          'Cargando estado de cuenta y avisos...',
        ];

  @override
  void initState() {
    super.initState();
    _run();
  }

  /// Los pasos 2 y 3 no detienen la entrada: cada pantalla vuelve a pedir sus datos.
  Future<void> _soft(List<String> paths) async {
    try {
      await Future.wait(paths.map(widget.api.get));
    } on ApiException {
      // ignorado a propósito
    }
  }

  Future<void> _run() async {
    final startedAt = DateTime.now();
    setState(() {
      _done = 0;
      _error = null;
    });

    try {
      await widget.api.get('/mobile/session');
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
      return;
    }
    if (!mounted) return;
    setState(() => _done = 1);

    await _soft([_isAdmin ? '/mobile/admin/reservations' : '/mobile/reservation']);
    if (!mounted) return;
    setState(() => _done = 2);

    await _soft(
      _isAdmin
          ? ['/mobile/admin/payments', '/mobile/settings']
          : ['/mobile/payments', '/mobile/notifications'],
    );
    if (!mounted) return;
    setState(() => _done = 3);

    final elapsed = DateTime.now().difference(startedAt);
    if (elapsed < _minimumTime) {
      await Future<void>.delayed(_minimumTime - elapsed);
    }
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (mounted) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _done / 3;
    final message = _done >= 3 ? 'Todo listo' : _messages[_done];

    return Scaffold(
      backgroundColor: _cream,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
              child: Row(
                children: [
                  Image.asset(
                    'assets/images/sicpes_logo.png',
                    width: 36,
                    height: 36,
                  ),
                  const SizedBox(width: 9),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'SICPES',
                        style: TextStyle(
                          color: forestGreen,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          height: 1,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFF1DDB0)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircleAvatar(
                          radius: 3.5,
                          backgroundColor: Color(0xFFE59A1F),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _error == null ? 'SINCRONIZANDO...' : 'SIN CONEXIÓN',
                          style: const TextStyle(
                            color: Color(0xFF8A5B00),
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            letterSpacing: .8,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  const Positioned.fill(child: _Skeleton()),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 22),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(22, 26, 22, 22),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(color: borderColor),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x1F000000),
                                blurRadius: 30,
                                offset: Offset(0, 14),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 56,
                                height: 56,
                                child: _error == null
                                    ? const CircularProgressIndicator(
                                        strokeWidth: 4,
                                        color: brandGreen,
                                        backgroundColor: Color(0xFFE2F0E4),
                                      )
                                    : const Icon(
                                        Icons.wifi_off_rounded,
                                        size: 40,
                                        color: Color(0xFFA93830),
                                      ),
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'SINCRONIZACIÓN INICIAL',
                                style: TextStyle(
                                  color: Color(0xFF4C7A5F),
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.2,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _error == null
                                    ? 'Sincronizando tu residencia'
                                    : 'No se pudo conectar',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: forestGreen,
                                  fontSize: 21,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _error ??
                                    'Descargando reservaciones, estado de '
                                        'cuenta y avisos desde el servidor.',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: mutedGreen,
                                  fontSize: 12,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 18),
                              if (_error == null) ...[
                                TweenAnimationBuilder<double>(
                                  tween: Tween(end: progress),
                                  duration: const Duration(milliseconds: 500),
                                  curve: Curves.easeOut,
                                  builder: (context, value, _) => Column(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(99),
                                        child: LinearProgressIndicator(
                                          value: value,
                                          minHeight: 7,
                                          color: brandGreen,
                                          backgroundColor: const Color(
                                            0xFFE2F0E4,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              message,
                                              style: const TextStyle(
                                                color: mutedGreen,
                                                fontSize: 10,
                                              ),
                                            ),
                                          ),
                                          Text(
                                            '${(value * 100).round()}%',
                                            style: const TextStyle(
                                              color: brandGreen,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 14),
                                Wrap(
                                  alignment: WrapAlignment.center,
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: [
                                    for (var i = 0; i < 3; i++)
                                      _StepChip(
                                        label: '${i + 1}. ${_labels[i]}',
                                        done: _done > i,
                                      ),
                                  ],
                                ),
                              ] else ...[
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton(
                                    onPressed: _run,
                                    child: const Text('Intentar de nuevo'),
                                  ),
                                ),
                                TextButton(
                                  onPressed: widget.onLogout,
                                  child: const Text('Cerrar sesión'),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({required this.label, required this.done});

  final String label;
  final bool done;

  @override
  Widget build(BuildContext context) {
    final color = done ? brandGreen : mutedGreen;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: done ? const Color(0xFFEAF6EC) : const Color(0xFFFCFBF6),
        border: Border.all(color: done ? const Color(0xFFBFE0C8) : borderColor),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            done ? Icons.check_rounded : Icons.schedule_rounded,
            size: 12,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(color: color, fontSize: 10)),
        ],
      ),
    );
  }
}

/// Tarjetas "fantasma" que se ven desenfocadas detrás de la tarjeta de carga.
class _Skeleton extends StatelessWidget {
  const _Skeleton();

  @override
  Widget build(BuildContext context) {
    Widget bar(double width, {double height = 10}) => Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: const Color(0xFFE8EDE6),
        borderRadius: BorderRadius.circular(8),
      ),
    );

    Widget tile() => Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CircleAvatar(radius: 11, backgroundColor: Color(0xFFE8EDE6)),
            const SizedBox(height: 10),
            bar(70),
            const SizedBox(height: 6),
            bar(44, height: 8),
          ],
        ),
      ),
    );

    return Opacity(
      opacity: .55,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
        child: Column(
          children: [
            Row(children: [tile(), const SizedBox(width: 10), tile()]),
            const SizedBox(height: 10),
            Row(children: [tile(), const SizedBox(width: 10), tile()]),
            const SizedBox(height: 70),
            Container(
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
