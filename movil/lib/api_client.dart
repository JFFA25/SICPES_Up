import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client, FlutterSecureStorage? storage})
    : _client = client ?? http.Client(),
      _storage = storage ?? const FlutterSecureStorage();

  static const _tokenKey = 'sicpes_access_token';
  static const _apiBase = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000/api',
  );

  final http.Client _client;
  final FlutterSecureStorage _storage;

  Uri _uri(String path) {
    final base = _apiBase.endsWith('/')
        ? _apiBase.substring(0, _apiBase.length - 1)
        : _apiBase;
    return Uri.parse('$base$path');
  }

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<dynamic> get(String path, {bool authenticated = true}) =>
      _send('GET', path, authenticated: authenticated);

  Future<dynamic> post(
    String path, {
    Object? body,
    bool authenticated = true,
  }) => _send('POST', path, body: body, authenticated: authenticated);

  Future<dynamic> put(String path, {Object? body}) =>
      _send('PUT', path, body: body);

  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    bool authenticated = true,
  }) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (authenticated) {
      final token = await readToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    final request = http.Request(method, _uri(path))..headers.addAll(headers);
    if (body != null) request.body = jsonEncode(body);

    try {
      final streamed = await _client.send(request);
      final response = await http.Response.fromStream(streamed);
      final dynamic decoded = response.body.isEmpty
          ? null
          : jsonDecode(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message = decoded is Map<String, dynamic>
            ? decoded['error'] ?? decoded['message']
            : null;
        throw ApiException(
          message?.toString() ?? 'No se pudo completar la solicitud.',
        );
      }
      return decoded;
    } on ApiException {
      rethrow;
    } on FormatException {
      throw const ApiException('El servidor devolvió una respuesta inválida.');
    } catch (error) {
      throw ApiException('No se pudo conectar con SICPES: $error');
    }
  }
}
