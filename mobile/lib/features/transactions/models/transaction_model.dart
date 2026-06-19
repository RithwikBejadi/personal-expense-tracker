import 'package:equatable/equatable.dart';

enum TransactionType { income, expense }

class CategoryInfo {
  final String name;
  final String color;
  final String icon;

  const CategoryInfo({required this.name, required this.color, required this.icon});

  factory CategoryInfo.fromJson(Map<String, dynamic> json) => CategoryInfo(
        name:  json['name']  as String? ?? '',
        color: json['color'] as String? ?? '#A3A3A3',
        icon:  json['icon']  as String? ?? 'tag',
      );
}

class TransactionModel extends Equatable {
  final String id;
  final String? categoryId;
  final double amount;
  final TransactionType type;
  final String? description;
  final String? note;
  final DateTime date;
  final DateTime createdAt;
  final CategoryInfo? category;

  const TransactionModel({
    required this.id,
    this.categoryId,
    required this.amount,
    required this.type,
    this.description,
    this.note,
    required this.date,
    required this.createdAt,
    this.category,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) => TransactionModel(
        id:          json['id'] as String,
        categoryId:  json['categoryId'] as String?,
        amount:      double.parse(json['amount'].toString()),
        type:        json['type'] == 'INCOME' ? TransactionType.income : TransactionType.expense,
        description: json['description'] as String?,
        note:        json['note'] as String?,
        date:        DateTime.parse(json['date'] as String),
        createdAt:   DateTime.parse(json['createdAt'] as String),
        category: json['category'] != null
            ? CategoryInfo.fromJson(json['category'] as Map<String, dynamic>)
            : null,
      );

  bool get isIncome  => type == TransactionType.income;
  bool get isExpense => type == TransactionType.expense;

  @override
  List<Object?> get props => [id];
}
