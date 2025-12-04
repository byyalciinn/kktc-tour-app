/**
 * Contact & Support Screen
 * Premium, elegant design with modern UI/UX patterns
 */

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState, useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// Contact channels with enhanced data
const CONTACT_CHANNELS = [
  {
    id: 'phone',
    value: '+90 392 123 45 67',
    icon: 'call',
    gradient: ['#22C55E', '#16A34A'],
    action: 'tel:+903921234567',
    subtitle: '7/24 Destek Hattı',
  },
  {
    id: 'whatsapp',
    value: '+90 533 123 45 67',
    icon: 'logo-whatsapp',
    gradient: ['#25D366', '#128C7E'],
    action: 'https://wa.me/905331234567',
    subtitle: 'Anında Yanıt',
  },
  {
    id: 'email',
    value: 'destek@kktctour.com',
    icon: 'mail',
    gradient: ['#3B82F6', '#1D4ED8'],
    action: 'mailto:destek@kktctour.com',
    subtitle: '24 Saat İçinde Yanıt',
  },
];

// FAQ items
const FAQ_ITEMS = [
  { id: 'booking', icon: 'calendar-outline', question: 'Nasıl rezervasyon yapabilirim?' },
  { id: 'cancel', icon: 'close-circle-outline', question: 'Rezervasyonumu nasıl iptal edebilirim?' },
  { id: 'payment', icon: 'card-outline', question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?' },
  { id: 'refund', icon: 'refresh-outline', question: 'İade politikanız nedir?' },
];

// Message categories
const MESSAGE_CATEGORIES = [
  { id: 'general', icon: 'chatbubble-outline', label: 'Genel Soru' },
  { id: 'booking', icon: 'calendar-outline', label: 'Rezervasyon' },
  { id: 'technical', icon: 'construct-outline', label: 'Teknik Destek' },
  { id: 'feedback', icon: 'star-outline', label: 'Öneri & Şikayet' },
  { id: 'business', icon: 'briefcase-outline', label: 'İş Birliği' },
];

export default function ContactScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'contact' | 'faq'>('contact');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (tab: 'contact' | 'faq') => {
    setActiveTab(tab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tab === 'contact' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const handleContactChannel = async (action: string) => {
    try {
      const supported = await Linking.canOpenURL(action);
      if (supported) {
        await Linking.openURL(action);
      } else {
        Alert.alert('Hata', 'Bu işlem desteklenmiyor.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir sorun oluştu.');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedCategory) {
      Alert.alert('Uyarı', 'Lütfen bir konu seçin.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Uyarı', 'Lütfen adınızı girin.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Uyarı', 'Lütfen e-posta adresinizi girin.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı yazın.');
      return;
    }

    setIsSending(true);
    
    setTimeout(() => {
      setIsSending(false);
      Alert.alert(
        'Mesajınız Gönderildi! ✨',
        'En kısa sürede size dönüş yapacağız.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    }, 1500);
  };

  const tabIndicatorTranslate = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (width - 40) / 2],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Destek & İletişim
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
        <Animated.View
          style={[
            styles.tabIndicator,
            { 
              backgroundColor: colors.primary,
              transform: [{ translateX: tabIndicatorTranslate }],
            },
          ]}
        />
        <TouchableOpacity
          style={styles.tab}
          onPress={() => switchTab('contact')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={18}
            color={activeTab === 'contact' ? '#fff' : colors.textSecondary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'contact' ? '#fff' : colors.textSecondary }]}>
            İletişim
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => switchTab('faq')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="help-circle-outline"
            size={18}
            color={activeTab === 'faq' ? '#fff' : colors.textSecondary}
          />
          <Text style={[styles.tabText, { color: activeTab === 'faq' ? '#fff' : colors.textSecondary }]}>
            Sık Sorulan
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'contact' ? (
            <>
              {/* Hero Banner */}
              <LinearGradient
                colors={isDark 
                  ? ['rgba(240,58,82,0.2)', 'rgba(139,92,246,0.1)'] 
                  : ['rgba(240,58,82,0.1)', 'rgba(139,92,246,0.05)']}
                style={styles.heroBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.heroIconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="headset" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  Size Nasıl Yardımcı Olabiliriz?
                </Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  7/24 destek ekibimiz sorularınızı yanıtlamak için hazır
                </Text>
              </LinearGradient>

              {/* Quick Contact Channels */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  HIZLI İLETİŞİM
                </Text>
                <View style={styles.channelsGrid}>
                  {CONTACT_CHANNELS.map((channel) => (
                    <TouchableOpacity
                      key={channel.id}
                      style={styles.channelCard}
                      activeOpacity={0.9}
                      onPress={() => handleContactChannel(channel.action)}
                    >
                      <LinearGradient
                        colors={channel.gradient as [string, string]}
                        style={styles.channelGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.channelIconContainer}>
                          <Ionicons name={channel.icon as any} size={28} color="#fff" />
                        </View>
                        <Text style={styles.channelSubtitle}>{channel.subtitle}</Text>
                        <Text style={styles.channelValue}>{channel.value}</Text>
                        <View style={styles.channelArrow}>
                          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Message Form */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  MESAJ GÖNDERIN
                </Text>
                
                {/* Category Selection */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesScroll}
                  contentContainerStyle={styles.categoriesContent}
                >
                  {MESSAGE_CATEGORIES.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                            borderColor: isSelected
                              ? colors.primary
                              : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setSelectedCategory(category.id)}
                      >
                        <Ionicons
                          name={category.icon as any}
                          size={16}
                          color={isSelected ? '#fff' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isSelected ? '#fff' : colors.text },
                          ]}
                        >
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Form Fields */}
                <View
                  style={[
                    styles.formCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  {/* Name Input */}
                  <View style={[styles.formRow, styles.formRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={[styles.formIconContainer, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="person-outline" size={18} color={colors.primary} />
                    </View>
                    <TextInput
                      style={[styles.formInput, { color: colors.text }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Adınız Soyadınız"
                      placeholderTextColor={colors.textSecondary + '80'}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Email Input */}
                  <View style={[styles.formRow, styles.formRowBorder, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <View style={[styles.formIconContainer, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="mail-outline" size={18} color={colors.primary} />
                    </View>
                    <TextInput
                      style={[styles.formInput, { color: colors.text }]}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="E-posta Adresiniz"
                      placeholderTextColor={colors.textSecondary + '80'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Message Input */}
                  <View style={styles.formRow}>
                    <View style={[styles.formIconContainer, styles.messageIconContainer, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                    </View>
                    <TextInput
                      style={[styles.formInput, styles.messageInput, { color: colors.text }]}
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Mesajınızı yazın..."
                      placeholderTextColor={colors.textSecondary + '80'}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                {/* Send Button */}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    {
                      backgroundColor: (selectedCategory && name && email && message)
                        ? colors.primary
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    },
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
                        name="paper-plane"
                        size={20}
                        color={(selectedCategory && name && email && message) ? '#fff' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.sendButtonText,
                          { color: (selectedCategory && name && email && message) ? '#fff' : colors.textSecondary },
                        ]}
                      >
                        Mesajı Gönder
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Support Tickets Link */}
              <TouchableOpacity
                style={[
                  styles.ticketsLink,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                ]}
                onPress={() => router.push('/profile/support-tickets')}
                activeOpacity={0.7}
              >
                <View style={styles.ticketsLinkContent}>
                  <Text style={[styles.ticketsLinkTitle, { color: colors.text }]}>
                    Destek Biletleri
                  </Text>
                  <Text style={[styles.ticketsLinkSubtitle, { color: colors.textSecondary }]}>
                    Bilet oluşturun ve takip edin
                  </Text>
                </View>
                <Text style={[styles.ticketsLinkArrow, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>

              {/* Support Hours */}
              <View style={[styles.supportHoursCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <View style={styles.supportHoursRow}>
                  <View style={[styles.supportHoursIcon, { backgroundColor: '#22C55E20' }]}>
                    <Ionicons name="time-outline" size={18} color="#22C55E" />
                  </View>
                  <View>
                    <Text style={[styles.supportHoursTitle, { color: colors.text }]}>Çalışma Saatleri</Text>
                    <Text style={[styles.supportHoursText, { color: colors.textSecondary }]}>
                      Pazartesi - Cuma: 09:00 - 18:00
                    </Text>
                    <Text style={[styles.supportHoursText, { color: colors.textSecondary }]}>
                      Cumartesi: 10:00 - 14:00
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            /* FAQ Tab */
            <>
              <View style={styles.faqContainer}>
                <Text style={[styles.faqIntro, { color: colors.textSecondary }]}>
                  Aşağıdaki sorulara göz atın veya bize ulaşın
                </Text>
                
                {FAQ_ITEMS.map((faq, index) => (
                  <TouchableOpacity
                    key={faq.id}
                    style={[
                      styles.faqItem,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  >
                    <View style={styles.faqHeader}>
                      <View style={[styles.faqIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name={faq.icon as any} size={20} color={colors.primary} />
                      </View>
                      <Text style={[styles.faqQuestion, { color: colors.text }]}>
                        {faq.question}
                      </Text>
                      <Ionicons
                        name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </View>
                    {expandedFaq === faq.id && (
                      <View style={[styles.faqAnswer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                          Bu sorunun cevabı burada yer alacaktır. Detaylı bilgi için destek ekibimizle iletişime geçebilirsiniz.
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {/* Contact CTA */}
                <View style={[styles.faqCta, { backgroundColor: isDark ? 'rgba(240,58,82,0.1)' : 'rgba(240,58,82,0.05)' }]}>
                  <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
                  <Text style={[styles.faqCtaText, { color: colors.text }]}>
                    Aradığınız cevabı bulamadınız mı?
                  </Text>
                  <TouchableOpacity
                    style={[styles.faqCtaButton, { backgroundColor: colors.primary }]}
                    onPress={() => switchTab('contact')}
                  >
                    <Text style={styles.faqCtaButtonText}>Bize Yazın</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Tab Switcher
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 4,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    borderRadius: 12,
    left: 4,
    top: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Hero Banner
  heroBanner: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },

  // Contact Channels
  channelsGrid: {
    gap: 12,
  },
  channelCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  channelGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  channelIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelSubtitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  channelValue: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
    position: 'absolute',
    bottom: 20,
    left: 88,
  },
  channelArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Categories
  categoriesScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Form Card
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  formRowBorder: {
    borderBottomWidth: 1,
  },
  formIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageIconContainer: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  formInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  messageInput: {
    minHeight: 100,
    paddingTop: 0,
  },

  // Send Button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#F03A52',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  sendButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },

  // Tickets Link
  ticketsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  ticketsLinkContent: {
    flex: 1,
  },
  ticketsLinkTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketsLinkSubtitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  ticketsLinkArrow: {
    fontSize: 24,
    fontWeight: '300',
  },

  // Support Hours
  supportHoursCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  supportHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  supportHoursIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportHoursTitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  supportHoursText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },

  // FAQ
  faqContainer: {
    paddingTop: 8,
  },
  faqIntro: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    marginBottom: 20,
  },
  faqItem: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  faqIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  faqAnswer: {
    borderTopWidth: 1,
    padding: 16,
    paddingTop: 16,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 22,
  },
  faqCta: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginTop: 8,
    gap: 12,
  },
  faqCtaText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    textAlign: 'center',
  },
  faqCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 4,
  },
  faqCtaButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
});
