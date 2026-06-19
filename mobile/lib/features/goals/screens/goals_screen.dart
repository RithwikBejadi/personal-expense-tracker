import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../providers/goals_provider.dart';

class GoalsScreen extends ConsumerWidget {
  const GoalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goals = ref.watch(goalsProvider);
    final fmt   = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Savings Goals'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, size: 22),
            onPressed: () => context.push('/add-goal'),
          ),
        ],
      ),
      body: goals.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (list) {
          if (list.isEmpty) {
            return EmptyState(
              icon: Icons.savings_outlined,
              title: 'No savings goals',
              subtitle: 'Create a goal to start tracking your savings',
              action: ElevatedButton(
                onPressed: () => context.push('/add-goal'),
                child: const Text('Add goal'),
              ),
            );
          }

          final active    = list.where((g) => g['status'] == 'ACTIVE').toList();
          final completed = list.where((g) => g['status'] == 'COMPLETED').toList();
          final paused    = list.where((g) => g['status'] == 'PAUSED').toList();

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(goalsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (active.isNotEmpty) ...[
                  _SectionHeader(title: 'Active (${active.length})'),
                  const SizedBox(height: 8),
                  ...active.map((g) => _GoalCard(goal: g, fmt: fmt, ref: ref, context: context)),
                ],
                if (completed.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _SectionHeader(title: 'Completed (${completed.length})'),
                  const SizedBox(height: 8),
                  ...completed.map((g) => _GoalCard(goal: g, fmt: fmt, ref: ref, context: context)),
                ],
                if (paused.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _SectionHeader(title: 'Paused (${paused.length})'),
                  const SizedBox(height: 8),
                  ...paused.map((g) => _GoalCard(goal: g, fmt: fmt, ref: ref, context: context)),
                ],
                const SizedBox(height: 80),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/add-goal'),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});
  @override
  Widget build(BuildContext context) =>
      Text(title, style: Theme.of(context).textTheme.labelMedium);
}

class _GoalCard extends StatelessWidget {
  final Map<String, dynamic> goal;
  final NumberFormat fmt;
  final WidgetRef ref;
  final BuildContext context;
  const _GoalCard({required this.goal, required this.fmt, required this.ref, required this.context});

  @override
  Widget build(BuildContext context) {
    final saved      = double.parse(goal['savedAmount'].toString());
    final target     = double.parse(goal['targetAmount'].toString());
    final progress   = target > 0 ? (saved / target).clamp(0.0, 1.0) : 0.0;
    final percent    = double.parse(goal['progressPercent']?.toString() ?? '0');
    final remaining  = target - saved;
    final isComplete = goal['status'] == 'COMPLETED';
    final name       = goal['name'] as String;

    final targetDate = goal['targetDate'] != null
        ? DateTime.tryParse(goal['targetDate'] as String)
        : null;

    return GestureDetector(
      onTap: () => context.push('/goal/${goal['id']}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border.all(color: isComplete ? AppColors.income.withOpacity(0.3) : AppColors.border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: Theme.of(context).textTheme.titleSmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (isComplete)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.income.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('Completed', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.income)),
                  )
                else if (!isComplete && goal['status'] == 'PAUSED')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.neutral200,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('Paused', style: Theme.of(context).textTheme.labelSmall),
                  ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(fmt.format(saved), style: Theme.of(context).textTheme.titleMedium),
                    Text('of ${fmt.format(target)}', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('${percent.toStringAsFixed(0)}%', style: Theme.of(context).textTheme.titleMedium),
                    if (!isComplete)
                      Text('${fmt.format(remaining)} to go', style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 5,
                color: isComplete ? AppColors.income : AppColors.neutral950,
              ),
            ),
            if (targetDate != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined, size: 12, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    'Target: ${DateFormat('MMM d, yyyy').format(targetDate)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ],
            if (!isComplete) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => _showDepositSheet(context, goal['id'] as String, name),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    minimumSize: Size.zero,
                  ),
                  child: const Text('Add deposit'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showDepositSheet(BuildContext ctx, String goalId, String goalName) {
    final amountCtrl = TextEditingController();
    final noteCtrl   = TextEditingController();

    showModalBottomSheet(
      context: ctx,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 24, right: 24, top: 24,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Add deposit', style: Theme.of(ctx).textTheme.titleMedium),
            Text(goalName,      style: Theme.of(ctx).textTheme.bodySmall),
            const SizedBox(height: 20),
            TextField(
              controller: amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Amount', prefixText: '\$ '),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            TextField(controller: noteCtrl, decoration: const InputDecoration(labelText: 'Note (optional)')),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final amt = double.tryParse(amountCtrl.text);
                  if (amt == null || amt <= 0) return;
                  Navigator.pop(ctx);
                  await ref.read(goalsNotifierProvider.notifier).deposit(
                    goalId,
                    amt,
                    note: noteCtrl.text.trim().isEmpty ? null : noteCtrl.text.trim(),
                  );
                },
                child: const Text('Save deposit'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
