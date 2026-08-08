/// features/auth/domain/entities/user.dart — User Entity
///
/// Purpose:
///   Plain Dart class representing a user in the business domain.
///   No JSON logic, no HTTP — just data.
///
/// Why it exists:
///   Domain layer should not know about API response formats.
///   The data layer converts JSON → User; presentation uses User objects.
///
/// How Flutter communicates with FastAPI:
///   FastAPI returns user JSON in login/register responses.
///   UserModel.fromJson() converts it to this entity.

class User {
  final String id;
  final String email;
  final String name;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.createdAt,
  });
}
