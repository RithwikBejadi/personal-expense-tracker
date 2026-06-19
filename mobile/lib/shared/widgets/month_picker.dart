import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme/app_theme.dart';

class MonthPicker extends StatelessWidget {
  final int month;
  final int year;
  final void Function(int month, int year) onChanged;

  const MonthPicker({
    super.key,
    required this.month,
    required this.year,
    required this.onChanged,
  });

  void _prev() {
    if (month == 1) {
      onChanged(12, year - 1);
    } else {
      onChanged(month - 1, year);
    }
  }

  void _next() {
    final now = DateTime.now();
    final next = DateTime(year, month + 1);
    if (next.isAfter(DateTime(now.year, now.month))) return;
    if (month == 12) {
      onChanged(1, year + 1);
    } else {
      onChanged(month + 1, year);
    }
  }

  @override
  Widget build(BuildContext context) {
    final label = DateFormat('MMMM yyyy').format(DateTime(year, month));
    final now   = DateTime.now();
    final isCurrentMonth = month == now.month && year == now.year;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _NavButton(icon: Icons.chevron_left, onTap: _prev),
        const SizedBox(width: 4),
        Text(label, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(width: 4),
        _NavButton(icon: Icons.chevron_right, onTap: isCurrentMonth ? null : _next),
      ],
    );
  }
}

class _NavButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  const _NavButton({required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 18, color: onTap == null ? AppColors.textMuted : AppColors.textPrimary),
      ),
    );
  }
}
