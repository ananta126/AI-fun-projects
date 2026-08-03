/// core/network/api_exception.dart — HTTP Error Handler
///
/// Purpose:
///   Converts Dio HTTP errors into user-friendly messages.
///   Instead of showing "DioException [400]", users see "Email already registered".
///
/// Why it exists:
///   Centralizes error parsing. Every feature uses the same error format.
///
/// How Flutter communicates with FastAPI:
///   When FastAPI returns {"detail": "Invalid email or password"} with status 401,
///   this class extracts that message for display on the login screen.

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;

  /// Parse a Dio error into a readable ApiException.
  static ApiException fromDioError(dynamic error) {
    if (error is Exception && error.toString().contains('ApiException')) {
      return error as ApiException;
    }

    // DioException handling
    try {
      final response = (error as dynamic).response;
      if (response != null) {
        final statusCode = response.statusCode as int?;
        final data = response.data;
        String message = 'Something went wrong';

        if (data is Map && data.containsKey('detail')) {
          final detail = data['detail'];
          message = detail is String ? detail : detail.toString();
        }

        return ApiException(message, statusCode: statusCode);
      }
    } catch (_) {}

    return ApiException('Network error. Is the backend running?');
  }
}
