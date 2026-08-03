/// features/auth/domain/repositories/auth_repository.dart — Auth Repository Interface
///
/// Purpose:
///   Abstract contract defining WHAT auth operations exist.
///   The data layer provides the concrete implementation.
///
/// Why it exists:
///   Dependency Inversion — presentation/domain depend on this interface,
///   not on Dio or HTTP details. Makes testing easier.
///
/// How Flutter communicates with FastAPI:
///   AuthRepositoryImpl (in data/) implements these methods by calling
///   POST /auth/register, POST /auth/login, etc.

import '../entities/user.dart';

class AuthResult {
  final String accessToken;
  final User user;

  const AuthResult({required this.accessToken, required this.user});
}

abstract class AuthRepository {
  Future<AuthResult> register({
    required String email,
    required String password,
    required String name,
  });

  Future<AuthResult> login({
    required String email,
    required String password,
  });

  Future<void> logout();

  Future<User> getCurrentUser();

  Future<bool> isLoggedIn();
}
