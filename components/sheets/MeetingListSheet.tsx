import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { MeetingSession } from '@/types';
import { useThemeStore } from '@/stores';

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.7;

interface MeetingListSheetProps {
  visible: boolean;
  sessions: MeetingSession[];
  isLoading?: boolean;
  onClose: () => void;
  onStartNew: () => void;
  onOpenSession: (session: MeetingSession) => void;
  onShowInvite: (session: MeetingSession) => void;
}

export default function MeetingListSheet({
  visible,
  sessions,
  isLoading,
  onClose,
  onStartNew,
  onOpenSession,
  onShowInvite,
}: MeetingListSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height - SHEET_HEIGHT,
          useNativeDriver: true,
          damping: 24,
          stiffness: 260,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 24,
        stiffness: 260,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  }, [slideAnim, fadeAnim, onClose]);

  const handleStartNew = useCallback(() => {
    Alert.alert(
      t('meeting.list.newConfirmTitle'),
      t('meeting.list.newConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('meeting.list.newConfirmAction'), onPress: onStartNew },
      ]
    );
  }, [onStartNew, t]);

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

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (!sessions.length) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('meeting.list.emptyTitle')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('meeting.list.emptySubtitle')}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: colors.primary + '22' }]}>
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {t(`meeting.status.${item.status}`)}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.destinationText}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {formatDate(item.scheduledAt || item.createdAt)}
            </Text>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.border }]}
                onPress={() => onOpenSession(item)}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>{t('meeting.list.open')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.border }]}
                onPress={() => onShowInvite(item)}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>{t('meeting.list.invite')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    );
  }, [isLoading, sessions, colors, isDark, t, formatDate, onOpenSession, onShowInvite]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' },
              ]}
            />
          )}
        </Animated.View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: colors.card,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('meeting.list.title')}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {content}

        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: colors.primary }]}
          onPress={handleStartNew}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newButtonText}>{t('meeting.list.newButton')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,120,0.3)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
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
  cardSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  newButton: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  newButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});
