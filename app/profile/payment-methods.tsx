/**
 * Payment Methods Screen
 * Premium design for managing payment cards and methods
 */

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

// Mock saved cards - replace with actual data
const MOCK_CARDS = [
  {
    id: '1',
    type: 'visa',
    last4: '4242',
    expiry: '12/26',
    holder: 'JOHN DOE',
    isDefault: true,
    gradient: ['#1A1A2E', '#16213E'],
  },
  {
    id: '2',
    type: 'mastercard',
    last4: '8888',
    expiry: '08/25',
    holder: 'JOHN DOE',
    isDefault: false,
    gradient: ['#0F4C75', '#3282B8'],
  },
];

// Card type icons and colors
const CARD_BRANDS: Record<string, { icon: string; color: string }> = {
  visa: { icon: 'card', color: '#1A1F71' },
  mastercard: { icon: 'card', color: '#EB001B' },
  amex: { icon: 'card', color: '#006FCF' },
};

export default function PaymentMethodsScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const [cards, setCards] = useState(MOCK_CARDS);
  const [showAddCard, setShowAddCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New card form
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.slice(0, 19);
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleSetDefault = (cardId: string) => {
    setCards(cards.map(card => ({
      ...card,
      isDefault: card.id === cardId,
    })));
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert(
      'Kartı Sil',
      'Bu kartı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => setCards(cards.filter(c => c.id !== cardId)),
        },
      ]
    );
  };

  const handleAddCard = () => {
    if (!cardNumber || !expiry || !cvv || !cardHolder) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const newCard = {
        id: Date.now().toString(),
        type: 'visa',
        last4: cardNumber.replace(/\s/g, '').slice(-4),
        expiry,
        holder: cardHolder.toUpperCase(),
        isDefault: cards.length === 0,
        gradient: ['#2D3436', '#636E72'] as [string, string],
      };
      setCards([...cards, newCard]);
      setShowAddCard(false);
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setCardHolder('');
      setIsLoading(false);
      Alert.alert('Başarılı', 'Kart başarıyla eklendi.');
    }, 1500);
  };

  const renderCreditCard = (card: typeof MOCK_CARDS[0]) => (
    <View key={card.id} style={styles.cardWrapper}>
      <LinearGradient
        colors={card.gradient as [string, string]}
        style={styles.creditCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Card Pattern */}
        <View style={styles.cardPattern}>
          <View style={[styles.patternCircle, styles.patternCircle1]} />
          <View style={[styles.patternCircle, styles.patternCircle2]} />
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Top Row */}
          <View style={styles.cardTopRow}>
            <View style={styles.chipContainer}>
              <View style={styles.chip} />
            </View>
            {card.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Varsayılan</Text>
              </View>
            )}
          </View>

          {/* Card Number */}
          <Text style={styles.cardNumberText}>
            •••• •••• •••• {card.last4}
          </Text>

          {/* Bottom Row */}
          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardLabel}>Kart Sahibi</Text>
              <Text style={styles.cardValue}>{card.holder}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>Son Kullanım</Text>
              <Text style={styles.cardValue}>{card.expiry}</Text>
            </View>
            <View style={styles.cardBrandContainer}>
              <Text style={styles.cardBrandText}>
                {card.type.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Card Actions */}
      <View style={[styles.cardActions, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
        {!card.isDefault && (
          <TouchableOpacity
            style={styles.cardAction}
            onPress={() => handleSetDefault(card.id)}
          >
            <Ionicons name="star-outline" size={18} color={colors.primary} />
            <Text style={[styles.cardActionText, { color: colors.primary }]}>
              Varsayılan Yap
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.cardAction}
          onPress={() => handleDeleteCard(card.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={[styles.cardActionText, { color: '#EF4444' }]}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Ödeme Yöntemleri
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddCard(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)' }]}>
          <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
          <Text style={[styles.infoBannerText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            Tüm kart bilgileriniz PCI DSS standartlarına uygun şekilde şifrelenmektedir.
          </Text>
        </View>

        {/* Cards List */}
        {cards.length > 0 ? (
          <View style={styles.cardsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              KAYITLI KARTLAR
            </Text>
            {cards.map(renderCreditCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="card-outline" size={48} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Henüz Kart Eklenmemiş
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Hızlı ve güvenli ödeme için kart ekleyin
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddCard(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Kart Ekle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Other Payment Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DİĞER ÖDEME YÖNTEMLERİ
          </Text>
          <View style={[styles.otherMethods, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            <TouchableOpacity style={[styles.methodRow, styles.methodRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[styles.methodIcon, { backgroundColor: '#22C55E20' }]}>
                <Ionicons name="cash-outline" size={22} color="#22C55E" />
              </View>
              <View style={styles.methodContent}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>Nakit Ödeme</Text>
                <Text style={[styles.methodSubtitle, { color: colors.textSecondary }]}>Tur sırasında nakit ödeyin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.methodRow}>
              <View style={[styles.methodIcon, { backgroundColor: '#8B5CF620' }]}>
                <Ionicons name="wallet-outline" size={22} color="#8B5CF6" />
              </View>
              <View style={styles.methodContent}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>Havale / EFT</Text>
                <Text style={[styles.methodSubtitle, { color: colors.textSecondary }]}>Banka havalesi ile ödeyin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Add Card Modal */}
      <Modal
        visible={showAddCard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddCard(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: 20 }]}>
            <TouchableOpacity onPress={() => setShowAddCard(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Yeni Kart Ekle</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Card Preview */}
            <LinearGradient
              colors={['#2D3436', '#636E72']}
              style={styles.cardPreview}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardPreviewContent}>
                <Text style={styles.cardPreviewNumber}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </Text>
                <View style={styles.cardPreviewBottom}>
                  <Text style={styles.cardPreviewName}>
                    {cardHolder || 'KART SAHİBİ'}
                  </Text>
                  <Text style={styles.cardPreviewExpiry}>
                    {expiry || 'MM/YY'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Form */}
            <View style={styles.formSection}>
              <View style={[styles.formCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.formRow, styles.formRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Kart Numarası</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text }]}
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor={colors.textSecondary + '60'}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>
                <View style={styles.formRowDouble}>
                  <View style={[styles.formRowHalf, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Son Kullanım</Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.text }]}
                      value={expiry}
                      onChangeText={(text) => setExpiry(formatExpiry(text))}
                      placeholder="MM/YY"
                      placeholderTextColor={colors.textSecondary + '60'}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.formRowHalf}>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>CVV</Text>
                    <TextInput
                      style={[styles.formInput, { color: colors.text }]}
                      value={cvv}
                      onChangeText={setCvv}
                      placeholder="•••"
                      placeholderTextColor={colors.textSecondary + '60'}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
                <View style={styles.formRow}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Kart Üzerindeki İsim</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text }]}
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    placeholder="AD SOYAD"
                    placeholderTextColor={colors.textSecondary + '60'}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addCardButton, { backgroundColor: colors.primary }]}
              onPress={handleAddCard}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={22} color="#fff" />
                  <Text style={styles.addCardButtonText}>Kartı Ekle</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 18,
  },

  // Cards Section
  cardsSection: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },

  // Credit Card
  cardWrapper: {
    marginBottom: 20,
  },
  creditCard: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  patternCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  patternCircle2: {
    width: 200,
    height: 200,
    bottom: -80,
    left: -60,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipContainer: {
    width: 50,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,215,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chip: {
    width: 35,
    height: 25,
    borderRadius: 4,
    backgroundColor: 'rgba(255,215,0,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(218,165,32,0.6)',
  },
  defaultBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  cardNumberText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    letterSpacing: 2,
    marginVertical: 20,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  cardBrandContainer: {
    alignItems: 'flex-end',
  },
  cardBrandText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActionText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Other Methods
  otherMethods: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  methodRowBorder: {
    borderBottomWidth: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 13,
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
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Card Preview
  cardPreview: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  cardPreviewContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardPreviewNumber: {
    color: '#fff',
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
    letterSpacing: 2,
    marginBottom: 20,
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  cardPreviewExpiry: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Form
  formSection: {
    marginBottom: 24,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formRow: {
    padding: 16,
  },
  formRowBorder: {
    borderBottomWidth: 1,
  },
  formRowDouble: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  formRowHalf: {
    flex: 1,
    padding: 16,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },

  // Add Card Button
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  addCardButtonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
});
