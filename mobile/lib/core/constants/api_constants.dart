class ApiConstants {
  ApiConstants._();

  static const String baseUrl = 'https://rithwik-expense-planner-api.onrender.com/api';

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 20);

  // Endpoints
  static const String register     = '/auth/register';
  static const String login        = '/auth/login';
  static const String me           = '/auth/me';

  static const String categories   = '/categories';
  static const String budgets      = '/budgets';
  static const String transactions = '/transactions';
  static const String recurring    = '/recurring';
  static const String savings      = '/savings';
}
