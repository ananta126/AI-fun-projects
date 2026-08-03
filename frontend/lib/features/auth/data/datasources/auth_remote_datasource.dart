/// features/auth/data/datasources/auth_remote_datasource.dart — Auth API Calls
///
/// Purpose:
///   Makes the actual HTTP calls to FastAPI auth endpoints.
///   This is the ONLY file that knows the exact API URLs and request shapes.
///
/// Why it exists:
///   Separates "how to call the API" from "what to do with the result".
///   If the API changes, you only update this file.
///
/// How Flutter communicates with FastAPI:
///   register() → POST /auth/register  {email, password, name}
///   login()    → POST /auth/login     {email, password}
///   logout()   → POST /auth/logout    (JWT in header)
///   getMe()    → GET  /auth/me        (JWT in header)

import 'package:dio/dio.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_exception.dart';
import '../models/auth_response_model.dart';
import '../models/user_model.dart';

class AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSource(this._apiClient);

  Dio get _dio => _apiClient.dio;

  Future<AuthResponseModel> register({
    required String email,
    required String password,
    required String name,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.register,
        data: {'email': email, 'password': password, 'name': name},
      );
      return AuthResponseModel.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.login,
        data: {'email': email, 'password': password},
      );
      return AuthResponseModel.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiConstants.logout);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<UserModel> getMe() async {
    try {
      final response = await _dio.get(ApiConstants.me);
      return UserModel.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
