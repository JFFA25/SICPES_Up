import 'package:flutter/material.dart';

import 'sicpes_widgets.dart';

const _cream = Color(0xFFFDFBF7);
const _heroGreen = Color(0xFF287A51);

/// Pantalla de inicio pública (antes de iniciar sesión).
class LandingScreen extends StatefulWidget {
  const LandingScreen({
    required this.onLogin,
    required this.onRegister,
    super.key,
  });

  final VoidCallback onLogin;
  final VoidCallback onRegister;

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _scroll = ScrollController();
  final _featuresKey = GlobalKey();
  bool _menuOpen = false;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _goToFeatures() {
    final context = _featuresKey.currentContext;
    if (context == null) return;
    Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 450),
      curve: Curves.easeOutCubic,
    );
  }

  void _goTop() {
    setState(() => _menuOpen = false);
    _scroll.animateTo(
      0,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
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
                                _MenuItem('Inicio', onTap: _goTop),
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
                                        borderRadius: BorderRadius.circular(
                                          12,
                                        ),
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _Hero(
                    onStart: widget.onRegister,
                    onLearnMore: _goToFeatures,
                  ),
                  const _TowerCard(),
                  Padding(
                    key: _featuresKey,
                    padding: const EdgeInsets.fromLTRB(20, 26, 20, 26),
                    child: const Column(
                      children: [
                        _FeatureCard(
                          icon: Icons.bed_outlined,
                          title: 'Encuentra tu espacio',
                          text: 'Explora opciones de habitación.',
                        ),
                        SizedBox(height: 12),
                        _FeatureCard(
                          icon: Icons.verified_user_outlined,
                          title: 'Da seguimiento',
                          text: 'Consulta el estado de tu reservación.',
                        ),
                        SizedBox(height: 12),
                        _FeatureCard(
                          icon: Icons.credit_card_outlined,
                          title: 'Organiza tus pagos',
                          text: 'Revisa cuotas e historial desde tu cuenta.',
                        ),
                      ],
                    ),
                  ),
                  const _Footer(),
                ],
              ),
            ),
          ),
        ],
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
  const _MenuItem(this.label, {required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 13),
        child: Text(
          label,
          style: const TextStyle(
            color: forestGreen,
            fontSize: 14,
            fontWeight: FontWeight.w500,
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
              child: Image.asset('assets/images/tower.webp', fit: BoxFit.contain),
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
