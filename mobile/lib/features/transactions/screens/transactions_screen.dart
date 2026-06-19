import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/month_picker.dart';
import '../models/transaction_model.dart';
import '../providers/transaction_provider.dart';

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(transactionFilterProvider);
    final txns   = ref.watch(transactionsProvider);
    final fmt    = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, size: 22),
            onPressed: () => context.push('/add-transaction'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter bar
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    MonthPicker(
                      month: filter.month,
                      year:  filter.year,
                      onChanged: (m, y) => ref.read(transactionFilterProvider.notifier)
                          .update((s) => s.copyWith(month: m, year: y)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Type filter chips
                Row(
                  children: [
                    _FilterChip(
                      label: 'All',
                      selected: filter.type == null,
                      onSelected: (_) => ref.read(transactionFilterProvider.notifier)
                          .update((s) => s.copyWith(clearType: true)),
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Income',
                      selected: filter.type == 'INCOME',
                      onSelected: (_) => ref.read(transactionFilterProvider.notifier)
                          .update((s) => s.copyWith(type: 'INCOME')),
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Expenses',
                      selected: filter.type == 'EXPENSE',
                      onSelected: (_) => ref.read(transactionFilterProvider.notifier)
                          .update((s) => s.copyWith(type: 'EXPENSE')),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // List
          Expanded(
            child: txns.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(e.toString())),
              data: (list) {
                if (list.isEmpty) {
                  return EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: 'No transactions',
                    subtitle: 'Tap + to log your first transaction',
                    action: ElevatedButton(
                      onPressed: () => context.push('/add-transaction'),
                      child: const Text('Add transaction'),
                    ),
                  );
                }

                // Group by date
                final grouped = <String, List<TransactionModel>>{};
                for (final t in list) {
                  final key = DateFormat('yyyy-MM-dd').format(t.date);
                  grouped.putIfAbsent(key, () => []).add(t);
                }
                final dates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(transactionsProvider),
                  child: ListView.builder(
                    itemCount: dates.length,
                    itemBuilder: (context, i) {
                      final date = dates[i];
                      final dayTxns = grouped[date]!;
                      final dayTotal = dayTxns.fold<double>(
                        0,
                        (sum, t) => sum + (t.isIncome ? t.amount : -t.amount),
                      );

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _formatDate(DateTime.parse(date)),
                                  style: Theme.of(context).textTheme.labelMedium,
                                ),
                                Text(
                                  '${dayTotal >= 0 ? '+' : ''}${fmt.format(dayTotal)}',
                                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                    color: dayTotal >= 0 ? AppColors.income : AppColors.expense,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              border: Border.all(color: AppColors.border),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: dayTxns.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (_, j) => _TransactionTile(
                                txn: dayTxns[j],
                                fmt: fmt,
                                onDelete: () async {
                                  await ref.read(transactionNotifierProvider.notifier).delete(dayTxns[j].id);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Transaction deleted')),
                                    );
                                  }
                                },
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime d) {
    final now = DateTime.now();
    if (d.year == now.year && d.month == now.month && d.day == now.day) return 'Today';
    if (d.year == now.year && d.month == now.month && d.day == now.day - 1) return 'Yesterday';
    return DateFormat('MMM d, yyyy').format(d);
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final void Function(bool) onSelected;
  const _FilterChip({required this.label, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      labelStyle: Theme.of(context).textTheme.labelMedium?.copyWith(
        color: selected ? Colors.white : AppColors.textSecondary,
        fontWeight: selected ? FontWeight.w500 : FontWeight.normal,
      ),
      selectedColor: AppColors.neutral950,
      checkmarkColor: Colors.white,
      showCheckmark: false,
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final TransactionModel txn;
  final NumberFormat fmt;
  final VoidCallback onDelete;
  const _TransactionTile({required this.txn, required this.fmt, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(txn.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.expense.withOpacity(0.1),
        child: const Icon(Icons.delete_outline, color: AppColors.expense),
      ),
      confirmDismiss: (_) async {
        return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Delete transaction'),
            content: const Text('Are you sure?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: AppColors.expense))),
            ],
          ),
        );
      },
      onDismissed: (_) => onDelete(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.neutral100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                txn.isIncome ? Icons.arrow_downward : Icons.arrow_upward,
                size: 16,
                color: txn.isIncome ? AppColors.income : AppColors.expense,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    txn.description ?? txn.category?.name ?? 'Transaction',
                    style: Theme.of(context).textTheme.labelLarge,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (txn.category != null)
                    Text(txn.category!.name, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            Text(
              '${txn.isIncome ? '+' : '-'}${fmt.format(txn.amount)}',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: txn.isIncome ? AppColors.income : AppColors.expense,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
