/**
 * Block Reports Tab Component
 * 
 * Admin panel component for viewing user block reports
 * Shows automatic reports created when users block each other
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

interface BlockReportsTabProps {
  colors: typeof Colors.light;
  isDark: boolean;
  insets: EdgeInsets;
}

// Source labels
const sourceLabels: Record<string, string> = {
  post: 'Paylaşım',
  comment: 'Yorum',
  profile: 'Profil',
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

interface BlockReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string | null;
  source: string;
  post_id: string | null;
  comment_id: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reporter?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  reported_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export default function BlockReportsTab({ colors, isDark, insets }: BlockReportsTabProps) {
  const { user } = useAuthStore();
  
  // State
  const [reports, setReports] = useState<BlockReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [selectedReport, setSelectedReport] = useState<BlockReport | null>(null);
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
        .from('user_block_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related users
      const reporterIds = [...new Set(reportsData?.map(r => r.reporter_id) || [])];
      const reportedIds = [...new Set(reportsData?.map(r => r.reported_user_id) || [])];
      const allUserIds = [...new Set([...reporterIds, ...reportedIds])];

      const usersMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allUserIds);
        users?.forEach(u => { usersMap[u.id] = u; });
      }

      // Combine data
      const enrichedReports: BlockReport[] = (reportsData || []).map(report => ({
        ...report,
        reporter: usersMap[report.reporter_id] || null,
        reported_user: usersMap[report.reported_user_id] || null,
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
      console.error('Error fetching block reports:', error);
      Alert.alert('Hata', 'Engelleme raporları yüklenirken bir hata oluştu');
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
        .from('user_block_reports')
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
          [oldStatus]: Math.max(0, (prev as any)[oldStatus] - 1),
          [newStatus]: ((prev as any)[newStatus] || 0) + 1,
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

  // Ban reported user
  const banReportedUser = async (userId: string, reportId: string) => {
    Alert.alert(
      'Kullanıcıyı Yasakla',
      'Bu kullanıcıyı yasaklamak istediğinize emin misiniz? Kullanıcı uygulamaya giriş yapamayacak.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Yasakla',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ is_banned: true, banned_at: new Date().toISOString() })
                .eq('id', userId);

              if (error) throw error;

              // Update report status to resolved
              await updateReportStatus(reportId, 'resolved');
              
              Alert.alert('Başarılı', 'Kullanıcı yasaklandı ve rapor çözüldü');
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Kullanıcı yasaklanamadı');
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
              {filterStatus === 'pending' ? 'Bekleyen engelleme raporu yok' : 'Rapor bulunamadı'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filterStatus === 'pending' 
                ? 'Tüm raporlar incelendi' 
                : 'Bu filtreye uygun rapor bulunmuyor'}
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
                <View style={styles.usersRow}>
                  <View style={styles.userInfo}>
                    <Image
                      source={{ uri: getAvatarUrl(report.reporter?.avatar_url, report.reporter_id) }}
                      style={styles.userAvatar}
                    />
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {report.reporter?.full_name || 'Anonim'}
                    </Text>
                  </View>
                  <Text style={[styles.arrowText, { color: colors.textSecondary }]}>→</Text>
                  <View style={styles.userInfo}>
                    <Image
                      source={{ uri: getAvatarUrl(report.reported_user?.avatar_url, report.reported_user_id) }}
                      style={styles.userAvatar}
                    />
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {report.reported_user?.full_name || 'Anonim'}
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

              {/* Source & Date */}
              <View style={styles.metaRow}>
                <View style={[styles.sourceBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                  <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
                    {sourceLabels[report.source] || report.source}
                  </Text>
                </View>
                <Text style={[styles.reportDate, { color: colors.textSecondary }]}>
                  {formatDate(report.created_at)}
                </Text>
              </View>

              {/* Description */}
              {report.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                  {report.description}
                </Text>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Engelleme Detayı</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedReport && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Reporter Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Engelleyen Kullanıcı
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

              {/* Reported User Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Engellenen Kullanıcı
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                  <Image
                    source={{ uri: getAvatarUrl(selectedReport.reported_user?.avatar_url, selectedReport.reported_user_id) }}
                    style={styles.sectionAvatar}
                  />
                  <View style={styles.sectionInfo}>
                    <Text style={[styles.sectionName, { color: colors.text }]}>
                      {selectedReport.reported_user?.full_name || 'Anonim'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Source Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Engelleme Kaynağı
                </Text>
                <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.reasonText, { color: colors.text }]}>
                    {sourceLabels[selectedReport.source] || selectedReport.source}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Rapor Bilgisi
                </Text>
                <View
                  style={[
                    styles.sectionCardColumn,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
                  ]}
                >
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Durum</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {statusConfig[selectedReport.status]?.label || selectedReport.status}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Rapor ID</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]} selectable>
                      {selectedReport.id}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reporter ID</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]} selectable>
                      {selectedReport.reporter_id}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reported ID</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]} selectable>
                      {selectedReport.reported_user_id}
                    </Text>
                  </View>
                  {selectedReport.post_id && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Post ID</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]} selectable>
                        {selectedReport.post_id}
                      </Text>
                    </View>
                  )}
                  {selectedReport.comment_id && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Comment ID</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]} selectable>
                        {selectedReport.comment_id}
                      </Text>
                    </View>
                  )}
                  {selectedReport.reviewed_at && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>İncelenme</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}> {formatDate(selectedReport.reviewed_at)} </Text>
                    </View>
                  )}
                  {selectedReport.reviewed_by && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>İnceleyen</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]} selectable>
                        {selectedReport.reviewed_by}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Description Section */}
              {selectedReport.description && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Detay
                  </Text>
                  <View
                    style={[
                      styles.sectionCardColumn,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' },
                    ]}
                  >
                    <Text style={[styles.descriptionText, { color: colors.text }]} selectable>
                      {selectedReport.description}
                    </Text>
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
                    style={[styles.actionButton, styles.banButton]}
                    onPress={() => banReportedUser(selectedReport.reported_user_id, selectedReport.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.banButtonText}>Kullanıcıyı Yasakla</Text>
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
                    style={[styles.actionButton, styles.banButton]}
                    onPress={() => banReportedUser(selectedReport.reported_user_id, selectedReport.id)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.banButtonText}>Kullanıcıyı Yasakla</Text>
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
  usersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  userName: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    maxWidth: 80,
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '600',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  reportDate: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  description: {
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
  sectionCardColumn: {
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
    flexShrink: 1,
    width: '100%',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
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
  },
  dismissButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  dismissButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  reviewButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  reviewButtonText: {
    color: '#3B82F6',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  resolveButton: {
    backgroundColor: '#22C55E',
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  banButton: {
    backgroundColor: '#EF4444',
  },
  banButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
});
