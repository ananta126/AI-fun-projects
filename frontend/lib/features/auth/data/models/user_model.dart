/// features/auth/data/models/user_model.dart — User JSON Model
///
/// Purpose:
///   Converts FastAPI's user JSON into a Dart User entity.
///
/// Why it exists:
///   API responses use snake_case (created_at). Dart uses camelCase (createdAt).
///   This model handles the conversion.
///
/// How Flutter communicates with FastAPI:
///   FastAPI returns: {"id": "uuid", "email": "...", "name": "...", "created_at": "..."}
///   UserModel.fromJson() parses this into a User entity.

import '../../domain/entities/user.dart';

class UserModel {
  final String id;
  final String email;
  final String name;
  final String createdAt;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    required this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      createdAt: json['created_at'] as String,
    );
  }

  User toEntity() {
    return User(
      id: id,
      email: email,
      name: name,
      createdAt: DateTime.parse(createdAt),
    );
  }
}
