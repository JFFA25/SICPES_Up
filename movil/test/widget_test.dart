import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sicpes_mobile/intro_splash.dart';

void main() {
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
