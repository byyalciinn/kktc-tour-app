import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { CommunityPost } from '@/types';
import { useCommunityStore, useAuthStore, useThemeStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';

const { width, height } = Dimensions.get('window');

export default function ModerationScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  // Stores
  const { user } = useAuthStore();
  const {
    pendingPosts,
    isLoading,
    isRefreshing,
    fetchPendingPosts,
    approvePost,
    rejectPost,
  } = useCommunityStore();

  // Local state
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load pending posts on mount
  useEffect(() => {
    fetchPendingPosts();
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchPendingPosts();
  }, [fetchPendingPosts]);

  // Handle approve
  const handleApprove = async (post: CommunityPost) => {
    if (!user) return;

    Alert.alert(
      t('community.moderation.approve'),
      t('community.moderation.approveConfirm', { title: post.title || t('community.types.' + post.type) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('community.moderation.approve'),
          onPress: async () => {
            setIsProcessing(true);
            const { success, error } = await approvePost(post.id, user.id);
            setIsProcessing(false);

            if (success) {
              Alert.alert(t('common.success'), t('community.moderation.approved'));
            } else {
              Alert.alert(t('common.error'), error || t('errors.generic'));
            }
          },
        },
      ]
    );
  };

  // Handle reject
  const handleReject = (post: CommunityPost) => {
    setSelectedPost(post);
    setRejectReason('');
    setIsRejectModalVisible(true);
  };

  // Submit rejection
  const submitRejection = async () => {
    if (!user || !selectedPost || !rejectReason.trim()) {
      Alert.alert(t('common.error'), t('community.moderation.rejectReasonRequired'));
      return;
    }

    setIsProcessing(true);
    const { success, error } = await rejectPost(selectedPost.id, user.id, rejectReason.trim());
    setIsProcessing(false);

    if (success) {
      setIsRejectModalVisible(false);
      setSelectedPost(null);
      setRejectReason('');
      Alert.alert(t('common.success'), t('community.moderation.rejected'));
    } else {
      Alert.alert(t('common.error'), error || t('errors.generic'));
    }
  };

  // Get post type info
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'photo':
        return { icon: 'camera', label: t('community.types.photo'), color: '#4A90D9' };
      case 'review':
        return { icon: 'chatbubble', label: t('community.types.review'), color: '#50C878' };
      case 'suggestion':
        return { icon: 'bulb', label: t('community.types.suggestion'), color: '#FFB347' };
      default:
        return { icon: 'document', label: '', color: colors.primary };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render post item
  const renderPostItem = ({ item }: { item: CommunityPost }) => {
    const typeInfo = getTypeInfo(item.type);

    return (
      <View
        style={[
          styles.postCard,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: getAvatarUrl(item.user?.avatarUrl, item.userId) }}
              style={styles.avatar}
            />
            <View style={styles.userText}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {item.user?.fullName || t('community.anonymous')}
              </Text>
              <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: `${typeInfo.color}20` }]}>
            <Ionicons name={typeInfo.icon as any} size={14} color={typeInfo.color} />
            <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
          </View>
        </View>

        {/* Content */}
        {item.title && (
          <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
        )}

        {item.content && (
          <Text style={[styles.postContent, { color: colors.text }]} numberOfLines={4}>
            {item.content}
          </Text>
        )}

        {/* Images */}
        {item.images && item.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScroll}
            contentContainerStyle={styles.imagesContainer}
          >
            {item.images.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.postImage} />
            ))}
          </ScrollView>
        )}

        {/* Location */}
        {item.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {item.location}
            </Text>
          </View>
        )}

        {/* Tour reference */}
        {item.tour && (
          <View style={[styles.tourReference, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Image source={{ uri: item.tour.image }} style={styles.tourImage} />
            <Text style={[styles.tourTitle, { color: colors.text }]} numberOfLines={1}>
              {item.tour.title}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item)}
            disabled={isProcessing}
          >
            <Ionicons name="close-circle" size={20} color="#FF6B6B" />
            <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
              {t('community.moderation.reject')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton, { backgroundColor: colors.primary }]}
            onPress={() => handleApprove(item)}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={[styles.actionButtonText, { color: '#FFF' }]}>
              {t('community.moderation.approve')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t('community.moderation.noPending')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {t('community.moderation.allClear')}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(26,26,26,0.95)' : 'rgba(243,242,238,0.95)' },
            ]}
          />
        )}
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('community.moderation.title')}
          </Text>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingPosts.length}</Text>
          </View>
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={pendingPosts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />

      {/* Reject Modal */}
      <Modal
        visible={isRejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF' },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('community.moderation.rejectReason')}
            </Text>
            <TextInput
              style={[
                styles.reasonInput,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: colors.text,
                },
              ]}
              placeholder={t('community.moderation.rejectReasonPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setIsRejectModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalRejectButton,
                  !rejectReason.trim() && { opacity: 0.5 },
                ]}
                onPress={submitRejection}
                disabled={!rejectReason.trim() || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>
                    {t('community.moderation.reject')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  pendingBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFF',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  postCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  postTime: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imagesScroll: {
    marginBottom: 12,
  },
  imagesContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  postImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tourReference: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  tourImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  tourTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  approveButton: {},
  actionButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 16,
  },
  reasonInput: {
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    minHeight: 120,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalRejectButton: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
});
