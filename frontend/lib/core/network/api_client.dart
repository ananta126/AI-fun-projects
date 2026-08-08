/// core/network/api_client.dart — HTTP Client with JWT Interceptor
///
/// Purpose:
///   Shared Dio instance that ALL features use to call FastAPI.
///   Automatically attaches the JWT token to every request.
///
/// Why it exists:
///   Without this, every feature would manually add the Authorization header.
///   The interceptor does it once, centrally.
///
/// How Flutter communicates with FastAPI:
///   1. On login/register, the token is saved via setToken()
///   2. On every subsequent request, the interceptor adds:
///        Authorization: Bearer eyJhbGciOi...
///   3. FastAPI's api/deps.py reads this header and validates the JWT

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/api_constants.dart';

const _tokenKey = 'jwt_access_token';

/// Riverpod provider for the shared API client.
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

class ApiClient {
  late final Dio dio;
  final _storage = const FlutterSecureStorage();

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    // Interceptor: automatically attach JWT to every request
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: _tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  /// Save JWT token after login/register.
  Future<void> setToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  /// Remove JWT token on logout.
  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  /// Check if a token exists (user might be logged in).
  Future<bool> hasToken() async {
    final token = await _storage.read(key: _tokenKey);
    return token != null;
  }
}
