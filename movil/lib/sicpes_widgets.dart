import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

const forestGreen = Color(0xFF173D2A);
const brandGreen = Color(0xFF287A51);
const mutedGreen = Color(0xFF66766A);
const borderColor = Color(0xFFE9E4D7);

String displayMoney(Object? value) => NumberFormat.currency(
  locale: 'es_MX',
  symbol: '\$',
  decimalDigits: 0,
).format(double.tryParse(value?.toString() ?? '') ?? 0);

String displayDate(Object? value) {
  if (value == null || value.toString().isEmpty) return '—';
  final date = DateTime.tryParse(value.toString());
  return date == null ? '—' : DateFormat('dd/MM/yyyy', 'es_MX').format(date);
}

String displayPeriod(Object? month, Object? year) {
  final monthValue = int.tryParse(month?.toString() ?? '');
  final yearValue = int.tryParse(year?.toString() ?? '');
  if (monthValue == null ||
      yearValue == null ||
      monthValue < 1 ||
      monthValue > 12) {
    return 'Periodo no disponible';
  }
  final date = DateTime(yearValue, monthValue);
  return DateFormat('MMMM yyyy', 'es_MX').format(date);
}

List<Map<String, dynamic>> mapList(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}

class PageBody extends StatelessWidget {
  const PageBody({
    required this.title,
    required this.subtitle,
    required this.children,
    this.padding = const EdgeInsets.fromLTRB(18, 18, 18, 28),
    super.key,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: padding,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: forestGreen,
            fontSize: 24,
            fontWeight: FontWeight.w700,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(subtitle, style: const TextStyle(color: mutedGreen, height: 1.4)),
        const SizedBox(height: 18),
        ...children,
      ],
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key});

  final String status;

  @override
  Widget build(BuildContext context) {
    final normalized = status.toLowerCase();
    final background = switch (normalized) {
      'aceptada' ||
      'pagado' ||
      'aprobado' ||
      'finalizada' => const Color(0xFFE2F5E7),
      'pendiente' => const Color(0xFFFFF3D8),
      'rechazada' || 'cancelada' || 'atrasado' => const Color(0xFFFCE7E4),
      _ => const Color(0xFFF0EEE5),
    };
    final foreground = switch (normalized) {
      'aceptada' ||
      'pagado' ||
      'aprobado' ||
      'finalizada' => const Color(0xFF1E7A45),
      'pendiente' => const Color(0xFF8A5B00),
      'rechazada' || 'cancelada' || 'atrasado' => const Color(0xFFA93830),
      _ => const Color(0xFF6B6252),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: foreground.withValues(alpha: .18)),
      ),
      child: Text(
        status.isEmpty ? 'sin estado' : status,
        style: TextStyle(
          color: foreground,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class StatTile extends StatelessWidget {
  const StatTile({
    required this.icon,
    required this.value,
    required this.label,
    super.key,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFEAF6EC),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: brandGreen),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: forestGreen,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    label,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: mutedGreen, fontSize: 10),
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

class InlineError extends StatelessWidget {
  const InlineError(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1EF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF3CDC8)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: Color(0xFFA93830), fontSize: 12),
      ),
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) =>
      const Center(child: CircularProgressIndicator());
}
