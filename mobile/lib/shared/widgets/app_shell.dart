import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  int _locationToIndex(String location) {
    if (location.startsWith('/transactions')) return 1;
    if (location.startsWith('/budget'))       return 2;
    if (location.startsWith('/goals'))        return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _locationToIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: BottomNavigationBar(
          currentIndex: index,
          onTap: (i) {
            switch (i) {
              case 0: context.go('/dashboard');    break;
              case 1: context.go('/transactions'); break;
              case 2: context.go('/budget');       break;
              case 3: context.go('/goals');        break;
            }
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_outlined),          activeIcon: Icon(Icons.home),          label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.receipt_long_outlined),  activeIcon: Icon(Icons.receipt_long),  label: 'Transactions'),
            BottomNavigationBarItem(icon: Icon(Icons.pie_chart_outline),      activeIcon: Icon(Icons.pie_chart),     label: 'Budget'),
            BottomNavigationBarItem(icon: Icon(Icons.savings_outlined),       activeIcon: Icon(Icons.savings),       label: 'Goals'),
          ],
        ),
      ),
    );
  }
}
