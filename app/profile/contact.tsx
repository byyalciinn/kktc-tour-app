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
  useColorScheme,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';

// Contact methods
const contactMethods = [
  {
    id: 'phone',
    label: 'Telefon',
    value: '+90 392 123 45 67',
    icon: 'call-outline',
    action: 'tel:+903921234567',
  },
  {
    id: 'email',
    label: 'E-posta',
    value: 'destek@kktctour.com',
    icon: 'mail-outline',
    action: 'mailto:destek@kktctour.com',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    value: '+90 533 123 45 67',
    icon: 'logo-whatsapp',
    action: 'https://wa.me/905331234567',
  },
];

// Message subjects
const subjects = [
  'Genel Soru',
  'Teknik Destek',
  'Üyelik & Ödeme',
  'Şikayet & Öneri',
  'İş Birliği',
];

export default function ContactScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleContactMethod = async (action: string) => {
    try {
      const supported = await Linking.canOpenURL(action);
      if (supported) {
        await Linking.openURL(action);
      } else {
        Alert.alert('Hata', 'Bu işlem desteklenmiyor.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu.');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSubject) {
      Alert.alert('Uyarı', 'Lütfen bir konu seçin.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı yazın.');
      return;
    }

    setIsSending(true);
    
    // Simulate sending
    setTimeout(() => {
      setIsSending(false);
      Alert.alert(
        'Mesaj Gönderildi',
        'Mesajınız başarıyla iletildi. En kısa sürede size dönüş yapacağız.',
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
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>İletişim</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Contact Methods */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            HIZLI İLETİŞİM
          </Text>
          <View style={styles.contactMethodsContainer}>
            {contactMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.contactMethodCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleContactMethod(method.action)}
              >
                <View style={[styles.contactMethodIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={method.icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.contactMethodLabel, { color: colors.textSecondary }]}>
                  {method.label}
                </Text>
                <Text style={[styles.contactMethodValue, { color: colors.text }]}>
                  {method.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Message Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            MESAJ GÖNDER
          </Text>
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            {/* Subject Selection */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Konu</Text>
              <View style={styles.subjectsContainer}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={[
                      styles.subjectChip,
                      {
                        backgroundColor: selectedSubject === subject 
                          ? colors.primary 
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        borderColor: selectedSubject === subject 
                          ? colors.primary 
                          : 'transparent',
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedSubject(subject)}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        { color: selectedSubject === subject ? '#fff' : colors.text },
                      ]}
                    >
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message Input */}
            <View style={[styles.formSection, styles.formSectionBorder, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Mesajınız</Text>
              <TextInput
                style={[
                  styles.messageInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  },
                ]}
                placeholder="Mesajınızı buraya yazın..."
                placeholderTextColor={colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: (selectedSubject && message.trim()) ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
          ]}
          activeOpacity={0.9}
          onPress={handleSendMessage}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons 
                name="send" 
                size={20} 
                color={(selectedSubject && message.trim()) ? '#fff' : colors.textSecondary} 
              />
              <Text style={[
                styles.sendButtonText,
                { color: (selectedSubject && message.trim()) ? '#fff' : colors.textSecondary }
              ]}>
                Mesaj Gönder
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Working Hours */}
        <View style={[
          styles.workingHoursCard,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
        ]}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.workingHoursText, { color: colors.textSecondary }]}>
            Çalışma Saatleri: Hafta içi 09:00 - 18:00
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
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
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
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Contact Methods
  contactMethodsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  contactMethodCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  contactMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactMethodLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  contactMethodValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
    textAlign: 'center',
  },

  // Form
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formSection: {
    padding: 16,
  },
  formSectionBorder: {
    borderTopWidth: 1,
  },
  formLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 12,
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectChipText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  messageInput: {
    minHeight: 120,
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },

  // Send Button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sendButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Working Hours
  workingHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  workingHoursText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
});
