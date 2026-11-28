import 'package:flutter/material.dart';

import 'sicpes_widgets.dart';

/// Detalle de una habitación (galería, datos, servicios y precio).
/// Al pulsar "Solicitar esta habitación" regresa `true` a quien la abrió.
class RoomDetailScreen extends StatefulWidget {
  const RoomDetailScreen({
    required this.type,
    required this.floor,
    required this.room,
    required this.price,
    this.available = true,
    this.photoUrls = const [],
    this.description = '',
    super.key,
  });

  /// 'individual' o 'compartida'
  final String type;
  final String floor;
  final String room;
  final int price;
  final bool available;

  /// Fotos reales (Cloudinary). Si viene vacío se usan las genéricas.
  final List<String> photoUrls;
  final String description;

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  static const _services = [
    'Internet Wi-Fi',
    'Agua y luz',
    'Mobiliario completo',
    'Limpieza de áreas comunes',
    'Vigilancia',
    'Cerca de tu campus',
  ];

  late final List<String> _photos = widget.photoUrls.isNotEmpty
      ? widget.photoUrls
      : widget.type == 'compartida'
      ? const [
          'assets/rooms/room_shared.jpg',
          'assets/rooms/room_hero.jpg',
          'assets/rooms/room_individual.jpg',
        ]
      : const [
          'assets/rooms/room_hero.jpg',
          'assets/rooms/room_individual.jpg',
          'assets/rooms/room_shared.jpg',
        ];
  int _selected = 0;

  String get _typeLabel =>
      widget.type == 'compartida' ? 'Compartida' : 'Individual';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Habitación ${widget.room}')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
        children: [
          Text(
            widget.available ? 'HABITACIÓN DISPONIBLE' : 'HABITACIÓN OCUPADA',
            style: const TextStyle(
              color: Color(0xFF4C7A5F),
              fontSize: 9,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Habitación ${widget.room}',
            style: const TextStyle(
              color: forestGreen,
              fontSize: 24,
              fontWeight: FontWeight.w700,
              letterSpacing: -.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '$_typeLabel · Piso ${widget.floor}',
            style: const TextStyle(color: mutedGreen),
          ),
          if (widget.description.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              widget.description,
              style: const TextStyle(color: mutedGreen, height: 1.35),
            ),
          ],
          const SizedBox(height: 14),

          // Galería
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: AspectRatio(
              aspectRatio: 16 / 10,
              child: _RoomPhoto(_photos[_selected]),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < _photos.length; i++) ...[
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selected = i),
                    child: Container(
                      height: 58,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: i == _selected
                              ? brandGreen
                              : Colors.transparent,
                          width: 2,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: _RoomPhoto(_photos[i]),
                      ),
                    ),
                  ),
                ),
                if (i < _photos.length - 1) const SizedBox(width: 8),
              ],
            ],
          ),
          const SizedBox(height: 14),

          // Datos
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.45,
            children: [
              StatTile(
                icon: Icons.bed_outlined,
                value: _typeLabel,
                label: 'Tipo',
              ),
              StatTile(
                icon: Icons.apartment_outlined,
                value: 'Piso ${widget.floor}',
                label: 'Piso',
              ),
              StatTile(
                icon: Icons.account_balance_wallet_outlined,
                value: '${displayMoney(widget.price)}/mes',
                label: 'Precio',
              ),
              StatTile(
                icon: Icons.check_circle_outline,
                value: widget.available ? 'Disponible' : 'Ocupada',
                label: 'Estado',
              ),
            ],
          ),
          const SizedBox(height: 10),

          const Text(
            'Servicios incluidos',
            style: TextStyle(
              color: forestGreen,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final service in _services)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.check_rounded,
                        size: 15,
                        color: brandGreen,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        service,
                        style: const TextStyle(
                          fontSize: 12,
                          color: forestGreen,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          const Text(
            'Sobre la habitación',
            style: TextStyle(
              color: forestGreen,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Un espacio luminoso y equipado para que te concentres en estudiar. '
            'Incluye mobiliario, internet de alta velocidad y servicios básicos, '
            'a unos minutos de tu campus.',
            style: TextStyle(color: mutedGreen, height: 1.5),
          ),
          const SizedBox(height: 16),

          // Reservar
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'RESERVA ESTA HABITACIÓN',
                    style: TextStyle(
                      color: Color(0xFF4C7A5F),
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    displayMoney(widget.price),
                    style: const TextStyle(
                      color: forestGreen,
                      fontSize: 27,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Text(
                    'por mes · servicios incluidos',
                    style: TextStyle(color: mutedGreen, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1FAF3),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.verified_user_outlined,
                          size: 17,
                          color: brandGreen,
                        ),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Sin cargos ocultos. Confirmación en 24 h.',
                            style: TextStyle(fontSize: 12, color: forestGreen),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  FilledButton(
                    onPressed: widget.available
                        ? () => Navigator.pop(context, true)
                        : null,
                    child: const Text('Solicitar esta habitación'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Comparar opciones'),
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

/// Foto de la habitación: URL de Cloudinary o imagen incluida en la app.
class _RoomPhoto extends StatelessWidget {
  const _RoomPhoto(this.source);

  final String source;

  @override
  Widget build(BuildContext context) {
    if (source.startsWith('http')) {
      return Image.network(
        source,
        fit: BoxFit.cover,
        width: double.infinity,
        loadingBuilder: (context, child, progress) => progress == null
            ? child
            : const ColoredBox(color: Color(0xFFE8EDE6)),
        errorBuilder: (context, error, stack) => const ColoredBox(
          color: Color(0xFFE8EDE6),
          child: Center(child: Icon(Icons.image_not_supported_outlined)),
        ),
      );
    }
    return Image.asset(source, fit: BoxFit.cover, width: double.infinity);
  }
}
