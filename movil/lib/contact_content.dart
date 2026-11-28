import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'sicpes_widgets.dart';

// ── Datos de contacto (iguales a los de la web) ─────────────────────────────
const _defaultEmail = 'sicpes.soporte@gmail.com';
const _phoneLabel = '776-104-3056';
const _phoneTel = '+527761043056';
const _whatsapp = '527761043056';
const _lat = 20.237911;
const _lon = -97.958499;
const _address = 'Universidad Tecnológica de Xicotepec de Juárez';

const _socials = [
  ('Facebook', 'https://www.facebook.com/', Icons.facebook),
  ('Twitter', 'https://twitter.com/', Icons.alternate_email),
  ('Instagram', 'https://www.instagram.com/', Icons.camera_alt_outlined),
];

const _faqs = [
  (
    '¿Cómo reservo una habitación?',
    'Crea tu cuenta, entra a Reservar, elige una habitación disponible y envía tu solicitud. El equipo la revisa y te avisa si fue aceptada.',
  ),
  (
    '¿Cómo pago mi renta?',
    'Desde la sección Pagos puedes consultar tus cuotas y subir tu comprobante. El administrador lo valida y se refleja en tu historial.',
  ),
  (
    '¿Qué incluye la renta?',
    'Servicios básicos, internet, mobiliario y limpieza de áreas comunes. El precio exacto depende del tipo de habitación.',
  ),
  (
    '¿Cuánto tarda la confirmación?',
    'Normalmente respondemos en un máximo de 24 horas en días hábiles.',
  ),
];

/// Horario: días (1 = lunes ... 7 = domingo), apertura y cierre en horas.
class _Schedule {
  const _Schedule(this.label, this.days, this.open, this.close, this.text);

  final String label;
  final List<int> days;
  final int? open;
  final int? close;
  final String text;
}

const _schedule = [
  _Schedule('Lunes a Viernes', [1, 2, 3, 4, 5], 9, 18, '9:00 AM - 6:00 PM'),
  _Schedule('Sábados', [6], 10, 14, '10:00 AM - 2:00 PM'),
  _Schedule('Domingos', [7], null, null, 'Cerrado'),
];

Future<void> _open(BuildContext context, Uri uri) async {
  var opened = false;
  try {
    opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    opened = false;
  }
  if (!opened && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('No se pudo abrir la aplicación.')),
    );
  }
}

/// Contenido completo de "Contacto": accesos, formulario, horarios,
/// ubicación, redes y preguntas frecuentes. Lo usan la pantalla de inicio
/// (antes de entrar) y "Soporte SICPES" dentro de la cuenta.
class ContactContent extends StatefulWidget {
  const ContactContent({this.supportEmail = _defaultEmail, super.key});

  final String supportEmail;

  @override
  State<ContactContent> createState() => _ContactContentState();
}

