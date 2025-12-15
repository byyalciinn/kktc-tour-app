/**
 * Reports Tab Component
 * 
 * Admin panel component for managing community post reports
 * Minimalist premium design without icons/emojis
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
} from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { getAvatarUrl } from '@/lib/avatarService';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';

interface ReportsTabProps {
  colors: typeof Colors.light;
  isDark: boolean;
  insets: EdgeInsets;
}

// Report reason labels
const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  inappropriate: 'Uygunsuz İçerik',
  harassment: 'Taciz',
  misinformation: 'Yanlış Bilgi',
  other: 'Diğer',
};

// Status labels and colors
const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: '#F59E0B' },
  reviewed: { label: 'İncelendi', color: '#3B82F6' },
  resolved: { label: 'Çözüldü', color: '#22C55E' },
  dismissed: { label: 'Reddedildi', color: '#6B7280' },
};

type FilterStatus = 'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  reporter?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    title: string | null;
    content: string | null;
    images: string[];
    user_id: string;
    status: string;
    user?: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export default function ReportsTab({ colors, isDark, insets }: ReportsTabProps) {
  const { user } = useAuthStore();
  
  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    resolved: 0,
    dismissed: 0,
  });

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      const { data: reportsData, error } = await supabase
        .from('community_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data
      const reporterIds = [...new Set(reportsData?.map(r => r.reporter_id) || [])];
      const postIds = [...new Set(reportsData?.map(r => r.post_id) || [])];

      // Fetch reporters
      const reportersMap: Record<string, any> = {};
      if (reporterIds.length > 0) {
        const { data: reporters } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', reporterIds);
        reporters?.forEach(r => { reportersMap[r.id] = r; });
      }

      // Fetch posts
      const postsMap: Record<string, any> = {};
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from('community_posts')
          .select('id, title, content, images, user_id, status')
          .in('id', postIds);
        
        // Fetch post owners
        const postOwnerIds = [...new Set(posts?.map(p => p.user_id) || [])];
        const postOwnersMap: Record<string, any> = {};
        if (postOwnerIds.length > 0) {
          const { data: owners } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', postOwnerIds);
          owners?.forEach(o => { postOwnersMap[o.id] = o; });
        }

        posts?.forEach(p => { 
          postsMap[p.id] = {
            ...p,
            user: postOwnersMap[p.user_id] || null,
          }; 
        });
      }

      // Combine data
      const enrichedReports: Report[] = (reportsData || []).map(report => ({
        ...report,
        reporter: reportersMap[report.reporter_id] || null,
        post: postsMap[report.post_id] || null,
      }));

      setReports(enrichedReports);

      // Calculate stats
      setStats({
        total: enrichedReports.length,
        pending: enrichedReports.filter(r => r.status === 'pending').length,
        reviewed: enrichedReports.filter(r => r.status === 'reviewed').length,
        resolved: enrichedReports.filter(r => r.status === 'resolved').length,
        dismissed: enrichedReports.filter(r => r.status === 'dismissed').length,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Hata', 'Şikayetler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  // Update report status
  const updateReportStatus = async (reportId: string, newStatus: string) => {
    if (!user?.id) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('community_reports')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() }
          : r
      ));

      // Update stats
      setStats(prev => {
        const oldStatus = reports.find(r => r.id === reportId)?.status || 'pending';
        return {
          ...prev,
          [oldStatus]: Math.max(0, prev[oldStatus as keyof typeof prev] - 1),
          [newStatus]: (prev[newStatus as keyof typeof prev] || 0) + 1,
        };
      });

      setIsDetailModalVisible(false);
      setSelectedReport(null);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız oldu');
    } finally {
      setProcessing(false);
    }
  };

  // Delete reported post
  const deleteReportedPost = async (postId: string, reportId: string) => {
    Alert.alert(
      'Paylaşımı Sil',
      'Bu paylaşımı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const { error } = await supabase
                .from('community_posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              // Update report status to resolved
              await updateReportStatus(reportId, 'resolved');
              
              Alert.alert('Başarılı', 'Paylaşım silindi ve şikayet çözüldü');
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Paylaşım silinemedi');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Filter reports
  const filteredReports = filterStatus === 'all' 
    ? reports 
    : reports.filter(r => r.status === filterStatus);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Toplam</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bekleyen</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)' }]}>
          <Text style={[styles.statValue, { color: '#22C55E' }]}>{stats.resolved}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Çözülen</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as FilterStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && { backgroundColor: colors.primary },
              filterStatus !== status && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filterStatus === status ? '#fff' : colors.textSecondary },
              ]}
            >
              {status === 'all' ? 'Tümü' : statusConfig[status]?.label || status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reports List */}
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
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#D1D5DB' }]} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {filterStatus === 'pending' ? 'Bekleyen şikayet yok' : 'Şikayet bulunamadı'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filterStatus === 'pending' 
                ? 'Tüm şikayetler incelendi' 
                : 'Bu filtreye uygun şikayet bulunmuyor'}
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={[
                styles.reportCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
              onPress={() => {
                setSelectedReport(report);
                setIsDetailModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              {/* Report Header */}
              <View style={styles.reportHeader}>
                <View style={styles.reporterInfo}>
                  <Image
                    source={{ uri: getAvatarUrl(report.reporter?.avatar_url, report.reporter_id) }}
                    style={styles.reporterAvatar}
                  />
                  <View style={styles.reporterText}>
                    <Text style={[styles.reporterName, { color: colors.text }]} numberOfLines={1}>
                      {report.reporter?.full_name || 'Anonim'}
                    </Text>
                    <Text style={[styles.reportDate, { color: colors.textSecondary }]}>
                      {formatDate(report.created_at)}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: `${statusConfig[report.status]?.color || '#6B7280'}15` }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { color: statusConfig[report.status]?.color || '#6B7280' }
                  ]}>
                    {statusConfig[report.status]?.label || report.status}
                  </Text>
                </View>
              </View>

              {/* Reason */}
              <View style={styles.reasonContainer}>
                <Text style={[styles.reasonLabel, { color: colors.textSecondary }]}>Sebep:</Text>
                <Text style={[styles.reasonValue, { color: colors.text }]}>
                  {reasonLabels[report.reason] || report.reason}
                </Text>
              </View>

              {/* Description */}
              {report.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                  {report.description}
                </Text>
              )}

              {/* Reported Post Preview */}
              {report.post && (
                <View style={[
                  styles.postPreview, 
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }
                ]}>
                  <View style={styles.postPreviewHeader}>
                    <Image
                      source={{ uri: getAvatarUrl(report.post.user?.avatar_url, report.post.user_id) }}
                      style={styles.postOwnerAvatar}
                    />
                    <Text style={[styles.postOwnerName, { color: colors.text }]} numberOfLines={1}>
                      {report.post.user?.full_name || 'Kullanıcı'}
                    </Text>
                  </View>
                  {report.post.title && (
                    <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={1}>
                      {report.post.title}
                    </Text>
                  )}
                  {report.post.content && (
                    <Text style={[styles.postContent, { color: colors.textSecondary }]} numberOfLines={2}>
                      {report.post.content}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsDetailModalVisible(false);
          setSelectedReport(null);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <TouchableOpacity 
              onPress={() => {
                setIsDetailModalVisible(false);
                setSelectedReport(null);
              }}
            >
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Kapat</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Şikayet Detayı</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedReport && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Reporter Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Şikayet Eden
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                  <Image
                    source={{ uri: getAvatarUrl(selectedReport.reporter?.avatar_url, selectedReport.reporter_id) }}
                    style={styles.sectionAvatar}
                  />
                  <View style={styles.sectionInfo}>
                    <Text style={[styles.sectionName, { color: colors.text }]}>
                      {selectedReport.reporter?.full_name || 'Anonim'}
                    </Text>
                    <Text style={[styles.sectionDate, { color: colors.textSecondary }]}>
                      {formatDate(selectedReport.created_at)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Reason Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Şikayet Sebebi
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.reasonText, { color: colors.text }]}>
                    {reasonLabels[selectedReport.reason] || selectedReport.reason}
                  </Text>
                </View>
              </View>

              {/* Description Section */}
              {selectedReport.description && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Açıklama
                  </Text>
                  <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.descriptionText, { color: colors.text }]}>
                      {selectedReport.description}
                    </Text>
                  </View>
                </View>
              )}

              {/* Reported Post Section */}
              {selectedReport.post && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Şikayet Edilen Paylaşım
                  </Text>
                  <View style={[styles.postCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                    <View style={styles.postHeader}>
                      <Image
                        source={{ uri: getAvatarUrl(selectedReport.post.user?.avatar_url, selectedReport.post.user_id) }}
                        style={styles.postAvatar}
                      />
                      <Text style={[styles.postUserName, { color: colors.text }]}>
                        {selectedReport.post.user?.full_name || 'Kullanıcı'}
                      </Text>
                    </View>
                    {selectedReport.post.title && (
                      <Text style={[styles.postTitleFull, { color: colors.text }]}>
                        {selectedReport.post.title}
                      </Text>
                    )}
                    {selectedReport.post.content && (
                      <Text style={[styles.postContentFull, { color: colors.textSecondary }]}>
                        {selectedReport.post.content}
                      </Text>
                    )}
                    {selectedReport.post.images && selectedReport.post.images.length > 0 && (
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.postImages}
                        contentContainerStyle={styles.postImagesContent}
                      >
                        {selectedReport.post.images.map((image, index) => (
                          <Image 
                            key={index} 
                            source={{ uri: image }} 
                            style={styles.postImage} 
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                </View>
              )}

              {/* Actions Section */}
              {selectedReport.status === 'pending' && (
                <View style={styles.actionsSection}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dismissButton]}
                    onPress={() => updateReportStatus(selectedReport.id, 'dismissed')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#6B7280" />
                    ) : (
                      <Text style={styles.dismissButtonText}>Reddet</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.reviewButton]}
                    onPress={() => updateReportStatus(selectedReport.id, 'reviewed')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#3B82F6" />
                    ) : (
                      <Text style={styles.reviewButtonText}>İncele</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteReportedPost(selectedReport.post_id, selectedReport.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.deleteButtonText}>Paylaşımı Sil</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {selectedReport.status === 'reviewed' && (
                <View style={styles.actionsSection}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.resolveButton]}
                    onPress={() => updateReportStatus(selectedReport.id, 'resolved')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.resolveButtonText}>Çözüldü Olarak İşaretle</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteReportedPost(selectedReport.post_id, selectedReport.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.deleteButtonText}>Paylaşımı Sil</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: insets.bottom + 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
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
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  
  // Filter
  filterContainer: {
    maxHeight: 44,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIndicator: {
    width: 48,
    height: 2,
    backgroundColor: '#D1D5DB',
    borderRadius: 1,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Report Card
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reporterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  reporterText: {
    flex: 1,
  },
  reporterName: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  reasonLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  reasonValue: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 18,
    marginBottom: 12,
  },
  
  // Post Preview
  postPreview: {
    borderRadius: 12,
    padding: 12,
  },
  postPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postOwnerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  postOwnerName: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  postTitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  postContent: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 18,
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
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
  },
  sectionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionDate: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  reasonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 22,
  },
  
  // Post Card in Modal
  postCard: {
    borderRadius: 14,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  postUserName: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  postTitleFull: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 8,
  },
  postContentFull: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
  },
  postImages: {
    marginTop: 12,
  },
  postImagesContent: {
    gap: 8,
  },
  postImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  
  // Actions
  actionsSection: {
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    backgroundColor: 'rgba(107,114,128,0.1)',
  },
  dismissButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#6B7280',
  },
  reviewButton: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  reviewButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#3B82F6',
  },
  resolveButton: {
    backgroundColor: '#22C55E',
  },
  resolveButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
});
