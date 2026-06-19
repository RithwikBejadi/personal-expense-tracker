import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';

final recurringProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final data = await ApiClient.instance.get(ApiConstants.recurring);
  return (data['recurring'] as List).cast<Map<String, dynamic>>();
});

final dueRecurringProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final data = await ApiClient.instance.get('${ApiConstants.recurring}/due');
  return (data['due'] as List).cast<Map<String, dynamic>>();
});

class RecurringNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> create(Map<String, dynamic> body) async {
    await ApiClient.instance.post(ApiConstants.recurring, data: body);
    ref.invalidate(recurringProvider);
    ref.invalidate(dueRecurringProvider);
  }

  Future<void> apply(String id, {String? note}) async {
    await ApiClient.instance.post('${ApiConstants.recurring}/$id/apply', data: {
      if (note != null) 'note': note,
    });
    ref.invalidate(recurringProvider);
    ref.invalidate(dueRecurringProvider);
  }

  Future<void> toggleActive(String id, bool isActive) async {
    await ApiClient.instance.patch('${ApiConstants.recurring}/$id', data: {'isActive': isActive});
    ref.invalidate(recurringProvider);
    ref.invalidate(dueRecurringProvider);
  }

  Future<void> delete(String id) async {
    await ApiClient.instance.delete('${ApiConstants.recurring}/$id');
    ref.invalidate(recurringProvider);
    ref.invalidate(dueRecurringProvider);
  }
}

final recurringNotifierProvider = AsyncNotifierProvider<RecurringNotifier, void>(RecurringNotifier.new);