class _ContactContentState extends State<ContactContent> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _sent = false;

  String get _mail =>
      widget.supportEmail.isEmpty ? _defaultEmail : widget.supportEmail;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  /// Hora del Centro de México (UTC-6, sin horario de verano).
  DateTime get _mexicoNow =>
      DateTime.now().toUtc().subtract(const Duration(hours: 6));

  _Schedule? get _today {
    final weekday = _mexicoNow.weekday;
    for (final row in _schedule) {
      if (row.days.contains(weekday)) return row;
    }
    return null;
  }

  bool get _isOpen {
    final row = _today;
    if (row == null || row.open == null || row.close == null) return false;
    final now = _mexicoNow;
    final hour = now.hour + now.minute / 60;
    return hour >= row.open! && hour < row.close!;
  }

  Future<void> _send() async {
    if (!_formKey.currentState!.validate()) return;
    final subject = _subject.text.trim().isEmpty
        ? 'Consulta desde SICPES'
        : _subject.text.trim();
    final body =
        '${_message.text.trim()}\n\n— ${_name.text.trim()} (${_email.text.trim()})';
    final uri = Uri(
      scheme: 'mailto',
      path: _mail,
      query:
          'subject=${Uri.encodeComponent(subject)}&body=${Uri.encodeComponent(body)}',
    );
    setState(() => _sent = true);
    await _open(context, uri);
    await Future<void>.delayed(const Duration(seconds: 6));
    if (mounted) setState(() => _sent = false);
  }

  String? _required(String? value) =>
      (value == null || value.trim().isEmpty) ? 'Campo obligatorio.' : null;

  @override
  Widget build(BuildContext context) {
    final today = _today;
    final open = _isOpen;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'CONTACTO',
          style: TextStyle(
            color: Color(0xFF4C7A5F),
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          '¿En qué podemos ayudarte?',
          style: TextStyle(
            color: forestGreen,
            fontSize: 26,
            fontWeight: FontWeight.w800,
            height: 1.15,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Escríbenos, llámanos o visítanos. Respondemos tus dudas sobre reservaciones, pagos y habitaciones en un máximo de 24 horas en días hábiles.',
          style: TextStyle(color: mutedGreen, height: 1.4),
        ),
        const SizedBox(height: 16),

        // Accesos directos
        _QuickAction(
          icon: Icons.mail_outline,
          title: 'Correo',
          text: _mail,
          onTap: () => _open(context, Uri.parse('mailto:$_mail')),
        ),
        _QuickAction(
          icon: Icons.phone_outlined,
          title: 'Llamar',
          text: _phoneLabel,
          onTap: () => _open(context, Uri.parse('tel:$_phoneTel')),
        ),
        _QuickAction(
          icon: Icons.chat_bubble_outline,
          title: 'WhatsApp',
          text: 'Escríbenos un mensaje',
          onTap: () => _open(
            context,
            Uri.parse(
              'https://wa.me/$_whatsapp?text=${Uri.encodeComponent('Hola, tengo una duda sobre SICPES.')}',
            ),
          ),
        ),
        const SizedBox(height: 8),

        // Formulario
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Envíanos un mensaje',
                    style: TextStyle(
                      color: brandGreen,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Se abrirá tu aplicación de correo con el mensaje listo para enviar.',
                    style: TextStyle(color: mutedGreen, fontSize: 12),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Nombre',
                      hintText: 'Tu nombre completo',
                    ),
                    validator: _required,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Correo electrónico',
                      hintText: 'tu@correo.com',
                    ),
                    validator: (value) {
                      final required = _required(value);
                      if (required != null) return required;
                      return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                              .hasMatch(value!.trim())
                          ? null
                          : 'Escribe un correo válido.';
                    },
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _subject,
                    decoration: const InputDecoration(
                      labelText: 'Asunto',
                      hintText: 'Ej. Duda sobre mi reservación',
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _message,
                    minLines: 4,
                    maxLines: 6,
                    decoration: const InputDecoration(
                      labelText: 'Mensaje',
                      alignLabelWithHint: true,
                    ),
                    validator: _required,
                  ),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    onPressed: _send,
                    icon: const Icon(Icons.send_rounded, size: 18),
                    label: const Text('Enviar mensaje'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                  if (_sent)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Abriendo tu correo…',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: brandGreen, fontSize: 12),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),

        // Horarios
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.schedule, color: brandGreen),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Horarios',
                        style: TextStyle(
                          color: brandGreen,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: open
                            ? const Color(0xFFDDF0E2)
                            : const Color(0xFFF0EEE5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircleAvatar(
                            radius: 4,
                            backgroundColor: open
                                ? const Color(0xFF3FAE6A)
                                : const Color(0xFF9AA39B),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            open ? 'Abierto ahora' : 'Cerrado ahora',
                            style: TextStyle(
                              color: open
                                  ? const Color(0xFF1E5E3A)
                                  : mutedGreen,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                for (final row in _schedule)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              text: row.label,
                              children: [
                                if (identical(row, today))
                                  const TextSpan(
                                    text: '  HOY',
                                    style: TextStyle(
                                      color: brandGreen,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                              ],
                            ),
                            style: TextStyle(
                              color: identical(row, today)
                                  ? forestGreen
                                  : mutedGreen,
                              fontWeight: identical(row, today)
                                  ? FontWeight.w700
                                  : FontWeight.w400,
                            ),
                          ),
                        ),
                        Text(
                          row.text,
                          style: TextStyle(
                            color: identical(row, today)
                                ? forestGreen
                                : mutedGreen,
                            fontWeight: identical(row, today)
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                const Text(
                  'Hora del Centro de México.',
                  style: TextStyle(color: mutedGreen, fontSize: 11),
                ),
              ],
            ),
          ),
        ),

        // Ubicación
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '¿Dónde estamos?',
                  style: TextStyle(
                    color: brandGreen,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.location_on_outlined, color: brandGreen),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _address,
                        style: TextStyle(color: forestGreen, height: 1.4),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () => _open(
                          context,
                          Uri.parse(
                            'https://www.google.com/maps/dir/?api=1&destination=$_lat,$_lon&travelmode=walking',
                          ),
                        ),
                        icon: const Icon(Icons.directions_walk, size: 18),
                        label: const Text('Cómo llegar'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _open(
                          context,
                          Uri.parse(
                            'https://www.google.com/maps/search/?api=1&query=$_lat,$_lon',
                          ),
                        ),
                        icon: const Icon(Icons.map_outlined, size: 18),
                        label: const Text('Ver mapa'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Se abre Google Maps con la ruta a pie desde tu ubicación, con distancia y tiempo estimado.',
                  style: TextStyle(color: mutedGreen, fontSize: 11),
                ),
              ],
            ),
          ),
        ),

        // Redes
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Síguenos',
                  style: TextStyle(
                    color: brandGreen,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final social in _socials)
                      ActionChip(
                        avatar: Icon(social.$3, size: 18, color: brandGreen),
                        label: Text(social.$1),
                        onPressed: () => _open(context, Uri.parse(social.$2)),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Preguntas frecuentes
        Card(
          clipBehavior: Clip.antiAlias,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 14, 8, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(8, 0, 8, 6),
                  child: Text(
                    'Preguntas frecuentes',
                    style: TextStyle(
                      color: brandGreen,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                for (var i = 0; i < _faqs.length; i++)
                  Theme(
                    data: Theme.of(context).copyWith(
                      dividerColor: Colors.transparent,
                    ),
                    child: ExpansionTile(
                      initiallyExpanded: i == 0,
                      tilePadding: const EdgeInsets.symmetric(horizontal: 8),
                      childrenPadding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
                      expandedCrossAxisAlignment: CrossAxisAlignment.start,
                      title: Text(
                        _faqs[i].$1,
                        style: const TextStyle(
                          color: forestGreen,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      children: [
                        Text(
                          _faqs[i].$2,
                          style: const TextStyle(
                            color: mutedGreen,
                            height: 1.4,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.title,
    required this.text,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFEAF6EC),
          child: Icon(icon, color: brandGreen),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: forestGreen,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
        subtitle: Text(text, style: const TextStyle(color: mutedGreen)),
        trailing: const Icon(Icons.chevron_right, color: mutedGreen),
      ),
    );
  }
}

/// Pantalla completa de contacto (se abre desde "Soporte SICPES").
class ContactScreen extends StatelessWidget {
  const ContactScreen({this.supportEmail = _defaultEmail, super.key});

  final String supportEmail;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contacto')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        child: ContactContent(supportEmail: supportEmail),
      ),
    );
  }
}
