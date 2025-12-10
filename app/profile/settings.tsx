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
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useThemeStore, useTwoFactorStore } from '@/stores';
import { useToast } from '@/components/ui';
import { languages, changeLanguage, getCurrentLanguage, LanguageCode } from '@/lib/i18n';
import { clearAllCache } from '@/lib/cacheService';
import { confirmSecureAction, executeSecureAction } from '@/lib/secureAction';

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

  const { signOut, user } = useAuthStore();
  const { 
    twoFactorEnabled, 
    isLoadingSettings: is2FALoading,
    loadTwoFactorStatus,
    enableTwoFactor,
    disableTwoFactor,
  } = useTwoFactorStore();

  // Load 2FA status on mount
  useEffect(() => {
    if (user?.id) {
      loadTwoFactorStatus(user.id);
    }
  }, [user?.id]);

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
    // Don't allow selecting coming soon languages
    if (languages[langCode].comingSoon) {
      return;
    }
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
          onPress: async () => {
            try {
              const result = await clearAllCache();
              if (result.success) {
                toast.success(t('settings.cacheCleared'));
              } else {
                toast.error(result.error || t('common.error'));
              }
            } catch (error) {
              toast.error(t('common.error'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    // First confirmation
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            // Second confirmation with biometric re-auth
            confirmSecureAction(
              t('settings.deleteAccountFinal'),
              t('settings.deleteAccountFinalConfirm'),
              {
                actionType: 'delete_account',
                language: currentLang,
                forceReauth: true, // Always require re-auth for account deletion
                confirmText: t('settings.deleteAccountConfirmButton'),
                cancelText: t('common.cancel'),
                destructive: true,
                onConfirm: async () => {
                  const { deleteAccount } = useAuthStore.getState();
                  const result = await deleteAccount();
                  
                  if (result.success) {
                    toast.success(t('settings.accountDeleted'));
                    router.replace('/(auth)');
                  } else {
                    toast.error(result.error || t('common.error'));
                  }
                },
                onAuthFailed: (error) => {
                  toast.error(error);
                },
              }
            );
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

  const handleToggle2FA = async (enabled: boolean) => {
    if (!user?.id) return;

    if (enabled) {
      // Show confirmation with biometric re-auth before enabling
      confirmSecureAction(
        t('settings.twoFactorAuth'),
        t('settings.twoFactorEnableConfirm'),
        {
          actionType: 'toggle_2fa',
          language: currentLang,
          confirmText: t('common.enable'),
          cancelText: t('common.cancel'),
          onConfirm: async () => {
            const result = await enableTwoFactor(user.id);
            if (result.success) {
              toast.success(t('settings.twoFactorEnabled'));
            } else {
              toast.error(result.error || t('common.error'));
            }
          },
          onAuthFailed: (error) => {
            toast.error(error);
          },
        }
      );
    } else {
      // Show confirmation with biometric re-auth before disabling
      confirmSecureAction(
        t('settings.twoFactorAuth'),
        t('settings.twoFactorDisableConfirm'),
        {
          actionType: 'toggle_2fa',
          language: currentLang,
          confirmText: t('common.disable'),
          cancelText: t('common.cancel'),
          destructive: true,
          onConfirm: async () => {
            const result = await disableTwoFactor(user.id);
            if (result.success) {
              toast.success(t('settings.twoFactorDisabled'));
            } else {
              toast.error(result.error || t('common.error'));
            }
          },
          onAuthFailed: (error) => {
            toast.error(error);
          },
        }
      );
    }
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
              label={t('settings.twoFactorAuth')}
              hasSwitch
              switchValue={twoFactorEnabled}
              onSwitchChange={handleToggle2FA}
              hasArrow={false}
            />
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
            Cyprigo v0.1.0
          </Text>
          <Text style={[styles.appCopyright, { color: colors.textSecondary }]}>
            © 2025 Cyprigo. {t('common.allRightsReserved') || 'Tüm hakları saklıdır.'}
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal - Premium Minimalist Design */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeLanguageModal}
      >
        <TouchableWithoutFeedback onPress={closeLanguageModal}>
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)',
                opacity: fadeAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.languageModalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.languageModal,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandle}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' },
                ]}
              />
            </View>

            {/* Modal Title */}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.language')}
            </Text>

            {/* Language Options */}
            <View style={styles.languageOptions}>
              {(Object.keys(languages) as LanguageCode[]).map((langCode, index) => {
                const lang = languages[langCode];
                const isSelected = currentLang === langCode;
                const isComingSoon = lang.comingSoon;
                const isLast = index === Object.keys(languages).length - 1;

                return (
                  <TouchableOpacity
                    key={langCode}
                    style={[
                      styles.languageOption,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                          : 'transparent',
                      },
                      !isLast && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    onPress={() => handleLanguageChange(langCode)}
                    activeOpacity={isComingSoon ? 1 : 0.6}
                    disabled={isComingSoon}
                  >
                    <View style={styles.languageLeft}>
                      <Text style={[
                        styles.languageName,
                        { color: isComingSoon ? colors.textSecondary : colors.text },
                        isComingSoon && { opacity: 0.5 },
                      ]}>
                        {lang.nativeName}
                      </Text>
                    </View>

                    <View style={styles.languageRight}>
                      {isComingSoon ? (
                        <View style={[
                          styles.comingSoonBadge,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                        ]}>
                          <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
                            {t('common.soon')}
                          </Text>
                        </View>
                      ) : isSelected ? (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cancel Button */}
            <View style={styles.cancelButtonContainer}>
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
            </View>
          </View>
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
  // Language Modal Styles - Premium Minimalist
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  languageModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  languageModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
    paddingBottom: 16,
  },
  languageOptions: {
    paddingHorizontal: 0,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  languageLeft: {
    flex: 1,
  },
  languageRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageName: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  comingSoonText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  cancelButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
});
