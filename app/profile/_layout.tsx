import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="personal-info" />
      <Stack.Screen name="membership-card" />
      <Stack.Screen name="help" />
      <Stack.Screen name="contact" />
    </Stack>
  );
}
