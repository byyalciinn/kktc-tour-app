import { Stack, router } from 'expo-router';
import { useColorScheme, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';

/**
 * Admin Layout - Protected admin routes with role-based access control
 */
export default function AdminLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { profile, user, loading, initialized } = useAuthStore();

  // Admin guard: redirect non-admin users
  useEffect(() => {
    if (!initialized || loading) return;

    // Not logged in
    if (!user) {
      router.replace('/(auth)');
      return;
    }

    // Not admin
    if (profile?.role !== 'admin') {
      router.replace('/(tabs)');
      return;
    }
  }, [user, profile, loading, initialized]);

  // Show loading while checking auth
  if (!initialized || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // Block render for non-admin users (guard will redirect)
  if (!user || profile?.role !== 'admin') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Bu sayfaya erişim yetkiniz yok
        </Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ title: 'Tur Yönetimi' }}
      />
      <Stack.Screen 
        name="add" 
        options={{ title: 'Yeni Tur Ekle' }}
      />
      <Stack.Screen 
        name="edit" 
        options={{ title: 'Tur Düzenle' }}
      />
      <Stack.Screen 
        name="categories" 
        options={{ title: 'Kategori Yönetimi' }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
