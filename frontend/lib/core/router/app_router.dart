/// core/router/app_router.dart — Navigation & Route Guards
///
/// Purpose:
///   Defines all app routes and redirects unauthenticated users to login.
///
/// Why it exists:
///   Centralizes navigation logic. If user is not logged in and tries to
///   access /home, they get redirected to /login automatically.
///
/// How Flutter communicates with FastAPI:
///   On app start, checkAuth() calls GET /auth/me to validate stored JWT.
///   If valid → show /home. If not → show /login.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/auth/presentation/screens/home_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isAuthenticated = authState.status == AuthStatus.authenticated;
      final isAuthRoute =
          state.matchedLocation == '/login' || state.matchedLocation == '/register';

      // Not logged in and trying to access protected route → go to login
      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }

      // Logged in and on login/register → go to home
      if (isAuthenticated && isAuthRoute) {
        return '/home';
      }

      return null; // No redirect needed
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
    ],
  );
});
