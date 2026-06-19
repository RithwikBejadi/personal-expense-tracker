import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';

final goalsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final data = await ApiClient.instance.get(ApiConstants.savings);
  return (data['goals'] as List).cast<Map<String, dynamic>>();
});

final goalDetailProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, String>((ref, id) async {
  final data = await ApiClient.instance.get('${ApiConstants.savings}/$id');
  return data as Map<String, dynamic>;
});

class GoalsNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> create(Map<String, dynamic> body) async {
    await ApiClient.instance.post(ApiConstants.savings, data: body);
    ref.invalidate(goalsProvider);
  }

  Future<void> deposit(String goalId, double amount, {String? note, String? date}) async {
    await ApiClient.instance.post('${ApiConstants.savings}/$goalId/deposit', data: {
      'amount': amount,
      if (note != null) 'note': note,
      if (date != null) 'date': date,
    });
    ref.invalidate(goalsProvider);
    ref.invalidate(goalDetailProvider(goalId));
  }

  Future<void> updateStatus(String goalId, String status) async {
    await ApiClient.instance.patch('${ApiConstants.savings}/$goalId', data: {'status': status});
    ref.invalidate(goalsProvider);
    ref.invalidate(goalDetailProvider(goalId));
  }

  Future<void> delete(String goalId) async {
    await ApiClient.instance.delete('${ApiConstants.savings}/$goalId');
    ref.invalidate(goalsProvider);
  }
}

final goalsNotifierProvider = AsyncNotifierProvider<GoalsNotifier, void>(GoalsNotifier.new);
