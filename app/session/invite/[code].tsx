import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useMeetingStore, useThemeStore } from '@/stores';

export default function JoinMeetingScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { user } = useAuthStore();
  const { joinSessionByCode, isSubmitting } = useMeetingStore();

  const inviteCode = typeof code === 'string' ? code : '';

  const handleJoin = useCallback(async () => {
    if (!inviteCode) {
      Alert.alert(t('common.error'), t('meeting.errors.inviteMissing'));
      return;
    }

    const { success, session, error } = await joinSessionByCode(inviteCode);
    if (!success || !session) {
      Alert.alert(t('common.error'), error || t('meeting.errors.joinFailed'));
      return;
    }

    router.replace(`/session/${session.id}` as any);
  }, [inviteCode, joinSessionByCode, t]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          <View style={styles.card}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              {t('meeting.join.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('meeting.join.loginRequired')}
            </Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)')}
            >
              <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.card}>
          <Ionicons name="people-outline" size={40} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t('meeting.join.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('meeting.join.subtitle')}
          </Text>

          <View style={[styles.codeBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{inviteCode}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleJoin}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? t('common.loading') : t('meeting.join.button')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  codeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});
