import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useCommunityStore, useAuthStore, useThemeStore } from '@/stores';
import { CommunityPost, CommunityPostType } from '@/types';
import { getAvatarUrl } from '@/lib/avatarService';
import { CommunityPostCard } from '@/components/cards';
import { CreatePostSheet, PostDetailSheet, ProfileSheet } from '@/components/sheets';

const { width } = Dimensions.get('window');

// Filter options
const FILTER_OPTIONS: { id: CommunityPostType | 'all'; icon: string; labelKey: string }[] = [
  { id: 'all', icon: 'apps-outline', labelKey: 'community.filters.all' },
  { id: 'photo', icon: 'camera-outline', labelKey: 'community.filters.photos' },
  { id: 'review', icon: 'chatbubble-outline', labelKey: 'community.filters.reviews' },
  { id: 'suggestion', icon: 'bulb-outline', labelKey: 'community.filters.suggestions' },
];

export default function CommunityScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Auth
  const { user, profile } = useAuthStore();
  

  // Community store
  const {
    posts,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    fetchPosts,
    fetchMorePosts,
    toggleLike,
    setSelectedPost,
  } = useCommunityStore();

  // Local state
  const [activeFilter, setActiveFilter] = useState<CommunityPostType | 'all'>('all');
  const [isCreateSheetVisible, setIsCreateSheetVisible] = useState(false);
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<CommunityPost | null>(null);
  const [isProfileSheetVisible, setIsProfileSheetVisible] = useState(false);

  // Spin animation for refresh
  useEffect(() => {
    if (isRefreshing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isRefreshing]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Load posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Filter posts by type
  const filteredPosts = useMemo(() => {
    return activeFilter === 'all' 
      ? posts 
      : posts.filter(post => post.type === activeFilter);
  }, [posts, activeFilter]);

  // All posts visible to all users (no premium restriction)
  const visiblePosts = filteredPosts;

  // Handlers
  const handleRefresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchMorePosts();
    }
  }, [isLoadingMore, hasMore, fetchMorePosts]);

  const handlePostPress = useCallback((post: CommunityPost) => {
    setSelectedPostForDetail(post);
    setIsDetailSheetVisible(true);
  }, []);

  const handleLikePress = useCallback(async (post: CommunityPost) => {
    if (!user) return;
    await toggleLike(user.id, post.id);
  }, [user, toggleLike]);

  const handleCreatePress = useCallback(() => {
    setIsCreateSheetVisible(true);
  }, []);

  const handlePostCreated = useCallback(() => {
    setIsCreateSheetVisible(false);
    // Refresh to show new post (will be pending, but user can see their own)
  }, []);

  // Handle avatar press - open profile sheet
  const handleAvatarPress = useCallback(() => {
    setIsProfileSheetVisible(true);
  }, []);

  // Handle delete post
  const handleDeletePost = useCallback(async (post: CommunityPost) => {
    const { deletePost } = useCommunityStore.getState();
    const { success, error } = await deletePost(post.id);
    if (!success && error) {
      Alert.alert(t('common.error'), error);
    }
  }, [t]);

  // Handle report post with reason selection
  const handleReportPost = useCallback((post: CommunityPost) => {
    const { reportPost } = useCommunityStore.getState();
    
    // Report reasons
    const reasons = [
      { id: 'spam', label: t('community.reportReasons.spam') },
      { id: 'inappropriate', label: t('community.reportReasons.inappropriate') },
      { id: 'harassment', label: t('community.reportReasons.harassment') },
      { id: 'misinformation', label: t('community.reportReasons.misinformation') },
      { id: 'other', label: t('community.reportReasons.other') },
    ];

    Alert.alert(
      t('community.reportTitle'),
      t('community.reportMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        ...reasons.map(reason => ({
          text: reason.label,
          onPress: async () => {
            const { success, error } = await reportPost(post.id, reason.id as any);
            if (success) {
              Alert.alert(
                t('community.reportSuccess'),
                t('community.reportSuccessMessage')
              );
            } else {
              Alert.alert(
                t('common.error'),
                error || t('community.reportError')
              );
            }
          },
        })),
      ]
    );
  }, [t]);

  // Handle hide post (not interested)
  const handleHidePost = useCallback(async (post: CommunityPost) => {
    const { hidePost } = useCommunityStore.getState();
    const { success, error } = await hidePost(post.id);
    
    if (success) {
      // Post is already removed from local state by hidePost
      Alert.alert(t('community.hiddenSuccess'));
    } else {
      Alert.alert(t('common.error'), error || t('community.hideError'));
    }
  }, [t]);


  // Render post item
  const renderPostItem = useCallback(({ item, index }: { item: CommunityPost; index: number }) => {
    return (
      <CommunityPostCard
        post={item}
        onPress={handlePostPress}
        onLikePress={handleLikePress}
        onDeletePress={handleDeletePost}
        onReportPress={handleReportPost}
        onHidePress={handleHidePost}
        isLiked={item.isLiked}
      />
    );
  }, [handlePostPress, handleLikePress, handleDeletePost, handleReportPost, handleHidePost]);

  // Render header
  const renderHeader = useCallback(() => (
    <View style={styles.headerContent}>
      {/* Refresh indicator */}
      {isRefreshing && (
        <View style={styles.refreshContainer}>
          <Animated.View style={[styles.refreshIconWrapper, { transform: [{ rotate: spin }] }]}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.refreshText, { color: colors.textSecondary }]}>
            {t('common.updating')}
          </Text>
        </View>
      )}

      {/* Horizontal Scrollable Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScrollContent}
        style={styles.filtersScroll}
      >
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
              onPress={() => setActiveFilter(filter.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={isActive ? '#FFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? '#FFF' : colors.text },
                ]}
              >
                {t(filter.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [isRefreshing, spin, colors, isDark, activeFilter, t]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
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
          <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t('community.empty.title')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {t('community.empty.subtitle')}
        </Text>
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={handleCreatePress}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyButtonText}>{t('community.createFirst')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, colors, isDark, t, handleCreatePress]);

  // Render footer (loading more) - only show when actually loading more and has more data
  const renderFooter = useCallback(() => {
    // Don't show spinner if not loading more, or if there are no posts, or if there's no more data
    if (!isLoadingMore || posts.length === 0 || !hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore, posts.length, hasMore, colors.primary]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header Bar with Glass Effect */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
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
        <View style={styles.headerBarContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('tabs.community')}
          </Text>
          {user && (
            <TouchableOpacity
              style={[styles.headerAvatar]}
              activeOpacity={0.8}
              onPress={handleAvatarPress}
            >
              <Image
                source={{ uri: getAvatarUrl(profile?.avatar_url, user.id) }}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={visiblePosts}
        renderItem={renderPostItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />

      {/* Floating Action Button */}
      {user && (
        <TouchableOpacity
          style={[
            styles.fab,
            { 
              backgroundColor: colors.primary,
              bottom: insets.bottom + 90,
            },
          ]}
          onPress={handleCreatePress}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Create Post Sheet */}
      <CreatePostSheet
        visible={isCreateSheetVisible}
        onClose={() => setIsCreateSheetVisible(false)}
        onSuccess={handlePostCreated}
      />

      {/* Post Detail Sheet */}
      <PostDetailSheet
        post={selectedPostForDetail}
        visible={isDetailSheetVisible}
        onClose={() => {
          setIsDetailSheetVisible(false);
          setSelectedPostForDetail(null);
        }}
      />

      {/* Profile Sheet */}
      <ProfileSheet
        visible={isProfileSheetVisible}
        onClose={() => setIsProfileSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header Bar
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  // List
  listContent: {
    paddingHorizontal: 20,
  },
  // Header Content
  headerContent: {
    marginBottom: 8,
    marginTop: 12,
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  refreshIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  // Horizontal Filter Tabs
  filtersScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  filtersScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
  // Footer
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  // Premium Paywall Styles
  premiumPostWrapper: {
    position: 'relative',
  },
  blurredPostContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  premiumCTAOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  premiumCTAGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(240,58,82,0.2)',
  },
  premiumCTAContent: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  premiumIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(240,58,82,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumCTATitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  premiumCTASubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  premiumCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#F03A52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumCTAButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
});
