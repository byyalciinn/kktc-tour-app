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
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useTranslation } from 'react-i18next';

// FAQ item keys
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;

// Help categories - minimal design without icons
const HELP_CATEGORIES = [
  { id: 'account' },
  { id: 'tours' },
  { id: 'membership' },
] as const;

export default function HelpScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profileScreens.help.header')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Help Categories - Minimal horizontal list */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profileScreens.help.categoriesTitle')}
          </Text>
          <View style={styles.categoriesRow}>
            {HELP_CATEGORIES.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, { color: colors.text }]}>
                  {t(`profileScreens.help.categories.${category.id}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profileScreens.help.faqTitle')}
          </Text>
          <View
            style={[
              styles.faqCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            {FAQ_KEYS.map((key, index) => (
              <View key={key}>
                <TouchableOpacity
                  style={[
                    styles.faqItem,
                    index < FAQ_KEYS.length - 1 && expandedIndex !== index && [
                      styles.faqItemBorder,
                      { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                    ],
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(index)}
                >
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>
                    {t(`profileScreens.help.faq.${key}`)}
                  </Text>
                  <Ionicons
                    name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {expandedIndex === index && (
                  <View style={[
                    styles.faqAnswer,
                    index < FAQ_KEYS.length - 1 && [
                      styles.faqItemBorder,
                      { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                    ],
                  ]}>
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                      {t(`profileScreens.help.faq.a${key.slice(1)}`)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Contact Support - Minimal bordered button */}
        <TouchableOpacity
          style={[
            styles.contactButton,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            },
          ]}
          activeOpacity={0.8}
          onPress={() => router.push('/profile/contact')}
        >
          <Text style={[styles.contactButtonText, { color: colors.text }]}>
            {t('profileScreens.help.contactButton')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Categories - Minimal chips
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },

  // FAQ
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // Contact Button - Minimal bordered
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  contactButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
});
