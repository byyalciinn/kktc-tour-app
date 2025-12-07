/**
 * Identity Information Screen
 * Modern, elegant design for managing identity documents
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
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useThemeStore } from '@/stores';
import { useTranslation } from 'react-i18next';

// Document types
const DOCUMENT_TYPES = [
  { id: 'tc_kimlik', icon: 'card-outline', labelKey: 'tcKimlik' },
  { id: 'passport', icon: 'document-outline', labelKey: 'passport' },
  { id: 'driving_license', icon: 'car-outline', labelKey: 'drivingLicense' },
] as const;

export default function IdInfoScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const { profile, updateProfile } = useAuthStore();

  // Form state - these fields will be stored locally or in extended profile
  const [activeDocument, setActiveDocument] = useState<string>('tc_kimlik');
  const [tcKimlik, setTcKimlik] = useState('');
  const [passport, setPassport] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [nationality, setNationality] = useState('Türkiye');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    
    // Simulate save - integrate with your backend
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        t('common.success'),
        t('profileScreens.idInfo.saved'),
        [{ text: t('common.done'), onPress: () => router.back() }]
      );
    }, 1000);
  };

  const getDocumentLabel = (docId: string) => {
    const labels: Record<string, string> = {
      tc_kimlik: t('profileScreens.idInfo.tcKimlik'),
      passport: t('profileScreens.idInfo.passport'),
      driving_license: t('profileScreens.idInfo.drivingLicense'),
    };
    return labels[docId] || docId;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header with Blur */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('profile.idInfo')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section with Gradient */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(240,58,82,0.2)', 'rgba(240,58,82,0.05)'] 
                : ['rgba(240,58,82,0.15)', 'rgba(240,58,82,0.02)']}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.heroIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>
                {t('profileScreens.idInfo.heroTitle')}
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                {t('profileScreens.idInfo.heroSubtitle')}
              </Text>
            </LinearGradient>
          </View>

          {/* Document Type Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('profileScreens.idInfo.documentTypeTitle')}
            </Text>
            <View style={styles.documentTypesContainer}>
              {DOCUMENT_TYPES.map((doc) => {
                const isActive = activeDocument === doc.id;
                return (
                  <TouchableOpacity
                    key={doc.id}
                    style={[
                      styles.documentTypeCard,
                      {
                        backgroundColor: isActive
                          ? colors.primary
                          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                        borderColor: isActive
                          ? colors.primary
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setActiveDocument(doc.id)}
                  >
                    <Ionicons
                      name={doc.icon as any}
                      size={24}
                      color={isActive ? '#fff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.documentTypeLabel,
                        { color: isActive ? '#fff' : colors.text },
                      ]}
                    >
                      {getDocumentLabel(doc.id)}
                    </Text>
                    {isActive && (
                      <View style={styles.activeIndicator}>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Document Details Card */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('profileScreens.idInfo.documentInfoTitle')}
            </Text>
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              {/* Document Number Input */}
              <View style={[styles.inputRow, styles.inputRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {getDocumentLabel(activeDocument)}
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={activeDocument === 'tc_kimlik' ? tcKimlik : activeDocument === 'passport' ? passport : drivingLicense}
                    onChangeText={activeDocument === 'tc_kimlik' ? setTcKimlik : activeDocument === 'passport' ? setPassport : setDrivingLicense}
                    placeholder={t('profileScreens.idInfo.enterValue', { field: getDocumentLabel(activeDocument) })}
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType={activeDocument === 'tc_kimlik' ? 'numeric' : 'default'}
                    maxLength={activeDocument === 'tc_kimlik' ? 11 : 20}
                    autoCapitalize={activeDocument === 'tc_kimlik' ? 'none' : 'characters'}
                  />
                </View>
              </View>

              {/* Nationality */}
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="flag-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {t('profileScreens.idInfo.nationality')}
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={nationality}
                    onChangeText={setNationality}
                    placeholder={t('profileScreens.idInfo.nationalityPlaceholder')}
                    placeholderTextColor={colors.textSecondary + '80'}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Security Notice */}
          <View
            style={[
              styles.securityNotice,
              { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)' },
            ]}
          >
            <Ionicons name="lock-closed" size={18} color="#22C55E" />
            <Text style={[styles.securityNoticeText, { color: isDark ? '#86EFAC' : '#15803D' }]}>
              {t('profileScreens.idInfo.securityNotice')}
            </Text>
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
                <Text style={styles.saveButtonText}>{t('profileScreens.idInfo.saveButton')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

  // Hero Section
  heroSection: {
    marginBottom: 24,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Document Types
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  documentTypesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  documentTypeCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  documentTypeLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Form Card
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  inputRowBorder: {
    borderBottomWidth: 1,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(240,58,82,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    padding: 0,
  },

  // Security Notice
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  securityNoticeText: {
    fontSize: 13,
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
