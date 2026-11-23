import 'package:flutter/material.dart';

import 'admin_screens.dart';
import 'api_client.dart';
import 'logout_flow.dart';
import 'notifications_button.dart';
import 'resident_screens.dart';

const _forest = Color(0xFF173D2A);

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
          ResidentAccountScreen(
            api: widget.api,
            user: widget.user,
            onOpenSection: (index) => setState(() => _section = index),
            onLogout: widget.onLogout,
          ),
        ];

  static const _adminItems = [
    _NavItem('Reservas', Icons.calendar_month_outlined, Icons.calendar_month),
    _NavItem('Pagos', Icons.credit_card_outlined, Icons.credit_card),
    _NavItem('Pisos', Icons.apartment_outlined, Icons.apartment),
    _NavItem('Reportes', Icons.bar_chart_outlined, Icons.bar_chart_rounded),
    _NavItem('Ajustes', Icons.settings_outlined, Icons.settings),
  ];

  static const _residentItems = [
    _NavItem('Inicio', Icons.home_outlined, Icons.home),
    _NavItem('Reservar', Icons.calendar_month_outlined, Icons.calendar_month),
    _NavItem('Pagos', Icons.credit_card_outlined, Icons.credit_card),
    _NavItem('Cuenta', Icons.person_outline, Icons.person),
  ];

  @override
  Widget build(BuildContext context) {
    final items = _isAdmin ? _adminItems : _residentItems;
    final displayName = (widget.user['nombre'] ?? 'Usuario').toString();

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const _Brand(),
        actions: [
          NotificationsButton(api: widget.api),
          GestureDetector(
            onTap: _isAdmin ? null : () => setState(() => _section = 3),
            child: CircleAvatar(
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
          ),
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: () => confirmAndLogout(context, widget.onLogout),
            icon: const Icon(Icons.logout_rounded),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          if (!_isAdmin && _section != 3)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  const ['INICIO', 'RESERVAR', 'PAGOS'][_section],
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
      bottomNavigationBar: NavigationBar(
        selectedIndex: _section,
        onDestinationSelected: (index) => setState(() => _section = index),
        destinations: [
          for (final item in items)
            NavigationDestination(
              icon: Icon(item.icon),
              selectedIcon: Icon(item.selectedIcon),
              label: item.label,
            ),
        ],
      ),
    );
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
          child: Icon(
            Icons.apartment_rounded,
            color: Color(0xFF287A51),
            size: 19,
          ),
        ),
        SizedBox(width: 8),
        Text(
          'SICPES',
          style: TextStyle(
            color: _forest,
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.icon, this.selectedIcon);

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

String _initials(String value) => value
    .split(' ')
    .where((part) => part.isNotEmpty)
    .take(2)
    .map((part) => part[0].toUpperCase())
    .join();
