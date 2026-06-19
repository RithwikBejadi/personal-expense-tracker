import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/storage/local_storage.dart';
import '../models/user_model.dart';

// Holds the current user; null = logged out
final authStateProvider = AsyncNotifierProvider<AuthNotifier, UserModel?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<UserModel?> {
  @override
  Future<UserModel?> build() async {
    final hasToken = await LocalStorage.instance.hasToken();
    if (!hasToken) return null;
    try {
      final data = await ApiClient.instance.get(ApiConstants.me);
      return UserModel.fromJson(data['user'] as Map<String, dynamic>);
    } catch (_) {
      await LocalStorage.instance.deleteToken();
      return null;
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final data = await ApiClient.instance.post(ApiConstants.login, data: {
        'email': email,
        'password': password,
      });
      await LocalStorage.instance.saveToken(data['token'] as String);
      return UserModel.fromJson(data['user'] as Map<String, dynamic>);
    });
  }

  Future<void> register(String name, String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final data = await ApiClient.instance.post(ApiConstants.register, data: {
        'name': name,
        'email': email,
        'password': password,
      });
      await LocalStorage.instance.saveToken(data['token'] as String);
      return UserModel.fromJson(data['user'] as Map<String, dynamic>);
    });
  }

  Future<void> logout() async {
    await LocalStorage.instance.deleteToken();
    state = const AsyncData(null);
  }
}
