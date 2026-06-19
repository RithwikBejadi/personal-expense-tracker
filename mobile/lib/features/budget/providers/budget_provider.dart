import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../transactions/providers/transaction_provider.dart';

// Current month budget detail (used by dashboard + budget screen)
final currentBudgetProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final filter = ref.watch(transactionFilterProvider);
  try {
    final data = await ApiClient.instance.get(
      '${ApiConstants.budgets}/${filter.month}/${filter.year}',
    );
    return data as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
});

// All budgets list
final allBudgetsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final data = await ApiClient.instance.get(ApiConstants.budgets);
  return (data['budgets'] as List).cast<Map<String, dynamic>>();
});

// Budget mutations
class BudgetNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<Map<String, dynamic>> createBudget(Map<String, dynamic> body) async {
    final data = await ApiClient.instance.post(ApiConstants.budgets, data: body);
    ref.invalidate(currentBudgetProvider);
    ref.invalidate(allBudgetsProvider);
    return data['budget'] as Map<String, dynamic>;
  }

  Future<void> updateItems(String budgetId, List<Map<String, dynamic>> items) async {
    await ApiClient.instance.put(
      '${ApiConstants.budgets}/$budgetId/items',
      data: {'items': items},
    );
    ref.invalidate(currentBudgetProvider);
  }

  Future<void> deleteBudget(String id) async {
    await ApiClient.instance.delete('${ApiConstants.budgets}/$id');
    ref.invalidate(currentBudgetProvider);
    ref.invalidate(allBudgetsProvider);
  }
}

final budgetNotifierProvider = AsyncNotifierProvider<BudgetNotifier, void>(BudgetNotifier.new);
