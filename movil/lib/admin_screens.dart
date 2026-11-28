import 'package:flutter/material.dart';

import 'api_client.dart';
import 'file_picker_helper.dart';
import 'sicpes_widgets.dart';

class AdminReservationsScreen extends StatefulWidget {
  const AdminReservationsScreen({required this.api, super.key});

  final ApiClient api;

  @override
  State<AdminReservationsScreen> createState() =>
      _AdminReservationsScreenState();
}

class _AdminReservationsScreenState extends State<AdminReservationsScreen> {
  static const _filters = [
    ('Todas', 'all'),
    ('Pendientes', 'pendiente'),
    ('Aceptadas', 'aceptada'),
    ('Rechazadas', 'rechazada'),
    ('Finalizadas', 'finalizada'),
  ];

  List<Map<String, dynamic>> _reservations = [];
  String _filter = 'all';
  String _search = '';
  String? _error;
  bool _loading = true;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _reservations = mapList(
        await widget.api.get('/mobile/admin/reservations'),
      );
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _visible {
    final query = _search.trim().toLowerCase();
    return _reservations.where((item) {
      final status = (item['estado'] ?? '').toString().toLowerCase();
      final matchesStatus =
          _filter == 'all' ||
          status == _filter ||
          (_filter == 'rechazada' && status == 'cancelada');
      final text = [
        item['nombre'],
        item['email'],
        item['id'],
        item['tipo'],
        item['habitacion'],
      ].join(' ').toLowerCase();
      return matchesStatus && text.contains(query);
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _assign(Map<String, dynamic> reservation) async {
    try {
      final allRooms = mapList(
        await widget.api.get('/mobile/admin/rooms/details'),
      ).where((room) => _asInt(room['activa']) == 1).toList();
      final floorNumbers = allRooms.map((r) => r['piso'].toString()).toSet().toList()
        ..sort((a, b) => _asInt(a).compareTo(_asInt(b)));
      final floors = [
        for (final number in floorNumbers) <String, dynamic>{'piso': number},
      ];
      final currentIsActive = !{'cancelada', 'rechazada', 'finalizada'}
          .contains((reservation['estado'] ?? '').toString());
      int freeSpots(Map<String, dynamic> room) {
        final mine = currentIsActive &&
            reservation['piso']?.toString() == room['piso'].toString() &&
            reservation['habitacion']?.toString() == room['habitacion'].toString();
        return _asInt(room['capacidad']) - (_asInt(room['ocupantes']) - (mine ? 1 : 0));
      }
      if (!mounted) return;
      if (floors.isEmpty) {
        _showMessage('No hay pisos registrados para asignar.');
        return;
      }

      final amount = TextEditingController(
        text:
            (double.tryParse(reservation['monto']?.toString() ?? '') ??
                    (reservation['tipo'] == 'compartida' ? 1800 : 2500))
                .toStringAsFixed(0),
      );
      var selectedFloor = reservation['piso']?.toString() ?? '';
      if (!floors.any((floor) => floor['piso'].toString() == selectedFloor)) {
        selectedFloor = floors.first['piso'].toString();
      }
      var selectedRoom = reservation['habitacion']?.toString() ?? '';

      final assignment = await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) {
            final floorRooms = allRooms
                .where((room) => room['piso'].toString() == selectedFloor)
                .toList();
            final roomNames = [
              for (final room in floorRooms)
                if (freeSpots(room) > 0) room['habitacion'].toString(),
            ];
            if (!roomNames.contains(selectedRoom)) {
              selectedRoom = roomNames.isEmpty ? '' : roomNames.first;
            }

            return AlertDialog(
              title: const Text('Asignar habitación'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        (reservation['nombre'] ?? 'Estudiante').toString(),
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: selectedFloor,
                      decoration: const InputDecoration(labelText: 'Piso'),
                      items: [
                        for (final item in floors)
                          DropdownMenuItem(
                            value: item['piso'].toString(),
                            child: Text('Piso ${item['piso']}'),
                          ),
                      ],
                      onChanged: (value) => setDialogState(() {
                        selectedFloor = value ?? '';
                        selectedRoom = '';
                      }),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: selectedRoom.isEmpty ? null : selectedRoom,
                      decoration: const InputDecoration(
                        labelText: 'Habitación',
                      ),
                      items: [
                        for (final room in floorRooms.where(
                          (r) => roomNames.contains(r['habitacion'].toString()),
                        ))
                          DropdownMenuItem(
                            value: room['habitacion'].toString(),
                            child: Text(
                              'Habitación ${room['habitacion']} · ${room['tipo'] == 'compartida' ? 'Compartida' : 'Individual'} · ${freeSpots(room)} libre${freeSpots(room) == 1 ? '' : 's'}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      isExpanded: true,
                      onChanged: (value) => setDialogState(() {
                        selectedRoom = value ?? '';
                        final picked = floorRooms.where(
                          (r) => r['habitacion'].toString() == selectedRoom,
                        );
                        if (picked.isNotEmpty && _asInt(picked.first['precio']) > 0) {
                          amount.text = _asInt(picked.first['precio']).toString();
                        }
                      }),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: amount,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Monto mensual (MXN)',
                      ),
                    ),
                    if (roomNames.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 10),
                        child: Text(
                          'No hay habitaciones disponibles en este piso.',
                          style: TextStyle(
                            color: Color(0xFFA93830),
                            fontSize: 12,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: roomNames.isEmpty || amount.text.trim().isEmpty
                      ? null
                      : () {
                          final monthlyAmount = double.tryParse(amount.text);
                          if (monthlyAmount == null || monthlyAmount <= 0) {
                            return;
                          }
                          Navigator.pop(dialogContext, {
                            'piso': selectedFloor,
                            'habitacion': selectedRoom,
                            'monto': monthlyAmount,
                          });
                        },
                  child: const Text('Aceptar'),
                ),
              ],
            );
          },
        ),
      );
      amount.dispose();
      if (assignment == null) return;
      await widget.api.put(
        '/mobile/admin/reservations/${reservation['id']}',
        body: {'estado': 'aceptada', ...assignment},
      );
      await _load();
      _showMessage('Habitación asignada y reservación aceptada.');
    } on ApiException catch (error) {
      _showMessage(error.message);
    }
  }

  Future<void> _reject(Map<String, dynamic> reservation) async {
    final reason = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Rechazar reservación'),
        content: TextField(
          controller: reason,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Motivo (opcional)',
            hintText: 'Ej. Documentación incompleta',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFA93830),
            ),
            onPressed: () => Navigator.pop(dialogContext, reason.text.trim()),
            child: const Text('Rechazar solicitud'),
          ),
        ],
      ),
    );
    reason.dispose();
    if (value == null) return;
    await _updateReservation(reservation, {
      'estado': 'rechazada',
      if (value.isNotEmpty) 'motivo_rechazo': value,
    }, 'Reservación rechazada.');
  }

  Future<void> _updateReservation(
    Map<String, dynamic> reservation,
    Map<String, dynamic> body,
    String message,
  ) async {
    try {
      await widget.api.put(
        '/mobile/admin/reservations/${reservation['id']}',
        body: body,
      );
      await _load();
      _showMessage(message);
    } on ApiException catch (error) {
      _showMessage(error.message);
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final total = _reservations.length;
    final pending = _reservations
        .where((item) => item['estado'] == 'pendiente')
        .length;
    final accepted = _reservations
        .where((item) => item['estado'] == 'aceptada')
        .length;
    final rejected = _reservations
        .where(
          (item) =>
              item['estado'] == 'rechazada' || item['estado'] == 'cancelada',
        )
        .length;

    return _loading && _reservations.isEmpty
        ? const LoadingView()
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
              children: [
                const Text(
                  'Reservaciones',
                  style: TextStyle(
                    color: forestGreen,
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Revisa las solicitudes y asigna habitaciones.',
                  style: TextStyle(color: mutedGreen),
                ),
                const SizedBox(height: 14),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 2.45,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 4,
                  children: [
                    StatTile(
                      icon: Icons.people_outline,
                      value: '$total',
                      label: 'Total',
                    ),
                    StatTile(
                      icon: Icons.schedule,
                      value: '$pending',
                      label: 'Pendientes',
                    ),
                    StatTile(
                      icon: Icons.check_circle_outline,
                      value: '$accepted',
                      label: 'Aceptadas',
                    ),
                    StatTile(
                      icon: Icons.cancel_outlined,
                      value: '$rejected',
                      label: 'Rechazadas',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final filter in _filters)
                        Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(filter.$1),
                            selected: _filter == filter.$2,
                            onSelected: (_) =>
                                setState(() => _filter = filter.$2),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Buscar estudiante...',
                    isDense: true,
                  ),
                  onChanged: (value) => setState(() => _search = value),
                ),
                const SizedBox(height: 10),
                if (_error != null) InlineError(_error!),
                if (_visible.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(22),
                      child: Center(
                        child: Text('No hay reservaciones para mostrar.'),
                      ),
                    ),
                  )
                else
                  for (final reservation in _visible)
                    _reservationCard(reservation),
              ],
            ),
          );
  }

  Widget _reservationCard(Map<String, dynamic> item) {
    final name = (item['nombre'] ?? 'Estudiante').toString();
    final room = item['habitacion'] == null
        ? 'Sin asignar'
        : 'Hab. ${item['habitacion']}';
    final status = (item['estado'] ?? '').toString();
    final actions = <Widget>[];
    if (status == 'pendiente') {
      actions.add(
        OutlinedButton.icon(
          onPressed: () => _assign(item),
          icon: const Icon(Icons.meeting_room_outlined, size: 16),
          label: const Text('Asignar'),
        ),
      );
      actions.add(
        TextButton(
          onPressed: () => _reject(item),
          child: const Text('Rechazar'),
        ),
      );
    } else if (status == 'aceptada') {
      actions.add(
        OutlinedButton(
          onPressed: () => _updateReservation(item, {
            'estado': 'finalizada',
          }, 'Reservación finalizada.'),
          child: const Text('Finalizar'),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: Padding(
        padding: const EdgeInsets.all(13),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 19,
                  backgroundColor: const Color(0xFFDDF0E2),
                  backgroundImage: item['foto_perfil_url'] is String
                      ? NetworkImage(item['foto_perfil_url'] as String)
                      : null,
                  child: item['foto_perfil_url'] is String
                      ? null
                      : Text(
                          _initials(name),
                          style: const TextStyle(color: forestGreen),
                        ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: forestGreen,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        '${item['tipo'] ?? 'Habitación'} · $room',
                        style: const TextStyle(color: mutedGreen, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status),
              ],
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Divider(height: 1),
            ),
            Wrap(
              spacing: 16,
              runSpacing: 6,
              children: [
                _Detail(
                  label: 'INGRESO',
                  value: displayDate(item['fecha_ingreso']),
                ),
                _Detail(label: 'MENSUAL', value: displayMoney(item['monto'])),
                if (item['piso'] != null)
                  _Detail(label: 'PISO', value: item['piso'].toString()),
              ],
            ),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: Wrap(spacing: 4, children: actions),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AdminPaymentsScreen extends StatefulWidget {
  const AdminPaymentsScreen({required this.api, super.key});

  final ApiClient api;

  @override
  State<AdminPaymentsScreen> createState() => _AdminPaymentsScreenState();
}

class _AdminPaymentsScreenState extends State<AdminPaymentsScreen> {
  List<Map<String, dynamic>> _payments = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _payments = mapList(await widget.api.get('/mobile/admin/payments'));
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setStatus(Map<String, dynamic> payment, String status) async {
    try {
      await widget.api.put(
        '/mobile/admin/payments/${payment['id']}/status',
        body: {'estado': status},
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              status == 'pagado' ? 'Pago aprobado.' : 'Pago rechazado.',
            ),
          ),
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final pending = _payments
        .where((item) => item['estado'].toString().toLowerCase() == 'pendiente')
        .length;
    return _loading && _payments.isEmpty
        ? const LoadingView()
        : RefreshIndicator(
            onRefresh: _load,
            child: PageBody(
              title: 'Pagos',
              subtitle:
                  'Revisa las mensualidades y solicitudes de los estudiantes.',
              children: [
                StatTile(
                  icon: Icons.pending_actions_outlined,
                  value: '$pending',
                  label: 'Pendientes por revisar',
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  InlineError(_error!),
                ],
                const SizedBox(height: 10),
                if (_payments.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(22),
                      child: Center(child: Text('No hay pagos para mostrar.')),
                    ),
                  )
                else
                  for (final item in _payments) _paymentCard(item),
              ],
            ),
          );
  }

  Widget _paymentCard(Map<String, dynamic> item) {
    final status = (item['estado'] ?? '').toString();
    final isPending = status.toLowerCase() == 'pendiente';
    return Card(
      margin: const EdgeInsets.only(bottom: 9),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    (item['nombre'] ?? 'Estudiante').toString(),
                    style: const TextStyle(
                      color: forestGreen,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                StatusBadge(status),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              displayPeriod(item['mes'], item['anio']),
              style: const TextStyle(color: mutedGreen, fontSize: 12),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    displayMoney(item['monto'] ?? item['monto_pagado']),
                    style: const TextStyle(
                      color: forestGreen,
                      fontSize: 19,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (isPending) ...[
                  TextButton(
                    onPressed: () => _setStatus(item, 'rechazado'),
                    child: const Text('Rechazar'),
                  ),
                  const SizedBox(width: 4),
                  FilledButton(
                    onPressed: () => _setStatus(item, 'pagado'),
                    child: const Text('Aprobar'),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class AdminFloorsScreen extends StatefulWidget {
  const AdminFloorsScreen({required this.api, super.key});

  final ApiClient api;

  @override
  State<AdminFloorsScreen> createState() => _AdminFloorsScreenState();
}

int _asInt(Object? value) =>
    value is bool ? (value ? 1 : 0) : int.tryParse((value ?? '').toString()) ?? 0;

List<Map<String, dynamic>> _photosOf(Map<String, dynamic> room) => [
  for (final photo in (room['fotos'] is List ? room['fotos'] as List : []))
    if (photo is Map) Map<String, dynamic>.from(photo),
];

class _AdminFloorsScreenState extends State<AdminFloorsScreen> {
  List<Map<String, dynamic>> _rooms = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _rooms = mapList(await widget.api.get('/mobile/admin/rooms/details'));
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<MapEntry<String, List<Map<String, dynamic>>>> get _floors {
    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final room in _rooms) {
      grouped.putIfAbsent(room['piso'].toString(), () => []).add(room);
    }
    final entries = grouped.entries.toList()
      ..sort((a, b) => _asInt(a.key).compareTo(_asInt(b.key)));
    return entries;
  }

  Future<void> _addRooms({String? floorNumber}) async {
    final floor = TextEditingController(text: floorNumber ?? '');
    final rooms = TextEditingController();
    final capacity = TextEditingController(text: '1');
    var type = 'individual';
    final approved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Agregar habitaciones'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: floor,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Piso'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: rooms,
                  decoration: const InputDecoration(
                    labelText: 'Habitaciones',
                    hintText: '101, 102, 103',
                  ),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: type,
                  decoration: const InputDecoration(labelText: 'Tipo'),
                  items: const [
                    DropdownMenuItem(
                      value: 'individual',
                      child: Text('Individual'),
                    ),
                    DropdownMenuItem(
                      value: 'compartida',
                      child: Text('Compartida'),
                    ),
                  ],
                  onChanged: (value) => setDialogState(() {
                    type = value ?? 'individual';
                    capacity.text = type == 'compartida' ? '2' : '1';
                  }),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: capacity,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Capacidad (personas)',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
    final values = [floor.text.trim(), rooms.text.trim(), capacity.text.trim()];
    floor.dispose();
    rooms.dispose();
    capacity.dispose();
    if (approved != true || values[0].isEmpty || values[1].isEmpty) return;
    try {
      await widget.api.post(
        '/mobile/admin/rooms',
        body: {
          'piso': values[0],
          'habitaciones': values[1],
          'tipo': type,
          'capacidad': _asInt(values[2]).clamp(1, 6),
        },
      );
      _showMessage('Habitaciones guardadas.');
      await _load();
    } on ApiException catch (error) {
      _showMessage(error.message);
    }
  }

  Future<void> _removeFloor(String floor) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Eliminar piso'),
        content: Text('¿Eliminar el piso $floor y todas sus habitaciones?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (approved != true) return;
    try {
      await widget.api.delete('/mobile/admin/rooms/$floor');
      await _load();
    } on ApiException catch (error) {
      _showMessage(error.message);
    }
  }

  Future<void> _editRoom(Map<String, dynamic> room) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (_) => _RoomEditorSheet(api: widget.api, roomId: room['id']),
    );
    if (mounted) await _load();
  }

  void _showMessage(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _rooms.isEmpty) return const LoadingView();
    final active = _rooms.where((room) => _asInt(room['activa']) == 1);
    final spots = active.fold<int>(0, (t, r) => t + _asInt(r['capacidad']));
    final free = active.fold<int>(0, (t, r) => t + _asInt(r['cupos']));
    return RefreshIndicator(
      onRefresh: _load,
      child: PageBody(
        title: 'Pisos',
        subtitle: 'Edita tipo, capacidad y fotos de cada habitación.',
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '$free de $spots lugares disponibles',
                  style: const TextStyle(color: mutedGreen, fontSize: 12),
                ),
              ),
              FilledButton.icon(
                onPressed: _addRooms,
                icon: const Icon(Icons.add),
                label: const Text('Agregar'),
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            InlineError(_error!),
          ],
          const SizedBox(height: 8),
          if (_rooms.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(22),
                child: Center(child: Text('No hay pisos registrados.')),
              ),
            )
          else
            for (final entry in _floors)
              Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 12, 6, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const CircleAvatar(
                            radius: 18,
                            backgroundColor: Color(0xFFEAF6EC),
                            child: Icon(
                              Icons.apartment,
                              color: brandGreen,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Piso ${entry.key}',
                              style: const TextStyle(
                                color: forestGreen,
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                              ),
                            ),
                          ),
                          IconButton(
                            tooltip: 'Agregar habitaciones al piso',
                            onPressed: () => _addRooms(floorNumber: entry.key),
                            icon: const Icon(Icons.add_circle_outline),
                          ),
                          IconButton(
                            tooltip: 'Eliminar piso',
                            onPressed:
                                entry.value.any((r) => _asInt(r['ocupantes']) > 0)
                                ? null
                                : () => _removeFloor(entry.key),
                            icon: const Icon(
                              Icons.delete_outline,
                              color: Color(0xFFA93830),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final room in entry.value)
                            _RoomChip(
                              room: room,
                              onTap: () => _editRoom(room),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Text(
              'I = individual · C = compartida · amarillo = con reservaciones activas. Toca una habitación para editarla.',
              style: TextStyle(color: mutedGreen, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoomChip extends StatelessWidget {
  const _RoomChip({required this.room, required this.onTap});

  final Map<String, dynamic> room;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final occupied = _asInt(room['ocupantes']) > 0;
    final inactive = _asInt(room['activa']) != 1;
    final hasPhotos = _photosOf(room).isNotEmpty;
    return Opacity(
      opacity: inactive ? .5 : 1,
      child: Material(
        color: occupied ? const Color(0xFFFFF3D8) : const Color(0xFFEAF6EC),
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  room['habitacion'].toString(),
                  style: TextStyle(
                    color: occupied ? const Color(0xFF8A5B00) : forestGreen,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  room['tipo'] == 'compartida' ? 'C' : 'I',
                  style: const TextStyle(
                    color: mutedGreen,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (hasPhotos) ...[
                  const SizedBox(width: 4),
                  const Icon(Icons.photo_outlined, size: 12, color: brandGreen),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Hoja inferior para editar una habitación y administrar sus fotos.
class _RoomEditorSheet extends StatefulWidget {
  const _RoomEditorSheet({required this.api, required this.roomId});

  final ApiClient api;
  final Object? roomId;

  @override
  State<_RoomEditorSheet> createState() => _RoomEditorSheetState();
}

class _RoomEditorSheetState extends State<_RoomEditorSheet> {
  Map<String, dynamic>? _room;
  final _capacity = TextEditingController();
  final _description = TextEditingController();
  String _type = 'individual';
  bool _active = true;
  bool _busy = false;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _reload(fillForm: true);
  }

  @override
  void dispose() {
    _capacity.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _reload({bool fillForm = false}) async {
    try {
      final rooms = mapList(
        await widget.api.get('/mobile/admin/rooms/details'),
      );
      final room = rooms.firstWhere(
        (item) => item['id'].toString() == widget.roomId.toString(),
        orElse: () => <String, dynamic>{},
      );
      if (room.isEmpty) {
        if (mounted) Navigator.pop(context);
        return;
      }
      _room = room;
      if (fillForm) {
        _type = room['tipo'].toString();
        _capacity.text = _asInt(room['capacidad']).toString();
        _description.text = (room['descripcion'] ?? '').toString();
        _active = _asInt(room['activa']) == 1;
      }
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() => _run(() async {
    await widget.api.put(
      '/mobile/admin/rooms/${widget.roomId}',
      body: {
        'tipo': _type,
        'capacidad': _asInt(_capacity.text).clamp(1, 6),
        'descripcion': _description.text.trim(),
        'activa': _active,
      },
    );
    if (mounted) Navigator.pop(context);
  });

  Future<void> _addPhoto() async {
    final file = await pickFile();
    if (file == null) return;
    if (file.size > 5 * 1024 * 1024) {
      setState(() => _error = 'La foto pesa más de 5 MB.');
      return;
    }
    await _run(() async {
      await widget.api.postMultipart(
        '/mobile/admin/rooms/${widget.roomId}/photos',
        fileField: 'photo',
        bytes: file.bytes,
        filename: file.name,
      );
      await _reload();
    });
  }

  Future<void> _makeCover(Object? photoId) => _run(() async {
    await widget.api.put('/mobile/admin/rooms/photos/$photoId/cover');
    await _reload();
  });

  Future<void> _removePhoto(Object? photoId) async {
    final approved = await _confirm(
      'Quitar foto',
      'La foto dejará de mostrarse en la residencia y en la habitación.',
      'Quitar',
    );
    if (approved != true) return;
    await _run(() async {
      await widget.api.delete('/mobile/admin/rooms/photos/$photoId');
      await _reload();
    });
  }

  Future<void> _removeRoom() async {
    final approved = await _confirm(
      'Eliminar habitación',
      '¿Eliminar la habitación ${_room?['habitacion']} con sus fotos? No se puede deshacer.',
      'Eliminar',
    );
    if (approved != true) return;
    await _run(() async {
      await widget.api.delete('/mobile/admin/rooms/item/${widget.roomId}');
      if (mounted) Navigator.pop(context);
    });
  }

  Future<bool?> _confirm(String title, String body, String action) =>
      showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: Text(action),
            ),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final room = _room;
    if (_loading || room == null) {
      return const SizedBox(height: 240, child: LoadingView());
    }
    final occupants = _asInt(room['ocupantes']);
    final hasOccupants = occupants > 0;
    final photos = _photosOf(room);
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'PISO ${room['piso']}',
              style: const TextStyle(
                color: Color(0xFF4C7A5F),
                fontSize: 9,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.1,
              ),
            ),
            Text(
              'Habitación ${room['habitacion']}',
              style: const TextStyle(
                color: forestGreen,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              hasOccupants
                  ? '$occupants reservación(es) activa(s).'
                  : 'Sin reservaciones activas.',
              style: const TextStyle(color: mutedGreen, fontSize: 12),
            ),
            const SizedBox(height: 14),
            if (_error != null) ...[InlineError(_error!), const SizedBox(height: 10)],
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Tipo'),
              items: const [
                DropdownMenuItem(value: 'individual', child: Text('Individual')),
                DropdownMenuItem(value: 'compartida', child: Text('Compartida')),
              ],
              onChanged: hasOccupants
                  ? null
                  : (value) => setState(() {
                      _type = value ?? 'individual';
                      _capacity.text = _type == 'compartida' ? '2' : '1';
                    }),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _capacity,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Capacidad (personas)',
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _description,
              maxLines: 2,
              maxLength: 255,
              decoration: const InputDecoration(
                labelText: 'Descripción (opcional)',
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _active,
              onChanged: hasOccupants && _active
                  ? null
                  : (value) => setState(() => _active = value),
              title: const Text('Visible para reservar'),
            ),
            if (hasOccupants)
              const Text(
                'Con reservaciones activas no se puede cambiar el tipo, desactivar ni eliminar la habitación.',
                style: TextStyle(color: mutedGreen, fontSize: 11),
              ),
            const SizedBox(height: 12),
            Text(
              'FOTOS (${photos.length}/8)',
              style: const TextStyle(
                color: mutedGreen,
                fontSize: 10,
                fontWeight: FontWeight.w700,
                letterSpacing: .8,
              ),
            ),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              children: [
                for (var i = 0; i < photos.length; i++)
                  Stack(
                    fit: StackFit.expand,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.network(
                          photos[i]['url'].toString(),
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stack) =>
                              const ColoredBox(color: Color(0xFFE8EDE6)),
                        ),
                      ),
                      if (i == 0)
                        const Positioned(
                          left: 4,
                          top: 4,
                          child: _PhotoBadge('PORTADA'),
                        ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: PopupMenuButton<String>(
                          enabled: !_busy,
                          icon: const CircleAvatar(
                            radius: 13,
                            backgroundColor: Colors.white,
                            child: Icon(Icons.more_horiz, size: 16),
                          ),
                          onSelected: (value) => value == 'cover'
                              ? _makeCover(photos[i]['id'])
                              : _removePhoto(photos[i]['id']),
                          itemBuilder: (context) => [
                            if (i != 0)
                              const PopupMenuItem(
                                value: 'cover',
                                child: Text('Usar de portada'),
                              ),
                            const PopupMenuItem(
                              value: 'delete',
                              child: Text('Quitar foto'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                if (photos.length < 8)
                  OutlinedButton(
                    onPressed: _busy ? null : _addPhoto,
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo_outlined),
                        SizedBox(height: 4),
                        Text('Subir', style: TextStyle(fontSize: 11)),
                      ],
                    ),
                  ),
              ],
            ),
            if (photos.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  'Sin fotos: los estudiantes verán una imagen genérica. JPG, PNG o WebP, máx. 5 MB.',
                  style: TextStyle(color: mutedGreen, fontSize: 11),
                ),
              ),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: _busy ? null : _save,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
              child: Text(_busy ? 'Guardando...' : 'Guardar cambios'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _busy || hasOccupants ? null : _removeRoom,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFA93830),
                minimumSize: const Size.fromHeight(46),
              ),
              child: const Text('Eliminar habitación'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PhotoBadge extends StatelessWidget {
  const _PhotoBadge(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: brandGreen,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 8,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({required this.api, super.key});

  final ApiClient api;

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _individual = TextEditingController();
  final _shared = TextEditingController();
  final _email = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _individual.dispose();
    _shared.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await widget.api.get('/mobile/admin/settings');
      if (result is Map<String, dynamic>) {
        _individual.text = result['precioIndividual']?.toString() ?? '';
        _shared.text = result['precioCompartida']?.toString() ?? '';
        _email.text = result['emailAdmin']?.toString() ?? '';
      }
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await widget.api.put(
        '/mobile/admin/settings',
        body: {
          'precioIndividual': double.parse(_individual.text),
          'precioCompartida': double.parse(_shared.text),
          'emailAdmin': _email.text.trim(),
        },
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Configuración actualizada.')),
        );
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _positiveNumber(String? value) {
    final number = double.tryParse(value ?? '');
    return number == null || number <= 0 ? 'Ingresa un monto válido.' : null;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingView();
    return PageBody(
      title: 'Configuración',
      subtitle: 'Actualiza los precios y el correo administrativo.',
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _individual,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Precio individual (MXN)',
                    ),
                    validator: _positiveNumber,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _shared,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Precio compartido (MXN)',
                    ),
                    validator: _positiveNumber,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Correo administrativo',
                    ),
                    validator: (value) =>
                        value == null ||
                            !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                                .hasMatch(value.trim())
                        ? 'Escribe un correo válido.'
                        : null,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    InlineError(_error!),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? 'Guardando...' : 'Guardar cambios'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class AdminReportsScreen extends StatefulWidget {
  const AdminReportsScreen({required this.api, super.key});

  final ApiClient api;

  @override
  State<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends State<AdminReportsScreen> {
  Map<String, dynamic> _stats = {};
  List<Map<String, dynamic>> _monthly = [];
  List<Map<String, dynamic>> _byStatus = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await widget.api.get('/mobile/admin/dashboard-stats');
      if (result is Map<String, dynamic>) {
        _stats = Map<String, dynamic>.from(result['summary'] as Map? ?? {});
        _monthly = mapList(result['monthlyRevenue']);
        _byStatus = mapList(result['reservationsByStatus']);
      }
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingView();
    final maxRevenue = _monthly.fold<double>(
      0,
      (max, item) =>
          (double.tryParse(item['total']?.toString() ?? '') ?? 0) > max
          ? (double.tryParse(item['total']?.toString() ?? '') ?? 0)
          : max,
    );
    return RefreshIndicator(
      onRefresh: _load,
      child: PageBody(
        title: 'Reportes',
        subtitle: 'Resumen actualizado de la operación residencial.',
        children: [
          if (_error != null) InlineError(_error!),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.4,
            children: [
              StatTile(
                icon: Icons.meeting_room_outlined,
                value: '${_stats['totalReservations'] ?? 0}',
                label: 'Reservaciones',
              ),
              StatTile(
                icon: Icons.schedule,
                value: '${_stats['pendingReservations'] ?? 0}',
                label: 'Pendientes',
              ),
              StatTile(
                icon: Icons.check_circle_outline,
                value: '${_stats['acceptedReservations'] ?? 0}',
                label: 'Aceptadas',
              ),
              StatTile(
                icon: Icons.payments_outlined,
                value: displayMoney(_stats['totalAmount']),
                label: 'Ingresos registrados',
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            'Ingresos mensuales',
            style: TextStyle(color: forestGreen, fontWeight: FontWeight.w700),
          ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  for (final item in _monthly)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 58,
                            child: Text(
                              (item['month'] ?? '').toString().split(' ').first,
                              style: const TextStyle(fontSize: 11),
                            ),
                          ),
                          Expanded(
                            child: LinearProgressIndicator(
                              value: maxRevenue == 0
                                  ? 0
                                  : (double.tryParse(
                                              item['total']?.toString() ?? '',
                                            ) ??
                                            0) /
                                        maxRevenue,
                              minHeight: 8,
                              borderRadius: BorderRadius.circular(9),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            displayMoney(item['total']),
                            style: const TextStyle(fontSize: 10),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'Reservaciones por estado',
            style: TextStyle(color: forestGreen, fontWeight: FontWeight.w700),
          ),
          for (final item in _byStatus)
            Card(
              child: ListTile(
                dense: true,
                title: Text((item['name'] ?? '').toString()),
                trailing: Text(
                  (item['value'] ?? 0).toString(),
                  style: const TextStyle(
                    color: forestGreen,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(
          color: mutedGreen,
          fontSize: 9,
          fontWeight: FontWeight.w700,
          letterSpacing: .5,
        ),
      ),
      const SizedBox(height: 3),
      Text(
        value,
        style: const TextStyle(
          color: forestGreen,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    ],
  );
}

String _initials(String value) => value
    .split(' ')
    .where((part) => part.isNotEmpty)
    .take(2)
    .map((part) => part[0].toUpperCase())
    .join();
