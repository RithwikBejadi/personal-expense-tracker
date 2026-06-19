import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../models/transaction_model.dart';

// ── Filter state ────────────────────────────────────────────────────────────
class TransactionFilter {
  final int month;
  final int year;
  final String? type; // 'INCOME' | 'EXPENSE' | null

  const TransactionFilter({required this.month, required this.year, this.type});

  TransactionFilter copyWith({int? month, int? year, String? type, bool clearType = false}) =>
      TransactionFilter(
        month: month ?? this.month,
        year:  year  ?? this.year,
        type:  clearType ? null : (type ?? this.type),
      );
}

final transactionFilterProvider = StateProvider<TransactionFilter>((ref) {
  final now = DateTime.now();
  return TransactionFilter(month: now.month, year: now.year);
});

// ── Transactions list ────────────────────────────────────────────────────────
final transactionsProvider = FutureProvider.autoDispose<List<TransactionModel>>((ref) async {
  final filter = ref.watch(transactionFilterProvider);
  final data = await ApiClient.instance.get(
    ApiConstants.transactions,
    queryParameters: {
      'month': filter.month,
      'year':  filter.year,
      if (filter.type != null) 'type': filter.type,
      'limit': 100,
    },
  );
  return (data['transactions'] as List)
      .map((e) => TransactionModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Monthly summary ──────────────────────────────────────────────────────────
class MonthlySummary {
  final double income;
  final double expenses;
  final double net;
  final String savingsRate;
  final List<CategorySummary> byCategory;

  const MonthlySummary({
    required this.income,
    required this.expenses,
    required this.net,
    required this.savingsRate,
    required this.byCategory,
  });
}

class CategorySummary {
  final String? categoryId;
  final String type;
  final double total;
  final int count;
  final Map<String, dynamic>? category;

  const CategorySummary({
    this.categoryId,
    required this.type,
    required this.total,
    required this.count,
    this.category,
  });

  factory CategorySummary.fromJson(Map<String, dynamic> json) => CategorySummary(
        categoryId: json['categoryId'] as String?,
        type:       json['type'] as String,
        total:      double.parse(json['total'].toString()),
        count:      json['_count'] as int? ?? 0,
        category:   json['category'] as Map<String, dynamic>?,
      );
}

final summaryProvider = FutureProvider.autoDispose<MonthlySummary>((ref) async {
  final filter = ref.watch(transactionFilterProvider);
  final data = await ApiClient.instance.get(
    '${ApiConstants.transactions}/summary',
    queryParameters: {'month': filter.month, 'year': filter.year},
  );
  return MonthlySummary(
    income:      double.parse(data['income'].toString()),
    expenses:    double.parse(data['expenses'].toString()),
    net:         double.parse(data['net'].toString()),
    savingsRate: data['savingsRate'].toString(),
    byCategory:  (data['byCategory'] as List)
        .map((e) => CategorySummary.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
});

// ── Trends ───────────────────────────────────────────────────────────────────
final trendsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final data = await ApiClient.instance.get(
    '${ApiConstants.transactions}/trends',
    queryParameters: {'months': 6},
  );
  return (data['trends'] as List).cast<Map<String, dynamic>>();
});

// ── Notifier for mutations ───────────────────────────────────────────────────
class TransactionNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> create(Map<String, dynamic> body) async {
    await ApiClient.instance.post(ApiConstants.transactions, data: body);
    ref.invalidate(transactionsProvider);
    ref.invalidate(summaryProvider);
  }

  Future<void> delete(String id) async {
    await ApiClient.instance.delete('${ApiConstants.transactions}/$id');
    ref.invalidate(transactionsProvider);
    ref.invalidate(summaryProvider);
  }
}

final transactionNotifierProvider = AsyncNotifierProvider<TransactionNotifier, void>(TransactionNotifier.new);
