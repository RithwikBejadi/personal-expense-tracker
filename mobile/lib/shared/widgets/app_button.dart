import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_theme.dart';

enum AppButtonVariant { primary, secondary, ghost, destructive }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final AppButtonVariant variant;
  final Widget? icon;
  final double? width;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.width,
  });

  void _handlePress() {
    if (onPressed != null) {
      HapticFeedback.lightImpact();
      onPressed!();
    }
  }

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: variant == AppButtonVariant.primary ? Colors.white : AppColors.textPrimary,
            ),
          )
        : icon != null
            ? Row(mainAxisSize: MainAxisSize.min, children: [icon!, const SizedBox(width: 8), Text(label)])
            : Text(label);

    final button = switch (variant) {
      AppButtonVariant.primary     => ElevatedButton(onPressed: isLoading ? null : _handlePress, child: child),
      AppButtonVariant.secondary   => OutlinedButton(onPressed: isLoading ? null : _handlePress, child: child),
      AppButtonVariant.ghost       => TextButton(onPressed: isLoading ? null : _handlePress, child: child),
      AppButtonVariant.destructive => ElevatedButton(
          onPressed: isLoading ? null : _handlePress,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.expense,
            foregroundColor: Colors.white,
          ),
          child: child,
        ),
    };

    if (width != null) return SizedBox(width: width, child: button);
    return button;
  }
}
