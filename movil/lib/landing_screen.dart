import 'package:flutter/material.dart';

import 'api_client.dart';
import 'contact_content.dart';
import 'sicpes_widgets.dart';

const _cream = Color(0xFFFDFBF7);
const _heroGreen = Color(0xFF287A51);

enum _LandingTab { home, residence, contact }

/// Pantalla de inicio pública (antes de iniciar sesión).
class LandingScreen extends StatefulWidget {
  const LandingScreen({
    required this.api,
    required this.onLogin,
    required this.onRegister,
    super.key,
  });

  final ApiClient api;
  final VoidCallback onLogin;
  final VoidCallback onRegister;

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _scroll = ScrollController();
  Map<String, List<String>> _floors = {};
  int? _individualPrice;
  int? _sharedPrice;
  String _supportEmail = 'sicpes.soporte@gmail.com';
  String? _residenceError;
  bool _loadingResidence = true;
  bool _menuOpen = false;
  _LandingTab _selectedTab = _LandingTab.home;

  @override
  void initState() {
    super.initState();
    _loadResidenceInfo();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadResidenceInfo() async {
    try {
      final response = await widget.api.get('/rooms', authenticated: false);
      if (response is Map<String, dynamic> &&
          response['agrupado'] is Map<String, dynamic>) {
        final grouped = response['agrupado'] as Map<String, dynamic>;
        _floors = {
          for (final entry in grouped.entries)
            if (entry.value is List)
              entry.key: (entry.value as List)
                  .map((room) => room.toString())
                  .toList(),
        };
      }
    } on ApiException catch (error) {
      _residenceError = error.message;
    }

    try {
      final response = await widget.api.get('/settings', authenticated: false);
      if (response is Map<String, dynamic>) {
        _individualPrice = _parsePrice(response['precioIndividual']);
        _sharedPrice = _parsePrice(response['precioCompartida']);
        final email = response['emailAdmin']?.toString().trim();
        if (email != null && email.isNotEmpty) _supportEmail = email;
      }
    } on ApiException catch (error) {
      _residenceError ??= error.message;
    }

    if (mounted) setState(() => _loadingResidence = false);
  }

  int? _parsePrice(Object? value) =>
      int.tryParse(value?.toString() ?? '') ??
      double.tryParse(value?.toString() ?? '')?.round();

  void _selectTab(_LandingTab tab) {
    setState(() {
      _selectedTab = tab;
      _menuOpen = false;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(0);
    });
  }

  void _goTop() {
    _selectTab(_LandingTab.home);
  }

  Widget _buildTabContent() {
    switch (_selectedTab) {
      case _LandingTab.home:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Hero(
              onStart: widget.onRegister,
              onLearnMore: () => _selectTab(_LandingTab.residence),
            ),
            const _TowerCard(),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 26, 20, 26),
              child: Column(
                children: [
                  const _FeatureCard(
                    icon: Icons.bed_outlined,
                    title: 'Encuentra tu espacio',
                    text: 'Explora opciones de habitación.',
                  ),
                  const SizedBox(height: 12),
                  const _FeatureCard(
                    icon: Icons.verified_user_outlined,
                    title: 'Da seguimiento',
                    text: 'Consulta el estado de tu reservación.',
                  ),
                  const SizedBox(height: 12),
                  const _FeatureCard(
                    icon: Icons.credit_card_outlined,
                    title: 'Organiza tus pagos',
                    text: 'Revisa cuotas e historial desde tu cuenta.',
                  ),
                ],
              ),
            ),
            const _Footer(),
          ],
        );
      case _LandingTab.residence:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _ResidenceOverview(
              floors: _floors,
              individualPrice: _individualPrice,
              sharedPrice: _sharedPrice,
              loading: _loadingResidence,
              error: _residenceError,
            ),
            const _Footer(),
          ],
        );
      case _LandingTab.contact:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _ContactPage(
              supportEmail: _supportEmail,
              onRegister: widget.onRegister,
              onLogin: widget.onLogin,
            ),
            const _Footer(),
          ],
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _cream,
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                  child: Row(
                    children: [
                      const _LogoLockup(),
                      const Spacer(),
                      InkWell(
                        onTap: () => setState(() => _menuOpen = !_menuOpen),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: borderColor),
                          ),
                          child: Icon(
                            _menuOpen ? Icons.close : Icons.menu,
                            color: brandGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                AnimatedSize(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOut,
                  alignment: Alignment.topCenter,
                  child: _menuOpen
                      ? Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: borderColor),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x14000000),
                                  blurRadius: 18,
                                  offset: Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                _MenuItem(
                                  'Inicio',
                                  selected: _selectedTab == _LandingTab.home,
                                  onTap: _goTop,
                                ),
                                _MenuItem(
                                  'La residencia',
                                  selected:
                                      _selectedTab == _LandingTab.residence,
                                  onTap: () => _selectTab(_LandingTab.residence),
                                ),
                                _MenuItem(
                                  'Contacto',
                                  selected: _selectedTab == _LandingTab.contact,
                                  onTap: () => _selectTab(_LandingTab.contact),
                                ),
                                _MenuItem(
                                  'Regístrate',
                                  onTap: () {
                                    setState(() => _menuOpen = false);
                                    widget.onRegister();
                                  },
                                ),
                                const SizedBox(height: 6),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton(
                                    onPressed: () {
                                      setState(() => _menuOpen = false);
                                      widget.onLogin();
                                    },
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: brandGreen,
                                      side: const BorderSide(
                                        color: Color(0xFFCBD8CB),
                                      ),
                                      minimumSize: const Size.fromHeight(46),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: const Text('Iniciar sesión'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : const SizedBox(width: double.infinity),
                ),
                const Divider(height: 1, color: borderColor),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              controller: _scroll,
              child: _buildTabContent(),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResidenceOverview extends StatelessWidget {
  const _ResidenceOverview({
    required this.floors,
    required this.individualPrice,
    required this.sharedPrice,
    required this.loading,
    required this.error,
  });

  final Map<String, List<String>> floors;
  final int? individualPrice;
  final int? sharedPrice;
  final bool loading;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final roomCount = floors.values.fold<int>(
      0,
      (total, rooms) => total + rooms.length,
    );
    final prices = [
      individualPrice,
      sharedPrice,
    ].whereType<int>().where((price) => price > 0).toList();
    final lowestPrice = prices.isEmpty
        ? null
        : prices.reduce((first, second) => first < second ? first : second);
    final floorEntries = floors.entries.toList()
      ..sort((first, second) => first.key.compareTo(second.key));

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(
            eyebrow: 'LA RESIDENCIA',
            title: 'Conoce el lugar donde vas a vivir.',
            subtitle: 'Un espacio para estudiantes con opciones de habitación y servicios para tu día a día.',
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 190,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: const [
                _ResidencePhoto(
                  asset: 'assets/rooms/room_hero.jpg',
                  label: 'La residencia',
                ),
                SizedBox(width: 10),
                _ResidencePhoto(
                  asset: 'assets/rooms/room_individual.jpg',
                  label: 'Habitación individual',
                ),
                SizedBox(width: 10),
                _ResidencePhoto(
                  asset: 'assets/rooms/room_shared.jpg',
                  label: 'Habitación compartida',
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.35,
            children: [
              StatTile(
                icon: Icons.apartment_outlined,
                value: loading ? '…' : floors.length.toString(),
                label: 'Pisos',
              ),
              StatTile(
                icon: Icons.bed_outlined,
                value: loading ? '…' : roomCount.toString(),
                label: 'Habitaciones registradas',
              ),
              const StatTile(
                icon: Icons.meeting_room_outlined,
                value: '2',
                label: 'Tipos de habitación',
              ),
              StatTile(
                icon: Icons.payments_outlined,
                value: lowestPrice == null ? '—' : displayMoney(lowestPrice),
                label: 'Renta desde / mes',
              ),
            ],
          ),
          if (error != null)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text(
                'No pudimos actualizar precios o disponibilidad. Intenta de nuevo más tarde.',
                style: TextStyle(color: Color(0xFFA93830), fontSize: 12),
              ),
            ),
          const SizedBox(height: 22),
          const _SectionHeading(
            eyebrow: 'HABITACIONES',
            title: 'Elige cómo quieres vivir',
          ),
          const SizedBox(height: 12),
          _RoomTypeCard(
            image: 'assets/rooms/room_individual.jpg',
            title: 'Individual',
            description: 'Tu propio espacio para concentrarte, con mobiliario y servicios incluidos.',
            price: individualPrice,
          ),
          const SizedBox(height: 10),
          _RoomTypeCard(
            image: 'assets/rooms/room_shared.jpg',
            title: 'Compartida',
            description: 'Comparte habitación con otros estudiantes y reduce tu renta mensual.',
            price: sharedPrice,
          ),
          const SizedBox(height: 22),
          const _SectionHeading(
            eyebrow: 'INCLUIDO EN TU RENTA',
            title: 'Servicios para tu estancia',
          ),
          const SizedBox(height: 12),
          const _ServiceCard(
            icon: Icons.wifi_rounded,
            title: 'Internet Wi-Fi',
            detail: 'Conexión para estudiar y trabajar.',
          ),
          const _ServiceCard(
            icon: Icons.water_drop_outlined,
            title: 'Agua y luz',
            detail: 'Servicios incluidos en la renta.',
          ),
          const _ServiceCard(
            icon: Icons.chair_alt_outlined,
            title: 'Mobiliario',
            detail: 'Habitaciones equipadas.',
          ),
          const _ServiceCard(
            icon: Icons.cleaning_services_outlined,
            title: 'Áreas comunes',
            detail: 'Limpieza de espacios compartidos.',
          ),
          const _ServiceCard(
            icon: Icons.shield_outlined,
            title: 'Vigilancia',
            detail: 'Un entorno cuidado para residentes.',
          ),
          const SizedBox(height: 22),
          const _SectionHeading(
            eyebrow: 'DISTRIBUCIÓN',
            title: 'Pisos y habitaciones',
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: loading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : floorEntries.isEmpty
                  ? const Text(
                      'La distribución de pisos se publicará aquí cuando esté disponible.',
                      style: TextStyle(color: mutedGreen),
                    )
                  : Column(
                      children: [
                        for (final entry in floorEntries)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 7),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                SizedBox(
                                  width: 70,
                                  child: Text(
                                    'Piso ${entry.key}',
                                    style: const TextStyle(
                                      color: forestGreen,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: Wrap(
                                    spacing: 6,
                                    runSpacing: 6,
                                    children: [
                                      for (final room in entry.value)
                                        Chip(
                                          label: Text(room),
                                          visualDensity: VisualDensity.compact,
                                          materialTapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 22),
          const _SectionHeading(
            eyebrow: 'PROCESO',
            title: 'Reservar es sencillo',
          ),
          const SizedBox(height: 12),
          const _StepCard(
            number: '1',
            title: 'Crea tu cuenta',
            detail: 'Regístrate y confirma tu correo electrónico.',
          ),
          const _StepCard(
            number: '2',
            title: 'Elige tu habitación',
            detail: 'Consulta opciones y envía tu solicitud.',
          ),
          const _StepCard(
            number: '3',
            title: 'Da seguimiento',
            detail: 'Consulta tu reservación y registra tus pagos.',
          ),
        ],
      ),
    );
  }
}

class _ContactPage extends StatelessWidget {
  const _ContactPage({
    required this.supportEmail,
    required this.onRegister,
    required this.onLogin,
  });

  final String supportEmail;
  final VoidCallback onRegister;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 30, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ContactContent(supportEmail: supportEmail),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: onRegister,
            style: FilledButton.styleFrom(
              backgroundColor: _heroGreen,
              minimumSize: const Size.fromHeight(50),
            ),
            child: const Text('Comenzar ahora'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: onLogin,
            style: OutlinedButton.styleFrom(
              foregroundColor: forestGreen,
              minimumSize: const Size.fromHeight(50),
              side: const BorderSide(color: borderColor),
            ),
            child: const Text('Iniciar sesión'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.eyebrow,
    required this.title,
    this.subtitle,
  });

  final String eyebrow;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: const TextStyle(
            color: Color(0xFF3F7A57),
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          title,
          style: const TextStyle(
            color: forestGreen,
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 5),
          Text(
            subtitle!,
            style: const TextStyle(color: mutedGreen, height: 1.4),
          ),
        ],
      ],
    );
  }
}

class _ResidencePhoto extends StatelessWidget {
  const _ResidencePhoto({required this.asset, required this.label});

  final String asset;
  final String label;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 270,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(asset, fit: BoxFit.cover),
            Align(
              alignment: Alignment.bottomLeft,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                color: const Color(0x88000000),
                child: Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoomTypeCard extends StatelessWidget {
  const _RoomTypeCard({
    required this.image,
    required this.title,
    required this.description,
    required this.price,
  });

  final String image;
  final String title;
  final String description;
  final int? price;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Image.asset(
            image,
            height: 145,
            width: double.infinity,
            fit: BoxFit.cover,
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          color: forestGreen,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Text(
                      price == null ? 'Consultar' : displayMoney(price),
                      style: const TextStyle(
                        color: brandGreen,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(description, style: const TextStyle(color: mutedGreen)),
                const SizedBox(height: 5),
                const Text(
                  'Por mes · servicios incluidos',
                  style: TextStyle(color: mutedGreen, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon, color: brandGreen),
        title: Text(
          title,
          style: const TextStyle(
            color: forestGreen,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Text(detail, style: const TextStyle(color: mutedGreen)),
        dense: true,
      ),
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({
    required this.number,
    required this.title,
    required this.detail,
  });

  final String number;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: brandGreen,
          foregroundColor: Colors.white,
          child: Text(number),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: forestGreen,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Text(detail, style: const TextStyle(color: mutedGreen)),
      ),
    );
  }
}

class _LogoLockup extends StatelessWidget {
  const _LogoLockup();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset('assets/images/sicpes_logo.png', width: 38, height: 38),
        const SizedBox(width: 9),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SICPES',
              style: TextStyle(
                color: forestGreen,
                fontSize: 15,
                fontWeight: FontWeight.w800,
                height: 1,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  const _MenuItem(this.label, {required this.onTap, this.selected = false});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE6F3E9) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? brandGreen : forestGreen,
            fontSize: 14,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.onStart, required this.onLearnMore});

  final VoidCallback onStart;
  final VoidCallback onLearnMore;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 30, 22, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(width: 26, height: 1.5, color: const Color(0xFF9CC8AE)),
              const SizedBox(width: 8),
              const Text(
                'RESIDENCIA ESTUDIANTIL SICPES',
                style: TextStyle(
                  color: Color(0xFF3F7A57),
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: 'Encuentra tu espacio ideal para ',
                  style: TextStyle(color: forestGreen),
                ),
                TextSpan(
                  text: 'vivir y estudiar.',
                  style: TextStyle(color: _heroGreen),
                ),
              ],
            ),
            style: TextStyle(
              fontSize: 40,
              fontWeight: FontWeight.w800,
              height: 1.05,
              letterSpacing: -1.4,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Explora opciones de alojamiento, administra tu reservación y '
            'consulta tus pagos desde un solo lugar.',
            style: TextStyle(color: mutedGreen, fontSize: 15, height: 1.5),
          ),
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onStart,
              icon: const Icon(Icons.arrow_forward, size: 18),
              iconAlignment: IconAlignment.end,
              label: const Text('Comenzar ahora'),
              style: FilledButton.styleFrom(
                backgroundColor: _heroGreen,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                textStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onLearnMore,
              style: OutlinedButton.styleFrom(
                foregroundColor: forestGreen,
                backgroundColor: Colors.white,
                side: const BorderSide(color: borderColor),
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                textStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: const Text('Conoce más'),
            ),
          ),
          const SizedBox(height: 16),
          const Row(
            children: [
              CircleAvatar(radius: 4, backgroundColor: Color(0xFF3F9A67)),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Un espacio pensado para acompañarte durante tus estudios',
                  style: TextStyle(color: mutedGreen, fontSize: 11),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TowerCard extends StatelessWidget {
  const _TowerCard();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 18, 22, 0),
      child: AspectRatio(
        aspectRatio: 1,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFE3EBE2)),
                gradient: const RadialGradient(
                  colors: [Color(0xFFF2F7F1), Color(0xFFFDFBF7)],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Image.asset(
                'assets/images/tower.webp',
                fit: BoxFit.contain,
              ),
            ),
            Positioned(
              right: 0,
              bottom: 22,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x1A000000),
                      blurRadius: 16,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: Color(0xFFE6F3E9),
                      child: Icon(
                        Icons.bed_outlined,
                        color: brandGreen,
                        size: 17,
                      ),
                    ),
                    SizedBox(width: 9),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tu próximo capítulo',
                          style: TextStyle(color: mutedGreen, fontSize: 9),
                        ),
                        Text(
                          'comienza aquí',
                          style: TextStyle(
                            color: forestGreen,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
    required this.icon,
    required this.title,
    required this.text,
  });

  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFE6F3E9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: brandGreen, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: forestGreen,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  text,
                  style: const TextStyle(color: mutedGreen, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(22, 30, 22, 34),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFF0F3322), Color(0xFF05241A)],
        ),
      ),
      child: const Column(
        children: [
          Text(
            'SICPES',
            style: TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.w800,
              letterSpacing: 1,
            ),
          ),
          SizedBox(height: 6),
          Text(
            'Residencias estudiantiles',
            style: TextStyle(color: Color(0xCCFFFFFF), fontSize: 12),
          ),
          SizedBox(height: 4),
          Text(
            '© 2026 SICPES. Todos los derechos reservados.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xCCFFFFFF), fontSize: 12),
          ),
        ],
      ),
    );
  }
}
