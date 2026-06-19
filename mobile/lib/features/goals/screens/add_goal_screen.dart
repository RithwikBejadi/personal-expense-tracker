import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:currency_text_input_formatter/currency_text_input_formatter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';
import '../providers/goals_provider.dart';

class AddGoalScreen extends ConsumerStatefulWidget {
  const AddGoalScreen({super.key});
  @override
  ConsumerState<AddGoalScreen> createState() => _AddGoalScreenState();
}

class _AddGoalScreenState extends ConsumerState<AddGoalScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _nameCtrl    = TextEditingController();
  final _amountCtrl  = TextEditingController();
  final _currencyFormatter = CurrencyTextInputFormatter.currency(symbol: '', decimalDigits: 2);
  DateTime? _targetDate;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      await ref.read(goalsNotifierProvider.notifier).create({
        'name':         _nameCtrl.text.trim(),
        'targetAmount': double.parse(_amountCtrl.text.replaceAll(',', '')),
        if (_targetDate != null) 'targetDate': DateFormat('yyyy-MM-dd').format(_targetDate!),
      });
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New goal'),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => context.pop()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppTextField(
                label: 'Goal name',
                hint: 'e.g. Emergency fund',
                controller: _nameCtrl,
                validator: (v) => (v == null || v.isEmpty) ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Target amount',
                hint: '0.00',
                controller: _amountCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [_currencyFormatter],
                prefixIcon: const Padding(padding: EdgeInsets.only(left: 14, right: 8), child: Text('\$', style: TextStyle(fontSize: 16, color: AppColors.textSecondary))),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Amount is required';
                  if ((double.tryParse(v.replaceAll(',', '')) ?? 0) <= 0) return 'Must be > 0';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              Text('Target date (optional)', style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 8),
              InkWell(
                onTap: () async {
                  HapticFeedback.lightImpact();
                  final picked = await showDatePicker(
                    context:     context,
                    initialDate: _targetDate ?? DateTime.now().add(const Duration(days: 30)),
                    firstDate:   DateTime.now(),
                    lastDate:    DateTime(2040),
                    builder: (ctx, child) => Theme(
                      data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: AppColors.neutral950)),
                      child: child!,
                    ),
                  );
                  if (picked != null) setState(() => _targetDate = picked);
                },
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
                      Text(
                        _targetDate != null
                            ? DateFormat('MMM d, yyyy').format(_targetDate!)
                            : 'No target date',
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: _targetDate != null ? AppColors.textPrimary : AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              AppButton(label: 'Create goal', onPressed: _submit, isLoading: _isLoading),
            ],
          ),
        ),
      ),
    );
  }
}
