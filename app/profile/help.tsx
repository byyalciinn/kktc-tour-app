import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';

// FAQ items
const faqItems = [
  {
    question: 'Nasıl tur rezervasyonu yapabilirim?',
    answer: 'Ana sayfadan veya keşfet bölümünden istediğiniz turu seçin, detay sayfasında "Yol Tarifi Al" butonuna tıklayarak tur lokasyonuna ulaşabilirsiniz. Rezervasyon için tur sağlayıcısı ile iletişime geçmeniz gerekmektedir.',
  },
  {
    question: 'Üyelik seviyemi nasıl yükseltebilirim?',
    answer: 'Profil sayfanızdan "Üyelik Kartı" bölümüne giderek Gold veya Business üyelik paketlerinden birini seçebilirsiniz. Ödeme işlemini tamamladıktan sonra üyeliğiniz otomatik olarak yükseltilecektir.',
  },
  {
    question: 'Favorilerime nasıl tur ekleyebilirim?',
    answer: 'Herhangi bir tur detay sayfasında sağ üst köşedeki kalp ikonuna tıklayarak turu favorilerinize ekleyebilirsiniz. Favorilerinize alt menüden "Favoriler" sekmesinden ulaşabilirsiniz.',
  },
  {
    question: 'Uygulama bildirimleri nasıl yönetilir?',
    answer: 'Telefon ayarlarınızdan KKTC Tour uygulamasının bildirim izinlerini yönetebilirsiniz. Özel kampanya ve indirimlerden haberdar olmak için bildirimleri açık tutmanızı öneririz.',
  },
  {
    question: 'Hesabımı nasıl silebilirim?',
    answer: 'Hesabınızı silmek için İletişim sayfasından destek ekibimize ulaşabilirsiniz. Hesap silme işlemi geri alınamaz ve tüm verileriniz kalıcı olarak silinir.',
  },
  {
    question: 'Ödeme yöntemleri nelerdir?',
    answer: 'Kredi kartı, banka kartı ve havale/EFT ile ödeme yapabilirsiniz. Tüm ödemeler güvenli altyapımız üzerinden gerçekleştirilmektedir.',
  },
];

// Help categories
const helpCategories = [
  { id: 'account', label: 'Hesap İşlemleri', icon: 'person-outline' },
  { id: 'tours', label: 'Turlar & Rezervasyon', icon: 'map-outline' },
  { id: 'payment', label: 'Ödeme & Faturalama', icon: 'card-outline' },
  { id: 'membership', label: 'Üyelik & Avantajlar', icon: 'diamond-outline' },
];

export default function HelpScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Yardım</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Help Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            YARDIM KATEGORİLERİ
          </Text>
          <View style={styles.categoriesGrid}>
            {helpCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={category.icon as any} size={22} color={colors.primary} />
                </View>
                <Text style={[styles.categoryLabel, { color: colors.text }]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SIK SORULAN SORULAR
          </Text>
          <View
            style={[
              styles.faqCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            {faqItems.map((item, index) => (
              <View key={index}>
                <TouchableOpacity
                  style={[
                    styles.faqItem,
                    index < faqItems.length - 1 && expandedIndex !== index && [
                      styles.faqItemBorder,
                      { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                    ],
                  ]}
                  activeOpacity={0.7}
                  onPress={() => toggleExpand(index)}
                >
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>
                    {item.question}
                  </Text>
                  <Ionicons
                    name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {expandedIndex === index && (
                  <View style={[
                    styles.faqAnswer,
                    index < faqItems.length - 1 && [
                      styles.faqItemBorder,
                      { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                    ],
                  ]}>
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                      {item.answer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Contact Support */}
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
          onPress={() => router.push('/profile/contact')}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
          <Text style={styles.contactButtonText}>Destek Ekibiyle İletişime Geç</Text>
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

  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    textAlign: 'center',
  },

  // FAQ
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 22,
  },

  // Contact Button
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  contactButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
});
