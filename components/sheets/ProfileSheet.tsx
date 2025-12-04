import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// SwiftUI components for iOS 26+ Liquid Glass design
let ContextMenu: any = null;
let Host: any = null;
let Button: any = null;

if (Platform.OS === 'ios') {
  try {
    const SwiftUI = require('@expo/ui/swift-ui');
    ContextMenu = SwiftUI.ContextMenu;
    Host = SwiftUI.Host;
    Button = SwiftUI.Button;
  } catch (e) {
    // @expo/ui not installed, fallback to regular UI
  }
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useThemeStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';

const { height } = Dimensions.get('window');

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Member class badge colors
const memberClassColors: Record<string, string> = {
  'Normal': '#6B7280',
  'Gold': '#FFB800',
  'Business': '#3B82F6',
};

// Menu keys matching profile.tsx structure
const PERSONAL_DETAILS_KEYS = [
  { key: 'personalInfo', icon: 'person-outline', route: '/profile/personal-info' },
  { key: 'idInfo', icon: 'card-outline', route: '/profile/id-info' },
  { key: 'paymentMethods', icon: 'wallet-outline', route: '/profile/payment-methods' },
  { key: 'tourPreferences', icon: 'options-outline', route: '/profile/tour-preferences' },
] as const;

const SUPPORT_KEYS = [
  { key: 'help', route: '/profile/help' },
  { key: 'contact', route: '/profile/contact' },
  { key: 'myTickets', route: '/profile/support-tickets' },
] as const;

const ADMIN_MENU_KEYS = [
  { key: 'adminMenu', icon: 'settings-outline', route: '/admin/menu' },
] as const;

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  // Auth store
  const { profile, user, signOut } = useAuthStore();

  // Get member class color
  const memberClassColor = memberClassColors[profile?.member_class || 'Normal'] || '#6B7280';

  // Dynamic account info based on profile
  const accountInfoItems = [
    { label: t('profile.memberNumber'), value: profile?.member_number || '-', route: '' },
    { label: t('profile.memberClass'), value: profile?.member_class || 'Normal', route: '' },
    { label: t('profile.memberCard'), value: '', hasArrow: true, route: '/profile/membership-card' },
    { label: t('profile.myPanel'), value: '', hasArrow: true, route: '/profile/my-panel' },
  ];

  // Translated menu items
  const personalDetailsItems = PERSONAL_DETAILS_KEYS.map((item) => ({
    label: t(`profile.${item.key}`),
    icon: item.icon,
    route: item.route,
  }));

  const supportItems = SUPPORT_KEYS.map((item) => ({
    label: t(`profile.${item.key}`),
    route: item.route,
  }));

  const adminMenuItems = ADMIN_MENU_KEYS.map((item) => ({
    label: t(`profile.${item.key}`),
    icon: item.icon,
    route: item.route,
  }));

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
            closeSheet();
            await signOut();
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  const handleNavigate = (route: string) => {
    if (route) {
      closeSheet();
      router.push(route as any);
    }
  };

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [slideAnim, fadeAnim, onClose]);

  useEffect(() => {
    if (visible) {
      openSheet();
    }
  }, [visible, openSheet]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <TouchableWithoutFeedback onPress={closeSheet}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
              backgroundColor: isDark
                ? 'rgba(0, 0, 0, 0.6)'
                : 'rgba(0, 0, 0, 0.4)',
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={closeSheet} style={styles.closeButton}>
              <Text style={[styles.doneText, { color: colors.primary }]}>{t('common.close')}</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
            <View style={styles.headerRightButtons}>
              <TouchableOpacity 
                style={[
                  styles.settingsButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                ]}
                onPress={() => handleNavigate('/profile/settings')}
              >
                <Ionicons name="settings-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              {Platform.OS === 'ios' && ContextMenu && Host && Button && (
                <Host style={{ width: 44, height: 44 }}>
                  <ContextMenu>
                    <ContextMenu.Items>
                      <Button 
                        systemImage="paintbrush" 
                        onPress={() => Alert.alert('Tema', 'Tema değiştirme özelliği')}
                      >
                        Tema Değiştir
                      </Button>
                      <Button 
                        systemImage="trash" 
                        onPress={() => Alert.alert('Cache', 'Cache temizlendi')}
                      >
                        Cache Temizle
                      </Button>
                      <Button 
                        systemImage="bell.badge" 
                        onPress={() => Alert.alert('Bildirim', 'Test bildirimi gönderildi')}
                      >
                        Bildirimleri Test Et
                      </Button>
                      <Button 
                        systemImage="doc.text" 
                        onPress={() => Alert.alert('Loglar', 'Hata logları gösteriliyor')}
                      >
                        Hata Logları
                      </Button>
                      <Button 
                        systemImage="wifi" 
                        onPress={() => Alert.alert('Ağ', 'Ağ bağlantısı aktif')}
                      >
                        Ağ Durumu
                      </Button>
                    </ContextMenu.Items>
                    <ContextMenu.Trigger>
                      <Button variant="bordered" systemImage="flask">
                        Test
                      </Button>
                    </ContextMenu.Trigger>
                  </ContextMenu>
                </Host>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Profile Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={{ uri: getAvatarUrl(profile?.avatar_url, user?.id) }} 
                  style={styles.avatar} 
                />
              </View>
              <Text style={[styles.userName, { color: colors.text }]}>
                {profile?.full_name || user?.user_metadata?.full_name || t('profile.defaultUser')}
              </Text>
              <Text style={[styles.memberType, { color: memberClassColor }]}>
                {profile?.member_class || 'Normal'} {t('profile.memberSuffix')}
              </Text>
            </View>

            {/* Account Information Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t('profile.accountInfo').toUpperCase()}
              </Text>
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                {accountInfoItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.infoRow,
                      index < accountInfoItems.length - 1 && [
                        styles.infoRowBorder,
                        { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                      ],
                    ]}
                    activeOpacity={item.hasArrow ? 0.7 : 1}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <Text style={[styles.infoLabel, { color: colors.text }]}>{item.label}</Text>
                    <View style={styles.infoValueContainer}>
                      {item.value ? (
                        <Text style={[styles.infoValue, { color: colors.textSecondary }]}>
                          {item.value}
                        </Text>
                      ) : null}
                      {item.hasArrow && (
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Personal Details Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t('profile.personalDetails').toUpperCase()}
              </Text>
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                {personalDetailsItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.infoRow,
                      index < personalDetailsItems.length - 1 && [
                        styles.infoRowBorder,
                        { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                      ],
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <Text style={[styles.infoLabel, { color: colors.text }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Support Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t('profile.support').toUpperCase()}
              </Text>
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                {supportItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.infoRow,
                      index < supportItems.length - 1 && [
                        styles.infoRowBorder,
                        { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                      ],
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <Text style={[styles.infoLabel, { color: colors.text }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Admin Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {t('profile.admin').toUpperCase()}
              </Text>
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                {adminMenuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.infoRow,
                      index < adminMenuItems.length - 1 && [
                        styles.infoRowBorder,
                        { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                      ],
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <Text style={[styles.infoLabel, { color: colors.text }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)',
                },
              ]}
              activeOpacity={0.7}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.logoutText}>{t('auth.logout')}</Text>
            </TouchableOpacity>

            {/* App Version */}
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              {t('profile.version')} 1.0.0
            </Text>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.85,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    minWidth: 60,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  badgeIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  memberType: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    color: '#FF3B30',
  },
  versionText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    marginBottom: 20,
  },
});
