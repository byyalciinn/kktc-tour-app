/**
 * Users Tab Component
 * 
 * Admin panel component for managing users:
 * - View all registered users
 * - Search and filter users
 * - Update user roles and status
 * - View user statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EdgeInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { getAvatarUrl } from '@/lib/avatarService';
import {
  getUsersPublic,
  updateUserRole,
  updateUserMemberClass,
  toggleUserStatus,
  getUserStats,
  banUser,
  unbanUser,
  UserProfile,
  UserFilters,
  MembershipDuration,
} from '@/lib/userService';

interface UsersTabProps {
  colors: typeof Colors.light;
  isDark: boolean;
  insets: EdgeInsets;
}

// Member class colors
const memberClassColors: Record<string, string> = {
  Normal: '#6B7280',
  Gold: '#FFB800',
  Business: '#3B82F6',
};

// Role colors
const roleColors: Record<string, string> = {
  user: '#6B7280',
  admin: '#EF4444',
};

// Duration labels
const durationLabels: Record<MembershipDuration, string> = {
  '1_day': '1 Gün',
  '1_week': '1 Hafta',
  '1_month': '1 Ay',
  '1_year': '1 Yıl',
  'unlimited': 'Sınırsız',
};

export default function UsersTab({ colors, isDark, insets }: UsersTabProps) {
  // State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Stats
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    usersByClass: { Normal: number; Gold: number; Business: number };
  } | null>(null);
  
  // Modal state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Gold duration selection
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<MembershipDuration>('1_month');
  
  // Ban modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  
  // Filters
  const [filters, setFilters] = useState<UserFilters>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Load users
  const loadUsers = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 1 : page;
    
    const { data, error } = await getUsersPublic(currentPage, 20, {
      ...filters,
      search: searchQuery || undefined,
    });
    
    if (error) {
      console.error('Load users error:', error);
      return;
    }
    
    if (data) {
      if (resetPage) {
        setUsers(data.users);
        setPage(1);
      } else {
        setUsers(prev => currentPage === 1 ? data.users : [...prev, ...data.users]);
      }
      setHasMore(data.hasMore);
      setTotal(data.total);
    }
  }, [page, filters, searchQuery]);

  // Load stats
  const loadStats = async () => {
    const { data } = await getUserStats();
    if (data) {
      setStats(data);
    }
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadUsers(true), loadStats()]);
      setIsLoading(false);
    };
    init();
  }, []);

  // Search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(true), loadStats()]);
    setRefreshing(false);
  }, [loadUsers]);

  // User actions
  const handleUserPress = (user: UserProfile) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  };

  const handleUpdateRole = async (role: 'user' | 'admin') => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    const { success, error } = await updateUserRole(selectedUser.id, role);
    setIsUpdating(false);
    
    if (success) {
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, role } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, role } : null);
      Alert.alert('Başarılı', 'Kullanıcı rolü güncellendi');
    } else {
      Alert.alert('Hata', error || 'Rol güncellenemedi');
    }
  };

  const handleMemberClassSelect = (memberClass: 'Normal' | 'Gold' | 'Business') => {
    if (memberClass === 'Gold') {
      // Show duration picker for Gold
      setShowDurationPicker(true);
    } else {
      // Direct update for Normal and Business
      handleUpdateMemberClass(memberClass);
    }
  };

  const handleUpdateMemberClass = async (memberClass: 'Normal' | 'Gold' | 'Business', duration?: MembershipDuration) => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    const { success, error } = await updateUserMemberClass(selectedUser.id, memberClass, duration);
    setIsUpdating(false);
    setShowDurationPicker(false);
    
    if (success) {
      const expiresAt = duration && duration !== 'unlimited' ? calculateLocalExpiry(duration) : null;
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, member_class: memberClass, membership_expires_at: expiresAt } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, member_class: memberClass, membership_expires_at: expiresAt } : null);
      
      let message = 'Üyelik sınıfı güncellendi';
      if (memberClass === 'Gold' && duration && duration !== 'unlimited') {
        message = `Gold üyelik ${durationLabels[duration]} süreli olarak atanıdı`;
      }
      Alert.alert('Başarılı', message);
    } else {
      Alert.alert('Hata', error || 'Üyelik sınıfı güncellenemedi');
    }
  };

  // Helper to calculate local expiry for UI
  const calculateLocalExpiry = (duration: MembershipDuration): string | null => {
    if (duration === 'unlimited') return null;
    const now = new Date();
    switch (duration) {
      case '1_day': now.setDate(now.getDate() + 1); break;
      case '1_week': now.setDate(now.getDate() + 7); break;
      case '1_month': now.setMonth(now.getMonth() + 1); break;
      case '1_year': now.setFullYear(now.getFullYear() + 1); break;
    }
    return now.toISOString();
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    
    const newStatus = !selectedUser.is_active;
    
    Alert.alert(
      newStatus ? 'Kullanıcıyı Aktifleştir' : 'Kullanıcıyı Devre Dışı Bırak',
      newStatus 
        ? 'Bu kullanıcıyı aktifleştirmek istediğinize emin misiniz?'
        : 'Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: newStatus ? 'Aktifleştir' : 'Devre Dışı Bırak',
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            const { success, error } = await toggleUserStatus(selectedUser.id, newStatus);
            setIsUpdating(false);
            
            if (success) {
              setUsers(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, is_active: newStatus } : u
              ));
              setSelectedUser(prev => prev ? { ...prev, is_active: newStatus } : null);
              Alert.alert('Başarılı', `Kullanıcı ${newStatus ? 'aktifleştirildi' : 'devre dışı bırakıldı'}`);
            } else {
              Alert.alert('Hata', error || 'İşlem başarısız');
            }
          },
        },
      ]
    );
  };

  // Handle ban user
  const handleBanUser = () => {
    if (!selectedUser) return;
    setBanReason('');
    setShowBanModal(true);
  };

  const submitBan = async () => {
    if (!selectedUser || !banReason.trim()) {
      Alert.alert('Hata', 'Lütfen yasaklama nedenini girin');
      return;
    }

    setIsUpdating(true);
    const { success, error } = await banUser(selectedUser.id, banReason.trim());
    setIsUpdating(false);
    setShowBanModal(false);

    if (success) {
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, is_banned: true, ban_reason: banReason.trim(), banned_at: new Date().toISOString() } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, is_banned: true, ban_reason: banReason.trim(), banned_at: new Date().toISOString() } : null);
      Alert.alert('Başarılı', 'Kullanıcı yasaklandı');
    } else {
      Alert.alert('Hata', error || 'İşlem başarısız');
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;

    Alert.alert(
      'Yasağı Kaldır',
      'Bu kullanıcının yasağını kaldırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Yasağı Kaldır',
          onPress: async () => {
            setIsUpdating(true);
            const { success, error } = await unbanUser(selectedUser.id);
            setIsUpdating(false);

            if (success) {
              setUsers(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, is_banned: false, ban_reason: null, banned_at: null } : u
              ));
              setSelectedUser(prev => prev ? { ...prev, is_banned: false, ban_reason: null, banned_at: null } : null);
              Alert.alert('Başarılı', 'Kullanıcının yasağı kaldırıldı');
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
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Kullanıcılar yükleniyor...
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
        {stats && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalUsers}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Toplam</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#22C55E20' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.activeUsers}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Aktif</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="trending-up" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.newUsersThisMonth}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Bu Ay</Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Kullanıcı ara..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {total} kullanıcı bulundu
        </Text>

        {/* Users List */}
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Kullanıcı bulunamadı</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Arama kriterlerinizi değiştirmeyi deneyin
            </Text>
          </View>
        ) : (
          users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
              onPress={() => handleUserPress(user)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: getAvatarUrl(user.avatar_url, user.id) }}
                style={styles.userAvatar}
              />
              
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {user.full_name || 'İsimsiz Kullanıcı'}
                  </Text>
                  {user.is_banned && (
                    <View style={[styles.inactiveBadge, { backgroundColor: '#EF444420' }]}>
                      <Text style={[styles.inactiveBadgeText, { color: '#EF4444' }]}>Yasaklı</Text>
                    </View>
                  )}
                </View>
                
                <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                  {user.member_number || 'Üye No: -'}
                </Text>
                
                <View style={styles.userBadges}>
                  <View style={[styles.badge, { backgroundColor: memberClassColors[user.member_class] + '20' }]}>
                    <Text style={[styles.badgeText, { color: memberClassColors[user.member_class] }]}>
                      {user.member_class}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: roleColors[user.role] + '20' }]}>
                    <Text style={[styles.badgeText, { color: roleColors[user.role] }]}>
                      {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))
        )}

        {/* Load More */}
        {hasMore && (
          <TouchableOpacity
            style={[styles.loadMoreButton, { backgroundColor: colors.primary + '15' }]}
            onPress={() => {
              setPage(prev => prev + 1);
              loadUsers();
            }}
          >
            <Text style={[styles.loadMoreText, { color: colors.primary }]}>Daha Fazla Yükle</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* User Detail Modal - Modern Design */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>Kapat</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Kullanıcı Detayı</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedUser && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* User Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: getAvatarUrl(selectedUser.avatar_url, selectedUser.id) }}
                    style={styles.profileAvatar}
                  />
                  {selectedUser.is_banned && (
                    <View style={styles.bannedOverlay}>
                      <Ionicons name="ban" size={32} color="#EF4444" />
                    </View>
                  )}
                </View>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {selectedUser.full_name || 'İsimsiz Kullanıcı'}
                </Text>
                <Text style={[styles.profileMemberNumber, { color: colors.textSecondary }]}>
                  {selectedUser.member_number || 'Üye No: -'}
                </Text>
                
                <View style={styles.profileBadges}>
                  <View style={[styles.profileBadge, { backgroundColor: memberClassColors[selectedUser.member_class] }]}>
                    <Text style={styles.profileBadgeText}>{selectedUser.member_class}</Text>
                  </View>
                  <View style={[styles.profileBadge, { backgroundColor: roleColors[selectedUser.role] }]}>
                    <Text style={styles.profileBadgeText}>{selectedUser.role === 'admin' ? 'Admin' : 'Kullanıcı'}</Text>
                  </View>
                  {selectedUser.is_banned && (
                    <View style={[styles.profileBadge, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.profileBadgeText}>Yasaklı</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Ban Warning */}
              {selectedUser.is_banned && (
                <View style={[styles.banWarning, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="warning" size={20} color="#EF4444" />
                  <View style={styles.banWarningContent}>
                    <Text style={[styles.banWarningTitle, { color: '#EF4444' }]}>Bu kullanıcı yasaklı</Text>
                    <Text style={[styles.banWarningReason, { color: colors.textSecondary }]}>
                      Neden: {selectedUser.ban_reason || 'Belirtilmemiş'}
                    </Text>
                    {selectedUser.banned_at && (
                      <Text style={[styles.banWarningDate, { color: colors.textSecondary }]}>
                        Tarih: {formatDate(selectedUser.banned_at)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* User ID Card */}
              <View style={[styles.idCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8F8F8' }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>KULLANICI ID</Text>
                <Text style={[styles.idValue, { color: colors.text }]} selectable>
                  {selectedUser.id}
                </Text>
              </View>

              {/* Info Section */}
              <View style={[styles.infoSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <View style={styles.infoRowLeft}>
                    <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Kayıt Tarihi</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(selectedUser.created_at)}
                  </Text>
                </View>
                <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <View style={styles.infoRowLeft}>
                    <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefon</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {selectedUser.phone || '-'}
                  </Text>
                </View>
                <View style={[styles.infoRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <View style={styles.infoRowLeft}>
                    <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>E-posta</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                    {selectedUser.email || '-'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoRowLeft}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Son Güncelleme</Text>
                  </View>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(selectedUser.updated_at)}
                  </Text>
                </View>
              </View>

              {/* Role Section */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ROL</Text>
              <View style={styles.optionsRow}>
                {(['user', 'admin'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selectedUser.role === role 
                          ? colors.primary
                          : isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5',
                        borderColor: selectedUser.role === role 
                          ? colors.primary
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    onPress={() => handleUpdateRole(role)}
                    disabled={isUpdating}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: selectedUser.role === role ? '#fff' : colors.text },
                      ]}
                    >
                      {role === 'admin' ? 'Admin' : 'Kullanıcı'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Member Class Section */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ÜYELİK SINIFI</Text>
              <View style={styles.optionsRow}>
                {(['Normal', 'Gold', 'Business'] as const).map((memberClass) => (
                  <TouchableOpacity
                    key={memberClass}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selectedUser.member_class === memberClass 
                          ? memberClassColors[memberClass]
                          : isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5',
                        borderColor: selectedUser.member_class === memberClass 
                          ? memberClassColors[memberClass]
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    onPress={() => handleMemberClassSelect(memberClass)}
                    disabled={isUpdating}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: selectedUser.member_class === memberClass ? '#fff' : colors.text },
                      ]}
                    >
                      {memberClass}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Show expiry date if Gold */}
              {selectedUser.member_class === 'Gold' && selectedUser.membership_expires_at && (
                <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
                  Bitiş: {formatDate(selectedUser.membership_expires_at)}
                </Text>
              )}

              {/* Duration Picker for Gold */}
              {showDurationPicker && (
                <View style={[styles.durationPicker, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9F9F9', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[styles.durationTitle, { color: colors.text }]}>Gold Süresi Seçin</Text>
                  <View style={styles.durationOptions}>
                    {(Object.keys(durationLabels) as MembershipDuration[]).map((duration) => (
                      <TouchableOpacity
                        key={duration}
                        style={[
                          styles.durationChip,
                          {
                            backgroundColor: selectedDuration === duration 
                              ? memberClassColors.Gold
                              : isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            borderColor: selectedDuration === duration 
                              ? memberClassColors.Gold
                              : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          },
                        ]}
                        onPress={() => setSelectedDuration(duration)}
                      >
                        <Text style={[
                          styles.durationChipText,
                          { color: selectedDuration === duration ? '#fff' : colors.text }
                        ]}>
                          {durationLabels[duration]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.durationActions}>
                    <TouchableOpacity
                      style={[styles.durationCancel, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                      onPress={() => setShowDurationPicker(false)}
                    >
                      <Text style={[styles.durationCancelText, { color: colors.textSecondary }]}>Vazgeç</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.durationConfirm, { backgroundColor: memberClassColors.Gold }]}
                      onPress={() => handleUpdateMemberClass('Gold', selectedDuration)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.durationConfirmText}>Onayla</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Ban/Unban Button */}
              <TouchableOpacity
                style={[
                  styles.banButton,
                  {
                    backgroundColor: selectedUser.is_banned === true ? '#22C55E15' : '#EF444410',
                    borderColor: selectedUser.is_banned === true ? '#22C55E30' : '#EF444430',
                  },
                ]}
                onPress={() => {
                  if (selectedUser.is_banned === true) {
                    handleUnbanUser();
                  } else {
                    handleBanUser();
                  }
                }}
                disabled={isUpdating}
              >
                {isUpdating && !showBanModal ? (
                  <ActivityIndicator size="small" color={selectedUser.is_banned === true ? '#22C55E' : '#EF4444'} />
                ) : (
                  <>
                    <Ionicons
                      name={selectedUser.is_banned === true ? 'checkmark-circle' : 'ban'}
                      size={20}
                      color={selectedUser.is_banned === true ? '#22C55E' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.banButtonText,
                        { color: selectedUser.is_banned === true ? '#22C55E' : '#EF4444' },
                      ]}
                    >
                      {selectedUser.is_banned === true ? 'Yasağı Kaldır' : 'Kullanıcıyı Yasakla'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Inline Ban Sheet */}
              {showBanModal && (
                <View style={[styles.inlineBanSheet, { backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2', borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#FECACA' }]}>
                  {/* Header */}
                  <View style={styles.inlineBanHeader}>
                    <View style={[styles.inlineBanIconContainer, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="ban" size={24} color="#EF4444" />
                    </View>
                    <View style={styles.inlineBanHeaderText}>
                      <Text style={[styles.inlineBanTitle, { color: colors.text }]}>Kullanıcıyı Yasakla</Text>
                      <Text style={[styles.inlineBanSubtitle, { color: colors.textSecondary }]}>
                        Bu kullanıcı sisteme giriş yapamayacak
                      </Text>
                    </View>
                  </View>
                  
                  {/* Input */}
                  <Text style={[styles.inlineBanLabel, { color: colors.textSecondary }]}>YASAKLAMA NEDENİ</Text>
                  <TextInput
                    style={[
                      styles.inlineBanInput, 
                      { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', 
                        color: colors.text,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      }
                    ]}
                    placeholder="Örn: Topluluk kurallarını ihlal etti..."
                    placeholderTextColor={colors.textSecondary}
                    value={banReason}
                    onChangeText={setBanReason}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  
                  {/* Actions */}
                  <View style={styles.inlineBanActions}>
                    <TouchableOpacity
                      style={[styles.inlineBanCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                      onPress={() => {
                        setShowBanModal(false);
                        setBanReason('');
                      }}
                    >
                      <Text style={[styles.inlineBanCancelText, { color: colors.text }]}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.inlineBanConfirmBtn, { opacity: isUpdating || !banReason.trim() ? 0.6 : 1 }]}
                      onPress={submitBan}
                      disabled={isUpdating || !banReason.trim()}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="ban" size={16} color="#fff" />
                          <Text style={styles.inlineBanConfirmText}>Yasakla</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
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
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  resultCount: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 12,
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
    textAlign: 'center',
  },
  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
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
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  // Load more
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 15,
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
  // Profile header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 4,
  },
  profileMemberNumber: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 12,
  },
  profileBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  profileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  profileBadgeText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  // Info section
  infoSection: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  // Section title
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  // Options row
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  optionChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  // Expiry text
  expiryText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginTop: -12,
    marginBottom: 20,
  },
  // Duration picker
  durationPicker: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  durationTitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 14,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  durationChipText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  durationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  durationCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  durationCancelText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  durationConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  durationConfirmText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  // Status button
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  // New modern styles
  avatarContainer: {
    position: 'relative',
  },
  bannedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banWarning: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  banWarningContent: {
    flex: 1,
  },
  banWarningTitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  banWarningReason: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  banWarningDate: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginTop: 4,
  },
  idCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  idValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.3,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  banButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  banButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  // Inline Ban Sheet styles
  inlineBanSheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  inlineBanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  inlineBanIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineBanHeaderText: {
    flex: 1,
  },
  inlineBanTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 2,
  },
  inlineBanSubtitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  inlineBanLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inlineBanInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    minHeight: 80,
    borderWidth: 1,
    marginBottom: 16,
  },
  inlineBanActions: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineBanCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inlineBanCancelText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  inlineBanConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  inlineBanConfirmText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  // Ban sheet styles (legacy - can be removed)
  banSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  banSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  banSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  banSheetHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  banSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  banSheetHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  banSheetIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  banSheetTitle: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 8,
  },
  banSheetSubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
  },
  banSheetContent: {
    paddingHorizontal: 24,
  },
  banSheetLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  banSheetInput: {
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    minHeight: 120,
    borderWidth: 1,
    marginBottom: 24,
  },
  banSheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  banSheetCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  banSheetCancelText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  banSheetConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#EF4444',
  },
  banSheetConfirmText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  // Legacy ban modal styles (kept for reference)
  banModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  banModalContent: {
    borderRadius: 20,
    padding: 24,
  },
  banModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  banModalTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '700',
  },
  banModalSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  banReasonInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  banModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  banModalBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  banModalBtnText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
});
