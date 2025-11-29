import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';

// Member class badge colors
const memberClassColors: Record<string, string> = {
  'Normal': '#6B7280',
  'Gold': '#FFB800',
  'Business': '#3B82F6',
};

const personalDetailsItems = [
  { label: 'Kişisel Bilgiler', icon: 'person-outline', route: '/profile/personal-info' },
  { label: 'Kimlik Bilgileri', icon: 'card-outline', route: '' },
  { label: 'Ödeme Yöntemleri', icon: 'wallet-outline', route: '' },
  { label: 'Tur Tercihleri', icon: 'options-outline', route: '' },
];

const supportItems = [
  { label: 'Yardım', route: '/profile/help' },
  { label: 'İletişim', route: '/profile/contact' },
];

const adminMenuItems = [
  { label: 'Tur Yönetimi', icon: 'map-outline', route: '/admin' },
  { label: 'Kategori Yönetimi', icon: 'grid-outline', route: '/admin/categories' },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  
  // Zustand store
  const { user, profile, signOut } = useAuthStore();

  // Get member class color
  const memberClassColor = memberClassColors[profile?.member_class || 'Normal'] || '#6B7280';

  // Account info items (dynamic)
  const accountInfoItems = [
    { label: 'Üye No', value: profile?.member_number || '-', route: '' },
    { label: 'Üyelik Sınıfı', value: profile?.member_class || 'Normal', route: '' },
    { label: 'Üyelik Kartı', value: '', hasArrow: true, route: '/profile/membership-card' },
  ];

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profil</Text>
          <TouchableOpacity 
            style={[
              styles.settingsButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
            ]}
            onPress={() => router.push('/profile/settings' as any)}
            accessibilityLabel="Ayarlar"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Avatar Section - No Background */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: getAvatarUrl(profile?.avatar_url, user?.id) }} style={styles.avatar} />
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {profile?.full_name || user?.user_metadata?.full_name || 'Kullanıcı'}
          </Text>
          <Text style={[styles.memberType, { color: memberClassColor }]}>
            {profile?.member_class || 'Normal'} Üye
          </Text>
        </View>

        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            HESAP BİLGİLERİ
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
                onPress={() => item.route && router.push(item.route as any)}
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
            KİŞİSEL DETAYLAR
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
                onPress={() => item.route && router.push(item.route as any)}
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
            DESTEK
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
                onPress={() => item.route && router.push(item.route as any)}
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
            YÖNETİM
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
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.adminMenuItem}>
                  <View style={[styles.adminMenuIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.text }]}>{item.label}</Text>
                </View>
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
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Versiyon 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
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
  adminMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
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
