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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';

const privacySections = [
  {
    title: 'Veri Toplama',
    content: `Tour App olarak, size daha iyi hizmet sunabilmek için bazı kişisel verilerinizi topluyoruz. Bu veriler şunları içerebilir:

Ad, soyad ve iletişim bilgileri
Konum verileri (izninizle)
Uygulama kullanım istatistikleri
Cihaz bilgileri ve tanımlayıcıları
Ödeme bilgileri (güvenli şekilde işlenir)`,
  },
  {
    title: 'Veri Kullanımı',
    content: `Topladığımız verileri aşağıdaki amaçlarla kullanıyoruz:

Tur rezervasyonlarınızı işlemek
Size özelleştirilmiş öneriler sunmak
Uygulama deneyimini iyileştirmek
Güvenlik ve dolandırıcılık önleme
Yasal yükümlülüklerimizi yerine getirmek`,
  },
  {
    title: 'Veri Paylaşımı',
    content: `Kişisel verilerinizi üçüncü taraflarla yalnızca aşağıdaki durumlarda paylaşıyoruz:

Tur operatörleri ile rezervasyon işlemleri için
Ödeme işlemcileri ile güvenli ödeme için
Yasal zorunluluklar gerektirdiğinde
Açık izniniz olduğunda

Verilerinizi hiçbir zaman pazarlama amacıyla satmıyoruz.`,
  },
  {
    title: 'Veri Güvenliği',
    content: `Verilerinizin güvenliği bizim için önceliktir:

SSL/TLS şifreleme kullanıyoruz
Düzenli güvenlik denetimleri yapıyoruz
Erişim kontrolü ve yetkilendirme uyguluyoruz
Veri ihlali durumunda sizi bilgilendiririz`,
  },
  {
    title: 'Haklarınız',
    content: `KVKK kapsamında aşağıdaki haklara sahipsiniz:

Verilerinize erişim hakkı
Düzeltme ve güncelleme hakkı
Silme (unutulma) hakkı
İşlemeye itiraz hakkı
Veri taşınabilirliği hakkı

Bu haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.`,
  },
  {
    title: 'Çerezler',
    content: `Uygulamamızda çerezler ve benzer teknolojiler kullanıyoruz:

Oturum yönetimi için zorunlu çerezler
Tercihlerinizi hatırlamak için işlevsel çerezler
Analitik amaçlı performans çerezleri

Çerez tercihlerinizi uygulama ayarlarından yönetebilirsiniz.`,
  },
  {
    title: 'İletişim',
    content: `Gizlilik politikamız hakkında sorularınız için:

E-posta: privacy@tourapp.com
Telefon: +90 392 XXX XX XX
Adres: Lefkoşa, KKTC

Son güncelleme: Kasım 2024`,
  },
];

export default function PrivacyPolicyScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[
            styles.backButton,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gizlilik Politikası</Text>
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
        {/* Intro Text */}
        <Text style={[styles.introText, { color: colors.textSecondary }]}>
          Verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu öğrenin.
        </Text>

        {/* Content Sections */}
        {privacySections.map((section, index) => (
          <View
            key={index}
            style={[
              styles.sectionCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {section.content}
            </Text>
          </View>
        ))}
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
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: -0.2,
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
  introText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 22,
    marginBottom: 24,
    letterSpacing: -0.2,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionContent: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 23,
    letterSpacing: -0.2,
  },
});
