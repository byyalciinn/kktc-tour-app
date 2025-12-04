/**
 * Tickets Tab Component
 * 
 * Admin panel component for managing support tickets
 * Minimalist premium design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';

interface TicketsTabProps {
  colors: typeof Colors.light;
  isDark: boolean;
  insets: EdgeInsets;
}

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Açık', color: '#3B82F6' },
  in_progress: { label: 'İşlemde', color: '#F59E0B' },
  resolved: { label: 'Çözüldü', color: '#22C55E' },
  closed: { label: 'Kapatıldı', color: '#6B7280' },
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  general: 'Genel Soru',
  booking: 'Rezervasyon',
  technical: 'Teknik Destek',
  feedback: 'Öneri / Şikayet',
  payment: 'Ödeme',
  other: 'Diğer',
};

type FilterStatus = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

interface Ticket {
  id: string;
  ticket_code: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_id: string;
}

export default function TicketsTab({ colors, isDark, insets }: TicketsTabProps) {
  const { user } = useAuthStore();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('open');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Reply form
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
  });

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      let usersMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        users?.forEach(u => { usersMap[u.id] = u; });
      }

      const enrichedTickets: Ticket[] = (ticketsData || []).map(ticket => ({
        ...ticket,
        user: usersMap[ticket.user_id] || null,
      }));

      setTickets(enrichedTickets);

      // Calculate stats
      setStats({
        total: enrichedTickets.length,
        open: enrichedTickets.filter(t => t.status === 'open').length,
        in_progress: enrichedTickets.filter(t => t.status === 'in_progress').length,
        resolved: enrichedTickets.filter(t => t.status === 'resolved').length,
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch messages
  const fetchMessages = async (ticketId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTicketMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, [fetchTickets]);

  // Update ticket status
  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    if (!user?.id) return;

    setProcessing(true);
    try {
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user.id;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, status: newStatus } : t
      ));

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }

      // Recalculate stats
      fetchTickets();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'İşlem başarısız oldu');
    } finally {
      setProcessing(false);
    }
  };

  // Delete ticket
  const deleteTicket = async (ticketId: string) => {
    Alert.alert(
      'Bileti Sil',
      'Bu bileti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const { error } = await supabase
                .from('support_tickets')
                .delete()
                .eq('id', ticketId);

              if (error) throw error;

              setTickets(prev => prev.filter(t => t.id !== ticketId));
              setShowDetailModal(false);
              setSelectedTicket(null);
              fetchTickets();
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Bilet silinemedi');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  // Send reply
  const handleSendReply = async () => {
    if (!user?.id || !selectedTicket) return;
    if (!replyMessage.trim()) return;

    setIsSendingReply(true);
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: replyMessage.trim(),
          is_admin: true,
        });

      if (error) throw error;

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await updateTicketStatus(selectedTicket.id, 'in_progress');
      }

      setReplyMessage('');
      fetchMessages(selectedTicket.id);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Mesaj gönderilemedi');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Open ticket detail
  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
    fetchMessages(ticket.id);
  };

  // Filter tickets
  const filteredTickets = filterStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === filterStatus);

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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Toplam</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.open}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Açık</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.in_progress}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>İşlemde</Text>
        </View>
      </View>

      {/* Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as FilterStatus[]).map((status) => (
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
              {status === 'all' ? 'Tümü' : STATUS_CONFIG[status]?.label || status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tickets List */}
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
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#D1D5DB' }]} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Bilet bulunamadı
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Bu filtreye uygun bilet yok
            </Text>
          </View>
        ) : (
          filteredTickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={[
                styles.ticketCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
              onPress={() => openTicketDetail(ticket)}
              activeOpacity={0.7}
            >
              <View style={styles.ticketHeader}>
                <Text style={[styles.ticketCode, { color: colors.primary }]}>
                  {ticket.ticket_code}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: `${STATUS_CONFIG[ticket.status]?.color || '#6B7280'}15` }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: STATUS_CONFIG[ticket.status]?.color || '#6B7280' }
                  ]}>
                    {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                  </Text>
                </View>
              </View>

              <Text style={[styles.ticketSubject, { color: colors.text }]} numberOfLines={2}>
                {ticket.subject}
              </Text>

              <View style={styles.ticketMeta}>
                <Text style={[styles.ticketUser, { color: colors.textSecondary }]}>
                  {ticket.user?.full_name || 'Kullanıcı'}
                </Text>
                <Text style={[styles.ticketDot, { color: colors.textSecondary }]}>·</Text>
                <Text style={[styles.ticketCategory, { color: colors.textSecondary }]}>
                  {CATEGORY_LABELS[ticket.category] || ticket.category}
                </Text>
              </View>

              <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                {formatDate(ticket.created_at)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedTicket(null);
          setTicketMessages([]);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <TouchableOpacity onPress={() => {
              setShowDetailModal(false);
              setSelectedTicket(null);
              setTicketMessages([]);
            }}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Kapat</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedTicket?.ticket_code}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedTicket && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                style={styles.modalContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Ticket Info */}
                <View style={[
                  styles.ticketInfoCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }
                ]}>
                  <View style={styles.ticketInfoRow}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textSecondary }]}>Kullanıcı</Text>
                    <Text style={[styles.ticketInfoValue, { color: colors.text }]}>
                      {selectedTicket.user?.full_name || 'Bilinmiyor'}
                    </Text>
                  </View>
                  <View style={styles.ticketInfoRow}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textSecondary }]}>Kategori</Text>
                    <Text style={[styles.ticketInfoValue, { color: colors.text }]}>
                      {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                    </Text>
                  </View>
                  <View style={styles.ticketInfoRow}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textSecondary }]}>Durum</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: `${STATUS_CONFIG[selectedTicket.status]?.color || '#6B7280'}15` }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: STATUS_CONFIG[selectedTicket.status]?.color || '#6B7280' }
                      ]}>
                        {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Subject */}
                <Text style={[styles.detailSubject, { color: colors.text }]}>
                  {selectedTicket.subject}
                </Text>

                {/* Status Actions */}
                <View style={styles.statusActions}>
                  {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#22C55E' }]}
                      onPress={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      disabled={processing}
                    >
                      <Text style={styles.statusButtonText}>Çözüldü</Text>
                    </TouchableOpacity>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: '#6B7280' }]}
                      onPress={() => updateTicketStatus(selectedTicket.id, 'closed')}
                      disabled={processing}
                    >
                      <Text style={styles.statusButtonText}>Kapat</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => deleteTicket(selectedTicket.id)}
                    disabled={processing}
                  >
                    <Text style={styles.statusButtonText}>Sil</Text>
                  </TouchableOpacity>
                </View>

                {/* Messages */}
                <View style={styles.messagesSection}>
                  <Text style={[styles.messagesTitle, { color: colors.textSecondary }]}>
                    MESAJLAR
                  </Text>

                  {isLoadingMessages ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
                  ) : (
                    ticketMessages.map((msg) => (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageCard,
                          {
                            backgroundColor: msg.is_admin
                              ? isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)'
                              : isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                            borderColor: msg.is_admin
                              ? isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'
                              : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                          },
                        ]}
                      >
                        <View style={styles.messageHeader}>
                          <Text style={[
                            styles.messageSender,
                            { color: msg.is_admin ? '#3B82F6' : colors.text }
                          ]}>
                            {msg.is_admin ? 'Destek Ekibi' : 'Kullanıcı'}
                          </Text>
                          <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
                            {formatDate(msg.created_at)}
                          </Text>
                        </View>
                        <Text style={[styles.messageText, { color: colors.text }]}>
                          {msg.message}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Reply Input */}
              {selectedTicket.status !== 'closed' && (
                <View style={[
                  styles.replyContainer,
                  {
                    backgroundColor: colors.background,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    paddingBottom: insets.bottom + 10,
                  }
                ]}>
                  <TextInput
                    style={[
                      styles.replyInput,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        color: colors.text,
                      },
                    ]}
                    value={replyMessage}
                    onChangeText={setReplyMessage}
                    placeholder="Yanıt yazın..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: replyMessage.trim() ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    onPress={handleSendReply}
                    disabled={isSendingReply || !replyMessage.trim()}
                  >
                    {isSendingReply ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[
                        styles.sendButtonText,
                        { color: replyMessage.trim() ? '#fff' : colors.textSecondary }
                      ]}>
                        Gönder
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
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
    paddingTop: 60,
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
  },

  // Ticket Card
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ticketCode: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  ticketSubject: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 10,
    lineHeight: 22,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketUser: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  ticketDot: {
    marginHorizontal: 6,
  },
  ticketCategory: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  ticketDate: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Ticket Info
  ticketInfoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  ticketInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  ticketInfoLabel: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  ticketInfoValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  detailSubject: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 26,
  },

  // Status Actions
  statusActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },

  // Messages
  messagesSection: {
    marginBottom: 20,
  },
  messagesTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  messageCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageSender: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  messageText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 22,
  },

  // Reply
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  replyInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
});
