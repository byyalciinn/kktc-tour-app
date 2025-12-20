import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { MeetingInviteSheet } from '@/components/sheets';
import { useAuthStore, useMeetingStore, useThemeStore } from '@/stores';

export default function MeetingSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = typeof id === 'string' ? id : '';
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const { user } = useAuthStore();
  const {
    currentSession,
    participants,
    inviteCode,
    isLoading,
    isSubmitting,
    error,
    fetchSessionById,
    fetchParticipants,
    fetchInviteCode,
    startSession,
    endSession,
    leaveSession,
  } = useMeetingStore();

  const [isInviteVisible, setIsInviteVisible] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    fetchSessionById(sessionId);
    fetchParticipants(sessionId);
  }, [sessionId, fetchSessionById, fetchParticipants]);

  const isHost = useMemo(() => currentSession?.hostId === user?.id, [currentSession, user?.id]);

  const handleOpenInvite = useCallback(async () => {
    if (!sessionId) return;
    const code = await fetchInviteCode(sessionId);
    if (!code) {
      Alert.alert(t('common.error'), t('meeting.invite.missing'));
      return;
    }
    setIsInviteVisible(true);
  }, [fetchInviteCode, sessionId, t]);

  const handleStart = useCallback(async () => {
    if (!sessionId) return;
    const { success, error } = await startSession(sessionId);
    if (!success) {
      Alert.alert(t('common.error'), error || t('meeting.errors.updateFailed'));
    }
  }, [startSession, sessionId, t]);

  const handleEnd = useCallback(async () => {
    if (!sessionId) return;
    const { success, error } = await endSession(sessionId);
    if (!success) {
      Alert.alert(t('common.error'), error || t('meeting.errors.updateFailed'));
    }
  }, [endSession, sessionId, t]);

  const handleLeave = useCallback(async () => {
    if (!sessionId || !user?.id) return;
    const { success, error } = await leaveSession(sessionId, user.id);
    if (!success) {
      Alert.alert(t('common.error'), error || t('meeting.errors.updateFailed'));
      return;
    }
    router.back();
  }, [leaveSession, sessionId, user?.id, t]);

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t('meeting.list.noDate');
      const date = new Date(value);
      const isEnglish = (i18n.language || '').toLowerCase().startsWith('en');
      return date.toLocaleString(isEnglish ? 'en-US' : 'tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    },
    [i18n.language, t]
  );

  if (isLoading && !currentSession) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!currentSession) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {error || t('meeting.errors.sessionNotFound')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>{t('common.back')}</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>
                {t(`meeting.status.${currentSession.status}`)}
              </Text>
            </View>
            {isHost ? (
              <TouchableOpacity style={styles.inviteButton} onPress={handleOpenInvite}>
                <Ionicons name="qr-code-outline" size={18} color={colors.text} />
                <Text style={[styles.inviteText, { color: colors.text }]}>{t('meeting.invite.title')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{currentSession.title}</Text>
          <Text style={[styles.destination, { color: colors.textSecondary }]}>
            {currentSession.destinationText}
          </Text>

          <View style={[styles.metaCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatDate(currentSession.scheduledAt || currentSession.createdAt)}
            </Text>
          </View>

          {currentSession.description ? (
            <Text style={[styles.description, { color: colors.text }]}>{currentSession.description}</Text>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('meeting.participants.title')}</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {participants.length}/{currentSession.maxParticipants}
            </Text>
          </View>

          <View style={styles.participantList}>
            {participants.map((participant) => {
              const isOwner = participant.role === 'host';
              return (
                <View
                  key={participant.id}
                  style={[
                    styles.participantCard,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                >
                  <Ionicons name="person-circle-outline" size={24} color={colors.textSecondary} />
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantName, { color: colors.text }]}>
                      {participant.user?.fullName || t('meeting.participants.anonymous')}
                    </Text>
                    <Text style={[styles.participantRole, { color: colors.textSecondary }]}>
                      {isOwner ? t('meeting.participants.host') : t('meeting.participants.member')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.actions}>
            {isHost ? (
              <>
                {currentSession.status === 'draft' ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                    onPress={handleStart}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.primaryButtonText}>{t('meeting.actions.start')}</Text>
                  </TouchableOpacity>
                ) : null}
                {currentSession.status !== 'ended' ? (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={handleEnd}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      {t('meeting.actions.end')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleLeave}
                disabled={isSubmitting}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {t('meeting.actions.leave')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <MeetingInviteSheet
        visible={isInviteVisible}
        inviteCode={inviteCode}
        sessionTitle={currentSession.title}
        onClose={() => setIsInviteVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inviteText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  title: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  destination: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  metaCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  description: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  sectionHeader: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  participantList: {
    marginTop: 12,
    gap: 10,
  },
  participantCard: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  participantRole: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});
