import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
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
  ActionSheetIOS,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';
import { optimizeAvatar } from '@/lib/imageOptimizer';

export default function PersonalInfoScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  
  // Auth store
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const uploadUserAvatar = useAuthStore((state) => state.uploadUserAvatar);
  const deleteUserAvatar = useAuthStore((state) => state.deleteUserAvatar);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBirthDate(profile.birth_date || '');
      setAddress(profile.address || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  // Upload image to Supabase with optimization
  const handleUploadImage = async (imageUri: string) => {
    setIsUploading(true);
    
    try {
      // Optimize avatar image (target ~100KB)
      const optimized = await optimizeAvatar(imageUri);
      
      if (optimized) {
        console.log(`[Avatar] Optimized: ${optimized.compressionRatio}% reduction`);
        const { success, error } = await uploadUserAvatar(optimized.uri);
        
        if (success) {
          Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
        } else {
          Alert.alert('Hata', error?.message || 'Fotoğraf yüklenirken bir hata oluştu.');
        }
      } else {
        // Fallback to original if optimization fails
        const { success, error } = await uploadUserAvatar(imageUri);
        if (success) {
          Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
        } else {
          Alert.alert('Hata', error?.message || 'Fotoğraf yüklenirken bir hata oluştu.');
        }
      }
    } catch (err) {
      console.error('[Avatar] Optimization error:', err);
      Alert.alert('Hata', 'Fotoğraf işlenirken bir hata oluştu.');
    }
    
    setIsUploading(false);
  };

  // Pick image from gallery - optimization handled in handleUploadImage
  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Full quality - optimization handled separately
        allowsMultipleSelection: false,
        exif: false, // Don't include EXIF data
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert('Hata', 'Görsel seçilemedi');
        return;
      }

      await handleUploadImage(asset.uri);
    } catch (error) {
      console.error('Pick from gallery error:', error);
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu');
    }
  };

  // Take photo with camera - optimization handled in handleUploadImage
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Full quality - optimization handled separately
        exif: false, // Don't include EXIF data
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert('Hata', 'Fotoğraf çekilemedi');
        return;
      }

      await handleUploadImage(asset.uri);
    } catch (error) {
      console.error('Take photo error:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu');
    }
  };

  // Delete avatar
  const handleDeleteAvatar = async () => {
    Alert.alert(
      'Fotoğrafı Sil',
      'Profil fotoğrafınızı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setIsUploading(true);
            const { success, error } = await deleteUserAvatar();
            setIsUploading(false);
            
            if (success) {
              Alert.alert('Başarılı', 'Profil fotoğrafınız silindi.');
            } else {
              Alert.alert('Hata', error?.message || 'Fotoğraf silinirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  // Show image picker options
  const handlePickImage = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['İptal', 'Galeri', 'Kamera', 'Fotoğrafı Sil'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickFromGallery();
          else if (buttonIndex === 2) takePhoto();
          else if (buttonIndex === 3) handleDeleteAvatar();
        }
      );
    } else {
      Alert.alert(
        'Profil Fotoğrafı',
        'Bir seçenek belirleyin',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Galeri', onPress: pickFromGallery },
          { text: 'Kamera', onPress: takePhoto },
          { text: 'Fotoğrafı Sil', style: 'destructive', onPress: handleDeleteAvatar },
        ]
      );
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Hata', 'Ad Soyad alanı zorunludur.');
      return;
    }

    setIsLoading(true);
    
    const { success, error } = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      birth_date: birthDate.trim() || null,
      address: address.trim() || null,
    });
    
    setIsLoading(false);
    
    if (success) {
      Alert.alert('Başarılı', 'Bilgileriniz güncellendi.', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Hata', error?.message || 'Bilgiler güncellenirken bir hata oluştu.');
    }
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

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                <Image 
                  source={{ uri: getAvatarUrl(profile?.avatar_url, user?.id) }} 
                  style={styles.avatar} 
                />
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
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="name"
                editable={true}
              />
            </View>

            {/* Email */}
            <View style={[styles.inputRow, styles.inputRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>E-posta</Text>
              <TextInput
                style={[styles.input, { color: colors.text, opacity: 0.6 }]}
                value={email}
                placeholder="E-posta adresinizi girin"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                editable={false}
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
                textContentType="telephoneNumber"
                returnKeyType="next"
                editable={true}
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
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                editable={true}
              />
            </View>

            {/* Address */}
            <View style={styles.inputRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Adres</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { color: colors.text }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Adresinizi girin"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                textContentType="fullStreetAddress"
                returnKeyType="done"
                editable={true}
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
    minHeight: 24,
  },
  multilineInput: {
    minHeight: 60,
    paddingTop: 4,
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
