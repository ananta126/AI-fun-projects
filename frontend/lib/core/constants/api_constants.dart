/// core/constants/api_constants.dart — API Configuration
///
/// Purpose:
///   Defines the base URL and endpoint paths for the FastAPI backend.
///   Change BASE_URL here when switching between emulator and physical device.
///
/// Why it exists:
///   Single source of truth for all API URLs. No hardcoded strings scattered
///   across the codebase.
///
/// How Flutter communicates with FastAPI:
///   Every HTTP call goes to BASE_URL + endpoint path.
///   Example: POST http://10.0.2.2:8000/auth/login
///
/// Note for Android emulator:
///   Use 10.0.2.2 instead of localhost — the emulator's "localhost" is itself,
///   not your computer. For iOS simulator, localhost works fine.

class ApiConstants {
  ApiConstants._();

  // Android emulator → host machine. Change to your machine's IP for physical device.
  static const String baseUrl = 'http://10.0.2.2:8000';

  // Auth endpoints (match backend api/routes/auth.py)
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
}
