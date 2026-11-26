import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sicpes_mobile/api_client.dart';
import 'package:sicpes_mobile/auth_screen.dart';
import 'package:sicpes_mobile/intro_splash.dart';
import 'package:sicpes_mobile/landing_screen.dart';

void main() {
  testWidgets('landing separates public content into navigation tabs', (
    tester,
  ) async {
    final api = ApiClient(
      client: MockClient((_) async => http.Response('{}', 200)),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: LandingScreen(api: api, onLogin: () {}, onRegister: () {}),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Conoce más'), findsOneWidget);
    await tester.tap(find.text('Residencia'));
    await tester.pumpAndSettle();
    expect(find.text('Elige cómo quieres vivir'), findsOneWidget);
    expect(find.text('Reservar es sencillo'), findsOneWidget);

    await tester.tap(find.text('Contacto'));
    await tester.pumpAndSettle();
    expect(find.text('Estamos para ayudarte'), findsOneWidget);
    expect(find.text('Correo de soporte'), findsOneWidget);
  });

  testWidgets('login offers Google sign-in', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AuthScreen(api: ApiClient(), onAuthenticated: (_) {}),
      ),
    );

    expect(find.text('Continuar con Google'), findsOneWidget);
  });

  testWidgets('registration uses email instead of phone-code verification', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AuthScreen(
          api: ApiClient(),
          initialRegister: true,
          onAuthenticated: (_) {},
        ),
      ),
    );

    expect(find.text('Correo electrónico'), findsOneWidget);
    expect(find.text('Teléfono'), findsNothing);
    expect(find.text('Código de verificación'), findsNothing);
  });

  testWidgets('splash reports a connection error and offers retry', (
    tester,
  ) async {
    var retried = false;
    await tester.pumpWidget(
      MaterialApp(
        home: IntroSplash(
          status: IntroStatus.error,
          error: 'No se pudo conectar con SICPES.',
          onContinue: () {},
          onRetry: () => retried = true,
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 3500));

    expect(find.text('No se pudo conectar'), findsOneWidget);
    expect(find.text('Intentar de nuevo'), findsOneWidget);

    await tester.tap(find.text('Intentar de nuevo'));
    expect(retried, isTrue);
  });
}
