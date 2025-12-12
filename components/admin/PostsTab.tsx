/**
 * Posts Tab Component
 * 
 * Admin panel component for managing community posts:
 * - View all posts (approved, pending, rejected)
 * - Filter by status and type
 * - Delete posts
 * - View post statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EdgeInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { getAvatarUrl } from '@/lib/avatarService';
import { useCommunityStore, useAuthStore } from '@/stores';
import { CommunityPost, CommunityComment } from '@/types';

interface PostsTabProps {
  colors: typeof Colors.light;
  isDark: boolean;
  insets: EdgeInsets;
}

// Post type info
const postTypeInfo: Record<string, { icon: string; label: string; color: string }> = {
  photo: { icon: 'camera', label: 'Fotoğraf', color: '#4A90D9' },
  review: { icon: 'chatbubble', label: 'Değerlendirme', color: '#50C878' },
  suggestion: { icon: 'bulb', label: 'Öneri', color: '#FFB347' },
};

// Status info
const statusInfo: Record<string, { label: string; color: string }> = {
  approved: { label: 'Onaylı', color: '#22C55E' },
  pending: { label: 'Bekliyor', color: '#F59E0B' },
  rejected: { label: 'Reddedildi', color: '#EF4444' },
};

type FilterStatus = 'all' | 'approved' | 'pending' | 'rejected';

export default function PostsTab({ colors, isDark, insets }: PostsTabProps) {
  const { user } = useAuthStore();
  const { 
    posts, 
    pendingPosts,
    isLoading, 
    fetchPosts,
    fetchPendingPosts,
    approvePost,
    rejectPost,
    deletePost,
  } = useCommunityStore();
  
  // State
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [postComments, setPostComments] = useState<CommunityComment[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });

  // Calculate stats
  useEffect(() => {
    const allPosts = [...posts, ...pendingPosts];
    const uniquePosts = allPosts.filter((post, index, self) => 
      index === self.findIndex(p => p.id === post.id)
    );
    
    setStats({
      total: uniquePosts.length,
      approved: uniquePosts.filter(p => p.status === 'approved').length,
      pending: uniquePosts.filter(p => p.status === 'pending').length,
      rejected: uniquePosts.filter(p => p.status === 'rejected').length,
    });
  }, [posts, pendingPosts]);

  // Initial load
  useEffect(() => {
    fetchPosts();
    fetchPendingPosts();
  }, []);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchPendingPosts()]);
    setRefreshing(false);
  }, [fetchPosts, fetchPendingPosts]);

  // Get filtered posts
  const getFilteredPosts = (): CommunityPost[] => {
    const allPosts = [...posts, ...pendingPosts];
    const uniquePosts = allPosts.filter((post, index, self) => 
      index === self.findIndex(p => p.id === post.id)
    );
    
    if (filterStatus === 'all') {
      return uniquePosts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    
    return uniquePosts
      .filter(p => p.status === filterStatus)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  };

  // Fetch comments for selected post
  const { fetchComments, comments } = useCommunityStore();

  // Actions
  const handlePostPress = async (post: CommunityPost) => {
    setSelectedPost(post);
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setIsEditMode(false);
    setIsModalVisible(true);
    
    // Fetch comments for this post
    await fetchComments(post.id);
  };

  // Update postComments when comments change
  useEffect(() => {
    if (selectedPost) {
      setPostComments(comments);
    }
  }, [comments, selectedPost]);

  const handleApprove = async (post: CommunityPost) => {
    if (!user) return;
    
    Alert.alert(
      'İçeriği Onayla',
      'Bu içeriği onaylamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            setProcessing(true);
            const { success, error } = await approvePost(post.id, user.id);
            setProcessing(false);
            
            if (success) {
              setIsModalVisible(false);
              Alert.alert('Başarılı', 'İçerik onaylandı');
            } else {
              Alert.alert('Hata', error || 'İşlem başarısız');
            }
          },
        },
      ]
    );
  };

  const handleReject = (post: CommunityPost) => {
    setSelectedPost(post);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const submitReject = async () => {
    if (!user || !selectedPost || !rejectReason.trim()) {
      Alert.alert('Hata', 'Lütfen bir red nedeni girin');
      return;
    }

    setProcessing(true);
    const { success, error } = await rejectPost(selectedPost.id, user.id, rejectReason.trim());
    setProcessing(false);

    if (success) {
      setRejectModalVisible(false);
      setIsModalVisible(false);
      Alert.alert('Başarılı', 'İçerik reddedildi');
    } else {
      Alert.alert('Hata', error || 'İşlem başarısız');
    }
  };

  const handleDelete = async (post: CommunityPost) => {
    Alert.alert(
      'İçeriği Sil',
      'Bu içeriği kalıcı olarak silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            const { success, error } = await deletePost(post.id);
            setProcessing(false);
            
            if (success) {
              setIsModalVisible(false);
              Alert.alert('Başarılı', 'İçerik silindi');
            } else {
              Alert.alert('Hata', error || 'İşlem başarısız');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPosts = getFilteredPosts();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Paylaşımlar yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
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
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Toplam</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{stats.approved}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Onaylı</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bekliyor</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.rejected}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reddedildi</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterTab,
                {
                  backgroundColor: filterStatus === status 
                    ? colors.primary 
                    : isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                },
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: filterStatus === status ? '#fff' : colors.text },
                ]}
              >
                {status === 'all' ? 'Tümü' : statusInfo[status]?.label || status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Posts List */}
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Paylaşım bulunamadı</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Bu kategoride henüz paylaşım yok
            </Text>
          </View>
        ) : (
          filteredPosts.map((post) => {
            const typeInfo = postTypeInfo[post.type] || postTypeInfo.photo;
            const postStatus = statusInfo[post.status] || statusInfo.pending;
            
            return (
              <TouchableOpacity
                key={post.id}
                style={[
                  styles.postCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                onPress={() => handlePostPress(post)}
                activeOpacity={0.7}
              >
                {/* Header */}
                <View style={styles.postHeader}>
                  <Image
                    source={{ uri: getAvatarUrl(post.user?.avatarUrl, post.userId) }}
                    style={styles.postAvatar}
                  />
                  <View style={styles.postUserInfo}>
                    <Text style={[styles.postUserName, { color: colors.text }]}>
                      {post.user?.fullName || 'Anonim'}
                    </Text>
                    <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                      {formatDate(post.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.postBadges}>
                    <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
                      <Ionicons name={typeInfo.icon as any} size={12} color={typeInfo.color} />
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: postStatus.color + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: postStatus.color }]}>
                        {postStatus.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Content */}
                <View style={styles.postContent}>
                  {post.title && (
                    <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={1}>
                      {post.title}
                    </Text>
                  )}
                  {post.content && (
                    <Text style={[styles.postText, { color: colors.textSecondary }]} numberOfLines={2}>
                      {post.content}
                    </Text>
                  )}
                  {post.images && post.images.length > 0 && (
                    <View style={styles.postImages}>
                      {post.images.slice(0, 3).map((img, idx) => (
                        <Image key={idx} source={{ uri: img }} style={styles.postImage} />
                      ))}
                      {post.images.length > 3 && (
                        <View style={[styles.moreImages, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                          <Text style={styles.moreImagesText}>+{post.images.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Quick Actions for Pending */}
                {post.status === 'pending' && (
                  <View style={[styles.quickActions, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <TouchableOpacity
                      style={[styles.quickActionBtn, { backgroundColor: '#EF444415' }]}
                      onPress={() => handleReject(post)}
                    >
                      <Ionicons name="close" size={16} color="#EF4444" />
                      <Text style={[styles.quickActionText, { color: '#EF4444' }]}>Reddet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickActionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleApprove(post)}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={[styles.quickActionText, { color: '#fff' }]}>Onayla</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Post Detail Modal - Modern Design */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <TouchableOpacity onPress={() => {
              setIsModalVisible(false);
              setIsEditMode(false);
            }}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Kapat</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Paylaşım Detayı</Text>
            <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)}>
              <Ionicons 
                name={isEditMode ? 'checkmark' : 'create-outline'} 
                size={22} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>

          {selectedPost && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Status Badge - Top */}
              <View style={styles.modalStatusRow}>
                <View style={[styles.modalStatusBadge, { backgroundColor: statusInfo[selectedPost.status]?.color + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusInfo[selectedPost.status]?.color }]} />
                  <Text style={[styles.modalStatusText, { color: statusInfo[selectedPost.status]?.color }]}>
                    {statusInfo[selectedPost.status]?.label}
                  </Text>
                </View>
                <View style={[styles.typeBadgeLarge, { backgroundColor: postTypeInfo[selectedPost.type]?.color + '20' }]}>
                  <Ionicons name={postTypeInfo[selectedPost.type]?.icon as any} size={14} color={postTypeInfo[selectedPost.type]?.color} />
                  <Text style={[styles.typeBadgeText, { color: postTypeInfo[selectedPost.type]?.color }]}>
                    {postTypeInfo[selectedPost.type]?.label}
                  </Text>
                </View>
              </View>

              {/* Stats Cards */}
              <View style={styles.detailStatsRow}>
                <View style={[styles.detailStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8F8F8' }]}>
                  <Ionicons name="heart" size={20} color="#FF6B6B" />
                  <Text style={[styles.detailStatValue, { color: colors.text }]}>{selectedPost.likesCount || 0}</Text>
                  <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Beğeni</Text>
                </View>
                <View style={[styles.detailStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8F8F8' }]}>
                  <Ionicons name="chatbubble" size={20} color="#4A90D9" />
                  <Text style={[styles.detailStatValue, { color: colors.text }]}>{postComments.length}</Text>
                  <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Yorum</Text>
                </View>
                <View style={[styles.detailStatCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8F8F8' }]}>
                  <Ionicons name="images" size={20} color="#50C878" />
                  <Text style={[styles.detailStatValue, { color: colors.text }]}>{selectedPost.images?.length || 0}</Text>
                  <Text style={[styles.detailStatLabel, { color: colors.textSecondary }]}>Fotoğraf</Text>
                </View>
              </View>

              {/* User Info Card */}
              <View style={[styles.userInfoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8F8F8' }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>EKLEYEN KULLANICI</Text>
                <View style={styles.userInfoRow}>
                  <Image
                    source={{ uri: getAvatarUrl(selectedPost.user?.avatarUrl, selectedPost.userId) }}
                    style={styles.modalAvatar}
                  />
                  <View style={styles.modalUserInfo}>
                    <Text style={[styles.modalUserName, { color: colors.text }]}>
                      {selectedPost.user?.fullName || 'Anonim'}
                    </Text>
                    <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                      ID: {selectedPost.userId.slice(0, 8)}...
                    </Text>
                  </View>
                </View>
              </View>

              {/* Date Info */}
              <View style={[styles.dateInfoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8F8F8' }]}>
                <View style={styles.dateInfoItem}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <View>
                    <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Eklenen Tarih</Text>
                    <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(selectedPost.createdAt)}</Text>
                  </View>
                </View>
                {selectedPost.updatedAt && selectedPost.updatedAt !== selectedPost.createdAt && (
                  <View style={styles.dateInfoItem}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                    <View>
                      <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Son Güncelleme</Text>
                      <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(selectedPost.updatedAt)}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Content Section */}
              <View style={styles.contentSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>İÇERİK</Text>
                
                {isEditMode ? (
                  <>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Başlık"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <TextInput
                      style={[styles.editInput, styles.editContentInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                      value={editContent}
                      onChangeText={setEditContent}
                      placeholder="İçerik"
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={4}
                    />
                  </>
                ) : (
                  <>
                    {selectedPost.title && (
                      <Text style={[styles.modalPostTitle, { color: colors.text }]}>
                        {selectedPost.title}
                      </Text>
                    )}
                    {selectedPost.content && (
                      <Text style={[styles.modalPostContent, { color: colors.text }]}>
                        {selectedPost.content}
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* Images */}
              {selectedPost.images && selectedPost.images.length > 0 && (
                <View style={styles.imagesSection}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FOTOĞRAFLAR ({selectedPost.images.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalImages}>
                    {selectedPost.images.map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.modalImage} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Location */}
              {selectedPost.location && (
                <View style={[styles.locationCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8F8F8' }]}>
                  <Ionicons name="location" size={20} color={colors.primary} />
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    {selectedPost.location}
                  </Text>
                </View>
              )}

              {/* Comments Section */}
              <View style={styles.commentsSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  YORUMLAR ({postComments.length})
                </Text>
                {postComments.length === 0 ? (
                  <Text style={[styles.noComments, { color: colors.textSecondary }]}>
                    Henüz yorum yapılmamış
                  </Text>
                ) : (
                  postComments.map((comment) => (
                    <View key={comment.id} style={[styles.commentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FAFAFA' }]}>
                      <Image
                        source={{ uri: getAvatarUrl(comment.user?.avatarUrl, comment.userId) }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={[styles.commentUserName, { color: colors.text }]}>
                            {comment.user?.fullName || 'Anonim'}
                          </Text>
                          <Text style={[styles.commentDate, { color: colors.textSecondary }]}>
                            {formatDate(comment.createdAt)}
                          </Text>
                        </View>
                        <Text style={[styles.commentText, { color: colors.text }]}>
                          {comment.content}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Actions */}
              <View style={styles.modalActions}>
                {selectedPost.status === 'pending' && (
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(selectedPost)}
                      disabled={processing}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={[styles.modalActionText, { color: '#EF4444' }]}>Reddet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: colors.primary, flex: 1 }]}
                      onPress={() => handleApprove(selectedPost)}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={[styles.modalActionText, { color: '#fff' }]}>Onayla</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: '#EF444410', borderColor: '#EF444430', borderWidth: 1 }]}
                  onPress={() => handleDelete(selectedPost)}
                  disabled={processing}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Paylaşımı Kalıcı Olarak Sil</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={[styles.rejectModalContent, { backgroundColor: isDark ? '#2D2D2D' : '#FFF' }]}>
            <Text style={[styles.rejectModalTitle, { color: colors.text }]}>Red Nedeni</Text>
            <View style={[styles.rejectInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              <View style={styles.rejectInputWrapper}>
                <Text style={[styles.rejectInputPlaceholder, { color: colors.textSecondary }]}>
                  {rejectReason || 'Red nedenini yazın...'}
                </Text>
              </View>
            </View>
            <View style={styles.rejectModalActions}>
              <TouchableOpacity
                style={[styles.rejectModalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5' }]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={[styles.rejectModalBtnText, { color: colors.text }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectModalBtn, { backgroundColor: '#EF4444' }]}
                onPress={submitReject}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.rejectModalBtnText, { color: '#fff' }]}>Reddet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  // Filter
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 8,
  },
  // Post card
  postCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  postBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  postContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  postText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
  },
  postImages: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  postImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  moreImages: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  modalUserInfo: {
    flex: 1,
  },
  modalUserName: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  modalDate: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalStatusText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  modalPostTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 12,
  },
  modalPostContent: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalImages: {
    marginBottom: 16,
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginRight: 10,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInfoText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  modalActions: {
    gap: 12,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalActionText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  deleteBtnText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  // Reject modal
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  rejectModalContent: {
    borderRadius: 20,
    padding: 20,
  },
  rejectModalTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 16,
  },
  rejectInput: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    minHeight: 100,
  },
  rejectInputWrapper: {
    flex: 1,
  },
  rejectInputPlaceholder: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  rejectModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectModalBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectModalBtnText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  // New modern modal styles
  modalStatusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  detailStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  detailStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
  },
  detailStatValue: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  detailStatLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  userInfoCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dateInfoCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 16,
  },
  dateInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  dateValue: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    marginTop: 2,
  },
  contentSection: {
    marginBottom: 20,
  },
  editInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 12,
  },
  editContentInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imagesSection: {
    marginBottom: 20,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    flex: 1,
  },
  commentsSection: {
    marginBottom: 20,
  },
  noComments: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  commentDate: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  commentText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    backgroundColor: '#EF444415',
    flex: 1,
  },
});
