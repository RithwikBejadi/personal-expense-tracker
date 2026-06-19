import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/month_picker.dart';
import '../../transactions/providers/transaction_provider.dart';
import '../providers/budget_provider.dart';

class BudgetScreen extends ConsumerWidget {
  const BudgetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(transactionFilterProvider);
    final budget = ref.watch(currentBudgetProvider);
    final fmt    = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Budget'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart_outlined, size: 22),
            tooltip: 'Compare months',
            onPressed: () {}, // TODO: compare sheet
          ),
        ],
      ),
      body: Column(
        children: [
          // Month picker header
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                MonthPicker(
                  month: filter.month,
                  year:  filter.year,
                  onChanged: (m, y) => ref.read(transactionFilterProvider.notifier)
                      .update((s) => s.copyWith(month: m, year: y)),
                ),
                budget.whenOrNull(
                  data: (b) => b != null
                      ? IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 20),
                          onPressed: () => context.push('/budget-planner/${filter.month}/${filter.year}'),
                        )
                      : null,
                ) ?? const SizedBox.shrink(),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: budget.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error:   (e, _) => Center(child: Text(e.toString())),
              data: (b) {
                if (b == null) {
                  return EmptyState(
                    icon: Icons.pie_chart_outline,
                    title: 'No budget set',
                    subtitle: 'Create a budget plan for ${DateFormat('MMMM').format(DateTime(filter.year, filter.month))}',
                    action: ElevatedButton(
                      onPressed: () => context.push('/budget-planner/${filter.month}/${filter.year}'),
                      child: const Text('Create budget'),
                    ),
                  );
                }

                final summary      = b['summary'] as Map<String, dynamic>;
                final items        = (b['budget']['items'] as List).cast<Map<String, dynamic>>();
                final totalPlanned = double.parse(summary['totalPlanned'].toString());
                final totalSpent   = double.parse(summary['totalExpenses'].toString());
                final remaining    = totalPlanned - totalSpent;
                final progress     = totalPlanned > 0 ? (totalSpent / totalPlanned).clamp(0.0, 1.0) : 0.0;

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(currentBudgetProvider),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Overall summary card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.neutral950,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Total budget',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral400),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              fmt.format(totalPlanned),
                              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                color: Colors.white,
                                letterSpacing: -1,
                              ),
                            ),
                            const SizedBox(height: 16),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: progress,
                                minHeight: 4,
                                color: progress > 0.9 ? AppColors.expense : Colors.white,
                                backgroundColor: AppColors.neutral800,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _Stat(label: 'Spent',     value: fmt.format(totalSpent), context: context),
                                _Stat(label: 'Remaining', value: fmt.format(remaining),  context: context, highlight: remaining < 0),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Category breakdown
                      if (items.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: Center(
                            child: Text('No categories added yet.', style: Theme.of(context).textTheme.bodyMedium),
                          ),
                        )
                      else
                        ...items.map((item) => _BudgetItemRow(item: item, fmt: fmt)),

                      const SizedBox(height: 80),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: budget.whenOrNull(data: (b) => b == null)
          ? null
          : FloatingActionButton(
              onPressed: () => context.push('/budget-planner/${filter.month}/${filter.year}'),
              child: const Icon(Icons.tune),
            ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label, value;
  final BuildContext context;
  final bool highlight;
  const _Stat({required this.label, required this.value, required this.context, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral400)),
        const SizedBox(height: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            color: highlight ? AppColors.expense : Colors.white,
          ),
        ),
      ],
    );
  }
}

class _BudgetItemRow extends StatelessWidget {
  final Map<String, dynamic> item;
  final NumberFormat fmt;
  const _BudgetItemRow({required this.item, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final cat      = item['category'] as Map<String, dynamic>? ?? {};
    final planned  = double.parse(item['plannedAmount'].toString());
    final spent    = double.parse(item['spent']?.toString() ?? '0');
    final progress = planned > 0 ? (spent / planned).clamp(0.0, 1.0) : 0.0;
    final isOver   = spent > planned;
    final name     = cat['name'] as String? ?? 'Category';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: isOver ? AppColors.expense.withOpacity(0.4) : AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      color: AppColors.neutral100,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Icon(Icons.category_outlined, size: 15, color: AppColors.textSecondary),
                  ),
                  const SizedBox(width: 10),
                  Text(name, style: Theme.of(context).textTheme.titleSmall),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${fmt.format(spent)} / ${fmt.format(planned)}',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: isOver ? AppColors.expense : AppColors.textSecondary,
                    ),
                  ),
                  if (isOver)
                    Text(
                      'Over by ${fmt.format(spent - planned)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.expense),
                    ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 4,
              color: isOver ? AppColors.expense : AppColors.neutral700,
            ),
          ),
        ],
      ),
    );
  }
}
