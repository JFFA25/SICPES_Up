import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'api_client.dart';

const _forest = Color(0xFF173D2A);
const _googleClientId = String.fromEnvironment('GOOGLE_CLIENT_ID');

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
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: const ['email', 'profile'],
    serverClientId: _googleClientId.isEmpty ? null : _googleClientId,
  );
  late bool _register = widget.initialRegister;
  bool _awaitingEmailConfirmation = false;
  bool _busy = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _acceptedTerms = false;
  String? _error;
  String? _notice;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_awaitingEmailConfirmation) return;
    if (!_formKey.currentState!.validate()) return;
    if (_register && !_acceptedTerms) {
      setState(() => _error = 'Acepta los términos y el aviso de privacidad para continuar.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });

    try {
      if (_register) {
        final response = await widget.api.post(
          '/register',
          authenticated: false,
          body: {
            'nombre': _name.text.trim(),
            'email': _email.text.trim(),
            'password': _password.text,
          },
        );
        setState(() {
          _awaitingEmailConfirmation = true;
          _register = false;
          _notice = response is Map<String, dynamic>
              ? (response['message'] ?? 'Revisa tu correo para confirmar la cuenta.').toString()
              : 'Revisa tu correo para confirmar la cuenta.';
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

  Future<void> _signInWithGoogle() async {
    if (_googleClientId.isEmpty) {
      setState(() {
        _error =
            'Falta configurar GOOGLE_CLIENT_ID al compilar la aplicación.';
        _notice = null;
      });
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });

    try {
      final account = await _googleSignIn.signIn();
      if (account == null) return;

      final googleAuthentication = await account.authentication;
      final credential = googleAuthentication.idToken;
      if (credential == null || credential.isEmpty) {
        throw const ApiException(
          'Google no devolvió una credencial. Revisa la configuración OAuth de Android.',
        );
      }

      final response = await widget.api.post(
        '/mobile/auth/google',
        authenticated: false,
        body: {'credential': credential},
      );
      if (response is! Map<String, dynamic> ||
          response['token'] is! String ||
          response['user'] is! Map) {
        throw const ApiException(
          'La respuesta de inicio de sesión de Google no es válida.',
        );
      }

      final user = Map<String, dynamic>.from(response['user'] as Map);
      await widget.api.saveToken(response['token'] as String);
      widget.onAuthenticated(user);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } on PlatformException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message ?? 'No se pudo iniciar sesión con Google.';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resendConfirmation() async {
    final email = _email.text.trim();
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final response = await widget.api.post(
        '/resend-confirmation',
        authenticated: false,
        body: {'email': email},
      );
      if (mounted) {
        setState(
          () => _notice = response is Map<String, dynamic>
              ? (response['message'] ?? 'Correo de confirmación reenviado.')
                    .toString()
              : 'Correo de confirmación reenviado.',
        );
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
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
    final title = _awaitingEmailConfirmation
        ? 'Revisa tu correo'
        : _register
        ? 'Crea tu cuenta'
        : 'Qué gusto verte de nuevo.';
    final subtitle = _awaitingEmailConfirmation
        ? 'Confirma tu correo para activar la cuenta.'
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
                          _awaitingEmailConfirmation
                              ? 'CONFIRMACIÓN'
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
                        if (_error != null)
                          _Message(text: _error!, error: true),
                        if (_notice != null) _Message(text: _notice!),

                        if (_awaitingEmailConfirmation) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Enviamos un enlace de confirmación a ${_email.text.trim()}.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Color(0xFF66766A),
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton(
                            onPressed: _busy ? null : _resendConfirmation,
                            child: const Text('Reenviar correo'),
                          ),
                          TextButton(
                            onPressed: _busy
                                ? null
                                : () => setState(() {
                                    _awaitingEmailConfirmation = false;
                                    _register = false;
                                    _error = null;
                                    _notice = null;
                                  }),
                            child: const Text('Ir a iniciar sesión'),
                          ),
                        ] else ...[
                          if (_register) ...[
                            TextFormField(
                              controller: _name,
                              textCapitalization: TextCapitalization.words,
                              decoration: const InputDecoration(
                                labelText: 'Nombre completo',
                              ),
                              validator: _required,
                            ),
                            const SizedBox(height: 12),
                          ],
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
                          if (_register) ...[
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _confirm,
                              obscureText: _obscureConfirm,
                              autofillHints: const [AutofillHints.newPassword],
                              decoration: InputDecoration(
                                labelText: 'Repetir contraseña',
                                suffixIcon: IconButton(
                                  onPressed: () => setState(
                                    () => _obscureConfirm = !_obscureConfirm,
                                  ),
                                  icon: Icon(
                                    _obscureConfirm
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                  ),
                                ),
                              ),
                              validator: (value) {
                                final required = _required(value);
                                if (required != null) return required;
                                return value == _password.text
                                    ? null
                                    : 'Las contraseñas no coinciden.';
                              },
                            ),
                            const SizedBox(height: 4),
                            CheckboxListTile(
                              value: _acceptedTerms,
                              onChanged: _busy
                                  ? null
                                  : (value) => setState(
                                      () => _acceptedTerms = value ?? false,
                                    ),
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              dense: true,
                              title: const Text(
                                'Acepto los términos y condiciones y el aviso de privacidad.',
                                style: TextStyle(fontSize: 12),
                              ),
                            ),
                          ],
                          if (!_register)
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: _busy ? null : _forgotPassword,
                                child: const Text('¿Olvidaste tu contraseña?'),
                              ),
                            ),
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
                                : Text(_register ? 'Crear cuenta' : 'Entrar'),
                          ),
                          ...[
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              child: Row(
                                children: [
                                  const Expanded(child: Divider()),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                    ),
                                    child: Text(
                                      _register
                                          ? 'O REGÍSTRATE CON'
                                          : 'O CONTINÚA CON',
                                      style: const TextStyle(
                                        color: Color(0xFF66766A),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: .6,
                                      ),
                                    ),
                                  ),
                                  const Expanded(child: Divider()),
                                ],
                              ),
                            ),
                            _GoogleButton(
                              label: _register
                                  ? 'Registrarse con Google'
                                  : 'Continuar con Google',
                              busy: _busy,
                              onPressed: _signInWithGoogle,
                            ),
                            if (_googleClientId.isEmpty)
                              const Padding(
                                padding: EdgeInsets.only(top: 6),
                                child: Text(
                                  'Configura GOOGLE_CLIENT_ID para habilitar Google.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: Color(0xFF66766A),
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                          ],
                          TextButton(
                            onPressed: _busy
                                ? null
                                : () => setState(() {
                                    _register = !_register;
                                    _error = null;
                                    _notice = null;
                                    _formKey.currentState?.reset();
                                  }),
                            child: Text(
                              _register
                                  ? 'Ya tengo una cuenta · Iniciar sesión'
                                  : '¿No tienes cuenta? · Regístrate',
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
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

/// Botón "Continuar con Google" con el logotipo oficial de Google.
class _GoogleButton extends StatelessWidget {
  const _GoogleButton({
    required this.label,
    required this.busy,
    required this.onPressed,
  });

  final String label;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      elevation: 0,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: busy ? null : onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          height: 52,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFDADCE0)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0F000000),
                blurRadius: 6,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Opacity(
                opacity: busy ? .45 : 1,
                child: Image.asset(
                  'assets/images/google_g.png',
                  width: 22,
                  height: 22,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: TextStyle(
                  color: busy ? const Color(0xFF9AA0A6) : const Color(0xFF3C4043),
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  letterSpacing: .1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
