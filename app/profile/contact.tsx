/**
 * Contact & Support Screen
 * Minimalist premium design
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
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useTranslation } from 'react-i18next';

// Contact channels - minimal design
const CONTACT_CHANNELS = [
  {
    id: 'phone',
    value: '0548 866 83 40',
    icon: 'call-outline',
    action: 'tel:+905488668340',
  },
  {
    id: 'whatsapp',
    value: '0548 866 83 40',
    icon: 'logo-whatsapp',
    action: 'https://wa.me/905488668340',
  },
  {
    id: 'email',
    value: 'cyprurigo@gmail.com',
    icon: 'mail-outline',
    action: 'mailto:cyprurigo@gmail.com',
  },
] as const;

// FAQ item keys - without icons for minimal design
const FAQ_ITEMS = [
  { id: 'tours' },
  { id: 'favorites' },
  { id: 'directions' },
  { id: 'membership' },
] as const;

export default function ContactScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const handleContactChannel = async (action: string) => {
    try {
      const supported = await Linking.canOpenURL(action);
      if (supported) {
        await Linking.openURL(action);
      } else {
        Alert.alert(t('common.error'), t('profileScreens.contact.errorUnsupported'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profileScreens.contact.errorGeneric'));
    }
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('profileScreens.contact.header')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Banner - Links to Support Tickets */}
        <TouchableOpacity
          style={[
            styles.questionBanner,
            {
              backgroundColor: isDark ? colors.primary + '15' : colors.primary + '08',
              borderColor: isDark ? colors.primary + '30' : colors.primary + '20',
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push('/profile/support-tickets')}
        >
          <View style={[styles.questionIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="help-buoy-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.questionContent}>
            <Text style={[styles.questionTitle, { color: colors.text }]}>
              {t('profileScreens.contact.questionBannerTitle')}
            </Text>
            <Text style={[styles.questionSubtitle, { color: colors.textSecondary }]}>
              {t('profileScreens.contact.questionBannerSubtitle')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>

        {/* Info Section - Removal Request */}
        <View
          style={[
            styles.infoSection,
            {
              backgroundColor: isDark ? colors.primary + '15' : colors.primary + '08',
              borderColor: isDark ? colors.primary + '30' : colors.primary + '20',
            },
          ]}
        >
          <View style={[styles.infoIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="information-circle-outline" size={26} color={colors.primary} />
          </View>
          <Text style={[styles.infoText, { color: colors.text }]}>
            Listelerimizde yer almak istemeyen bir yer mi gördünüz? Desteğiniz için teşekkür ederiz. İlgili mekanın/bölgenin listeden çıkarılması için hemen şimdi bir destek bileti oluşturabilirsiniz.
          </Text>
        </View>

        {/* Quick Contact Section - Minimal design */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profileScreens.contact.quickContactTitle')}
          </Text>
          <View style={styles.contactList}>
            {CONTACT_CHANNELS.map((channel, index) => (
              <TouchableOpacity
                key={channel.id}
                style={[
                  styles.contactRow,
                  index < CONTACT_CHANNELS.length - 1 && [
                    styles.contactRowBorder,
                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                  ],
                ]}
                activeOpacity={0.7}
                onPress={() => handleContactChannel(channel.action)}
              >
                <Ionicons name={channel.icon as any} size={20} color={colors.textSecondary} />
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>
                    {t(`profileScreens.contact.channels.${channel.id}`)}
                  </Text>
                  <Text style={[styles.contactValue, { color: colors.text }]}>
                    {channel.value}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section - Minimal without icons */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profileScreens.contact.faqTitle')}
          </Text>
          <View
            style={[
              styles.faqCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              },
            ]}
          >
            {FAQ_ITEMS.map((faq, index) => (
              <View key={faq.id}>
                <TouchableOpacity
                  style={[
                    styles.faqItem,
                    index < FAQ_ITEMS.length - 1 && expandedFaq !== faq.id && [
                      styles.faqItemBorder,
                      { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                    ],
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                >
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>
                    {t(`profileScreens.contact.faq.${faq.id}.question`)}
                  </Text>
                  <Ionicons
                    name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {expandedFaq === faq.id && (
                  <View
                    style={[
                      styles.faqAnswer,
                      index < FAQ_ITEMS.length - 1 && [
                        styles.faqItemBorder,
                        { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                      ],
                    ]}
                  >
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                      {t(`profileScreens.contact.faq.${faq.id}.answer`)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Question Banner
  questionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
    gap: 14,
  },
  questionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionContent: {
    flex: 1,
  },
  questionTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  questionSubtitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 18,
  },
  questionExtra: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 18,
    marginTop: 6,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 24,
  },
  infoIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 14,
    marginLeft: 4,
  },

  // Contact List - Minimal rows
  contactList: {
    backgroundColor: 'transparent',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  contactRowBorder: {
    borderBottomWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },

  // FAQ Card - Minimal without icons
  faqCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 22,
  },
});
