import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/month_picker.dart';
import '../../../shared/widgets/stat_card.dart';
import '../../auth/providers/auth_provider.dart';
import '../../transactions/providers/transaction_provider.dart';
import '../../transactions/models/transaction_model.dart';
import '../../budget/providers/budget_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter  = ref.watch(transactionFilterProvider);
    final summary = ref.watch(summaryProvider);
    final txns    = ref.watch(transactionsProvider);
    final budget  = ref.watch(currentBudgetProvider);
    final user    = ref.watch(authStateProvider).valueOrNull;
    final fmt     = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: Text('Hello, ${user?.name.split(' ').first ?? ''}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.repeat_rounded, size: 22),
            tooltip: 'Recurring',
            onPressed: () => context.push('/recurring'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_outlined, size: 22),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authStateProvider.notifier).logout(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-transaction'),
        child: const Icon(Icons.add, size: 24),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(summaryProvider);
          ref.invalidate(transactionsProvider);
          ref.invalidate(currentBudgetProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Month picker
            MonthPicker(
              month: filter.month,
              year:  filter.year,
              onChanged: (m, y) => ref.read(transactionFilterProvider.notifier)
                  .update((s) => s.copyWith(month: m, year: y)),
            ),
            const SizedBox(height: 20),

            // Net balance hero card
            summary.when(
              loading: () => const _BalanceSkeleton(),
              error: (e, _) => _ErrorCard(message: e.toString()),
              data: (s) => _BalanceCard(
                income:   s.income,
                expenses: s.expenses,
                net:      s.net,
                savings:  s.savingsRate,
                fmt:      fmt,
              ),
            ),
            const SizedBox(height: 12),

            // Stats row
            summary.when(
              loading: () => const SizedBox(height: 80),
              error: (_, __) => const SizedBox.shrink(),
              data: (s) => Row(
                children: [
                  Expanded(
                    child: StatCard(
                      label: 'Income',
                      value: fmt.format(s.income),
                      valueColor: AppColors.income,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatCard(
                      label: 'Expenses',
                      value: fmt.format(s.expenses),
                      valueColor: AppColors.expense,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Budget progress
            budget.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (b) => b == null
                  ? _NoBudgetCard(
                      month: filter.month,
                      year:  filter.year,
                      onTap: () => context.push('/budget-planner/${filter.month}/${filter.year}'),
                    )
                  : _BudgetProgressCard(budget: b, fmt: fmt),
            ),
            const SizedBox(height: 20),

            // Category breakdown
            summary.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (s) {
                final expCats = s.byCategory
                    .where((c) => c.type == 'EXPENSE' && c.total > 0)
                    .toList()
                  ..sort((a, b) => b.total.compareTo(a.total));
                if (expCats.isEmpty) return const SizedBox.shrink();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Spending by category', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: expCats.take(5).length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, i) {
                          final cat   = expCats[i];
                          final total = s.expenses > 0 ? (cat.total / s.expenses) : 0.0;
                          return _CategoryRow(cat: cat, percent: total, fmt: fmt);
                        },
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),

            // Recent transactions
            txns.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => _ErrorCard(message: e.toString()),
              data: (list) {
                if (list.isEmpty) return const SizedBox.shrink();
                final recent = list.take(5).toList();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Recent', style: Theme.of(context).textTheme.titleMedium),
                        TextButton(
                          onPressed: () => context.go('/transactions'),
                          child: const Text('View all'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: recent.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (_, i) => _TransactionTile(txn: recent[i], fmt: fmt),
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

// ── Sub-widgets ──────────────────────────────────────────────────────────────

class _BalanceCard extends StatelessWidget {
  final double income, expenses, net;
  final String savings;
  final NumberFormat fmt;

  const _BalanceCard({
    required this.income,
    required this.expenses,
    required this.net,
    required this.savings,
    required this.fmt,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.neutral950,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Net balance', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral400)),
          const SizedBox(height: 8),
          Text(
            fmt.format(net),
            style: Theme.of(context).textTheme.displaySmall?.copyWith(
              color: Colors.white,
              letterSpacing: -1,
            ),
          ),
          const SizedBox(height: 16),
          Container(height: 1, color: AppColors.neutral800),
          const SizedBox(height: 14),
          Row(
            children: [
              _MiniStat(label: 'Savings rate', value: '$savings%', positive: true),
              const SizedBox(width: 24),
              _MiniStat(label: 'Net', value: net >= 0 ? '+${fmt.format(net)}' : fmt.format(net), positive: net >= 0),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final bool positive;
  const _MiniStat({required this.label, required this.value, required this.positive});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.neutral400)),
        const SizedBox(height: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: positive ? AppColors.income : AppColors.expense,
          ),
        ),
      ],
    );
  }
}

class _BudgetProgressCard extends StatelessWidget {
  final Map<String, dynamic> budget;
  final NumberFormat fmt;
  const _BudgetProgressCard({required this.budget, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final summary       = budget['summary'] as Map<String, dynamic>? ?? {};
    final totalPlanned  = double.parse(summary['totalPlanned']?.toString()  ?? '0');
    final totalExpenses = double.parse(summary['totalExpenses']?.toString() ?? '0');
    final progress      = totalPlanned > 0 ? (totalExpenses / totalPlanned).clamp(0.0, 1.0) : 0.0;
    final remaining     = totalPlanned - totalExpenses;
    final isOver        = remaining < 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Monthly budget', style: Theme.of(context).textTheme.titleSmall),
              Text(
                isOver ? 'Over by ${fmt.format(remaining.abs())}' : '${fmt.format(remaining)} left',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: isOver ? AppColors.expense : AppColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value:     progress,
              minHeight: 6,
              color:     isOver ? AppColors.expense : AppColors.neutral950,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(fmt.format(totalExpenses), style: Theme.of(context).textTheme.bodySmall),
              Text(fmt.format(totalPlanned),  style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ],
      ),
    );
  }
}

class _NoBudgetCard extends StatelessWidget {
  final int month, year;
  final VoidCallback onTap;
  const _NoBudgetCard({required this.month, required this.year, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.add_circle_outline, color: AppColors.textMuted),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Set a budget for ${DateFormat('MMMM').format(DateTime(year, month))}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

class _CategoryRow extends StatelessWidget {
  final CategorySummary cat;
  final double percent;
  final NumberFormat fmt;
  const _CategoryRow({required this.cat, required this.percent, required this.fmt});

  @override
  Widget build(BuildContext context) {
    final name = cat.category?['name'] as String? ?? 'Other';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.neutral100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.category_outlined, size: 16, color: AppColors.textSecondary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: percent,
                    minHeight: 3,
                    color: AppColors.neutral700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            fmt.format(cat.total),
            style: Theme.of(context).textTheme.labelLarge,
          ),
        ],
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final TransactionModel txn;
  final NumberFormat fmt;
  const _TransactionTile({required this.txn, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return Padding(
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
                Text(
                  DateFormat('MMM d').format(txn.date),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
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
    );
  }
}

class _BalanceSkeleton extends StatelessWidget {
  const _BalanceSkeleton();
  @override
  Widget build(BuildContext context) => Container(
    height: 130,
    decoration: BoxDecoration(
      color: AppColors.neutral200,
      borderRadius: BorderRadius.circular(16),
    ),
  );
}

class _ErrorCard extends StatelessWidget {
  final String message;
  const _ErrorCard({required this.message});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.surface,
      border: Border.all(color: AppColors.expense.withOpacity(0.3)),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(message, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.expense)),
  );
}
