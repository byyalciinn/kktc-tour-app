import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Switch,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useThemeStore } from '@/stores';
import { useToast } from '@/components/ui';
import { languages, changeLanguage, getCurrentLanguage, LanguageCode } from '@/lib/i18n';

interface SettingItemProps {
  label: string;
  value?: string;
  hasArrow?: boolean;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
}

function SettingItem({
  label,
  value,
  hasArrow = true,
  hasSwitch = false,
  switchValue = false,
  onSwitchChange,
  onPress,
  danger = false,
  isLast = false,
}: SettingItemProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        !isLast && { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderBottomWidth: 0.5 },
      ]}
      activeOpacity={hasSwitch ? 1 : 0.6}
      onPress={onPress}
      disabled={hasSwitch}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.settingLabel,
          { color: danger ? '#EF4444' : colors.text },
        ]}
      >
        {label}
      </Text>
      <View style={styles.settingRight}>
        {value && (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
        {hasSwitch && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={isDark ? '#39393D' : '#E5E5EA'}
          />
        )}
        {hasArrow && !hasSwitch && (
          <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { colorScheme, toggleDarkMode } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const toast = useToast();
  const { t } = useTranslation();

  const { signOut } = useAuthStore();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  // Animation for language modal
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openLanguageModal = () => {
    setLanguageModalVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLanguageModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLanguageModalVisible(false);
    });
  };

  const handleLanguageChange = async (langCode: LanguageCode) => {
    await changeLanguage(langCode);
    setCurrentLang(langCode);
    closeLanguageModal();
    toast.success(langCode === 'tr' ? 'Dil Türkçe olarak değiştirildi' : 'Language changed to English');
  };

  const handleClearCache = () => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.clearCacheConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cache clearing
            toast.success(t('settings.cacheCleared'));
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            toast.error(t('settings.comingSoon'));
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
          ]}
          onPress={() => router.back()}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('settings.preferences')}
          </Text>
          <BlurView
            intensity={isDark ? 40 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
              },
            ]}
          >
            <SettingItem
              label={t('settings.notificationsEnabled')}
              hasSwitch
              switchValue={notificationsEnabled}
              onSwitchChange={setNotificationsEnabled}
              hasArrow={false}
            />
            <SettingItem
              label={t('settings.locationServices')}
              hasSwitch
              switchValue={locationEnabled}
              onSwitchChange={setLocationEnabled}
              hasArrow={false}
            />
            <SettingItem
              label={t('settings.darkMode')}
              hasSwitch
              switchValue={isDark}
              onSwitchChange={toggleDarkMode}
              hasArrow={false}
            />
            <SettingItem
              label={t('settings.language')}
              value={languages[currentLang].nativeName}
              onPress={openLanguageModal}
              isLast
            />
          </BlurView>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('settings.privacySecurity')}
          </Text>
          <BlurView
            intensity={isDark ? 40 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
              },
            ]}
          >
            <SettingItem
              label={t('settings.changePassword')}
              onPress={() => router.push('/profile/change-password')}
            />
            <SettingItem
              label={t('settings.privacyPolicy')}
              onPress={() => router.push('/profile/privacy-policy')}
            />
            <SettingItem
              label={t('settings.termsOfService')}
              onPress={() => router.push('/profile/terms-of-use')}
              isLast
            />
          </BlurView>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('settings.dataManagement')}
          </Text>
          <BlurView
            intensity={isDark ? 40 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
              },
            ]}
          >
            <SettingItem
              label={t('settings.clearCache')}
              onPress={handleClearCache}
            />
            <SettingItem
              label={t('settings.downloadData')}
              onPress={() => toast.info(t('settings.comingSoon'))}
              isLast
            />
          </BlurView>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('settings.account')}
          </Text>
          <BlurView
            intensity={isDark ? 40 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
              },
            ]}
          >
            <SettingItem
              label={t('auth.logout')}
              onPress={handleLogout}
              danger
              hasArrow={false}
            />
            <SettingItem
              label={t('settings.deleteAccount')}
              onPress={handleDeleteAccount}
              danger
              hasArrow={false}
              isLast
            />
          </BlurView>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
            Tour App v1.0.0
          </Text>
          <Text style={[styles.appCopyright, { color: colors.textSecondary }]}>
            © 2024 Tour App. {t('common.allRightsReserved') || 'Tüm hakları saklıdır.'}
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeLanguageModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeLanguageModal}
        >
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
                opacity: fadeAnim,
              },
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.languageModalContainer,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <BlurView
            intensity={isDark ? 60 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.languageModal,
              {
                backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.95)',
              },
            ]}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandle}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' },
                ]}
              />
            </View>

            {/* Modal Title */}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.language')}
            </Text>

            {/* Language Options */}
            <View style={styles.languageOptions}>
              {(Object.keys(languages) as LanguageCode[]).map((langCode) => (
                <TouchableOpacity
                  key={langCode}
                  style={[
                    styles.languageOption,
                    {
                      backgroundColor: currentLang === langCode
                        ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,122,255,0.1)')
                        : 'transparent',
                      borderColor: currentLang === langCode
                        ? colors.primary
                        : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    },
                  ]}
                  onPress={() => handleLanguageChange(langCode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageFlag}>{languages[langCode].flag}</Text>
                  <View style={styles.languageTextContainer}>
                    <Text style={[styles.languageName, { color: colors.text }]}>
                      {languages[langCode].nativeName}
                    </Text>
                    <Text style={[styles.languageNameSecondary, { color: colors.textSecondary }]}>
                      {languages[langCode].name}
                    </Text>
                  </View>
                  {currentLang === langCode && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
              onPress={closeLanguageModal}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
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
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 8,
    marginLeft: 18,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  settingLabel: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
    letterSpacing: -0.4,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    letterSpacing: -0.4,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appVersion: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  // Language Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  languageModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  languageModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOptions: {
    gap: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 2,
  },
  languageNameSecondary: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
});
