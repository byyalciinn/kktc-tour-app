import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';
import { useToast } from '@/components/ui';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  hasArrow?: boolean;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
}

function SettingItem({
  icon,
  label,
  value,
  hasArrow = true,
  hasSwitch = false,
  switchValue = false,
  onSwitchChange,
  onPress,
  danger = false,
}: SettingItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
      ]}
      activeOpacity={hasSwitch ? 1 : 0.7}
      onPress={onPress}
      disabled={hasSwitch}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIconContainer,
            {
              backgroundColor: danger
                ? 'rgba(239, 68, 68, 0.1)'
                : isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.05)',
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={danger ? '#EF4444' : colors.primary}
          />
        </View>
        <Text
          style={[
            styles.settingLabel,
            { color: danger ? '#EF4444' : colors.text },
          ]}
        >
          {label}
        </Text>
      </View>
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
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        )}
        {hasArrow && !hasSwitch && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const toast = useToast();

  const { signOut } = useAuthStore();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);

  const handleClearCache = () => {
    Alert.alert(
      'Önbelleği Temizle',
      'Tüm önbellek verileri silinecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cache clearing
            toast.success('Önbellek temizlendi');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hesabı Sil',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            toast.error('Bu özellik henüz aktif değil');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ayarlar</Text>
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
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            BİLDİRİMLER
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
            <SettingItem
              icon="notifications-outline"
              label="Bildirimler"
              hasSwitch
              switchValue={notificationsEnabled}
              onSwitchChange={setNotificationsEnabled}
              hasArrow={false}
            />
            <SettingItem
              icon="location-outline"
              label="Konum Servisleri"
              hasSwitch
              switchValue={locationEnabled}
              onSwitchChange={setLocationEnabled}
              hasArrow={false}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            GÖRÜNÜM
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
            <SettingItem
              icon="moon-outline"
              label="Karanlık Mod"
              hasSwitch
              switchValue={darkModeEnabled}
              onSwitchChange={setDarkModeEnabled}
              hasArrow={false}
            />
            <SettingItem
              icon="language-outline"
              label="Dil"
              value="Türkçe"
              onPress={() => toast.info('Dil ayarları yakında eklenecek')}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            GİZLİLİK VE GÜVENLİK
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
            <SettingItem
              icon="lock-closed-outline"
              label="Şifre Değiştir"
              onPress={() => toast.info('Şifre değiştirme yakında eklenecek')}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              label="Gizlilik Politikası"
              onPress={() => toast.info('Gizlilik politikası yakında eklenecek')}
            />
            <SettingItem
              icon="document-text-outline"
              label="Kullanım Koşulları"
              onPress={() => toast.info('Kullanım koşulları yakında eklenecek')}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            VERİ YÖNETİMİ
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
            <SettingItem
              icon="trash-outline"
              label="Önbelleği Temizle"
              onPress={handleClearCache}
            />
            <SettingItem
              icon="download-outline"
              label="Verilerimi İndir"
              onPress={() => toast.info('Veri indirme yakında eklenecek')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
            TEHLİKELİ BÖLGE
          </Text>
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
              },
            ]}
          >
            <SettingItem
              icon="log-out-outline"
              label="Çıkış Yap"
              onPress={handleLogout}
              danger
            />
            <SettingItem
              icon="person-remove-outline"
              label="Hesabı Sil"
              onPress={handleDeleteAccount}
              danger
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
            Tour App v1.0.0
          </Text>
          <Text style={[styles.appCopyright, { color: colors.textSecondary }]}>
            © 2024 Tour App. Tüm hakları saklıdır.
          </Text>
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
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
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
});
