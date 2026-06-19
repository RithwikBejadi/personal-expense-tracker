import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../providers/transaction_provider.dart';

class _Category {
  final String id, name, color, icon, type;
  const _Category({required this.id, required this.name, required this.color, required this.icon, required this.type});
  factory _Category.fromJson(Map<String, dynamic> j) => _Category(
    id: j['id'], name: j['name'], color: j['color'] ?? '#A3A3A3', icon: j['icon'] ?? 'tag', type: j['type'],
  );
}

final _categoriesProvider = FutureProvider<List<_Category>>((ref) async {
  final data = await ApiClient.instance.get(ApiConstants.categories);
  return (data['categories'] as List).map((e) => _Category.fromJson(e)).toList();
});

class AddTransactionScreen extends ConsumerStatefulWidget {
  const AddTransactionScreen({super.key});
  @override
  ConsumerState<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends ConsumerState<AddTransactionScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _amountCtrl  = TextEditingController();
  final _descCtrl    = TextEditingController();
  final _noteCtrl    = TextEditingController();

  String   _type       = 'EXPENSE';
  String?  _categoryId;
  DateTime _date       = DateTime.now();
  bool     _isLoading  = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      await ref.read(transactionNotifierProvider.notifier).create({
        'amount':      double.parse(_amountCtrl.text.replaceAll(',', '')),
        'type':        _type,
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'note':        _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
        'categoryId':  _categoryId,
        'date':        DateFormat('yyyy-MM-dd').format(_date),
      });
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context:      context,
      initialDate:  _date,
      firstDate:    DateTime(2020),
      lastDate:     DateTime.now(),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(primary: AppColors.neutral950),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _date = picked);
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(_categoriesProvider);
    final filtered   = categories.valueOrNull?.where((c) => c.type == _type).toList() ?? [];

    return Scaffold(
      appBar: AppBar(title: const Text('Add transaction')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Type toggle
              Container(
                decoration: BoxDecoration(
                  color: AppColors.neutral100,
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    _TypeTab(label: 'Expense', selected: _type == 'EXPENSE', onTap: () => setState(() { _type = 'EXPENSE'; _categoryId = null; })),
                    _TypeTab(label: 'Income',  selected: _type == 'INCOME',  onTap: () => setState(() { _type = 'INCOME';  _categoryId = null; })),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Amount
              AppTextField(
                label: 'Amount',
                hint: '0.00',
                controller: _amountCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.,]'))],
                prefixIcon: const Padding(padding: EdgeInsets.only(left: 14, right: 8), child: Text('\$', style: TextStyle(fontSize: 16, color: AppColors.textSecondary))),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Amount is required';
                  if (double.tryParse(v.replaceAll(',', '')) == null) return 'Invalid amount';
                  if (double.parse(v.replaceAll(',', '')) <= 0) return 'Must be > 0';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Description
              AppTextField(
                label: 'Description',
                hint: 'e.g. Grocery run',
                controller: _descCtrl,
              ),
              const SizedBox(height: 16),

              // Category
              Text('Category', style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 8),
              categories.when(
                loading: () => const LinearProgressIndicator(),
                error:   (_, __) => const SizedBox.shrink(),
                data: (_) => Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: filtered.map((cat) {
                    final selected = _categoryId == cat.id;
                    return FilterChip(
                      label: Text(cat.name),
                      selected: selected,
                      onSelected: (_) => setState(() => _categoryId = selected ? null : cat.id),
                      selectedColor: AppColors.neutral950,
                      labelStyle: TextStyle(
                        color: selected ? Colors.white : AppColors.textSecondary,
                        fontSize: 13,
                      ),
                      showCheckmark: false,
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),

              // Date
              Text('Date', style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 8),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(10),
                    color: AppColors.surface,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.textSecondary),
                      const SizedBox(width: 12),
                      Text(DateFormat('MMM d, yyyy').format(_date), style: Theme.of(context).textTheme.bodyLarge),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Note
              AppTextField(
                label: 'Note (optional)',
                controller: _noteCtrl,
                maxLines: 2,
              ),
              const SizedBox(height: 32),

              AppButton(label: 'Save transaction', onPressed: _submit, isLoading: _isLoading),
            ],
          ),
        ),
      ),
    );
  }
}

class _TypeTab extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _TypeTab({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: selected ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4, offset: const Offset(0, 1))] : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: selected ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
