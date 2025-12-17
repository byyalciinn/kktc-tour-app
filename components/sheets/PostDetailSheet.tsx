import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ContextMenu, Button, Host } from '@expo/ui/swift-ui';
import Constants from 'expo-constants';
import { requireNativeViewManager } from 'expo-modules-core';

import { Colors } from '@/constants/Colors';
import { CommunityPost, CommunityComment } from '@/types';
import { useCommunityStore, useAuthStore, useThemeStore, useBlockStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';

const { width, height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.95;
const IMAGE_WIDTH = width - 40;

/**
 * Optimized Image component with loading state
 */
function OptimizedImage({ uri, style }: { uri: string; style: any }) {
  const [loading, setLoading] = React.useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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
        resizeMode="cover"
      />
    </View>
  );
}

interface PostDetailSheetProps {
  post: CommunityPost | null;
  visible: boolean;
  onClose: () => void;
}

export default function PostDetailSheet({
  post,
  visible,
  onClose,
}: PostDetailSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  // Stores
  const { user, profile } = useAuthStore();
  const {
    comments,
    isLoadingComments,
    isSubmitting,
    fetchComments,
    addComment,
    deleteComment,
    toggleLike,
  } = useCommunityStore();
  const { blockedUserIds, blockUser } = useBlockStore();

  const isExpoGo =
    (Constants as any)?.executionEnvironment === 'storeClient' ||
    (Constants as any)?.appOwnership === 'expo';

  const isExpoUIAvailable = useMemo(() => {
    if (Platform.OS !== 'ios') return false;
    if (isExpoGo) return false;
    try {
      // Expo UI isn't included in Expo Go. This will throw there.
      requireNativeViewManager('ExpoUI');
      return true;
    } catch {
      return false;
    }
  }, [isExpoGo]);

  // Local state
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(post?.isLiked || false);
  const [likesCount, setLikesCount] = useState(post?.likesCount || 0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Animation
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const likeAnim = useRef(new Animated.Value(1)).current;

  // Load comments when sheet opens
  useEffect(() => {
    if (visible && post) {
      fetchComments(post.id);
      setIsLiked(post.isLiked || false);
      setLikesCount(post.likesCount || 0);
    }
  }, [visible, post]);

  // Show/hide animation
  useEffect(() => {
    if (visible && post) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 300,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, post]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCommentText('');
      setCurrentImageIndex(0);
      onClose();
    });
  }, [slideAnim, fadeAnim, onClose]);

  // Pan responder for drag to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 25,
            stiffness: 300,
          }).start();
        }
      },
    })
  ).current;

  // Handle like
  const handleLike = async () => {
    if (!user || !post) return;

    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

    // Animate
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

    const { error } = await toggleLike(user.id, post.id);
    if (error) {
      // Revert on error
      setIsLiked(!newIsLiked);
      setLikesCount(prev => newIsLiked ? prev - 1 : prev + 1);
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!user || !post || !commentText.trim()) return;

    const { success, error } = await addComment(user.id, post.id, commentText.trim());
    if (success) {
      setCommentText('');
    } else {
      Alert.alert(t('common.error'), error || t('errors.generic'));
    }
  };

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  // Handle delete comment - allow for comment owner or admin
  const handleDeleteComment = (comment: CommunityComment) => {
    const canDelete = comment.userId === user?.id || isAdmin;
    if (!canDelete) return;

    Alert.alert(
      t('community.deleteComment'),
      t('community.deleteCommentConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteComment(comment.id),
        },
      ]
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if user can delete a comment
  const canDeleteComment = (comment: CommunityComment) => {
    return comment.userId === user?.id || isAdmin;
  };

  // Handle comment menu press for Android (UGC Compliance - Apple Guideline 1.2)
  const handleCommentMenuPressAndroid = (comment: CommunityComment) => {
    const isOwnComment = comment.userId === user?.id;
    const canDelete = isOwnComment || isAdmin;
    
    if (canDelete) {
      Alert.alert(
        t('community.commentOptions'),
        '',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => handleDeleteComment(comment),
          },
          ...(!isOwnComment
            ? [
                {
                  text: t('community.blockUser'),
                  style: 'destructive' as const,
                  onPress: () => handleBlockCommentUser(comment),
                },
                {
                  text: t('community.report'),
                  onPress: () => handleReportComment(comment),
                },
              ]
            : []),
        ]
      );
    } else {
      Alert.alert(
        t('community.commentOptions'),
        '',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('community.blockUser'), 
            style: 'destructive', 
            onPress: () => handleBlockCommentUser(comment) 
          },
          { 
            text: t('community.report'), 
            onPress: () => handleReportComment(comment) 
          },
        ]
      );
    }
  };

  const handleCommentMenuPressIOS = (comment: CommunityComment) => {
    const isOwnComment = comment.userId === user?.id;
    const canDelete = isOwnComment || isAdmin;

    const options = canDelete
      ? isOwnComment
        ? [t('common.cancel'), t('common.delete')]
        : [t('common.cancel'), t('common.delete'), t('community.blockUser'), t('community.report')]
      : [t('common.cancel'), t('community.blockUser'), t('community.report')];

    const cancelButtonIndex = 0;
    const destructiveButtonIndex = canDelete ? 1 : 1;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      },
      (buttonIndex) => {
        if (canDelete) {
          if (buttonIndex === 1) {
            handleDeleteComment(comment);
            return;
          }
          if (!isOwnComment) {
            if (buttonIndex === 2) {
              handleBlockCommentUser(comment);
            } else if (buttonIndex === 3) {
              handleReportComment(comment);
            }
          }
          return;
        }

        if (buttonIndex === 1) {
          handleBlockCommentUser(comment);
        } else if (buttonIndex === 2) {
          handleReportComment(comment);
        }
      }
    );
  };

  // Handle block user from comment (UGC Compliance)
  const handleBlockCommentUser = (comment: CommunityComment) => {
    if (!user) return;
    
    Alert.alert(
      t('community.blockUserTitle'),
      t('community.blockUserMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('community.block'),
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await blockUser(
              user.id, 
              comment.userId, 
              `Blocked from comment: ${comment.content?.substring(0, 50)}...`,
              'comment',
              comment.id
            );
            if (success) {
              Alert.alert(t('community.userBlocked'), t('community.userBlockedMessage'));
            } else {
              Alert.alert(t('common.error'), error || t('common.error'));
            }
          },
        },
      ]
    );
  };

  // Handle report comment - reports to community_reports with comment reference
  const handleReportComment = async (comment: CommunityComment) => {
    if (!user || !post) return;
    
    const reasons = [
      { id: 'spam', label: t('community.reportReasons.spam') },
      { id: 'inappropriate', label: t('community.reportReasons.inappropriate') },
      { id: 'harassment', label: t('community.reportReasons.harassment') },
      { id: 'misinformation', label: t('community.reportReasons.misinformation') },
      { id: 'other', label: t('community.reportReasons.other') },
    ];

    Alert.alert(
      t('community.reportCommentTitle'),
      t('community.reportCommentMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        ...reasons.map(reason => ({
          text: reason.label,
          onPress: async () => {
            // Report comment via community_reports table with comment reference
            const { reportPost } = useCommunityStore.getState();
            const { success, error } = await reportPost(
              post.id, 
              reason.id as any,
              `Comment report: "${comment.content?.substring(0, 100)}..." by user ${comment.userId}`
            );
            if (success) {
              Alert.alert(t('community.reportSuccess'), t('community.reportSuccessMessage'));
            } else {
              Alert.alert(t('common.error'), error || t('community.reportError'));
            }
          },
        })),
      ]
    );
  };

  // Filter comments to exclude blocked users
  const filteredComments = useMemo(() => {
    if (blockedUserIds.length === 0) return comments;
    return comments.filter(comment => !blockedUserIds.includes(comment.userId));
  }, [comments, blockedUserIds]);

  // Render iOS Context Menu for comments
  const renderCommentContextMenuIOS = (item: CommunityComment) => {
    const isOwnComment = item.userId === user?.id;
    const canDelete = isOwnComment || isAdmin;
    
    return (
      <Host matchContents>
        <ContextMenu>
          <ContextMenu.Items>
            {canDelete && (
              <Button
                systemImage="trash"
                onPress={() => handleDeleteComment(item)}
              >
                {t('common.delete')}
              </Button>
            )}
            {!isOwnComment && (
              <>
                <Button
                  systemImage="hand.raised"
                  onPress={() => handleBlockCommentUser(item)}
                >
                  {t('community.blockUser')}
                </Button>
                <Button
                  systemImage="flag"
                  onPress={() => handleReportComment(item)}
                >
                  {t('community.report')}
                </Button>
              </>
            )}
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <Button systemImage="ellipsis" variant="plain" />
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    );
  };

  // Render comment item
  const renderComment = ({ item }: { item: CommunityComment }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: getAvatarUrl(item.user?.avatarUrl, item.userId) }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentUserName, { color: colors.text }]}>
            {item.user?.fullName || t('community.anonymous')}
          </Text>
          <View style={styles.commentHeaderRight}>
            <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
              {formatDate(item.createdAt)}
            </Text>
            {/* Context Menu for comment options (UGC Compliance - iOS 26 native) */}
            {isExpoUIAvailable ? (
              renderCommentContextMenuIOS(item)
            ) : (
              <TouchableOpacity
                style={styles.commentMenuButton}
                onPress={() =>
                  Platform.OS === 'ios'
                    ? handleCommentMenuPressIOS(item)
                    : handleCommentMenuPressAndroid(item)
                }
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[styles.commentText, { color: colors.text }]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            height: SHEET_HEIGHT,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Solid Background for better readability */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' },
          ]}
        />

        {/* Handle */}
        <View style={styles.handleContainer}>
          <View
            style={[
              styles.handle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' },
            ]}
          />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={20}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* User info */}
            <View style={styles.userRow}>
              <Image
                source={{ uri: getAvatarUrl(post.user?.avatarUrl, post.userId) }}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {post.user?.fullName || t('community.anonymous')}
                </Text>
                <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                  {formatDate(post.createdAt)}
                </Text>
              </View>
            </View>

            {/* Title */}
            {post.title && (
              <Text style={[styles.title, { color: colors.text }]}>
                {post.title}
              </Text>
            )}

            {/* Content */}
            {post.content && (
              <Text style={[styles.postContent, { color: colors.text }]}>
                {post.content}
              </Text>
            )}

            {/* Images with Optimized Loading */}
            {post.images && post.images.length > 0 && (
              <View style={styles.imagesSection}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={IMAGE_WIDTH}
                  snapToAlignment="center"
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / IMAGE_WIDTH);
                    setCurrentImageIndex(index);
                  }}
                >
                  {post.images.map((image, index) => (
                    <OptimizedImage
                      key={index}
                      uri={image}
                      style={styles.fullImage}
                    />
                  ))}
                </ScrollView>
                {post.images.length > 1 && (
                  <View style={styles.imagePagination}>
                    {post.images.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          {
                            backgroundColor:
                              index === currentImageIndex
                                ? colors.primary
                                : isDark
                                ? 'rgba(255,255,255,0.3)'
                                : 'rgba(0,0,0,0.2)',
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Location */}
            {post.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {post.location}
                </Text>
              </View>
            )}

            {/* Tour reference */}
            {post.tour && (
              <TouchableOpacity
                style={[
                  styles.tourReference,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                ]}
                activeOpacity={0.8}
              >
                <Image source={{ uri: post.tour.image }} style={styles.tourImage} />
                <View style={styles.tourInfo}>
                  <Text style={[styles.tourLabel, { color: colors.textSecondary }]}>
                    {t('community.relatedTour')}
                  </Text>
                  <Text style={[styles.tourTitle, { color: colors.text }]}>
                    {post.tour.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={24}
                    color={isLiked ? '#FF6B6B' : colors.textSecondary}
                  />
                </Animated.View>
                <Text style={[styles.actionText, { color: isLiked ? '#FF6B6B' : colors.textSecondary }]}>
                  {likesCount} {t('community.likes')}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionButton}>
                <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                  {comments.length} {t('community.comments')}
                </Text>
              </View>
            </View>

            {/* Comments Section */}
            <View style={styles.commentsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('community.comments')}
              </Text>

              {isLoadingComments ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
              ) : filteredComments.length === 0 ? (
                <Text style={[styles.noComments, { color: colors.textSecondary }]}>
                  {t('community.noComments')}
                </Text>
              ) : (
                filteredComments.map((comment) => (
                  <View key={comment.id}>
                    {renderComment({ item: comment })}
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          {/* Comment Input */}
          {user && (
            <View
              style={[
                styles.commentInputContainer,
                {
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  paddingBottom: insets.bottom + 8,
                },
              ]}
            >
              <Image
                source={{ uri: getAvatarUrl(profile?.avatar_url, user.id) }}
                style={styles.inputAvatar}
              />
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder={t('community.addComment')}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: colors.primary },
                  (!commentText.trim() || isSubmitting) && { opacity: 0.5 },
                ]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || isSubmitting}
              >
                <Ionicons name="send" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  postDate: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  postContent: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 24,
    marginBottom: 16,
  },
  imagesSection: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  fullImage: {
    width: width - 40,
    height: 280,
    borderRadius: 16,
  },
  imagePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tourReference: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  tourImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
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
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  commentsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 16,
  },
  noComments: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commentMenuButton: {
    padding: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  commentText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 21,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
