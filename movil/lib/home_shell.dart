import 'package:flutter/material.dart';

import 'admin_screens.dart';
import 'api_client.dart';
import 'notifications_button.dart';
import 'resident_screens.dart';

const _forest = Color(0xFF173D2A);
const _green = Color(0xFF287A51);

class HomeShell extends StatefulWidget {
  const HomeShell({
    required this.user,
    required this.api,
    required this.onLogout,
    super.key,
  });

  final Map<String, dynamic> user;
  final ApiClient api;
  final Future<void> Function() onLogout;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _section = 0;

  bool get _isAdmin => widget.user['rol'] == 'admin';

  static const _adminTitles = [
    'Reservaciones',
    'Pagos',
    'Pisos',
    'Reportes',
    'Configuración',
  ];
  static const _residentTitles = ['Inicio', 'Reservar', 'Pagos', 'Mi cuenta'];

  late final List<Widget> _pages = _isAdmin
      ? [
          AdminReservationsScreen(api: widget.api),
          AdminPaymentsScreen(api: widget.api),
          AdminFloorsScreen(api: widget.api),
          AdminReportsScreen(api: widget.api),
          AdminSettingsScreen(api: widget.api),
        ]
      : [
          ResidentDashboardScreen(api: widget.api, user: widget.user),
          ResidentReservationScreen(api: widget.api),
          ResidentPaymentsScreen(api: widget.api),
          ResidentAccountScreen(api: widget.api, user: widget.user),
        ];

  List<_NavItem> get _adminItems => const [
    _NavItem('Reservaciones', Icons.calendar_month_outlined),
    _NavItem('Pagos', Icons.credit_card_outlined),
    _NavItem('Pisos', Icons.apartment_outlined),
    _NavItem('Reportes', Icons.bar_chart_rounded),
    _NavItem('Configuración', Icons.settings_outlined),
  ];

  List<_NavItem> get _residentItems => const [
    _NavItem('Inicio', Icons.home_outlined),
    _NavItem('Reservar', Icons.calendar_month_outlined),
    _NavItem('Pagos', Icons.credit_card_outlined),
    _NavItem('Mi cuenta', Icons.person_outline),
  ];

  @override
  Widget build(BuildContext context) {
    final titles = _isAdmin ? _adminTitles : _residentTitles;
    final items = _isAdmin ? _adminItems : _residentItems;
    final displayName = (widget.user['nombre'] ?? 'Usuario').toString();

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 8,
        title: const _Brand(),
        actions: [
          NotificationsButton(api: widget.api),
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFFDDF0E2),
            child: Text(
              _initials(displayName),
              style: const TextStyle(
                color: _forest,
                fontSize: 10,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout_rounded),
          ),
          const SizedBox(width: 4),
        ],
      ),
      drawer: _isAdmin
          ? Drawer(
              backgroundColor: const Color(0xFFF4F2EA),
              child: SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 16, 22),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const _Brand(),
                          const SizedBox(height: 22),
                          Text(
                            displayName,
                            style: const TextStyle(
                              color: _forest,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'ADMINISTRACIÓN',
                            style: TextStyle(
                              color: Color(0xFF5F7065),
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 6,
                      ),
                      child: Text(
                        'ADMINISTRACIÓN',
                        style: TextStyle(
                          color: Color(0xFF5F7065),
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ),
                    for (var index = 0; index < items.length; index++)
                      _DrawerItem(
                        item: items[index],
                        selected: _section == index,
                        onTap: () {
                          setState(() => _section = index);
                          Navigator.of(context).pop();
                        },
                      ),
                    const Spacer(),
                    const Divider(indent: 18, endIndent: 18),
                    ListTile(
                      leading: const Icon(Icons.shield_outlined),
                      title: const Text('Soporte SICPES'),
                      onTap: _openSupport,
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            )
          : null,
      body: Column(
        children: [
          if (!_isAdmin)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  titles[_section].toUpperCase(),
                  style: const TextStyle(
                    color: Color(0xFF4C7A5F),
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.1,
                  ),
                ),
              ),
            ),
          Expanded(
            child: IndexedStack(index: _section, children: _pages),
          ),
        ],
      ),
      bottomNavigationBar: _isAdmin
          ? null
          : NavigationBar(
              selectedIndex: _section,
              onDestinationSelected: (index) =>
                  setState(() => _section = index),
              destinations: [
                for (final item in items)
                  NavigationDestination(
                    icon: Icon(item.icon),
                    label: item.label,
                  ),
              ],
            ),
    );
  }

  Future<void> _openSupport() async {
    Navigator.of(context).pop();
    try {
      final settings = await widget.api.get('/mobile/settings');
      if (!mounted) return;
      final email = settings is Map<String, dynamic>
          ? (settings['emailAdmin'] ?? '').toString()
          : '';
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Soporte SICPES'),
          content: Text(
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
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return const Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: Color(0xFFEAF6EC),
          child: Icon(Icons.apartment_rounded, color: _green, size: 19),
        ),
        SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'SICPES',
              style: TextStyle(
                color: _forest,
                fontSize: 13,
                height: 1,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 3),
            Text(
              'RESIDENCIAL',
              style: TextStyle(
                color: Color(0xFF5F7065),
                fontSize: 7,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.icon);

  final String label;
  final IconData icon;
}

class _DrawerItem extends StatelessWidget {
  const _DrawerItem({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _NavItem item;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      child: ListTile(
        selected: selected,
        selectedTileColor: const Color(0xFFE2F0E4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: Icon(item.icon, size: 20),
        title: Text(
          item.label,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
        onTap: onTap,
      ),
    );
  }
}

String _initials(String value) => value
    .split(' ')
    .where((part) => part.isNotEmpty)
    .take(2)
    .map((part) => part[0].toUpperCase())
    .join();
