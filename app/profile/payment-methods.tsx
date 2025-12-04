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
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

// Cards will be loaded from backend in the future
const MOCK_CARDS: any[] = [];

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
        <View style={{ width: 44 }} />
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

        {/* Coming Soon Section */}
        <View style={styles.comingSoonSection}>
          <View style={[styles.comingSoonCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.comingSoonIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
            <Text style={[styles.comingSoonTitle, { color: colors.text }]}>
              Yakında Sizlerle
            </Text>
            <Text style={[styles.comingSoonSubtitle, { color: colors.textSecondary }]}>
              Kart ekleme özelliği çok yakında aktif olacak
            </Text>
          </View>
        </View>

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

  // Coming Soon Section
  comingSoonSection: {
    marginBottom: 24,
  },
  comingSoonCard: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  comingSoonIndicator: {
    width: 48,
    height: 3,
    borderRadius: 2,
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  comingSoonSubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
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

});
