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

const termsSections = [
  {
    title: '1. Kabul ve Onay',
    content: `Cyprigo mobil uygulamasını ("Uygulama") indirerek, yükleyerek veya kullanarak bu Kullanım Koşulları'nı ("Koşullar") kabul etmiş olursunuz. Bu Koşulları kabul etmiyorsanız, lütfen Uygulamayı kullanmayınız.

Uygulamayı kullanmak için 13 yaşından büyük olmanız gerekmektedir. 18 yaşından küçükseniz, ebeveyn veya yasal vasinizin onayı ile kullanabilirsiniz.`,
  },
  {
    title: '2. Hizmet Tanımı',
    content: `Cyprigo, Kuzey Kıbrıs'taki turistik yerleri ve turları keşfetmenizi sağlayan bir mobil uygulamadır.

Sunduğumuz hizmetler:
• Tur bilgileri ve detayları
• Konum bazlı tur önerileri
• Favori turları kaydetme
• Harita ve yol tarifi
• Kişiselleştirilmiş öneriler

Önemli Not: Cyprigo bir bilgilendirme ve öneri platformudur. Doğrudan tur rezervasyonu veya ödeme işlemi yapmamaktayız. Rezervasyon için ilgili tur sağlayıcısıyla iletişime geçmeniz gerekmektedir.`,
  },
  {
    title: '3. Kullanıcı Hesabı',
    content: `Hesap Oluşturma:
• Doğru ve güncel bilgi sağlamalısınız
• Hesap bilgilerinizi gizli tutmalısınız
• Hesabınızdaki tüm aktivitelerden siz sorumlusunuz

Hesap Güvenliği:
• Şifrenizi kimseyle paylaşmayın
• Yetkisiz erişim şüphesinde bizi bilgilendirin
• Güçlü şifre kullanmanızı öneririz

Hesabınızı istediğiniz zaman Ayarlar bölümünden silebilirsiniz.`,
  },
  {
    title: '4. Uygulama İçi Satın Almalar',
    content: `Cyprigo, Gold ve Business üyelik seçenekleri sunmaktadır.

Ödeme Koşulları:
• Tüm satın almalar Apple App Store üzerinden işlenir
• Fiyatlar yerel para biriminizde gösterilir
• Ödeme, satın alma onayında Apple hesabınızdan alınır

Abonelik Koşulları:
• Abonelikler otomatik olarak yenilenir
• İptal, mevcut dönemin sonunda geçerli olur
• İptal için App Store ayarlarını kullanın

İade Politikası:
• İadeler Apple'ın politikalarına tabidir
• İade talepleri için Apple Destek ile iletişime geçin`,
  },
  {
    title: '5. Kullanıcı Yükümlülükleri',
    content: `Uygulamayı kullanırken aşağıdaki kurallara uymalısınız:

Yapmanız Gerekenler:
• Doğru ve güncel bilgi sağlamak
• Yasalara ve düzenlemelere uymak
• Diğer kullanıcılara saygılı davranmak

Yapmamanız Gerekenler:
• Uygulamayı yasadışı amaçlarla kullanmak
• Zararlı yazılım yaymak veya güvenliği tehlikeye atmak
• Başkalarının hesaplarına yetkisiz erişim sağlamak
• Uygulamayı tersine mühendislik yapmak
• Spam veya istenmeyen içerik paylaşmak`,
  },
  {
    title: '6. Fikri Mülkiyet',
    content: `Cyprigo'nun tüm içeriği, tasarımı, logosu, grafikleri ve yazılımı telif hakkı ve fikri mülkiyet yasaları ile korunmaktadır.

Kullanım Lisansı:
Size Uygulamayı kişisel, ticari olmayan amaçlarla kullanmak için sınırlı, geri alınabilir, münhasır olmayan bir lisans veriyoruz.

İzin Verilmeyen Kullanımlar:
• İçeriğin kopyalanması veya çoğaltılması
• Ticari amaçlı kullanım
• Tersine mühendislik veya kaynak kodu çıkarma
• Marka ve logoların izinsiz kullanımı`,
  },
  {
    title: '7. Sorumluluk Sınırları',
    content: `Uygulama "olduğu gibi" sunulmaktadır. Yasaların izin verdiği azami ölçüde:

• Uygulamanın kesintisiz veya hatasız çalışacağını garanti etmiyoruz
• Tur bilgilerinin doğruluğundan tur sağlayıcıları sorumludur
• Üçüncü taraf hizmetlerinin içeriğinden sorumlu değiliz
• Dolaylı, arızi veya sonuç olarak ortaya çıkan zararlardan sorumlu değiliz

Uygulamayı kullanımınız kendi riskiniz dahilindedir.`,
  },
  {
    title: '8. Hesap Feshi',
    content: `Hesap Silme:
Hesabınızı istediğiniz zaman Ayarlar > Hesabımı Sil seçeneğinden silebilirsiniz.

Fesih Hakları:
Aşağıdaki durumlarda hesabınızı askıya alabilir veya feshedebiliriz:
• Bu Koşulları ihlal etmeniz
• Yasadışı faaliyetlerde bulunmanız
• Diğer kullanıcılara zarar vermeniz
• Uygulamayı kötüye kullanmanız

Fesih durumunda, aktif abonelikleriniz dönem sonuna kadar geçerli kalır.`,
  },
  {
    title: '9. Değişiklikler',
    content: `Bu Kullanım Koşulları'nı zaman zaman güncelleyebiliriz.

Değişiklik Bildirimi:
• Önemli değişiklikler uygulama içi bildirim ile duyurulur
• Güncellenmiş koşullar uygulamada yayınlanır
• "Son güncelleme" tarihi değiştirilir

Değişikliklerden sonra Uygulamayı kullanmaya devam etmeniz, güncellenmiş Koşulları kabul ettiğiniz anlamına gelir.`,
  },
  {
    title: '10. Geçerli Hukuk',
    content: `Bu Koşullar, Kuzey Kıbrıs Türk Cumhuriyeti yasalarına tabidir.

Uyuşmazlık Çözümü:
• Öncelikle dostane çözüm aranır
• Arabuluculuk yoluna başvurulabilir
• KKTC mahkemeleri münhasır yetkiye sahiptir`,
  },
  {
    title: '11. İletişim',
    content: `Bu Kullanım Koşulları hakkında sorularınız için:

E-posta: destek@cyprigo.com
Web: www.cyprigo.com

Cyprigo
Lefkoşa, Kuzey Kıbrıs

Son güncelleme: Aralık 2024`,
  },
];

export default function TermsOfUseScreen() {
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
        {/* Intro Text */}
        <Text style={[styles.introText, { color: colors.textSecondary }]}>
          Cyprigo'yu kullanmadan önce lütfen bu koşulları dikkatlice okuyunuz.
        </Text>

        {/* Content Sections */}
        {termsSections.map((section, index) => (
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

        {/* Accept Note */}
        <Text style={[styles.noteText, { color: colors.textSecondary }]}>
          Cyprigo'yu kullanmaya devam ederek bu koşulları kabul etmiş sayılırsınız.
        </Text>
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
  noteText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: -0.2,
  },
});
