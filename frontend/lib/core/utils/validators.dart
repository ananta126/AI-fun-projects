/// core/utils/validators.dart — Form Input Validators
///
/// Purpose:
///   Reusable validation functions for login/register form fields.
///
/// Why it exists:
///   Validates input on the client BEFORE sending to FastAPI.
///   Catches obvious errors (empty email, short password) instantly.

class Validators {
  Validators._();

  static String? email(String? value) {
    if (value == null || value.isEmpty) return 'Email is required';
    if (!value.contains('@')) return 'Enter a valid email';
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  static String? name(String? value) {
    if (value == null || value.isEmpty) return 'Name is required';
    return null;
  }
}
