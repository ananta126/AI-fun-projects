/// features/auth/data/models/auth_response_model.dart — Auth Response JSON Model
///
/// Purpose:
///   Parses the login/register response from FastAPI.
///
/// Why it exists:
///   FastAPI returns a combined response with token + user data.
///   This model extracts both in one step.
///
/// How Flutter communicates with FastAPI:
///   Response: {"access_token": "eyJ...", "token_type": "bearer", "user": {...}}
///   After parsing, the token is saved and the user is returned.

import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import 'user_model.dart';

class AuthResponseModel {
  final String accessToken;
  final String tokenType;
  final UserModel user;

  AuthResponseModel({
    required this.accessToken,
    required this.tokenType,
    required this.user,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      accessToken: json['access_token'] as String,
      tokenType: json['token_type'] as String? ?? 'bearer',
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }

  AuthResult toAuthResult() {
    return AuthResult(
      accessToken: accessToken,
      user: user.toEntity(),
    );
  }
}
