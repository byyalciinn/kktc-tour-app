import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

/**
 * Admin Layout - Protected admin routes with consistent styling
 */
export default function AdminLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

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
