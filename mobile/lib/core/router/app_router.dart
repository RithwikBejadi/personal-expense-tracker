import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/transactions/screens/transactions_screen.dart';
import '../../features/transactions/screens/add_transaction_screen.dart';
import '../../features/budget/screens/budget_screen.dart';
import '../../features/budget/screens/budget_planner_screen.dart';
import '../../features/goals/screens/goals_screen.dart';
import '../../features/goals/screens/add_goal_screen.dart';
import '../../features/goals/screens/goal_detail_screen.dart';
import '../../features/recurring/screens/recurring_screen.dart';
import '../../shared/widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggedIn = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation.startsWith('/login') ||
          state.matchedLocation.startsWith('/register');

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),

      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/dashboard',    builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/transactions', builder: (_, __) => const TransactionsScreen()),
          GoRoute(path: '/budget',       builder: (_, __) => const BudgetScreen()),
          GoRoute(path: '/goals',        builder: (_, __) => const GoalsScreen()),
        ],
      ),

      // Full-screen routes (no bottom nav)
      GoRoute(path: '/add-transaction', builder: (_, __) => const AddTransactionScreen()),
      GoRoute(
        path: '/budget-planner/:month/:year',
        builder: (_, state) => BudgetPlannerScreen(
          month: int.parse(state.pathParameters['month']!),
          year:  int.parse(state.pathParameters['year']!),
        ),
      ),
      GoRoute(path: '/add-goal',         builder: (_, __) => const AddGoalScreen()),
      GoRoute(
        path: '/goal/:id',
        builder: (_, state) => GoalDetailScreen(goalId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/recurring',        builder: (_, __) => const RecurringScreen()),
    ],
  );
});
