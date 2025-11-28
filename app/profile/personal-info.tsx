import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function PersonalInfoScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  // Form state
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || 'Ayşe Yılmaz');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Pick image from gallery
  const handlePickImage = async () => {
    Alert.alert(
      'Profil Fotoğrafı',
      'Fotoğraf kaynağını seçin',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Galeri',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setIsUploading(true);
              // Simulate upload delay
              setTimeout(() => {
                setAvatar(result.assets[0].uri);
                setIsUploading(false);
              }, 1000);
            }
          },
        },
        {
          text: 'Kamera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setIsUploading(true);
              setTimeout(() => {
                setAvatar(result.assets[0].uri);
                setIsUploading(false);
              }, 1000);
            }
          },
        },
      ]
    );
  };

  // Save changes
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Hata', 'Ad Soyad alanı zorunludur.');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Başarılı', 'Bilgileriniz güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    }, 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kişisel Bilgiler</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Section */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <View style={[styles.avatar, styles.avatarLoading, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              )}
              <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>
              Fotoğrafı Değiştir
            </Text>
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
            {/* Full Name */}
            <View style={[styles.inputRow, styles.inputRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ad Soyad</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Adınızı girin"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Email */}
            <View style={[styles.inputRow, styles.inputRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>E-posta</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="E-posta adresinizi girin"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={[styles.inputRow, styles.inputRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Telefon</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Telefon numaranızı girin"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            {/* Birth Date */}
            <View style={[styles.inputRow, styles.inputRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Doğum Tarihi</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="GG/AA/YYYY"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Address */}
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Adres</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Adresinizi girin"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>
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
            <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
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
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
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
  inputRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputRowBorder: {
    borderBottomWidth: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
    padding: 0,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
