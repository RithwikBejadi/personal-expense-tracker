import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/empty_state.dart';
import '../providers/recurring_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';

class RecurringScreen extends ConsumerWidget {
  const RecurringScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final due  = ref.watch(dueRecurringProvider);
    final all  = ref.watch(recurringProvider);
    final fmt  = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recurring'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        actions: [
          IconButton(
            icon: const Icon(Icons.add, size: 22),
            onPressed: () => _showAddSheet(context, ref),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(recurringProvider);
          ref.invalidate(dueRecurringProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Due section
            due.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (list) {
                if (list.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(color: AppColors.expense, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 8),
                        Text('Due now (${list.length})', style: Theme.of(context).textTheme.titleSmall),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ...list.map((r) => _RecurringTile(
                      item: r,
                      fmt: fmt,
                      isDue: true,
                      onApply: () => _confirmApply(context, ref, r['id'] as String, r['description'] as String),
                      onDelete: () => ref.read(recurringNotifierProvider.notifier).delete(r['id'] as String),
                      onToggle: (v) => ref.read(recurringNotifierProvider.notifier).toggleActive(r['id'] as String, v),
                    )),
                    const SizedBox(height: 20),
                  ],
                );
              },
            ),

            // All active
            all.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(e.toString())),
              data: (list) {
                final active   = list.where((r) => r['isActive'] == true).toList();
                final inactive = list.where((r) => r['isActive'] != true).toList();

                if (list.isEmpty) {
                  return EmptyState(
                    icon: Icons.repeat_outlined,
                    title: 'No recurring transactions',
                    subtitle: 'Add bills, subscriptions or any regular payment',
                    action: ElevatedButton(
                      onPressed: () => _showAddSheet(context, ref),
                      child: const Text('Add recurring'),
                    ),
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (active.isNotEmpty) ...[
                      Text('Active (${active.length})', style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 10),
                      ...active.map((r) => _RecurringTile(
                        item: r,
                        fmt: fmt,
                        isDue: false,
                        onApply: () => _confirmApply(context, ref, r['id'] as String, r['description'] as String),
                        onDelete: () => ref.read(recurringNotifierProvider.notifier).delete(r['id'] as String),
                        onToggle: (v) => ref.read(recurringNotifierProvider.notifier).toggleActive(r['id'] as String, v),
                      )),
                    ],
                    if (inactive.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Text('Inactive (${inactive.length})', style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 10),
                      ...inactive.map((r) => _RecurringTile(
                        item: r,
                        fmt: fmt,
                        isDue: false,
                        onApply: () => _confirmApply(context, ref, r['id'] as String, r['description'] as String),
                        onDelete: () => ref.read(recurringNotifierProvider.notifier).delete(r['id'] as String),
                        onToggle: (v) => ref.read(recurringNotifierProvider.notifier).toggleActive(r['id'] as String, v),
                      )),
                    ],
                  ],
                );
              },
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  void _confirmApply(BuildContext context, WidgetRef ref, String id, String name) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Log "$name"'),
        content: const Text('This will create a transaction and advance the next due date.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(recurringNotifierProvider.notifier).apply(id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transaction logged')));
              }
            },
            child: const Text('Log it'),
          ),
        ],
      ),
    );
  }

  void _showAddSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => _AddRecurringSheet(ref: ref),
    );
  }
}

class _RecurringTile extends StatelessWidget {
  final Map<String, dynamic> item;
  final NumberFormat fmt;
  final bool isDue;
  final VoidCallback onApply;
  final VoidCallback onDelete;
  final void Function(bool) onToggle;

  const _RecurringTile({
    required this.item,
    required this.fmt,
    required this.isDue,
    required this.onApply,
    required this.onDelete,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final name       = item['description'] as String;
    final amount     = double.parse(item['amount'].toString());
    final type       = item['type'] as String;
    final freq       = item['frequency'] as String;
    final isActive   = item['isActive'] as bool? ?? true;
    final nextDue    = DateTime.tryParse(item['nextDueDate'] as String? ?? '');
    final isIncome   = type == 'INCOME';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: isDue ? AppColors.expense.withOpacity(0.3) : AppColors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: AppColors.neutral100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            isIncome ? Icons.arrow_downward : Icons.arrow_upward,
            size: 16,
            color: isIncome ? AppColors.income : AppColors.expense,
          ),
        ),
        title: Text(name, style: Theme.of(context).textTheme.labelLarge),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(freq.toLowerCase(), style: Theme.of(context).textTheme.bodySmall),
            if (nextDue != null)
              Text(
                'Next: ${DateFormat('MMM d').format(nextDue)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: isDue ? AppColors.expense : AppColors.textMuted,
                ),
              ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              fmt.format(amount),
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: isIncome ? AppColors.income : AppColors.expense,
              ),
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, size: 18, color: AppColors.textMuted),
              onSelected: (v) {
                if (v == 'apply')  onApply();
                if (v == 'toggle') onToggle(!isActive);
                if (v == 'delete') onDelete();
              },
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'apply',  child: Text('Log now')),
                PopupMenuItem(value: 'toggle', child: Text(isActive ? 'Deactivate' : 'Activate')),
                const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: AppColors.expense))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AddRecurringSheet extends StatefulWidget {
  final WidgetRef ref;
  const _AddRecurringSheet({required this.ref});
  @override
  State<_AddRecurringSheet> createState() => _AddRecurringSheetState();
}

class _AddRecurringSheetState extends State<_AddRecurringSheet> {
  final _descCtrl   = TextEditingController();
  final _amountCtrl = TextEditingController();
  String _type      = 'EXPENSE';
  String _frequency = 'MONTHLY';
  bool _saving = false;

  @override
  void dispose() {
    _descCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('New recurring', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 20),
          // Type
          Row(
            children: ['EXPENSE', 'INCOME'].map((t) => Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: ChoiceChip(
                  label: Text(t == 'EXPENSE' ? 'Expense' : 'Income'),
                  selected: _type == t,
                  onSelected: (_) => setState(() => _type = t),
                  selectedColor: AppColors.neutral950,
                  labelStyle: TextStyle(color: _type == t ? Colors.white : AppColors.textSecondary, fontSize: 13),
                ),
              ),
            )).toList(),
          ),
          const SizedBox(height: 16),
          TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Description')),
          const SizedBox(height: 12),
          TextField(
            controller: _amountCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
            decoration: const InputDecoration(labelText: 'Amount', prefixText: '\$ '),
          ),
          const SizedBox(height: 16),
          Text('Frequency', style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((f) => ChoiceChip(
              label: Text(f[0] + f.substring(1).toLowerCase()),
              selected: _frequency == f,
              onSelected: (_) => setState(() => _frequency = f),
              selectedColor: AppColors.neutral950,
              labelStyle: TextStyle(color: _frequency == f ? Colors.white : AppColors.textSecondary, fontSize: 13),
              showCheckmark: false,
            )).toList(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : () async {
                if (_descCtrl.text.isEmpty || _amountCtrl.text.isEmpty) return;
                setState(() => _saving = true);
                try {
                  await widget.ref.read(recurringNotifierProvider.notifier).create({
                    'description': _descCtrl.text.trim(),
                    'amount':      double.parse(_amountCtrl.text),
                    'type':        _type,
                    'frequency':   _frequency,
                    'startDate':   DateFormat('yyyy-MM-dd').format(DateTime.now()),
                  });
                  if (mounted) Navigator.pop(context);
                } catch (e) {
                  if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                } finally {
                  if (mounted) setState(() => _saving = false);
                }
              },
              child: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Add recurring'),
            ),
          ),
        ],
      ),
    );
  }
}
