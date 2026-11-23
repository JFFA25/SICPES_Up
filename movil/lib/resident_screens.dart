import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'api_client.dart';
import 'file_picker_helper.dart';
import 'logout_flow.dart';
import 'request_status_screen.dart';
import 'room_detail_screen.dart';
import 'sicpes_widgets.dart';

class ResidentDashboardScreen extends StatefulWidget {
  const ResidentDashboardScreen({
    required this.api,
    required this.user,
    super.key,
  });

  final ApiClient api;
  final Map<String, dynamic> user;

  @override
  State<ResidentDashboardScreen> createState() =>
      _ResidentDashboardScreenState();
}

class _ResidentDashboardScreenState extends State<ResidentDashboardScreen> {
  Map<String, dynamic>? _reservation;
  List<Map<String, dynamic>> _payments = [];
  List<Map<String, dynamic>> _notices = [];
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
      final values = await Future.wait([
        widget.api.get('/mobile/reservation'),
        widget.api.get('/mobile/payments'),
        widget.api.get('/mobile/notifications'),
      ]);
      if (values[0] is Map<String, dynamic>) {
        _reservation = Map<String, dynamic>.from(values[0] as Map);
      } else {
        _reservation = null;
      }
      _payments = mapList(values[1]);
      final notices = values[2];
      _notices = mapList(
        notices is Map<String, dynamic> ? notices['items'] : null,
      ).take(3).toList();
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final reservation = _reservation;
    final state = (reservation?['estado'] ?? '').toString().toLowerCase();
    final firstName = (widget.user['nombre'] ?? 'Usuario')
        .toString()
        .split(' ')
        .first;
    final month = DateTime.now().month;
    final year = DateTime.now().year;
    final thisPayment = _payments.cast<Map<String, dynamic>?>().firstWhere(
      (payment) =>
          int.tryParse(payment?['mes']?.toString() ?? '') == month &&
          int.tryParse(payment?['anio']?.toString() ?? '') == year,
      orElse: () => null,
    );

