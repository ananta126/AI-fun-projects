/// features/auth/data/repositories/auth_repository_impl.dart — Auth Repository Implementation
///
/// Purpose:
///   Implements the AuthRepository interface using the remote data source.
///   Also manages JWT token storage via ApiClient.
///
/// Why it exists:
///   Bridges domain (what we need) and data (how we get it).
///   After login, it saves the token so future requests are authenticated.
///
/// How Flutter communicates with FastAPI:
///   login() calls data source → gets token → saves to secure storage
///   → all future Dio requests include Authorization header automatically.

import '../../../../core/network/api_client.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final ApiClient _apiClient;

  AuthRepositoryImpl(this._remoteDataSource, this._apiClient);

  @override
  Future<AuthResult> register({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _remoteDataSource.register(
      email: email,
      password: password,
      name: name,
    );
    await _apiClient.setToken(response.accessToken);
    return response.toAuthResult();
  }

  @override
  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _remoteDataSource.login(
      email: email,
      password: password,
    );
    await _apiClient.setToken(response.accessToken);
    return response.toAuthResult();
  }

  @override
  Future<void> logout() async {
    try {
      await _remoteDataSource.logout();
    } finally {
      // Always clear token locally, even if server call fails
      await _apiClient.clearToken();
    }
  }

  @override
  Future<User> getCurrentUser() async {
    final model = await _remoteDataSource.getMe();
    return model.toEntity();
  }

  @override
  Future<bool> isLoggedIn() async {
    return _apiClient.hasToken();
  }
}
