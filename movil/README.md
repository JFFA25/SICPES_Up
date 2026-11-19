# SICPES Residencial — Flutter

Aplicación para Android, iOS y web que reutiliza el backend de SICPES. Incluye
splash de sincronización, autenticación de residentes y administradores,
reservaciones, pagos, perfil y herramientas administrativas.

## Requisitos

- Flutter estable (Dart 3.13 o superior).
- Backend SICPES disponible y configurado con `JWT_SECRET`.

## Ejecutar

Desde esta carpeta:

```powershell
flutter pub get
flutter run
```

Por defecto, la app usa el backend desplegado en
`https://sicpes-backend.onrender.com/api`.

En un emulador Android, usa la dirección del host del emulador:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Para probar con el backend local desde un teléfono físico, reemplaza `10.0.2.2`
por la IP del equipo que corre el backend y asegúrate de permitir HTTP local en
la configuración de Android. La sesión nativa se autentica con JWT Bearer y
conserva el token en almacenamiento seguro. Las cuentas nuevas se verifican con
el código SMS que envía el backend.

## Compilar

```powershell
flutter build apk --dart-define=API_BASE_URL=https://sicpes-backend.onrender.com/api
flutter build web --dart-define=API_BASE_URL=https://sicpes-backend.onrender.com/api
```

La compilación de iOS requiere macOS y Xcode:

```powershell
flutter build ios --dart-define=API_BASE_URL=https://sicpes-backend.onrender.com/api
```

## Validar

```powershell
flutter analyze
flutter test
```
