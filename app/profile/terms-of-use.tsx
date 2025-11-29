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

const termsSections = [
  {
    title: 'Kabul ve Onay',
    content: `Tour App uygulamasını kullanarak bu kullanım koşullarını kabul etmiş sayılırsınız. Bu koşulları kabul etmiyorsanız, lütfen uygulamayı kullanmayınız.

Uygulamayı kullanmak için 18 yaşından büyük olmanız veya yasal vasinizin onayını almış olmanız gerekmektedir.`,
  },
  {
    title: 'Hizmet Tanımı',
    content: `Tour App, Kuzey Kıbrıs Türk Cumhuriyeti'ndeki turistik turları keşfetmenizi, rezervasyon yapmanızı ve yönetmenizi sağlayan bir mobil uygulamadır.

Sunduğumuz hizmetler:
• Tur arama ve filtreleme
• Online rezervasyon
• Dijital bilet yönetimi
• Tur rehberi iletişimi
• Değerlendirme ve yorumlar`,
  },
  {
    title: 'Kullanıcı Yükümlülükleri',
    content: `Uygulamamızı kullanırken aşağıdaki kurallara uymanız gerekmektedir:

• Doğru ve güncel bilgi sağlamak
• Hesap güvenliğinizi korumak
• Yasalara ve düzenlemelere uymak
• Diğer kullanıcılara saygılı davranmak
• Uygulamayı kötüye kullanmamak
• Fikri mülkiyet haklarına saygı göstermek`,
  },
  {
    title: 'Rezervasyon ve İptal',
    content: `Rezervasyon Koşulları:
• Rezervasyonlar onay e-postası ile kesinleşir
• Ödeme, rezervasyon sırasında veya tur öncesi alınır
• Fiyatlar KDV dahil olarak gösterilir

İptal Politikası:
• 48 saat öncesine kadar ücretsiz iptal
• 24-48 saat arası %50 kesinti
• 24 saatten az sürede iptal yapılamaz
• Mücbir sebep halleri ayrıca değerlendirilir`,
  },
  {
    title: 'Ödeme Koşulları',
    content: `Kabul edilen ödeme yöntemleri:
• Kredi kartı / Banka kartı
• Apple Pay / Google Pay
• Uygulama içi bakiye

Güvenlik:
• Tüm ödemeler SSL ile şifrelenir
• Kart bilgileriniz saklanmaz
• 3D Secure doğrulama kullanılır`,
  },
  {
    title: 'Sorumluluk Sınırları',
    content: `Tour App olarak:

• Tur operatörlerinin hizmet kalitesinden doğrudan sorumlu değiliz
• Doğal afetler ve mücbir sebeplerden kaynaklanan aksaklıklardan sorumlu tutulamayız
• Kullanıcı hatalarından doğan zararlardan sorumlu değiliz
• Üçüncü taraf bağlantılarının içeriğinden sorumlu değiliz

Ancak, platformumuzda listelenen tüm operatörleri dikkatle seçiyor ve denetliyoruz.`,
  },
  {
    title: 'Fikri Mülkiyet',
    content: `Tour App'in tüm içeriği, tasarımı, logosu ve yazılımı telif hakkı ile korunmaktadır.

İzin verilmeyen kullanımlar:
• İçeriğin kopyalanması veya çoğaltılması
• Ticari amaçlı kullanım
• Tersine mühendislik
• Marka ve logoların izinsiz kullanımı`,
  },
  {
    title: 'Değişiklikler',
    content: `Bu kullanım koşullarını önceden haber vermeksizin değiştirme hakkını saklı tutarız.

Önemli değişiklikler:
• Uygulama içi bildirim ile duyurulur
• E-posta ile bilgilendirilirsiniz
• Değişiklik tarihi belirtilir

Değişikliklerden sonra uygulamayı kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.`,
  },
  {
    title: 'Uyuşmazlık Çözümü',
    content: `Bu koşullardan doğan uyuşmazlıklarda:

• Öncelikle dostane çözüm aranır
• Arabuluculuk yoluna başvurulabilir
• KKTC mahkemeleri yetkilidir
• KKTC hukuku uygulanır

İletişim:
legal@tourapp.com

Son güncelleme: Kasım 2024`,
  },
];

export default function TermsOfUseScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kullanım Koşulları</Text>
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
            <Ionicons name="document-text" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Kullanım Koşulları
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Tour App'i kullanmadan önce lütfen bu koşulları dikkatlice okuyunuz.
          </Text>
        </BlurView>

        {/* Content Sections */}
        {termsSections.map((section, index) => (
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
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.sectionNumberText}>{index + 1}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {section.content}
            </Text>
          </BlurView>
        ))}

        {/* Accept Note */}
        <BlurView
          intensity={isDark ? 40 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.noteCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
            },
          ]}
        >
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Uygulamayı kullanmaya devam ederek bu koşulları kabul etmiş sayılırsınız.
          </Text>
        </BlurView>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    flex: 1,
  },
  sectionContent: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 24,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 20,
  },
});
