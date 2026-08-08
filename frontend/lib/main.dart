/// lib/main.dart — Application Entry Point
///
/// Purpose:
///   The first file Flutter runs. Sets up Riverpod, theme, routing,
///   and checks if the user is already logged in.
///
/// Why it exists:
///   Every Flutter app needs exactly one main() function.
///   Equivalent to backend's app/main.py.
///
/// How Flutter communicates with FastAPI:
///   On startup, checkAuth() checks for a stored JWT and validates it
///   with GET /auth/me. If valid, user goes straight to HomeScreen.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/providers/auth_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends ConsumerStatefulWidget {
  const MyApp({super.key});

  @override
  ConsumerState<MyApp> createState() => _MyAppState();
}

class _MyAppState extends ConsumerState<MyApp> {
  @override
  void initState() {
    super.initState();
    // Check if user has a stored JWT on app startup
    Future.microtask(() => ref.read(authProvider.notifier).checkAuth());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'AI Comm',
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
