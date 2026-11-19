import 'package:flutter/material.dart';

import 'api_client.dart';
import 'sicpes_widgets.dart';

/// Pantalla "Estado de mi petición": seguimiento de la reservación del residente.
class RequestStatusScreen extends StatefulWidget {
  const RequestStatusScreen({
    required this.api,
    this.initialReservation,
    super.key,
  });

  final ApiClient api;
  final Map<String, dynamic>? initialReservation;

  @override
  State<RequestStatusScreen> createState() => _RequestStatusScreenState();
}

class _RequestStatusScreenState extends State<RequestStatusScreen> {
  Map<String, dynamic>? _reservation;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reservation = widget.initialReservation;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _reservation == null;
      _error = null;
    });
    try {
      final result = await widget.api.get('/mobile/reservation');
      _reservation = result is Map<String, dynamic>
          ? Map<String, dynamic>.from(result)
          : null;
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _contactSupport() async {
    String email = '';
    try {
      final settings = await widget.api.get('/mobile/settings');
      if (settings is Map<String, dynamic>) {
        email = (settings['emailAdmin'] ?? '').toString();
      }
    } on ApiException {
      // Si no se puede leer el correo, se muestra el mensaje genérico.
    }
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Contactar a SICPES'),
        content: SelectableText(
          email.isEmpty
              ? 'Contacta al equipo administrativo para recibir ayuda.'
              : 'Escribe al equipo administrativo: $email',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final reservation = _reservation;
    return Scaffold(
      appBar: AppBar(title: const Text('Mi petición')),
      body: _loading
          ? const LoadingView()
          : RefreshIndicator(
              onRefresh: _load,
              child: reservation == null
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(18),
                      children: [
                        if (_error != null) InlineError(_error!),
                        const SizedBox(height: 40),
                        const Center(
                          child: Text(
                            'Todavía no tienes una petición de reservación.',
                            style: TextStyle(color: mutedGreen),
                          ),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Volver al inicio'),
                        ),
                      ],
                    )
                  : _content(reservation),
            ),
    );
  }

  Widget _content(Map<String, dynamic> reservation) {
    final state = (reservation['estado'] ?? '').toString().toLowerCase();
    final type = _cap(reservation['tipo']?.toString());
    final room = (reservation['habitacion'] ?? 'por asignar').toString();
    final floor = (reservation['piso'] ?? '—').toString();
    final reason = (reservation['motivo_rechazo'] ?? '').toString();
    final sent = displayDate(reservation['creado_en']);

    final rejected = state == 'rechazada' || state == 'cancelada';
    final accepted = state == 'aceptada' || state == 'finalizada';

    final _Hero hero = switch (state) {
      'aceptada' => const _Hero(
        'Aceptada',
        'Tu solicitud fue aprobada. Ya puedes consultar tus pagos.',
        Icons.check_rounded,
        Color(0xFFE2F5E7),
        Color(0xFF1E7A45),
      ),
      'finalizada' => const _Hero(
        'Finalizada',
        'Tu estancia concluyó. Puedes solicitar una nueva habitación.',
        Icons.flag_outlined,
        Color(0xFFF0EEE5),
        Color(0xFF6B6252),
      ),
      'rechazada' => const _Hero(
        'Rechazada',
        'Tu solicitud no fue aprobada. Puedes enviar una nueva.',
        Icons.close_rounded,
        Color(0xFFFCE7E4),
        Color(0xFFA93830),
      ),
      'cancelada' => const _Hero(
        'Cancelada',
        'Esta solicitud fue cancelada. Puedes enviar una nueva.',
        Icons.close_rounded,
        Color(0xFFFCE7E4),
        Color(0xFFA93830),
      ),
      _ => const _Hero(
        'En revisión',
        'El administrador está validando tu solicitud.',
        Icons.schedule_rounded,
        Color(0xFFFFF3D8),
        Color(0xFF8A5B00),
      ),
    };

    final photo = reservation['tipo'] == 'compartida'
        ? 'assets/rooms/room_shared.jpg'
        : 'assets/rooms/room_individual.jpg';

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
      children: [
        if (_error != null) ...[
          InlineError(_error!),
          const SizedBox(height: 10),
        ],
        const Text(
          'SEGUIMIENTO DE RESERVA',
          style: TextStyle(
            color: Color(0xFF4C7A5F),
            fontSize: 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Estado de mi petición',
          style: TextStyle(
            color: forestGreen,
            fontSize: 24,
            fontWeight: FontWeight.w700,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '$type · Habitación $room',
          style: const TextStyle(color: mutedGreen),
        ),
        const SizedBox(height: 16),

        // Estado actual
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: hero.background,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: hero.foreground.withValues(alpha: .18)),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: Icon(hero.icon, color: hero.foreground, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'ESTADO ACTUAL',
                      style: TextStyle(
                        color: hero.foreground,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hero.title,
                      style: const TextStyle(
                        color: forestGreen,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hero.text,
                      style: const TextStyle(
                        color: mutedGreen,
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (rejected && reason.isNotEmpty) ...[
          const SizedBox(height: 10),
          InlineError('Motivo: $reason'),
        ],
        const SizedBox(height: 12),

        // Línea de tiempo
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _TimelineStep(
                  title: 'Pendiente',
                  subtitle: sent == '—'
                      ? 'Solicitud enviada'
                      : 'Solicitud enviada · $sent',
                  status: _Step.done,
                ),
                _TimelineStep(
                  title: 'En revisión',
                  subtitle:
                      'Estamos validando tu información y disponibilidad.',
                  status: state == 'pendiente' ? _Step.current : _Step.done,
                ),
                _TimelineStep(
                  title: rejected
                      ? (state == 'cancelada' ? 'Cancelada' : 'Rechazada')
                      : 'Aceptada / Rechazada',
                  subtitle: accepted
                      ? 'Tu habitación quedó confirmada.'
                      : rejected
                      ? (reason.isEmpty
                            ? 'Tu solicitud no pudo ser aprobada.'
                            : reason)
                      : 'Pendiente de resolución.',
                  status: accepted
                      ? _Step.done
                      : rejected
                      ? _Step.failed
                      : _Step.todo,
                  last: true,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 4),

        // Habitación asignada
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Habitación asignada',
                        style: TextStyle(
                          color: forestGreen,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    StatusBadge(
                      accepted ? 'aceptada' : (rejected ? 'rechazada' : ''),
                      label: accepted
                          ? 'Confirmada'
                          : (rejected ? 'Sin asignar' : 'Por confirmar'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.asset(
                        photo,
                        width: 78,
                        height: 62,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Habitación $room',
                            style: const TextStyle(
                              color: forestGreen,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            '$type · Piso $floor',
                            style: const TextStyle(
                              color: mutedGreen,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            accepted
                                ? 'Ingreso ${displayDate(reservation['fecha_ingreso'])}'
                                : 'Se confirma al aceptar tu solicitud',
                            style: const TextStyle(
                              color: Color(0xFF2F7A52),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Ayuda
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '¿Necesitas ayuda?',
                  style: TextStyle(
                    color: forestGreen,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Escríbenos si tu solicitud tarda más de 24 horas.',
                  style: TextStyle(color: mutedGreen, fontSize: 12),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.tonalIcon(
                    onPressed: _contactSupport,
                    icon: const Icon(Icons.mail_outline, size: 18),
                    label: const Text('Contactar a SICPES'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 4),
        OutlinedButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Volver al inicio'),
        ),
      ],
    );
  }
}

class _Hero {
  const _Hero(
    this.title,
    this.text,
    this.icon,
    this.background,
    this.foreground,
  );

  final String title;
  final String text;
  final IconData icon;
  final Color background;
  final Color foreground;
}

enum _Step { done, current, todo, failed }

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.title,
    required this.subtitle,
    required this.status,
    this.last = false,
  });

  final String title;
  final String subtitle;
  final _Step status;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      _Step.done || _Step.current => brandGreen,
      _Step.failed => const Color(0xFFA93830),
      _Step.todo => const Color(0xFFD8D3C5),
    };
    final filled = status == _Step.done || status == _Step.failed;
    final IconData? stepIcon = switch (status) {
      _Step.done => Icons.check_rounded,
      _Step.failed => Icons.close_rounded,
      _Step.current => Icons.schedule_rounded,
      _Step.todo => null,
    };

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 26,
            child: Column(
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: filled ? color : Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: color, width: 2),
                  ),
                  child: stepIcon == null
                      ? null
                      : Icon(
                          stepIcon,
                          size: 13,
                          color: filled ? Colors.white : color,
                        ),
                ),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 2),
                      color: status == _Step.done
                          ? brandGreen
                          : const Color(0xFFE2DED0),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: last ? 0 : 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: status == _Step.todo ? mutedGreen : forestGreen,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: mutedGreen,
                      fontSize: 11.5,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _cap(String? value) => value == null || value.isEmpty
    ? '—'
    : '${value[0].toUpperCase()}${value.substring(1)}';
