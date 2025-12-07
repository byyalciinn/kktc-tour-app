/**
 * Tour Preferences Screen
 * Minimalist Premium Elegant Design
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
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useTranslation } from 'react-i18next';

// Tour category preferences - minimalist
const TOUR_CATEGORIES = [
  { id: 'history', label: 'Tarihi' },
  { id: 'nature', label: 'Doğa' },
  { id: 'beach', label: 'Plaj' },
  { id: 'adventure', label: 'Macera' },
  { id: 'food', label: 'Gastronomi' },
  { id: 'culture', label: 'Kültür' },
] as const;

// Group size preferences - minimalist
const GROUP_SIZES = [
  { id: 'solo', label: 'Bireysel' },
  { id: 'couple', label: 'Çift' },
  { id: 'family', label: 'Aile' },
  { id: 'group', label: 'Grup' },
] as const;

// Budget ranges - minimalist
const BUDGET_RANGES = [
  { id: 'budget', label: 'Ekonomik', range: '0-2.000₺' },
  { id: 'mid', label: 'Orta', range: '2.000-5.000₺' },
  { id: 'premium', label: 'Premium', range: '5.000-10.000₺' },
  { id: 'luxury', label: 'Lüks', range: '10.000₺+' },
] as const;

export default function TourPreferencesScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  // Preferences state
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['history', 'nature']);
  const [selectedGroupSize, setSelectedGroupSize] = useState<string>('couple');
  const [selectedBudget, setSelectedBudget] = useState<string>('mid');
  const [notifications, setNotifications] = useState({
    newTours: true,
    priceDrops: true,
    recommendations: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      Alert.alert(t('profileScreens.tourPreferences.selectWarningTitle'), t('profileScreens.tourPreferences.selectWarning'));
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        t('profileScreens.tourPreferences.saveSuccessTitle'),
        t('profileScreens.tourPreferences.saveSuccess'),
        [{ text: t('common.done'), onPress: () => router.back() }]
      );
    }, 800);
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
          {t('profileScreens.tourPreferences.header')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Text */}
        <Text style={[styles.introText, { color: colors.textSecondary }]}>
          {t('profileScreens.tourPreferences.intro')}
        </Text>

        {/* Favorite Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('profileScreens.tourPreferences.categoriesTitle')}
            </Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {t('profileScreens.tourPreferences.selectedCount', { count: selectedCategories.length })}
            </Text>
          </View>
          <View style={styles.categoriesGrid}>
            {TOUR_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                      borderColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text }
                  ]}>
                    {t(`profileScreens.tourPreferences.categories.${category.id}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Group Size */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profileScreens.tourPreferences.groupTitle')}
          </Text>
          <View style={styles.optionsRow}>
            {GROUP_SIZES.map((size) => {
              const isSelected = selectedGroupSize === size.id;
              return (
                <TouchableOpacity
                  key={size.id}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                      borderColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedGroupSize(size.id)}
                >
                  <Text style={[
                    styles.optionCardText,
                    { color: isSelected ? '#FFFFFF' : colors.text }
                  ]}>
                    {t(`profileScreens.tourPreferences.groupOptions.${size.id}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Budget Range */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profileScreens.tourPreferences.budgetTitle')}
          </Text>
          <View style={[
            styles.budgetCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }
          ]}>
            {BUDGET_RANGES.map((budget, index) => {
              const isSelected = selectedBudget === budget.id;
              const isLast = index === BUDGET_RANGES.length - 1;
              return (
                <TouchableOpacity
                  key={budget.id}
                  style={[
                    styles.budgetRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    },
                    isSelected && {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedBudget(budget.id)}
                >
                  <View style={styles.budgetLeft}>
                    <Text style={[styles.budgetLabel, { color: colors.text }]}>
                      {t(`profileScreens.tourPreferences.budgetOptions.${budget.id}.label`)}
                    </Text>
                    <Text style={[styles.budgetRange, { color: colors.textSecondary }]}>
                      {t(`profileScreens.tourPreferences.budgetOptions.${budget.id}.range`)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profileScreens.tourPreferences.notificationsTitle')}
          </Text>
          <View style={[
            styles.notificationsCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }
          ]}>
            {[
              { key: 'newTours' },
              { key: 'priceDrops' },
              { key: 'recommendations' },
            ].map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.notificationRow,
                  index < 2 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Text style={[styles.notificationLabel, { color: colors.text }]}>
                  {t(`profileScreens.tourPreferences.notificationLabels.${item.key}`)}
                </Text>
                <Switch
                  value={notifications[item.key as keyof typeof notifications]}
                  onValueChange={(value) => setNotifications(prev => ({ ...prev, [item.key]: value }))}
                  trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: '#22C55E' }}
                  thumbColor={notifications[item.key as keyof typeof notifications] ? '#fff' : '#fff'}
                  ios_backgroundColor={isDark ? '#333' : '#E5E7EB'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{t('profileScreens.tourPreferences.saveButton')}</Text>
          )}
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
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  introText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 22,
    marginBottom: 28,
    letterSpacing: -0.2,
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
  },

  // Categories - Chip style
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Options Row (Group Size)
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionCardText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Budget - List style
  budgetCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetLabel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  budgetRange: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    letterSpacing: -0.2,
  },

  // Notifications - List style
  notificationsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  notificationLabel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
    letterSpacing: -0.2,
  },

  // Save Button
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
