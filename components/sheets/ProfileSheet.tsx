import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
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
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';

const { height } = Dimensions.get('window');

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Mock user data
const userData = {
  name: 'Ayşe Yılmaz',
  memberType: 'Gold Üye',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  memberNumber: '477 833 9222 922',
  points: '14.934',
  memberClass: 'Gold',
};

const accountInfoItems = [
  { label: 'Üye No', value: userData.memberNumber },
  { label: 'Toplanan Puan', value: userData.points },
  { label: 'Üyelik Sınıfı', value: userData.memberClass },
  { label: 'Üyelik Kartı', value: '', hasArrow: true },
];

const personalDetailsItems = [
  { label: 'Kişisel Bilgiler', icon: 'person-outline' },
  { label: 'Kimlik Bilgileri', icon: 'card-outline' },
  { label: 'Ödeme Yöntemleri', icon: 'wallet-outline' },
  { label: 'Tur Tercihleri', icon: 'options-outline' },
];

export default function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

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
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
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
            <TouchableOpacity onPress={closeSheet} style={styles.headerButton}>
              <Text style={[styles.doneText, { color: colors.primary }]}>Kapat</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Profil</Text>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Profile Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
                <View style={[styles.badgeIndicator, { backgroundColor: '#FFD700' }]} />
              </View>
              <Text style={[styles.userName, { color: colors.text }]}>{userData.name}</Text>
              <Text style={[styles.memberType, { color: '#FFB800' }]}>{userData.memberType}</Text>
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
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
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
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
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
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
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
    maxHeight: height * 0.9,
  },
  sheet: {
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
  headerButton: {
    width: 60,
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
  },
  logoutText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    color: '#FF3B30',
  },
});
