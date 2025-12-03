import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useToast } from '@/components/ui';
import { useThemeStore } from '@/stores';

export default function ChangePasswordScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Başarılı',
        'Şifreniz başarıyla değiştirildi.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    }, 1500);
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
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Şifre Değiştir</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F7',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View style={[styles.infoIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Güvenliğiniz için güçlü bir şifre seçin. En az 8 karakter, büyük/küçük harf ve rakam içermelidir.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Mevcut Şifre
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Mevcut şifrenizi girin"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'}
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Yeni Şifre
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Yeni şifrenizi girin"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Yeni Şifre (Tekrar)
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Yeni şifrenizi tekrar girin"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
            </Text>
          </TouchableOpacity>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotLink}>
            <Text style={[styles.forgotLinkText, { color: colors.primary }]}>
              Mevcut şifrenizi mi unuttunuz?
            </Text>
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
  headerSpacer: {
    width: 44,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
    gap: 14,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 20,
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  submitButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotLinkText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
});
