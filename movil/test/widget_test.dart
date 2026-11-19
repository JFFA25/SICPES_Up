import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sicpes_mobile/main.dart';

void main() {
  testWidgets('splash reports a connection error and offers retry', (
    tester,
  ) async {
    var retried = false;
    await tester.pumpWidget(
      MaterialApp(
        home: SplashScreen(
          loading: false,
          error: 'No se pudo conectar con SICPES.',
          onRetry: () => retried = true,
        ),
      ),
    );

    expect(find.text('No se pudo conectar'), findsOneWidget);
    expect(find.text('Intentar de nuevo'), findsOneWidget);

    await tester.tap(find.text('Intentar de nuevo'));
    expect(retried, isTrue);
  });
}
