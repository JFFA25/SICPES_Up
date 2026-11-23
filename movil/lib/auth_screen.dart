import 'package:flutter/material.dart';

import 'api_client.dart';

const _forest = Color(0xFF173D2A);

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    required this.api,
    required this.onAuthenticated,
    this.onBack,
    this.initialRegister = false,
    super.key,
  });

  final VoidCallback? onBack;
  final bool initialRegister;

  final ApiClient api;
  final ValueChanged<Map<String, dynamic>> onAuthenticated;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  late bool _register = widget.initialRegister;
  bool _verify = false;
  bool _busy = false;
  bool _obscurePassword = true;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });

    try {
      if (_verify) {
        await widget.api.post(
          '/verify-otp',
          authenticated: false,
          body: {'email': _email.text.trim(), 'code': _code.text.trim()},
        );
        setState(() {
          _verify = false;
          _register = false;
          _notice = 'Cuenta verificada. Ya puedes iniciar sesión.';
        });
      } else if (_register) {
        await widget.api.post(
          '/register',
          authenticated: false,
          body: {
            'nombre': _name.text.trim(),
            'email': _email.text.trim(),
            'telefono': _phone.text.trim(),
            'password': _password.text,
          },
        );
        setState(() {
          _verify = true;
          _notice = 'Te enviamos un código por SMS para verificar tu cuenta.';
        });
      } else {
        final response = await widget.api.post(
          '/mobile/auth/login',
          authenticated: false,
          body: {'email': _email.text.trim(), 'password': _password.text},
        );
        if (response is! Map<String, dynamic> ||
            response['token'] is! String ||
            response['user'] is! Map<String, dynamic>) {
          throw const ApiException(
            'La respuesta de inicio de sesión no es válida.',
          );
        }
        await widget.api.saveToken(response['token'] as String);
        widget.onAuthenticated(response['user'] as Map<String, dynamic>);
      }
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgotPassword() async {
    final email = _email.text.trim();
    if (email.isEmpty) {
      setState(
        () => _error = 'Escribe tu correo para solicitar la recuperación.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      await widget.api.post(
        '/forgot-password',
        authenticated: false,
        body: {'email': email},
      );
      setState(
        () =>
            _notice = 'Si el correo está registrado, recibirás instrucciones.',
      );
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _required(String? value) => (value == null || value.trim().isEmpty)
      ? 'Este campo es obligatorio.'
      : null;

  @override
  Widget build(BuildContext context) {
    final title = _verify
        ? 'Verifica tu cuenta'
        : _register
        ? 'Crea tu cuenta'
        : 'Qué gusto verte de nuevo.';
    final subtitle = _verify
        ? 'Ingresa el código que enviamos a tu teléfono.'
        : _register
        ? 'Regístrate para solicitar una habitación.'
        : 'Ingresa a tu cuenta para continuar con tu residencia.';

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(22),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            if (widget.onBack != null)
                              IconButton(
                                tooltip: 'Volver al inicio',
                                onPressed: _busy ? null : widget.onBack,
                                icon: const Icon(Icons.arrow_back_rounded),
                                color: _forest,
                                visualDensity: VisualDensity.compact,
                              ),
                            const _Brand(),
                          ],
                        ),
                        const SizedBox(height: 26),
                        Text(
                          _verify
                              ? 'VERIFICACIÓN'
                              : _register
                              ? 'NUEVA CUENTA'
                              : 'INICIAR SESIÓN',
                          style: const TextStyle(
                            color: Color(0xFF4C7A5F),
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          title,
                          style: const TextStyle(
                            color: _forest,
                            fontSize: 23,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          subtitle,
                          style: const TextStyle(color: Color(0xFF66766A)),
                        ),
                        const SizedBox(height: 22),
                        if (_register && !_verify) ...[
                          TextFormField(
                            controller: _name,
                            textCapitalization: TextCapitalization.words,
                            decoration: const InputDecoration(
                              labelText: 'Nombre completo',
                            ),
                            validator: _required,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _phone,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Teléfono',
                            ),
                            validator: _required,
                          ),
                          const SizedBox(height: 12),
                        ],
                        if (!_verify) ...[
                          TextFormField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.email],
                            decoration: const InputDecoration(
                              labelText: 'Correo electrónico',
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
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _password,
                            obscureText: _obscurePassword,
                            autofillHints: _register
                                ? const [AutofillHints.newPassword]
                                : const [AutofillHints.password],
                            decoration: InputDecoration(
                              labelText: 'Contraseña',
                              suffixIcon: IconButton(
                                onPressed: () => setState(
                                  () => _obscurePassword = !_obscurePassword,
                                ),
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility_outlined
                                      : Icons.visibility_off_outlined,
                                ),
                              ),
                            ),
                            validator: (value) {
                              final required = _required(value);
                              if (required != null) return required;
                              if (_register && value!.length < 8) {
                                return 'Usa al menos 8 caracteres.';
                              }
                              return null;
                            },
                          ),
                        ] else
                          TextFormField(
                            controller: _code,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            decoration: const InputDecoration(
                              labelText: 'Código de verificación',
                              counterText: '',
                            ),
                            validator: _required,
                          ),
                        if (!_verify && !_register)
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              onPressed: _busy ? null : _forgotPassword,
                              child: const Text('¿Olvidaste tu contraseña?'),
                            ),
                          ),
                        if (_error != null)
                          _Message(text: _error!, error: true),
                        if (_notice != null) _Message(text: _notice!),
                        const SizedBox(height: 10),
                        FilledButton(
                          onPressed: _busy ? null : _submit,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(48),
                          ),
                          child: _busy
                              ? const SizedBox(
                                  width: 19,
                                  height: 19,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Text(
                                  _verify
                                      ? 'Verificar cuenta'
                                      : _register
                                      ? 'Crear cuenta'
                                      : 'Entrar',
                                ),
                        ),
                        if (!_verify)
                          TextButton(
                            onPressed: _busy
                                ? null
                                : () => setState(() {
                                    _register = !_register;
                                    _error = null;
                                    _notice = null;
                                  }),
                            child: Text(
                              _register
                                  ? 'Ya tengo una cuenta · Iniciar sesión'
                                  : '¿No tienes cuenta? · Regístrate',
                              textAlign: TextAlign.center,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        CircleAvatar(
          backgroundColor: Color(0xFFEAF6EC),
          child: Icon(Icons.apartment_rounded, color: Color(0xFF287A51)),
        ),
        SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SICPES',
              style: TextStyle(color: _forest, fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ],
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.text, this.error = false});

  final String text;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final color = error ? const Color(0xFFA93830) : const Color(0xFF287A51);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(text, style: TextStyle(color: color, fontSize: 12)),
    );
  }
}
