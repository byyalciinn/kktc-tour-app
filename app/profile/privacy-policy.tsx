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
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';

const privacySections = [
  {
    title: 'Veri Toplama',
    content: `Tour App olarak, size daha iyi hizmet sunabilmek için bazı kişisel verilerinizi topluyoruz. Bu veriler şunları içerebilir:

• Ad, soyad ve iletişim bilgileri
• Konum verileri (izninizle)
• Uygulama kullanım istatistikleri
• Cihaz bilgileri ve tanımlayıcıları
• Ödeme bilgileri (güvenli şekilde işlenir)`,
  },
  {
    title: 'Veri Kullanımı',
    content: `Topladığımız verileri aşağıdaki amaçlarla kullanıyoruz:

• Tur rezervasyonlarınızı işlemek
• Size özelleştirilmiş öneriler sunmak
• Uygulama deneyimini iyileştirmek
• Güvenlik ve dolandırıcılık önleme
• Yasal yükümlülüklerimizi yerine getirmek`,
  },
  {
    title: 'Veri Paylaşımı',
    content: `Kişisel verilerinizi üçüncü taraflarla yalnızca aşağıdaki durumlarda paylaşıyoruz:

• Tur operatörleri ile rezervasyon işlemleri için
• Ödeme işlemcileri ile güvenli ödeme için
• Yasal zorunluluklar gerektirdiğinde
• Açık izniniz olduğunda

Verilerinizi hiçbir zaman pazarlama amacıyla satmıyoruz.`,
  },
  {
    title: 'Veri Güvenliği',
    content: `Verilerinizin güvenliği bizim için önceliktir:

• SSL/TLS şifreleme kullanıyoruz
• Düzenli güvenlik denetimleri yapıyoruz
• Erişim kontrolü ve yetkilendirme uyguluyoruz
• Veri ihlali durumunda sizi bilgilendiririz`,
  },
  {
    title: 'Haklarınız',
    content: `KVKK kapsamında aşağıdaki haklara sahipsiniz:

• Verilerinize erişim hakkı
• Düzeltme ve güncelleme hakkı
• Silme (unutulma) hakkı
• İşlemeye itiraz hakkı
• Veri taşınabilirliği hakkı

Bu haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.`,
  },
  {
    title: 'Çerezler',
    content: `Uygulamamızda çerezler ve benzer teknolojiler kullanıyoruz:

• Oturum yönetimi için zorunlu çerezler
• Tercihlerinizi hatırlamak için işlevsel çerezler
• Analitik amaçlı performans çerezleri

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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

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
        {/* Hero Section */}
        <BlurView
          intensity={isDark ? 40 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
            },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Gizliliğiniz Bizim İçin Önemli
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu öğrenin.
          </Text>
        </BlurView>

        {/* Content Sections */}
        {privacySections.map((section, index) => (
          <BlurView
            key={index}
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {section.content}
            </Text>
          </BlurView>
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
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
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
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 8,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 24,
  },
});
