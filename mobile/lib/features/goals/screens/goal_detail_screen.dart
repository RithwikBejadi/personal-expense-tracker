import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/goals_provider.dart';

class GoalDetailScreen extends ConsumerWidget {
  final String goalId;
  const GoalDetailScreen({super.key, required this.goalId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(goalDetailProvider(goalId));
    final fmt    = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Goal detail'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (v) async {
              if (v == 'pause') {
                await ref.read(goalsNotifierProvider.notifier).updateStatus(goalId, 'PAUSED');
                if (context.mounted) context.pop();
              } else if (v == 'resume') {
                await ref.read(goalsNotifierProvider.notifier).updateStatus(goalId, 'ACTIVE');
              } else if (v == 'delete') {
                final ok = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Delete goal'),
                    content: const Text('This will delete all deposits. Are you sure?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                      TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: AppColors.expense))),
                    ],
                  ),
                );
                if (ok == true) {
                  await ref.read(goalsNotifierProvider.notifier).delete(goalId);
                  if (context.mounted) context.pop();
                }
              }
            },
            itemBuilder: (_) {
              final status = detail.valueOrNull?['goal']?['status'] as String? ?? '';
              return [
                if (status == 'ACTIVE')   const PopupMenuItem(value: 'pause',  child: Text('Pause goal')),
                if (status == 'PAUSED')   const PopupMenuItem(value: 'resume', child: Text('Resume goal')),
                const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: AppColors.expense))),
              ];
            },
          ),
        ],
      ),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (d) {
          final goal     = d['goal'] as Map<String, dynamic>;
          final trend    = (d['trend'] as List).cast<Map<String, dynamic>>();
          final deposits = (goal['deposits'] as List? ?? []).cast<Map<String, dynamic>>();

          final saved    = double.parse(goal['savedAmount'].toString());
          final target   = double.parse(goal['targetAmount'].toString());
          final progress = target > 0 ? (saved / target).clamp(0.0, 1.0) : 0.0;
          final percent  = double.parse(goal['progressPercent']?.toString() ?? '0');

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Progress card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.neutral950,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(goal['name'] as String, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white)),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(fmt.format(saved), style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
                        Text('${percent.toStringAsFixed(0)}%', style: Theme.of(context).textTheme.titleLarge?.copyWith(color: AppColors.neutral400)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('of ${fmt.format(target)}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.neutral400)),
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 5,
                        color: Colors.white,
                        backgroundColor: AppColors.neutral800,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Monthly deposits
              if (trend.isNotEmpty) ...[
                Text('Monthly deposits', style: Theme.of(context).textTheme.titleMedium),
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
                    itemCount: trend.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final t = trend[i];
                      final month = DateFormat('MMM yyyy').format(DateTime(t['year'] as int, t['month'] as int));
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(month, style: Theme.of(context).textTheme.labelLarge),
                            Text(fmt.format(t['total']), style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.income)),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Recent deposits
              if (deposits.isNotEmpty) ...[
                Text('All deposits', style: Theme.of(context).textTheme.titleMedium),
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
                    itemCount: deposits.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final dep = deposits[i];
                      final date = DateTime.tryParse(dep['date'] as String? ?? '');
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            const Icon(Icons.add_circle_outline, size: 18, color: AppColors.income),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(dep['note'] as String? ?? 'Deposit', style: Theme.of(context).textTheme.labelLarge),
                                  if (date != null)
                                    Text(DateFormat('MMM d, yyyy').format(date), style: Theme.of(context).textTheme.bodySmall),
                                ],
                              ),
                            ),
                            Text('+${fmt.format(dep['amount'])}', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.income)),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
              const SizedBox(height: 80),
            ],
          );
        },
      ),
    );
  }
}
