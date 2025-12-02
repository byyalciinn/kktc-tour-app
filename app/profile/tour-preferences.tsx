/**
 * Tour Preferences Screen
 * Elegant design for customizing tour experience preferences
 */

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore, useAuthStore } from '@/stores';
import { useTranslation } from 'react-i18next';

// Tour category preferences
const TOUR_CATEGORIES = [
  { id: 'history', icon: 'library-outline', color: '#8B5CF6' },
  { id: 'nature', icon: 'leaf-outline', color: '#22C55E' },
  { id: 'beach', icon: 'sunny-outline', color: '#F59E0B' },
  { id: 'adventure', icon: 'compass-outline', color: '#EF4444' },
  { id: 'food', icon: 'restaurant-outline', color: '#EC4899' },
  { id: 'culture', icon: 'color-palette-outline', color: '#06B6D4' },
] as const;

// Accessibility options
const ACCESSIBILITY_OPTIONS = [
  { id: 'wheelchair', icon: 'accessibility-outline', labelKey: 'wheelchairAccess' },
  { id: 'hearing', icon: 'ear-outline', labelKey: 'hearingAssistance' },
  { id: 'visual', icon: 'eye-outline', labelKey: 'visualAssistance' },
] as const;

// Group size preferences
const GROUP_SIZES = [
  { id: 'solo', icon: 'person-outline', label: 'Bireysel' },
  { id: 'couple', icon: 'heart-outline', label: 'Çift' },
  { id: 'family', icon: 'people-outline', label: 'Aile' },
  { id: 'group', icon: 'people-circle-outline', label: 'Grup' },
] as const;

// Budget ranges
const BUDGET_RANGES = [
  { id: 'budget', label: '€', range: '0-50€' },
  { id: 'mid', label: '€€', range: '50-150€' },
  { id: 'premium', label: '€€€', range: '150-300€' },
  { id: 'luxury', label: '€€€€', range: '300€+' },
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
  const [accessibilityOptions, setAccessibilityOptions] = useState<Record<string, boolean>>({
    wheelchair: false,
    hearing: false,
    visual: false,
  });
  const [notifications, setNotifications] = useState({
    newTours: true,
    priceDrops: true,
    recommendations: true,
    reviews: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const categoryLabels: Record<string, string> = {
    history: 'Tarihi',
    nature: 'Doğa',
    beach: 'Plaj',
    adventure: 'Macera',
    food: 'Yeme-İçme',
    culture: 'Kültür',
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleAccessibility = (optionId: string) => {
    setAccessibilityOptions(prev => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  };

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Uyarı', 'En az bir kategori seçmelisiniz.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Başarılı',
        'Tercihleriniz kaydedildi. Artık size özel öneriler alacaksınız!',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    }, 1000);
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
          Tur Tercihleri
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={isDark 
            ? ['rgba(240,58,82,0.2)', 'rgba(139,92,246,0.1)'] 
            : ['rgba(240,58,82,0.1)', 'rgba(139,92,246,0.05)']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Kişiselleştirilmiş Deneyim
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Tercihlerinizi belirleyin, size özel tur önerileri alalım
          </Text>
        </LinearGradient>

        {/* Favorite Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              FAVORİ KATEGORİLER
            </Text>
            <Text style={[styles.sectionBadge, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
              {selectedCategories.length} seçili
            </Text>
          </View>
          <View style={styles.categoriesGrid}>
            {TOUR_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected
                        ? category.color + '20'
                        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                      borderColor: isSelected
                        ? category.color
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => toggleCategory(category.id)}
                >
                  <View style={[styles.categoryIconBg, { backgroundColor: category.color + '20' }]}>
                    <Ionicons name={category.icon as any} size={24} color={category.color} />
                  </View>
                  <Text style={[styles.categoryLabel, { color: isSelected ? category.color : colors.text }]}>
                    {categoryLabels[category.id]}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: category.color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Group Size */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            GRUP TERCİHİ
          </Text>
          <View style={styles.groupSizeContainer}>
            {GROUP_SIZES.map((size) => {
              const isSelected = selectedGroupSize === size.id;
              return (
                <TouchableOpacity
                  key={size.id}
                  style={[
                    styles.groupSizeCard,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                      borderColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedGroupSize(size.id)}
                >
                  <Ionicons
                    name={size.icon as any}
                    size={24}
                    color={isSelected ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.groupSizeLabel, { color: isSelected ? '#fff' : colors.text }]}>
                    {size.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Budget Range */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            BÜTÇE ARALIĞI
          </Text>
          <View style={styles.budgetContainer}>
            {BUDGET_RANGES.map((budget) => {
              const isSelected = selectedBudget === budget.id;
              return (
                <TouchableOpacity
                  key={budget.id}
                  style={[
                    styles.budgetCard,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                      borderColor: isSelected
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedBudget(budget.id)}
                >
                  <Text style={[styles.budgetLabel, { color: isSelected ? '#fff' : colors.primary }]}>
                    {budget.label}
                  </Text>
                  <Text style={[styles.budgetRange, { color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                    {budget.range}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Accessibility */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ERİŞİLEBİLİRLİK
          </Text>
          <View style={[styles.accessibilityCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            {ACCESSIBILITY_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.accessibilityRow,
                  index < ACCESSIBILITY_OPTIONS.length - 1 && styles.accessibilityRowBorder,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                ]}
                activeOpacity={0.8}
                onPress={() => toggleAccessibility(option.id)}
              >
                <View style={[styles.accessibilityIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name={option.icon as any} size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.accessibilityLabel, { color: colors.text }]}>
                  {option.id === 'wheelchair' && 'Tekerlekli Sandalye Erişimi'}
                  {option.id === 'hearing' && 'İşitme Desteği'}
                  {option.id === 'visual' && 'Görme Desteği'}
                </Text>
                <Switch
                  value={accessibilityOptions[option.id]}
                  onValueChange={() => toggleAccessibility(option.id)}
                  trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: colors.primary + '50' }}
                  thumbColor={accessibilityOptions[option.id] ? colors.primary : '#fff'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            BİLDİRİM TERCİHLERİ
          </Text>
          <View style={[styles.notificationsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            {[
              { key: 'newTours', label: 'Yeni Turlar', icon: 'compass-outline' },
              { key: 'priceDrops', label: 'Fiyat Düşüşleri', icon: 'pricetag-outline' },
              { key: 'recommendations', label: 'Kişisel Öneriler', icon: 'star-outline' },
              { key: 'reviews', label: 'Yorum Bildirimleri', icon: 'chatbubble-outline' },
            ].map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.notificationRow,
                  index < 3 && styles.notificationRowBorder,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <View style={[styles.notificationIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.notificationLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
                <Switch
                  value={notifications[item.key as keyof typeof notifications]}
                  onValueChange={(value) => setNotifications(prev => ({ ...prev, [item.key]: value }))}
                  trackColor={{ false: isDark ? '#333' : '#E5E7EB', true: colors.primary + '50' }}
                  thumbColor={notifications[item.key as keyof typeof notifications] ? colors.primary : '#fff'}
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
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>Tercihleri Kaydet</Text>
            </>
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

  // Hero
  heroSection: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionBadge: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Group Size
  groupSizeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  groupSizeCard: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  groupSizeLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Budget
  budgetContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  budgetLabel: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
  },
  budgetRange: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },

  // Accessibility
  accessibilityCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accessibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  accessibilityRowBorder: {
    borderBottomWidth: 1,
  },
  accessibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessibilityLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },

  // Notifications
  notificationsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  notificationRowBorder: {
    borderBottomWidth: 1,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#F03A52',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