    if (_loading && reservation == null) return const LoadingView();
    return RefreshIndicator(
      onRefresh: _load,
      child: PageBody(
        title: 'Hola, $firstName',
        subtitle:
            'Este es el resumen de tu residencia y tus próximos movimientos.',
        children: [
          if (_error != null) InlineError(_error!),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.45,
            children: [
              StatTile(
                icon: Icons.bed_outlined,
                value: reservation?['habitacion']?.toString() ?? '—',
                label: 'Habitación',
              ),
              StatTile(
                icon: Icons.apartment_outlined,
                value: reservation?['piso']?.toString() ?? '—',
                label: 'Piso',
              ),
              StatTile(
                icon: Icons.home_outlined,
                value: _capitalize(reservation?['tipo']?.toString()),
                label: 'Tipo',
              ),
              StatTile(
                icon: Icons.payments_outlined,
                value: state == 'aceptada'
                    ? displayMoney(reservation?['monto'])
                    : '—',
                label: 'Mensualidad',
              ),
            ],
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(15),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Tu reservación',
                          style: TextStyle(
                            color: forestGreen,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (reservation != null) StatusBadge(state),
                    ],
                  ),
                  const SizedBox(height: 9),
                  Text(
                    reservation == null
                        ? 'Aún no tienes una reservación.'
                        : 'Residencia SICPES · Habitación ${reservation['habitacion'] ?? 'por asignar'}',
                    style: const TextStyle(color: mutedGreen),
                  ),
                  if (reservation != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${_capitalize(reservation['tipo']?.toString())} · Piso ${reservation['piso'] ?? '—'} · Ingreso ${displayDate(reservation['fecha_ingreso'])}',
                      style: const TextStyle(color: mutedGreen, fontSize: 12),
                    ),
                    if ((reservation['motivo_rechazo'] ?? '')
                            .toString()
                            .isNotEmpty &&
                        (state == 'rechazada' || state == 'cancelada'))
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Motivo: ${reservation['motivo_rechazo']}',
                          style: const TextStyle(color: Color(0xFFA93830)),
                        ),
                      ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonal(
                        onPressed: () async {
                          await Navigator.of(context).push<void>(
                            MaterialPageRoute(
                              builder: (_) => RequestStatusScreen(
                                api: widget.api,
                                initialReservation: reservation,
                              ),
                            ),
                          );
                          if (mounted) _load();
                        },
                        child: const Text('Ver estado de mi petición'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFEAF6EC),
                child: Icon(Icons.credit_card, color: brandGreen),
              ),
              title: const Text('Estado del pago del mes'),
              subtitle: Text(
                thisPayment == null
                    ? 'Sin solicitud registrada'
                    : displayPeriod(thisPayment['mes'], thisPayment['anio']),
              ),
              trailing: StatusBadge(
                (thisPayment?['estado'] ?? 'Por realizar').toString(),
              ),
            ),
          ),
          if (_notices.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'Avisos recientes',
              style: TextStyle(color: forestGreen, fontWeight: FontWeight.w700),
            ),
            for (final notice in _notices)
              Card(
                child: ListTile(
                  leading: const Icon(
                    Icons.notifications_none,
                    color: brandGreen,
                  ),
                  title: Text((notice['titulo'] ?? '').toString()),
                  subtitle: Text((notice['cuerpo'] ?? '').toString()),
                  isThreeLine: true,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class ResidentReservationScreen extends StatefulWidget {
  const ResidentReservationScreen({required this.api, super.key});

  final ApiClient api;

  @override
  State<ResidentReservationScreen> createState() =>
      _ResidentReservationScreenState();
}

class _ResidentReservationScreenState extends State<ResidentReservationScreen> {
  List<Map<String, dynamic>> _floors = [];
  Map<String, dynamic>? _reservation;
  DateTime _date = DateTime.now();
  String? _floor;
  String? _room;
  String _type = '';
  List<String> _occupied = [];
  int _individualPrice = 2500;
  int _sharedPrice = 1800;
  String? _error;
  bool _loading = true;
  bool _saving = false;

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
      final result = await Future.wait([
        widget.api.get('/mobile/rooms'),
        widget.api.get('/mobile/reservation'),
        widget.api.get('/mobile/settings'),
      ]);
      final roomResponse = result[0];
      _floors = mapList(
        roomResponse is Map<String, dynamic>
            ? roomResponse['lista']
            : roomResponse,
      );
      if (result[1] is Map<String, dynamic>) {
        _reservation = Map<String, dynamic>.from(result[1] as Map);
      } else {
        _reservation = null;
      }
      final settings = result[2];
      if (settings is Map<String, dynamic>) {
        _individualPrice =
            int.tryParse(settings['precioIndividual'].toString()) ?? 2500;
        _sharedPrice =
            int.tryParse(settings['precioCompartida'].toString()) ?? 1800;
      }
      if (_floors.isNotEmpty &&
          !_floors.any((item) => item['piso'].toString() == _floor)) {
        _floor = _floors.first['piso'].toString();
        await _loadOccupied();
      }
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<String> get _rooms {
    final floor = _floors.where((item) => item['piso'].toString() == _floor);
    if (floor.isEmpty) return const [];
    return (floor.first['habitaciones'] ?? '')
        .toString()
        .split(',')
        .map((room) => room.trim())
        .where((room) => room.isNotEmpty && !_occupied.contains(room))
        .toList();
  }

  bool get _hasActiveReservation {
    final status = (_reservation?['estado'] ?? '').toString().toLowerCase();
    return _reservation != null &&
        !{'finalizada', 'cancelada', 'rechazada'}.contains(status);
  }

  Future<void> _loadOccupied() async {
    if (_floor == null) return;
    try {
      final result = await widget.api.get(
        '/mobile/reservation/occupied?piso=${Uri.encodeQueryComponent(_floor!)}',
      );
      _occupied = result is List
          ? result.map((room) => room.toString()).toList()
          : [];
      if (_room != null && _occupied.contains(_room)) _room = null;
    } on ApiException catch (error) {
      _error = error.message;
    }
  }

  Future<void> _chooseDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date.isBefore(DateTime.now()) ? DateTime.now() : _date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      locale: const Locale('es', 'MX'),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submit() async {
    if (_hasActiveReservation) {
      _showMessage('Ya tienes una reservación registrada.');
      return;
    }
    if (_type.isEmpty || _floor == null || _room == null) {
      _showMessage('Completa todos los datos de la reservación.');
      return;
    }
    final amount = _type == 'individual' ? _individualPrice : _sharedPrice;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await widget.api.post(
        '/mobile/reservation',
        body: {
          'fecha_ingreso': DateFormat('yyyy-MM-dd').format(_date),
          'tipo': _type,
          'piso': _floor,
          'habitacion': _room,
          'monto': amount,
        },
      );
      await _load();
      _showMessage('Reservación enviada para revisión.');
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _openDetail() async {
    final price = _type == 'individual' ? _individualPrice : _sharedPrice;
    final request = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RoomDetailScreen(
          type: _type,
          floor: _floor ?? '',
          room: _room ?? '',
          price: price,
        ),
      ),
    );
    if (request == true && mounted) await _submit();
  }

  void _showMessage(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingView();
    final amount = _type == 'individual'
        ? _individualPrice
        : _type == 'compartida'
        ? _sharedPrice
        : null;

    return RefreshIndicator(
      onRefresh: _load,
      child: PageBody(
        title: _hasActiveReservation
            ? 'Tu reservación'
            : 'Reserva tu habitación',
        subtitle: _hasActiveReservation
            ? 'Consulta el estado de tu solicitud.'
            : 'Elige el espacio que mejor se adapte a ti.',
        children: [
          if (_error != null) InlineError(_error!),
          if (_hasActiveReservation)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    StatusBadge((_reservation?['estado'] ?? '').toString()),
                    const SizedBox(height: 12),
                    Text(
                      '${_capitalize(_reservation?['tipo']?.toString())} · Piso ${_reservation?['piso'] ?? '—'} · Habitación ${_reservation?['habitacion'] ?? 'por asignar'}',
                      style: const TextStyle(
                        color: forestGreen,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Fecha de ingreso: ${displayDate(_reservation?['fecha_ingreso'])}',
                    ),
                    if ((_reservation?['motivo_rechazo'] ?? '')
                        .toString()
                        .isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Motivo: ${_reservation?['motivo_rechazo']}',
                          style: const TextStyle(color: Color(0xFFA93830)),
                        ),
                      ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonal(
                        onPressed: () async {
                          await Navigator.of(context).push<void>(
                            MaterialPageRoute(
                              builder: (_) => RequestStatusScreen(
                                api: widget.api,
                                initialReservation: _reservation,
                              ),
                            ),
                          );
                          if (mounted) _load();
                        },
                        child: const Text('Ver estado de mi petición'),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _chooseDate,
                      icon: const Icon(Icons.calendar_today_outlined),
                      label: Text(
                        'Ingreso · ${DateFormat('dd/MM/yyyy').format(_date)}',
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'TIPO DE HABITACIÓN',
                      style: TextStyle(
                        color: mutedGreen,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: .7,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        ChoiceChip(
                          label: Text(
                            'Individual · ${displayMoney(_individualPrice)}',
                          ),
                          selected: _type == 'individual',
                          onSelected: (_) =>
                              setState(() => _type = 'individual'),
                        ),
                        ChoiceChip(
                          label: Text(
                            'Compartida · ${displayMoney(_sharedPrice)}',
                          ),
                          selected: _type == 'compartida',
                          onSelected: (_) =>
                              setState(() => _type = 'compartida'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _floor,
                      decoration: const InputDecoration(labelText: 'Piso'),
                      items: [
                        for (final floor in _floors)
                          DropdownMenuItem(
                            value: floor['piso'].toString(),
                            child: Text('Piso ${floor['piso']}'),
                          ),
                      ],
                      onChanged: (value) async {
                        setState(() {
                          _floor = value;
                          _room = null;
                        });
                        await _loadOccupied();
                        if (mounted) setState(() {});
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _rooms.contains(_room) ? _room : null,
                      decoration: const InputDecoration(
                        labelText: 'Habitación',
                      ),
                      items: [
                        for (final room in _rooms)
                          DropdownMenuItem(
                            value: room,
                            child: Text('Habitación $room'),
                          ),
                      ],
                      onChanged: (value) => setState(() => _room = value),
                    ),
                    if (_floor != null && _rooms.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text(
                          'No hay habitaciones disponibles en este piso.',
                          style: TextStyle(color: mutedGreen, fontSize: 12),
                        ),
                      ),
                    const SizedBox(height: 16),
                    if (amount != null)
                      Text(
                        'Renta mensual · ${displayMoney(amount)}',
                        style: const TextStyle(
                          color: forestGreen,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    const SizedBox(height: 12),
                    if (_type.isNotEmpty && _room != null) ...[
                      OutlinedButton.icon(
                        onPressed: _openDetail,
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text('Ver detalle de la habitación'),
                      ),
                      const SizedBox(height: 8),
                    ],
                    FilledButton(
                      onPressed: _saving ? null : _submit,
                      child: Text(
                        _saving ? 'Enviando...' : 'Solicitar reservación',
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

class ResidentPaymentsScreen extends StatefulWidget {
  const ResidentPaymentsScreen({required this.api, super.key});

  final ApiClient api;

  @override
  State<ResidentPaymentsScreen> createState() => _ResidentPaymentsScreenState();
}

class _ResidentPaymentsScreenState extends State<ResidentPaymentsScreen> {
  Map<String, dynamic>? _reservation;
  List<Map<String, dynamic>> _payments = [];
  int _priceIndividual = 2500;
  int _priceShared = 1800;
  bool _loading = true;
  bool _submitting = false;
  PickedFile? _receipt;
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
      final values = await Future.wait([
        widget.api.get('/mobile/reservation'),
        widget.api.get('/mobile/payments'),
        widget.api.get('/mobile/settings'),
      ]);
      if (values[0] is Map<String, dynamic>) {
        _reservation = Map<String, dynamic>.from(values[0] as Map);
      } else {
        _reservation = null;
      }
      _payments = mapList(values[1]);
      if (values[2] is Map<String, dynamic>) {
        _priceIndividual =
            int.tryParse(values[2]['precioIndividual'].toString()) ?? 2500;
        _priceShared =
            int.tryParse(values[2]['precioCompartida'].toString()) ?? 1800;
      }
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _targetMonth {
    final now = DateTime.now();
    final current = _payments.firstWhere(
      (payment) =>
          int.tryParse(payment['mes']?.toString() ?? '') == now.month &&
          int.tryParse(payment['anio']?.toString() ?? '') == now.year,
      orElse: () => <String, dynamic>{},
    );
    if ((current['estado'] ?? '').toString().toLowerCase() == 'pagado') {
      return now.month == 12 ? 1 : now.month + 1;
    }
    return now.month;
  }

  int get _targetYear {
    final now = DateTime.now();
    final current = _payments.firstWhere(
      (payment) =>
          int.tryParse(payment['mes']?.toString() ?? '') == now.month &&
          int.tryParse(payment['anio']?.toString() ?? '') == now.year,
      orElse: () => <String, dynamic>{},
    );
    return now.month == 12 &&
            (current['estado'] ?? '').toString().toLowerCase() == 'pagado'
        ? now.year + 1
        : now.year;
  }

  Map<String, dynamic>? get _currentPayment {
    for (final payment in _payments) {
      if (int.tryParse(payment['mes']?.toString() ?? '') == _targetMonth &&
          int.tryParse(payment['anio']?.toString() ?? '') == _targetYear) {
        return payment;
      }
    }
    return null;
  }

  double get _amount {
    final assigned = double.tryParse(_reservation?['monto']?.toString() ?? '');
    if (assigned != null && assigned > 0) return assigned;
    return _reservation?['tipo'] == 'individual'
        ? _priceIndividual.toDouble()
        : _priceShared.toDouble();
  }

  static const _receiptExtensions = ['png', 'jpg', 'jpeg', 'webp', 'pdf'];
  static const _maxReceiptBytes = 5 * 1024 * 1024;

  Future<void> _pickReceipt() async {
    try {
      final file = await pickFile(extensions: _receiptExtensions);
      if (file == null) return;
      if (file.size > _maxReceiptBytes) {
        setState(() => _error = 'El comprobante debe pesar 5 MB o menos.');
        return;
      }
      setState(() {
        _receipt = file;
        _error = null;
      });
    } catch (_) {
      setState(() => _error = 'No se pudo abrir el selector de archivos.');
    }
  }

  void _showReceipt(String url) {
    final isPdf = url.toLowerCase().contains('.pdf');
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Comprobante'),
        content: isPdf
            ? SelectableText('Comprobante en PDF:\n$url')
            : Image.network(
                url,
                errorBuilder: (_, _, _) =>
                    const Text('No se pudo cargar la imagen.'),
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

  Future<void> _requestPayment() async {
    final reservation = _reservation;
    final receipt = _receipt;
    if (reservation == null) return;
    if (receipt == null) {
      setState(() => _error = 'Sube tu comprobante de pago para continuar.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await widget.api.postMultipart(
        '/mobile/payments/request',
        fileField: 'comprobante',
        bytes: receipt.bytes,
        filename: receipt.name,
        fields: {
          'reservacion_id': reservation['id'].toString(),
          'monto': _amount.toString(),
          'fecha_pago':
              '$_targetYear-${_targetMonth.toString().padLeft(2, '0')}-01',
          'mes': _targetMonth.toString(),
          'anio': _targetYear.toString(),
        },
      );
      _receipt = null;
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Solicitud de pago enviada.')),
        );
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingView();
    final active = _reservation?['estado'] == 'aceptada';
    final payment = _currentPayment;
    final status = (payment?['estado'] ?? 'Por realizar').toString();
    final paid = _payments
        .where((item) => item['estado'].toString().toLowerCase() == 'pagado')
        .fold<double>(
          0,
          (sum, item) =>
              sum + (double.tryParse(item['monto']?.toString() ?? '') ?? 0),
        );
    final history = [..._payments]
      ..sort((first, second) {
        final yearDiff = (int.tryParse(second['anio']?.toString() ?? '') ?? 0)
            .compareTo(int.tryParse(first['anio']?.toString() ?? '') ?? 0);
        return yearDiff != 0
            ? yearDiff
            : (int.tryParse(second['mes']?.toString() ?? '') ?? 0).compareTo(
                int.tryParse(first['mes']?.toString() ?? '') ?? 0,
              );
      });

    return RefreshIndicator(
      onRefresh: _load,
      child: PageBody(
        title: 'Gestión de pagos',
        subtitle: 'Consulta tus cuotas y el historial de pagos.',
        children: [
          if (_error != null) InlineError(_error!),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.4,
            children: [
              StatTile(
                icon: Icons.payments_outlined,
                value: active ? displayMoney(_amount) : '—',
                label: 'Próximo pago',
              ),
              StatTile(
                icon: Icons.check_circle_outline,
                value: displayMoney(paid),
                label: 'Pagado',
              ),
            ],
          ),
          const SizedBox(height: 10),
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
                          'Tu próximo pago',
                          style: TextStyle(
                            color: forestGreen,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (active) StatusBadge(status),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (active) ...[
                    Text(
                      displayMoney(_amount),
                      style: const TextStyle(
                        color: forestGreen,
                        fontSize: 25,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      '${displayPeriod(_targetMonth, _targetYear)} · vence el día 1',
                      style: const TextStyle(color: mutedGreen),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed:
                            _submitting ||
                                _receipt == null ||
                                (payment != null &&
                                    payment['estado']
                                            .toString()
                                            .toLowerCase() !=
                                        'atrasado')
                            ? null
                            : _requestPayment,
                        child: Text(
                          _submitting
                              ? 'Enviando...'
                              : status.toLowerCase() == 'pendiente'
                              ? 'Pago solicitado'
                              : status.toLowerCase() == 'pagado'
                              ? 'Pago completo'
                              : status.toLowerCase() == 'atrasado'
                              ? 'Reenviar pago'
                              : 'Solicitar pago',
                        ),
                      ),
                    ),
                  ] else
                    const Text(
                      'No tienes estancias activas asociadas a cobros pendientes.',
                      style: TextStyle(color: mutedGreen),
                    ),
                ],
              ),
            ),
          ),
          if (active &&
              (payment == null || status.toLowerCase() == 'atrasado')) ...[
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Subir comprobante',
                      style: TextStyle(
                        color: forestGreen,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    InkWell(
                      onTap: _submitting ? null : _pickReceipt,
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          vertical: 22,
                          horizontal: 12,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCFBF6),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: _receipt == null
                                ? const Color(0xFFDDD9CB)
                                : brandGreen,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              _receipt == null
                                  ? Icons.upload_outlined
                                  : Icons.check_circle_outline,
                              color: brandGreen,
                              size: 28,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _receipt == null
                                  ? 'Selecciona un archivo'
                                  : _receipt!.name,
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: forestGreen,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              _receipt == null
                                  ? 'PNG, JPG o PDF · máx. 5 MB'
                                  : '${_receipt!.sizeLabel} · toca para cambiar',
                              style: const TextStyle(
                                color: mutedGreen,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_receipt != null)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _submitting
                              ? null
                              : () => setState(() => _receipt = null),
                          child: const Text('Quitar archivo'),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 16),
          const Text(
            'Historial de pagos',
            style: TextStyle(color: forestGreen, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 5),
          if (history.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Center(child: Text('No hay pagos anteriores.')),
              ),
            )
          else
            for (final item in history)
              Card(
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFEAF6EC),
                    child: Icon(Icons.credit_card, color: brandGreen),
                  ),
                  title: Text(
                    displayMoney(item['monto'] ?? item['monto_pagado']),
                  ),
                  subtitle: Text(displayPeriod(item['mes'], item['anio'])),
                  onTap: (item['comprobante_url'] ?? '').toString().isEmpty
                      ? null
                      : () => _showReceipt(item['comprobante_url'].toString()),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if ((item['comprobante_url'] ?? '').toString().isNotEmpty)
                        const Padding(
                          padding: EdgeInsets.only(right: 6),
                          child: Icon(
                            Icons.attach_file,
                            size: 16,
                            color: mutedGreen,
                          ),
                        ),
                      StatusBadge((item['estado'] ?? '').toString()),
                    ],
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class ResidentAccountScreen extends StatefulWidget {
  const ResidentAccountScreen({
    required this.api,
    required this.user,
    required this.onOpenSection,
    required this.onLogout,
    super.key,
  });

  final ApiClient api;
  final Map<String, dynamic> user;

  /// Cambia la pestaña del menú inferior (1 = Reservar, 2 = Pagos).
  final ValueChanged<int> onOpenSection;
  final Future<void> Function() onLogout;

  @override
  State<ResidentAccountScreen> createState() => _ResidentAccountScreenState();
}

class _ResidentAccountScreenState extends State<ResidentAccountScreen> {
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _reservation;
  String _supportEmail = '';
  Map<String, dynamic> _settings = {};
  bool _loading = true;
  bool _uploadingAvatar = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _changePhoto() async {
    PickedFile? file;
    try {
      file = await pickFile();
    } catch (_) {
      setState(() => _error = 'No se pudo abrir el selector de imágenes.');
      return;
    }
    if (file == null) return;
    if (file.size > 3 * 1024 * 1024) {
      setState(() => _error = 'La imagen debe pesar 3 MB o menos.');
      return;
    }
    setState(() {
      _uploadingAvatar = true;
      _error = null;
    });
    try {
      final result = await widget.api.postMultipart(
        '/mobile/profile/avatar',
        fileField: 'avatar',
        bytes: file.bytes,
        filename: file.name,
      );
      if (result is Map<String, dynamic> && result['user'] is Map) {
        _profile = Map<String, dynamic>.from(result['user'] as Map);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Foto de perfil actualizada.')),
        );
      }
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final values = await Future.wait([
        widget.api.get('/mobile/profile'),
        widget.api.get('/mobile/reservation'),
      ]);
      final profileResponse = values[0];
      _profile = profileResponse is Map<String, dynamic>
          ? Map<String, dynamic>.from(profileResponse['user'] as Map? ?? {})
          : null;
      _reservation = values[1] is Map<String, dynamic>
          ? Map<String, dynamic>.from(values[1] as Map)
          : null;
      try {
        final settings = await widget.api.get('/mobile/settings');
        if (settings is Map<String, dynamic>) {
          _settings = settings;
          _supportEmail = (settings['emailAdmin'] ?? '').toString();
        }
      } on ApiException {
        // el correo de soporte es opcional
      }
    } on ApiException catch (error) {
      _error = error.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openSupport() {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Soporte SICPES'),
        content: Text(
          _supportEmail.isEmpty
              ? 'Contacta al equipo administrativo para recibir ayuda.'
              : 'Escribe al equipo administrativo: $_supportEmail',
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

  int? get _rent {
    final type = _reservation?['tipo']?.toString();
    if (type == null) return null;
    final key = type == 'compartida' ? 'precioCompartida' : 'precioIndividual';
    return double.tryParse(_settings[key]?.toString() ?? '')?.round();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const LoadingView();
    final name = (_profile?['nombre'] ?? widget.user['nombre'] ?? 'Usuario')
        .toString();
    final email = (_profile?['email'] ?? widget.user['email'] ?? '').toString();
    final phone = (_profile?['telefono'] ?? '').toString();
    final image = (_profile?['foto_perfil_url'] ?? '').toString();
    final hasImage = image.startsWith('http');
    final room = (_reservation?['habitacion'] ?? '').toString();
    final floor = (_reservation?['piso'] ?? '').toString();
    final state = _reservation?['estado']?.toString();
    final entry = _reservation?['fecha_ingreso'];
    final rent = _rent;

    final chipLabel = state == null
        ? 'SIN RESERVACIÓN'
        : state == 'aceptada'
        ? 'RESIDENTE ACTIVO'
        : state.toUpperCase();
    final chipActive = state == 'aceptada';

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          // Banda verde + tarjeta de perfil
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                height: 92,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF3F8A62), Color(0xFF1E5A3C)],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 44, 16, 0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(3),
                          decoration: const BoxDecoration(
                            color: Color(0xFFFDFBF7),
                            shape: BoxShape.circle,
                          ),
                          child: CircleAvatar(
                            radius: 38,
                            backgroundColor: const Color(0xFFDDF0E2),
                            backgroundImage: hasImage
                                ? NetworkImage(image)
                                : null,
                            child: hasImage
                                ? null
                                : Text(
                                    _initials(name),
                                    style: const TextStyle(
                                      color: forestGreen,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                          ),
                        ),
                        if (_uploadingAvatar)
                          const Positioned.fill(
                            child: Padding(
                              padding: EdgeInsets.all(3),
                              child: CircleAvatar(
                                backgroundColor: Color(0x88000000),
                                child: SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: forestGreen,
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              email,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: mutedGreen,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: borderColor),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  CircleAvatar(
                                    radius: 3,
                                    backgroundColor: chipActive
                                        ? const Color(0xFF3F9A67)
                                        : const Color(0xFFE59A1F),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    chipLabel,
                                    style: const TextStyle(
                                      color: mutedGreen,
                                      fontSize: 8,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: .6,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: OutlinedButton.icon(
                        onPressed: _uploadingAvatar ? null : _changePhoto,
                        icon: const Icon(Icons.photo_camera_outlined, size: 15),
                        label: const Text('Editar'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: forestGreen,
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: borderColor),
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_error != null) InlineError(_error!),
                // Datos de la residencia
                Row(
                  children: [
                    Expanded(
                      child: _InfoTile(
                        icon: Icons.bed_outlined,
                        value: room.isEmpty ? '—' : room,
                        label: 'HABITACIÓN',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _InfoTile(
                        icon: Icons.home_outlined,
                        value: _capitalize(_reservation?['tipo']?.toString()),
                        label: 'TIPO',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _InfoTile(
                        icon: Icons.calendar_today_outlined,
                        value: entry == null ? '—' : displayDate(entry),
                        label: 'INGRESO',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _InfoTile(
                        icon: Icons.account_balance_wallet_outlined,
                        value: rent == null ? '—' : displayMoney(rent),
                        label: 'RENTA',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _Section(
                  title: 'Datos personales',
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _DataField(label: 'NOMBRE COMPLETO', value: name),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _DataField(label: 'CORREO', value: email),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: _DataField(
                              label: 'TELÉFONO',
                              value: phone.isEmpty ? '—' : phone,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _DataField(
                              label: 'HABITACIÓN',
                              value: room.isEmpty
                                  ? '—'
                                  : floor.isEmpty
                                  ? room
                                  : '$room · Piso $floor',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _Section(
                  title: 'Accesos rápidos',
                  child: Column(
                    children: [
                      _QuickLink(
                        icon: Icons.credit_card_outlined,
                        title: 'Pagos y comprobantes',
                        onTap: () => widget.onOpenSection(2),
                      ),
                      const Divider(height: 1, color: borderColor),
                      _QuickLink(
                        icon: Icons.calendar_month_outlined,
                        title: 'Mi reservación',
                        onTap: () => widget.onOpenSection(1),
                      ),
                      const Divider(height: 1, color: borderColor),
                      _QuickLink(
                        icon: Icons.support_agent_outlined,
                        title: 'Soporte SICPES',
                        onTap: _openSupport,
                      ),
                      const Divider(height: 1, color: borderColor),
                      _QuickLink(
                        icon: Icons.logout_rounded,
                        title: 'Cerrar sesión',
                        color: const Color(0xFFA93830),
                        onTap: () =>
                            confirmAndLogout(context, widget.onLogout),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: const Color(0xFFE6F3E9),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 17, color: brandGreen),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: forestGreen,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    color: mutedGreen,
                    fontSize: 8,
                    letterSpacing: .8,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: forestGreen,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _DataField extends StatelessWidget {
  const _DataField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
      decoration: BoxDecoration(
        color: const Color(0xFFFCFBF6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: mutedGreen,
              fontSize: 7.5,
              letterSpacing: .7,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: forestGreen,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({
    required this.icon,
    required this.title,
    required this.onTap,
    this.color = forestGreen,
  });

  final IconData icon;
  final String title;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 13),
        child: Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: color,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Icon(Icons.chevron_right, size: 20, color: color.withValues(alpha: .5)),
          ],
        ),
      ),
    );
  }
}

String _capitalize(String? value) => value == null || value.isEmpty
    ? '—'
    : '${value[0].toUpperCase()}${value.substring(1)}';

String _initials(String value) => value
    .split(' ')
    .where((part) => part.isNotEmpty)
    .take(2)
    .map((part) => part[0].toUpperCase())
    .join();
