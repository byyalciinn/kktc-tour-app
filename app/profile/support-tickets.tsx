/**
 * Support Tickets Screen
 * Minimalist premium design for creating and viewing support tickets
 */

import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore, useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';

// Ticket categories
const TICKET_CATEGORIES = [
  { id: 'general', label: 'Genel Soru' },
  { id: 'booking', label: 'Rezervasyon' },
  { id: 'technical', label: 'Teknik Destek' },
  { id: 'feedback', label: 'Öneri / Şikayet' },
  { id: 'payment', label: 'Ödeme' },
  { id: 'other', label: 'Diğer' },
] as const;

// Status labels
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Açık', color: '#3B82F6' },
  in_progress: { label: 'İşlemde', color: '#F59E0B' },
  resolved: { label: 'Çözüldü', color: '#22C55E' },
  closed: { label: 'Kapatıldı', color: '#6B7280' },
};

interface Ticket {
  id: string;
  ticket_code: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

export default function SupportTicketsScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { user } = useAuthStore();

  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Create ticket form
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reply form
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  // Fetch ticket messages
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

  // Create ticket
  const handleCreateTicket = async () => {
    if (!user?.id) return;
    if (!selectedCategory) {
      Alert.alert('Uyarı', 'Lütfen bir kategori seçin.');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir konu girin.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı yazın.');
      return;
    }

    setIsCreating(true);
    try {
      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          category: selectedCategory,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add initial message
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketData.id,
          sender_id: user.id,
          message: message.trim(),
          is_admin: false,
        });

      if (messageError) throw messageError;

      // Reset form and close modal
      setSelectedCategory('');
      setSubject('');
      setMessage('');
      setShowCreateModal(false);
      
      // Refresh tickets
      fetchTickets();
      
      Alert.alert(
        'Bilet Oluşturuldu',
        `Bilet kodunuz: ${ticketData.ticket_code}\n\nEn kısa sürede size dönüş yapacağız.`
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bilet oluşturulamadı.');
    } finally {
      setIsCreating(false);
    }
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
          is_admin: false,
        });

      if (error) throw error;

      setReplyMessage('');
      fetchMessages(selectedTicket.id);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Mesaj gönderilemedi.');
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

  // Get category label
  const getCategoryLabel = (categoryId: string) => {
    return TICKET_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Destek Biletleri
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          {tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Henüz bilet yok
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Yardıma mı ihtiyacınız var? Yeni bir destek bileti oluşturun.
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyButtonText}>Bilet Oluştur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Info text */}
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {tickets.length} bilet
              </Text>

              {/* Tickets list */}
              {tickets.map((ticket) => (
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
                  <View style={styles.ticketFooter}>
                    <Text style={[styles.ticketCategory, { color: colors.textSecondary }]}>
                      {getCategoryLabel(ticket.category)}
                    </Text>
                    <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                      {formatDate(ticket.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Create Ticket Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Yeni Bilet</Text>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView 
              style={styles.modalContent} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            >
              {/* Category Selection */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  KATEGORİ
                </Text>
                <View style={styles.categoriesGrid}>
                  {TICKET_CATEGORIES.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                            borderColor: isSelected
                              ? colors.primary
                              : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                          },
                        ]}
                        onPress={() => setSelectedCategory(category.id)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          { color: isSelected ? '#fff' : colors.text }
                        ]}>
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Subject */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  KONU
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      color: colors.text,
                    },
                  ]}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Kısa bir başlık yazın"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Message */}
              <View style={styles.formSection}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                  MESAJ
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.formTextArea,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                      color: colors.text,
                    },
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Sorununuzu veya sorunuzu detaylı açıklayın"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: (selectedCategory && subject && message)
                      ? colors.primary
                      : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                onPress={handleCreateTicket}
                disabled={isCreating || !selectedCategory || !subject || !message}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[
                    styles.submitButtonText,
                    { color: (selectedCategory && subject && message) ? '#fff' : colors.textSecondary }
                  ]}>
                    Bileti Oluştur
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Ticket Detail Modal */}
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
                  <View style={styles.ticketInfoRow}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textSecondary }]}>Kategori</Text>
                    <Text style={[styles.ticketInfoValue, { color: colors.text }]}>
                      {getCategoryLabel(selectedTicket.category)}
                    </Text>
                  </View>
                  <View style={styles.ticketInfoRow}>
                    <Text style={[styles.ticketInfoLabel, { color: colors.textSecondary }]}>Oluşturulma</Text>
                    <Text style={[styles.ticketInfoValue, { color: colors.text }]}>
                      {formatDate(selectedTicket.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Subject */}
                <Text style={[styles.detailSubject, { color: colors.text }]}>
                  {selectedTicket.subject}
                </Text>

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
                          msg.is_admin ? styles.adminMessage : styles.userMessage,
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
                            {msg.is_admin ? 'Destek Ekibi' : 'Siz'}
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

              {/* Reply Input - only if ticket is not closed */}
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
                    placeholder="Mesajınızı yazın..."
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
  backButtonText: {
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIndicator: {
    width: 48,
    height: 3,
    borderRadius: 2,
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
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },

  // Info text
  infoText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginBottom: 16,
  },

  // Ticket Card
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
    lineHeight: 22,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // Form
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  formInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  formTextArea: {
    minHeight: 140,
    paddingTop: 14,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Ticket Detail
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
    marginBottom: 24,
    lineHeight: 26,
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
  userMessage: {},
  adminMessage: {},
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
