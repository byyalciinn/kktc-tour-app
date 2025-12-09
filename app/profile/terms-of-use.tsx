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

Uygulamayı kullanmak için 13 yaşından büyük olmanız gerekmektedir. 18 yaşından küçükseniz, ebeveyn veya yasal vasinizin onayı ve gözetimi altında kullanabilirsiniz.`,
  },
  {
    title: '2. Hizmet Tanımı',
    content: `Cyprigo, Kuzey Kıbrıs'taki turistik yerleri, tarihi mekanları ve turları keşfetmenizi sağlayan bir mobil uygulamadır.

Sunduğumuz hizmetler:
• Turistik yerler ve turlar hakkında detaylı bilgiler
• Konum bazlı öneriler ve keşif
• Favori yerleri kaydetme
• Harita üzerinde görüntüleme ve yol tarifi
• Kişiselleştirilmiş öneriler
• Topluluk paylaşımları

Önemli: Cyprigo bir bilgilendirme ve keşif platformudur. Doğrudan tur rezervasyonu veya ödeme işlemi yapmamaktayız.`,
  },
  {
    title: '3. Kullanıcı Hesabı',
    content: `Hesap Oluşturma:
• Kayıt sırasında doğru ve güncel bilgi sağlamalısınız
• Hesap bilgilerinizi gizli tutmak sizin sorumluluğunuzdadır
• Hesabınız altında gerçekleştirilen tüm aktivitelerden siz sorumlusunuz

Hesap Güvenliği:
• Şifrenizi kimseyle paylaşmayın
• Yetkisiz erişim şüphesinde derhal bizi bilgilendirin
• Güçlü ve benzersiz şifre kullanmanızı öneririz

Hesabınızı istediğiniz zaman uygulama içinden Ayarlar > Hesabımı Sil seçeneğinden silebilirsiniz.`,
  },
  {
    title: '4. Uygulama İçi Satın Almalar',
    content: `Cyprigo, premium üyelik seçenekleri sunabilmektedir.

Ödeme Koşulları:
• Tüm satın almalar Apple App Store üzerinden işlenir
• Fiyatlar yerel para biriminizde gösterilir
• Ödeme, satın alma onayında Apple hesabınızdan tahsil edilir

Abonelik Koşulları:
• Abonelikler dönem sonunda otomatik olarak yenilenir
• İptal işlemi, mevcut dönemin sonunda geçerli olur
• İptal için iOS Ayarlar > Apple ID > Abonelikler bölümünü kullanın

İade Politikası:
• Tüm iadeler Apple'ın politikalarına tabidir
• İade talepleri için Apple Destek ile iletişime geçmeniz gerekmektedir`,
  },
  {
    title: '5. Kullanıcı Yükümlülükleri',
    content: `Uygulamayı kullanırken aşağıdaki kurallara uymalısınız:

Kabul Edilen Kullanım:
• Doğru ve güncel bilgi sağlamak
• Tüm geçerli yasalara ve düzenlemelere uymak
• Diğer kullanıcılara saygılı davranmak
• Topluluk kurallarına uymak

Yasaklanan Kullanım:
• Uygulamayı yasadışı amaçlarla kullanmak
• Zararlı yazılım yaymak veya sistem güvenliğini tehlikeye atmak
• Başkalarının hesaplarına yetkisiz erişim sağlamaya çalışmak
• Uygulamayı tersine mühendislik yapmak veya kaynak kodunu çıkarmaya çalışmak
• Spam, yanıltıcı veya uygunsuz içerik paylaşmak
• Diğer kullanıcıları taciz etmek veya rahatsız etmek`,
  },
  {
    title: '6. Fikri Mülkiyet',
    content: `Cyprigo'nun tüm içeriği, tasarımı, logosu, grafikleri, metinleri ve yazılımı telif hakkı ve fikri mülkiyet yasaları ile korunmaktadır.

Kullanım Lisansı:
Size Uygulamayı kişisel, ticari olmayan amaçlarla kullanmak için sınırlı, geri alınabilir, devredilemez ve münhasır olmayan bir lisans veriyoruz.

İzin Verilmeyen Kullanımlar:
• İçeriğin izinsiz kopyalanması, çoğaltılması veya dağıtılması
• Ticari amaçlı kullanım
• Tersine mühendislik veya kaynak kodu çıkarma girişimleri
• Marka, logo ve diğer fikri mülkiyetin izinsiz kullanımı`,
  },
  {
    title: '7. Sorumluluk Sınırları',
    content: `Uygulama "olduğu gibi" ve "mevcut haliyle" sunulmaktadır. Yasaların izin verdiği azami ölçüde:

• Uygulamanın kesintisiz, hatasız veya güvenli çalışacağını garanti etmiyoruz
• Uygulamadaki bilgilerin doğruluğu, eksiksizliği veya güncelliği konusunda garanti vermiyoruz
• Üçüncü taraf hizmetlerinin içeriğinden veya kullanılabilirliğinden sorumlu değiliz
• Dolaylı, arızi, özel veya sonuç olarak ortaya çıkan zararlardan sorumlu değiliz

Uygulamayı kullanımınız tamamen kendi riskiniz dahilindedir.`,
  },
  {
    title: '8. Hesap Feshi',
    content: `Hesap Silme:
Hesabınızı istediğiniz zaman uygulama içinden Ayarlar > Hesabımı Sil seçeneğinden silebilirsiniz. Hesap silme işlemi geri alınamaz.

Fesih Hakları:
Aşağıdaki durumlarda hesabınızı önceden bildirimde bulunmaksızın askıya alabilir veya kalıcı olarak feshedebiliriz:
• Bu Koşulları ihlal etmeniz
• Yasadışı faaliyetlerde bulunmanız
• Diğer kullanıcılara zarar vermeniz veya taciz etmeniz
• Uygulamayı kötüye kullanmanız

Fesih durumunda, aktif abonelikleriniz mevcut dönem sonuna kadar geçerli kalır.`,
  },
  {
    title: '9. Değişiklikler',
    content: `Bu Kullanım Koşulları'nı herhangi bir zamanda güncelleme hakkımızı saklı tutarız.

Değişiklik Bildirimi:
• Önemli değişiklikler uygulama içi bildirim ile duyurulacaktır
• Güncellenmiş koşullar uygulamada yayınlanacaktır
• "Son güncelleme" tarihi değiştirilecektir

Değişikliklerden sonra Uygulamayı kullanmaya devam etmeniz, güncellenmiş Koşulları kabul ettiğiniz anlamına gelir. Değişiklikleri kabul etmiyorsanız, Uygulamayı kullanmayı bırakmalısınız.`,
  },
  {
    title: '10. Geçerli Hukuk',
    content: `Bu Koşullar, Kuzey Kıbrıs Türk Cumhuriyeti yasalarına tabidir ve bu yasalara göre yorumlanacaktır.

Uyuşmazlık Çözümü:
• Herhangi bir uyuşmazlık durumunda öncelikle dostane çözüm aranacaktır
• Çözüme ulaşılamaması halinde arabuluculuk yoluna başvurulabilir
• KKTC mahkemeleri münhasır yetkiye sahiptir`,
  },
  {
    title: '11. İletişim',
    content: `Bu Kullanım Koşulları hakkında sorularınız, önerileriniz veya şikayetleriniz için bizimle iletişime geçebilirsiniz:

E-posta: cyprurigo@gmail.com

Cyprigo
Kuzey Kıbrıs

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
