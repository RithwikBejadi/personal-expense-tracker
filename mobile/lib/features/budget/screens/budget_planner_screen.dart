import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../shared/widgets/app_button.dart';
import '../providers/budget_provider.dart';

class _Cat { final String id, name; const _Cat(this.id, this.name); }

class BudgetPlannerScreen extends ConsumerStatefulWidget {
  final int month, year;
  const BudgetPlannerScreen({super.key, required this.month, required this.year});

  @override
  ConsumerState<BudgetPlannerScreen> createState() => _BudgetPlannerScreenState();
}

class _BudgetPlannerScreenState extends ConsumerState<BudgetPlannerScreen> {
  final Map<String, TextEditingController> _controllers = {};
  List<_Cat> _categories = [];
  String? _budgetId;
  bool _loading = true;
  bool _saving  = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final catData = await ApiClient.instance.get(
        ApiConstants.categories,
        queryParameters: {'type': 'EXPENSE'},
      );
      final cats = (catData['categories'] as List)
          .map((e) => _Cat(e['id'] as String, e['name'] as String))
          .toList();

      for (final c in cats) {
        _controllers[c.id] = TextEditingController();
      }

      // Load existing budget if any
      try {
        final bData = await ApiClient.instance.get(
          '${ApiConstants.budgets}/${widget.month}/${widget.year}',
        );
        _budgetId = bData['budget']['id'] as String;
        final items = (bData['budget']['items'] as List).cast<Map<String, dynamic>>();
        for (final item in items) {
          final cid = item['categoryId'] as String;
          if (_controllers.containsKey(cid)) {
            _controllers[cid]!.text = double.parse(item['plannedAmount'].toString()).toStringAsFixed(0);
          }
        }
      } catch (_) {} // no budget yet — fine

      setState(() { _categories = cats; _loading = false; });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  double get _total => _controllers.values.fold(0, (sum, c) {
    return sum + (double.tryParse(c.text) ?? 0);
  });

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final items = _controllers.entries
          .where((e) => (double.tryParse(e.value.text) ?? 0) > 0)
          .map((e) => {'categoryId': e.key, 'plannedAmount': double.parse(e.value.text)})
          .toList();

      if (_budgetId == null) {
        // Create new
        await ref.read(budgetNotifierProvider.notifier).createBudget({
          'month':        widget.month,
          'year':         widget.year,
          'totalPlanned': _total,
          'items':        items,
        });
      } else {
        // Update items + total
        await Future.wait([
          ApiClient.instance.patch('${ApiConstants.budgets}/$_budgetId', data: {'totalPlanned': _total}),
          ref.read(budgetNotifierProvider.notifier).updateItems(_budgetId!, items),
        ]);
      }
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Budget saved')),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final monthLabel = DateFormat('MMMM yyyy').format(DateTime(widget.year, widget.month));
    final fmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: Text('Plan $monthLabel'),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Total bar
                Container(
                  color: AppColors.surface,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Total planned', style: Theme.of(context).textTheme.bodyMedium),
                      AnimatedBuilder(
                        animation: Listenable.merge(_controllers.values.toList()),
                        builder: (_, __) => Text(
                          fmt.format(_total),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _categories.length,
                    itemBuilder: (context, i) {
                      final cat = _categories[i];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors.neutral100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.category_outlined, size: 16, color: AppColors.textSecondary),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(cat.name, style: Theme.of(context).textTheme.labelLarge),
                            ),
                            SizedBox(
                              width: 110,
                              child: TextFormField(
                                controller: _controllers[cat.id],
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
                                textAlign: TextAlign.right,
                                decoration: InputDecoration(
                                  hintText: '0',
                                  prefixText: '\$ ',
                                  prefixStyle: Theme.of(context).textTheme.bodyMedium,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                                onChanged: (_) => setState(() {}),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // Save button
                Container(
                  color: AppColors.surface,
                  padding: const EdgeInsets.all(20),
                  child: AppButton(
                    label: _budgetId == null ? 'Create budget' : 'Save changes',
                    onPressed: _save,
                    isLoading: _saving,
                  ),
                ),
              ],
            ),
    );
  }
}
