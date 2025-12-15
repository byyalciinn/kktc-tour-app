import React, { useRef, useEffect, useState, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { CommunityPost } from '@/types';
import { useThemeStore, useAuthStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const IMAGE_WIDTH = CARD_WIDTH - 32; // padding 16 each side

// Stagger animation delay for cards
let cardIndex = 0;

/**
 * Optimized Image component with loading state and progressive loading
 */
function OptimizedImage({ uri, style }: { uri: string; style: any }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLoad = () => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[style, { backgroundColor: '#E5E5E5', overflow: 'hidden' }]}>
      {loading && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
      <Animated.Image
        source={{ uri, cache: 'force-cache' }}
        style={[style, { opacity: fadeAnim }]}
        onLoad={handleLoad}
        onError={() => setError(true)}
        resizeMode="cover"
      />
    </View>
  );
}

interface CommunityPostCardProps {
  post: CommunityPost;
  onPress: (post: CommunityPost) => void;
  onLikePress: (post: CommunityPost) => void;
  onDeletePress?: (post: CommunityPost) => void;
  onReportPress?: (post: CommunityPost) => void;
  onHidePress?: (post: CommunityPost) => void;
  onBlockUserPress?: (post: CommunityPost) => void;
  isLiked?: boolean;
}

/**
 * Community post card with iOS 26 glass/liquid design
 * Wrapped in memo for performance optimization
 */
function CommunityPostCardComponent({
  post,
  onPress,
  onLikePress,
  onDeletePress,
  onReportPress,
  onHidePress,
  onBlockUserPress,
  isLiked = false,
}: CommunityPostCardProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  // Check if current user owns this post
  const isOwnPost = user?.id === post.userId;
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const likeAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  
  // Entry animation
  useEffect(() => {
    const delay = (cardIndex % 10) * 80; // Stagger effect
    cardIndex++;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }),
    ]).start();
    
    return () => {
      // Reset for re-renders
    };
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('community.time.now');
    if (diffMins < 60) return t('community.time.minutes', { count: diffMins });
    if (diffHours < 24) return t('community.time.hours', { count: diffHours });
    if (diffDays < 7) return t('community.time.days', { count: diffDays });
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // Handle press with scale animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  // Handle like with bounce animation
  const handleLike = () => {
    Animated.sequence([
      Animated.timing(likeAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(likeAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 400,
      }),
    ]).start();
    onLikePress(post);
  };

  // Handle menu press
  const handleMenuPress = () => {
    if (Platform.OS === 'ios') {
      // UGC Compliance: Added Block User option (Apple Guideline 1.2)
      const options = isOwnPost
        ? [t('common.cancel'), t('common.delete')]
        : [t('common.cancel'), t('community.report'), t('community.blockUser'), t('community.notInterested')];
      
      const destructiveButtonIndex = isOwnPost ? 1 : 2; // Block user is destructive for non-own posts
      const cancelButtonIndex = 0;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
        },
        (buttonIndex) => {
          if (isOwnPost) {
            if (buttonIndex === 1) {
              // Delete
              Alert.alert(
                t('community.deletePost'),
                t('community.deletePostConfirm'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: () => onDeletePress?.(post),
                  },
                ]
              );
            }
          } else {
            if (buttonIndex === 1) {
              // Report
              onReportPress?.(post);
            } else if (buttonIndex === 2) {
              // Block User (UGC Compliance)
              onBlockUserPress?.(post);
            } else if (buttonIndex === 3) {
              // Not interested
              onHidePress?.(post);
            }
          }
        }
      );
    } else {
      // Android - use Alert
      if (isOwnPost) {
        Alert.alert(
          t('community.postOptions'),
          '',
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: () => {
                Alert.alert(
                  t('community.deletePost'),
                  t('community.deletePostConfirm'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => onDeletePress?.(post),
                    },
                  ]
                );
              },
            },
          ]
        );
      } else {
        // UGC Compliance: Added Block User option for Android (Apple Guideline 1.2)
        Alert.alert(
          t('community.postOptions'),
          '',
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('community.report'), onPress: () => onReportPress?.(post) },
            { text: t('community.blockUser'), style: 'destructive', onPress: () => onBlockUserPress?.(post) },
            { text: t('community.notInterested'), onPress: () => onHidePress?.(post) },
          ]
        );
      }
    }
  };

  const hasImages = post.images && post.images.length > 0;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim },
          ],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
          },
        ]}
        activeOpacity={1}
        onPress={() => onPress(post)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Header: User info + Menu */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: getAvatarUrl(post.user?.avatarUrl, post.userId) }}
              style={styles.avatar}
            />
            <View style={styles.userText}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {post.user?.fullName || t('community.anonymous')}
              </Text>
              <View style={styles.postMeta}>
                <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                  {formatDate(post.createdAt)}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleMenuPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {post.title && (
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {post.title}
          </Text>
        )}
        
        {post.content && (
          <Text style={[styles.content, { color: colors.text }]} numberOfLines={3}>
            {post.content}
          </Text>
        )}

        {/* Images - Horizontal Slider */}
        {hasImages && (
          <View style={styles.imagesContainer}>
            {post.images.length === 1 ? (
              <OptimizedImage uri={post.images[0]} style={styles.singleImage} />
            ) : (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={IMAGE_WIDTH + 8}
                  snapToAlignment="start"
                  contentContainerStyle={styles.imageSliderContent}
                >
                  {post.images.map((image, index) => (
                    <OptimizedImage 
                      key={index} 
                      uri={image} 
                      style={styles.sliderImage} 
                    />
                  ))}
                </ScrollView>
                {/* Pagination dots */}
                <View style={styles.paginationDots}>
                  {post.images.map((_, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.dot,
                        { backgroundColor: index === 0 ? colors.primary : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }
                      ]} 
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Tour reference */}
        {post.tour && (
          <View style={[styles.tourReference, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Image source={{ uri: post.tour.image }} style={styles.tourImage} />
            <View style={styles.tourInfo}>
              <Text style={[styles.tourLabel, { color: colors.textSecondary }]}>
                {t('community.relatedTour')}
              </Text>
              <Text style={[styles.tourTitle, { color: colors.text }]} numberOfLines={1}>
                {post.tour.title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        )}

        {/* Location */}
        {post.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {post.location}
            </Text>
          </View>
        )}

        {/* Footer: Actions */}
        <View style={styles.footer}>
          <View style={styles.actions}>
            {/* Like button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? '#FF6B6B' : colors.textSecondary}
                />
              </Animated.View>
              <Text style={[styles.actionText, { color: isLiked ? '#FF6B6B' : colors.textSecondary }]}>
                {post.likesCount > 0 ? post.likesCount : ''}
              </Text>
            </TouchableOpacity>

            {/* Comment button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onPress(post)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                {post.commentsCount > 0 ? post.commentsCount : ''}
              </Text>
            </TouchableOpacity>

            {/* Share button */}
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Export memoized component for performance
export const CommunityPostCard = memo(CommunityPostCardComponent);

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // Header
  header: {
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
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Content
  title: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  content: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  // Images
  imagesContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  imageSliderContent: {
    gap: 8,
  },
  sliderImage: {
    width: IMAGE_WIDTH,
    height: 200,
    borderRadius: 16,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Tour reference
  tourReference: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
  },
  tourImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
  },
  tourInfo: {
    flex: 1,
  },
  tourLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tourTitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginTop: 2,
  },
  // Location
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
  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
});
