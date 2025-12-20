import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';

interface MeetingInviteSheetProps {
  visible: boolean;
  inviteCode: string | null;
  sessionTitle?: string;
  onClose: () => void;
}

export default function MeetingInviteSheet({
  visible,
  inviteCode,
  sessionTitle,
  onClose,
}: MeetingInviteSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const inviteLink = useMemo(() => {
    if (!inviteCode) return '';
    return `cyprigo://session/invite/${inviteCode}`;
  }, [inviteCode]);

  const qrUrl = useMemo(() => {
    if (!inviteLink) return '';
    // Prototype QR via remote image generator. Replace with local QR later.
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteLink)}`;
  }, [inviteLink]);

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('common.copied'), t('meeting.invite.linkCopied'));
  }, [inviteLink, t]);

  const handleShare = useCallback(async () => {
    if (!inviteLink) return;
    await Share.share({
      message: inviteLink,
      title: sessionTitle || t('meeting.invite.title'),
    });
  }, [inviteLink, sessionTitle, t]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
        <View style={[styles.card, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('meeting.invite.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {sessionTitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{sessionTitle}</Text>
          ) : null}

          {inviteCode ? (
            <>
              <View style={[styles.codeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
                  {t('meeting.invite.codeLabel')}
                </Text>
                <Text style={[styles.codeValue, { color: colors.text }]}>{inviteCode}</Text>
              </View>

              <View style={styles.linkRow}>
                <Text style={[styles.linkText, { color: colors.text }]} numberOfLines={1}>
                  {inviteLink}
                </Text>
                <TouchableOpacity onPress={handleCopy} style={styles.iconButton}>
                  <Ionicons name="copy-outline" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {qrUrl ? (
                <Image source={{ uri: qrUrl }} style={styles.qrImage} />
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={handleShare}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFF" />
                  <Text style={styles.actionText}>{t('meeting.invite.share')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('meeting.invite.missing')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  codeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  linkRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: 12,
  },
  actions: {
    marginTop: 16,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});
