/**
 * Blocked Users Screen
 * 
 * Displays list of users blocked by the current user
 * Allows unblocking users
 */

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useThemeStore, useBlockStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';
import { BlockedUserInfo } from '@/stores/blockStore';

export default function BlockedUsersScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const { user } = useAuthStore();
  const { blockedUsers, isLoading, fetchBlockedUsersWithDetails, unblockUser } = useBlockStore();

  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Load blocked users on mount
  useEffect(() => {
    if (user?.id) {
      fetchBlockedUsersWithDetails(user.id);
    }
  }, [user?.id, fetchBlockedUsersWithDetails]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchBlockedUsersWithDetails(user.id);
    setRefreshing(false);
  }, [user?.id, fetchBlockedUsersWithDetails]);

  // Handle unblock user
  const handleUnblock = (blockedUser: BlockedUserInfo) => {
    if (!user?.id) return;

    Alert.alert(
      t('profile.unblockUserTitle'),
      t('profile.unblockUserMessage', { name: blockedUser.user?.fullName || t('community.anonymous') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.unblock'),
          onPress: async () => {
            setUnblockingId(blockedUser.blockedId);
            const { success, error } = await unblockUser(user.id, blockedUser.blockedId);
            setUnblockingId(null);

            if (success) {
              // Refresh the list
              fetchBlockedUsersWithDetails(user.id);
              Alert.alert(t('profile.userUnblocked'), t('profile.userUnblockedMessage'));
            } else {
              Alert.alert(t('common.error'), error || t('common.error'));
            }
          },
        },
      ]
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('profile.blockedUsers')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      {isLoading && blockedUsers.length === 0 ? (
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t('profile.noBlockedUsers')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {t('profile.noBlockedUsersSubtitle')}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('profile.blockedUsersInfo')}
              </Text>
              
              {blockedUsers.map((blockedUser) => (
                <View
                  key={blockedUser.id}
                  style={[
                    styles.userCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <Image
                    source={{ uri: getAvatarUrl(blockedUser.user?.avatarUrl, blockedUser.blockedId) }}
                    style={styles.userAvatar}
                  />
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {blockedUser.user?.fullName || t('community.anonymous')}
                    </Text>
                    <Text style={[styles.blockedDate, { color: colors.textSecondary }]}>
                      {t('profile.blockedOn', { date: formatDate(blockedUser.blockedAt) })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.unblockButton,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                    ]}
                    onPress={() => handleUnblock(blockedUser)}
                    disabled={unblockingId === blockedUser.blockedId}
                  >
                    {unblockingId === blockedUser.blockedId ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={[styles.unblockButtonText, { color: colors.primary }]}>
                        {t('profile.unblock')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  blockedDate: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  unblockButtonText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
});
