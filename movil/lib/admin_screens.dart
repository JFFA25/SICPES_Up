import 'package:flutter/material.dart';

import 'api_client.dart';
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
      final response = await widget.api.get('/mobile/rooms');
      final floors = mapList(
        response is Map<String, dynamic> ? response['lista'] : null,
      );
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
            final floor = floors.firstWhere(
              (item) => item['piso'].toString() == selectedFloor,
            );
            final roomNames = (floor['habitaciones'] ?? '')
                .toString()
                .split(',')
                .map((room) => room.trim())
                .where((room) => room.isNotEmpty)
                .where(
                  (room) => !_reservations.any(
                    (item) =>
                        item['id'] != reservation['id'] &&
                        item['estado'] == 'aceptada' &&
                        item['piso'].toString() == selectedFloor &&
                        item['habitacion'].toString() == room,
                  ),
                )
                .toList();
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
                        for (final room in roomNames)
                          DropdownMenuItem(
                            value: room,
                            child: Text('Habitación $room'),
                          ),
                      ],
                      onChanged: (value) =>
                          setDialogState(() => selectedRoom = value ?? ''),
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

class _AdminFloorsScreenState extends State<AdminFloorsScreen> {
  List<Map<String, dynamic>> _floors = [];
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
      final result = await widget.api.get('/mobile/rooms');
      _floors = mapList(
        result is Map<String, dynamic> ? result['lista'] : result,
      );
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addFloor() async {
    final floor = TextEditingController();
    final rooms = TextEditingController();
    final values = await showDialog<List<String>>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Agregar habitaciones'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: floor,
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
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, [
              floor.text.trim(),
              rooms.text.trim(),
            ]),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    floor.dispose();
    rooms.dispose();
    if (values == null || values.any((value) => value.isEmpty)) return;
    try {
      await widget.api.post(
        '/mobile/admin/rooms',
        body: {'piso': values[0], 'habitaciones': values[1]},
      );
      await _load();
    } on ApiException catch (error) {
      _showMessage(error.message);
    }
  }

  Future<void> _removeFloor(Map<String, dynamic> floor) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Eliminar piso'),
        content: Text('¿Eliminar el piso ${floor['piso']} y sus habitaciones?'),
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
      await widget.api.delete('/mobile/admin/rooms/${floor['piso']}');
      await _load();
    } on ApiException catch (error) {
      _showMessage(error.message);
    }
  }

  void _showMessage(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _floors.isEmpty) return const LoadingView();
    return RefreshIndicator(
      onRefresh: _load,
      child: PageBody(
        title: 'Pisos',
        subtitle: 'Administra habitaciones disponibles en la residencia.',
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: _addFloor,
              icon: const Icon(Icons.add),
              label: const Text('Agregar habitaciones'),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            InlineError(_error!),
          ],
          const SizedBox(height: 8),
          if (_floors.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(22),
                child: Center(child: Text('No hay pisos registrados.')),
              ),
            )
          else
            for (final floor in _floors)
              Card(
                margin: const EdgeInsets.only(bottom: 9),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFEAF6EC),
                    child: Icon(Icons.apartment, color: brandGreen),
                  ),
                  title: Text('Piso ${floor['piso']}'),
                  subtitle: Text((floor['habitaciones'] ?? '').toString()),
                  trailing: IconButton(
                    tooltip: 'Eliminar piso',
                    onPressed: () => _removeFloor(floor),
                    icon: const Icon(
                      Icons.delete_outline,
                      color: Color(0xFFA93830),
                    ),
                  ),
                ),
              ),
        ],
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
