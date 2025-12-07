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
    title: '1. Giriş',
    content: `Cyprigo ("biz", "bizim" veya "uygulama") olarak gizliliğinize saygı duyuyor ve kişisel verilerinizi korumayı taahhüt ediyoruz. Bu Gizlilik Politikası, Cyprigo mobil uygulamasını kullandığınızda hangi bilgileri topladığımızı, nasıl kullandığımızı ve koruduğumuzu açıklamaktadır.

Bu uygulamayı kullanarak, bu Gizlilik Politikası'nda açıklanan uygulamaları kabul etmiş olursunuz.`,
  },
  {
    title: '2. Topladığımız Bilgiler',
    content: `Cyprigo aşağıdaki bilgileri toplayabilir:

Hesap Bilgileri: Ad, e-posta adresi, telefon numarası ve profil fotoğrafı.

Konum Verileri: Yakınınızdaki turları göstermek için cihaz konumunuz (yalnızca izninizle).

Kullanım Verileri: Uygulama içi etkileşimler, görüntülenen turlar, favoriler ve tercihler.

Cihaz Bilgileri: Cihaz modeli, işletim sistemi sürümü, benzersiz cihaz tanımlayıcıları ve uygulama sürümü.

Üyelik Bilgileri: Üyelik durumu ve satın alma geçmişi (Apple tarafından işlenir).`,
  },
  {
    title: '3. Bilgilerin Kullanımı',
    content: `Topladığımız bilgileri aşağıdaki amaçlarla kullanıyoruz:

• Tur bilgilerini ve önerilerini sunmak
• Kişiselleştirilmiş deneyim sağlamak
• Hesabınızı yönetmek ve güvenliğini sağlamak
• Uygulama performansını analiz etmek ve iyileştirmek
• Müşteri desteği sağlamak
• Yasal yükümlülüklerimizi yerine getirmek

Cyprigo bir tur bilgilendirme ve öneri uygulamasıdır. Doğrudan rezervasyon veya ödeme işlemi yapmamaktayız.`,
  },
  {
    title: '4. Bilgi Paylaşımı',
    content: `Kişisel bilgilerinizi aşağıdaki durumlar dışında üçüncü taraflarla paylaşmıyoruz:

Hizmet Sağlayıcılar: Uygulama altyapısı için güvenilir hizmet sağlayıcılarla (Supabase, analitik araçları).

Yasal Gereklilikler: Yasaların gerektirdiği durumlarda veya yasal süreçlere yanıt olarak.

İş Transferleri: Şirket birleşmesi veya satışı durumunda.

Kişisel verilerinizi hiçbir zaman reklam veya pazarlama amacıyla üçüncü taraflara satmıyoruz.`,
  },
  {
    title: '5. Veri Güvenliği',
    content: `Verilerinizi korumak için endüstri standardı güvenlik önlemleri uyguluyoruz:

• SSL/TLS şifreleme ile veri iletimi
• Güvenli sunucu altyapısı
• Düzenli güvenlik denetimleri
• Erişim kontrolü ve yetkilendirme
• Şifreli veri depolama

Hiçbir sistem %100 güvenli olmasa da, verilerinizi korumak için makul önlemleri alıyoruz.`,
  },
  {
    title: '6. Veri Saklama',
    content: `Kişisel verilerinizi yalnızca bu politikada belirtilen amaçlar için gerekli olduğu sürece saklıyoruz:

• Hesap bilgileri: Hesabınız aktif olduğu sürece
• Kullanım verileri: 24 aya kadar
• Konum verileri: Gerçek zamanlı, saklanmaz

Hesabınızı sildiğinizde, kişisel verileriniz 30 gün içinde sistemlerimizden kaldırılır (yasal saklama gereklilikleri hariç).`,
  },
  {
    title: '7. Haklarınız',
    content: `Kişisel verilerinizle ilgili aşağıdaki haklara sahipsiniz:

Erişim Hakkı: Hakkınızda tuttuğumuz verileri talep edebilirsiniz.

Düzeltme Hakkı: Yanlış veya eksik bilgilerin düzeltilmesini isteyebilirsiniz.

Silme Hakkı: Hesabınızı ve verilerinizi silmemizi talep edebilirsiniz.

Taşınabilirlik Hakkı: Verilerinizin bir kopyasını talep edebilirsiniz.

İtiraz Hakkı: Veri işlemeye itiraz edebilirsiniz.

Bu haklarınızı kullanmak için Ayarlar > Hesabımı Sil seçeneğini kullanabilir veya destek@cyprigo.com adresine e-posta gönderebilirsiniz.`,
  },
  {
    title: '8. Çocukların Gizliliği',
    content: `Cyprigo 13 yaşın altındaki çocuklara yönelik değildir. 13 yaşın altındaki çocuklardan bilerek kişisel bilgi toplamıyoruz.

Eğer bir ebeveyn veya vasi olarak çocuğunuzun bize kişisel bilgi sağladığını fark ederseniz, lütfen bizimle iletişime geçin. Bu tür bilgileri derhal sileceğiz.`,
  },
  {
    title: '9. Üçüncü Taraf Hizmetler',
    content: `Uygulamamız aşağıdaki üçüncü taraf hizmetleri kullanmaktadır:

• Supabase: Veritabanı ve kimlik doğrulama
• Apple App Store: Uygulama içi satın almalar
• Harita Servisleri: Tur konumlarını göstermek için

Bu hizmetlerin kendi gizlilik politikaları vardır ve bunları incelemenizi öneririz.`,
  },
  {
    title: '10. Politika Değişiklikleri',
    content: `Bu Gizlilik Politikası'nı zaman zaman güncelleyebiliriz. Önemli değişiklikler olduğunda:

• Uygulama içi bildirim göndereceğiz
• Güncellenmiş politikayı uygulamada yayınlayacağız
• "Son güncelleme" tarihini değiştireceğiz

Değişikliklerden sonra uygulamayı kullanmaya devam etmeniz, güncellenmiş politikayı kabul ettiğiniz anlamına gelir.`,
  },
  {
    title: '11. İletişim',
    content: `Gizlilik politikamız veya veri uygulamalarımız hakkında sorularınız için:

E-posta: destek@cyprigo.com
Web: www.cyprigo.com

Cyprigo
Lefkoşa, Kuzey Kıbrıs

Son güncelleme: Aralık 2024`,
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
          Cyprigo'yu kullanmadan önce lütfen bu gizlilik politikasını dikkatlice okuyunuz.
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
