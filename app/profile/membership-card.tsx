import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_SPACING = 20;

// Membership levels
const membershipLevels = ['Normal', 'Gold', 'Business'] as const;
type MembershipLevel = (typeof membershipLevels)[number];

// Plan configurations matching the reference design
const planConfigs: Record<
  MembershipLevel,
  {
    name: string;
    price: number | null;
    originalPrice?: number;
    description: string;
    benefits: { text: string; included: boolean }[];
    badge?: string;
    isDark?: boolean;
  }
> = {
  Normal: {
    name: 'Temel Üyelik',
    price: null,
    description:
      'Temel tur erişimi ile KKTC\'yi keşfetmeye başlayın. Küçük gruplar için ideal.',
    benefits: [
      { text: 'Temel tur erişimi', included: true },
      { text: 'E-posta desteği', included: true },
      { text: 'Standart arama', included: true },
      { text: 'Sınırlı favoriler (5 tur)', included: true },
      { text: 'Reklamsız deneyim', included: false },
      { text: 'Öncelikli destek', included: false },
      { text: 'Özel indirimler', included: false },
      { text: 'VIP etkinlik erişimi', included: false },
    ],
    badge: undefined,
  },
  Gold: {
    name: 'Gold Üyelik',
    price: 299,
    originalPrice: 399,
    description:
      'Gelişmiş özellikler ve öncelikli destek ile tur deneyiminizi üst seviyeye taşıyın.',
    benefits: [
      { text: 'Temel tur erişimi', included: true },
      { text: 'E-posta desteği', included: true },
      { text: 'Gelişmiş arama filtreleri', included: true },
      { text: 'Sınırsız favoriler', included: true },
      { text: 'Reklamsız deneyim', included: true },
      { text: 'Öncelikli destek', included: true },
      { text: '%10 indirim', included: false },
      { text: 'VIP etkinlik erişimi', included: false },
    ],
    badge: '%25 Tasarruf',
    isDark: true,
  },
  Business: {
    name: 'Business Üyelik',
    price: 599,
    description:
      'Tüm premium özellikler ve işletme avantajları ile maksimum fayda sağlayın.',
    benefits: [
      { text: 'Temel tur erişimi', included: true },
      { text: 'E-posta desteği', included: true },
      { text: 'Gelişmiş arama filtreleri', included: true },
      { text: 'Sınırsız favoriler', included: true },
      { text: 'Reklamsız deneyim', included: true },
      { text: 'VIP destek hattı', included: true },
      { text: '%20 indirim', included: true },
      { text: 'VIP etkinlik erişimi', included: true },
    ],
    badge: 'Popüler',
  },
};

export default function MembershipCardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const profile = useAuthStore((state) => state.profile);

  // Billing period toggle
  const [isAnnual, setIsAnnual] = useState(true);

  // Current plan index for horizontal scroll
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Map member_class to level
  const mapMemberClass = (
    memberClass: string | null | undefined
  ): MembershipLevel => {
    if (memberClass === 'Silver') return 'Business';
    if (memberClass === 'Gold' || memberClass === 'Business')
      return memberClass as MembershipLevel;
    return 'Normal';
  };

  const currentClass = mapMemberClass(profile?.member_class);
  const currentIndex = membershipLevels.indexOf(currentClass);

  const handlePurchase = (level: MembershipLevel) => {
    if (level === 'Normal') return;
    const config = planConfigs[level];
    Alert.alert(
      'Üyeliği Yükselt',
      `${config.name} için ${config.price}₺/${isAnnual ? 'yıl' : 'ay'} ödemeniz gerekmektedir.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Üyeliğini Başlat',
          onPress: () => {
            Alert.alert('Başarılı', 'Deneme süresi başlatılıyor...');
          },
        },
      ]
    );
  };

  // Page indicator dots
  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {membershipLevels.map((_, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + CARD_SPACING),
            index * (CARD_WIDTH + CARD_SPACING),
            (index + 1) * (CARD_WIDTH + CARD_SPACING),
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotColor = scrollX.interpolate({
            inputRange,
            outputRange: [
              isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
              '#F59E0B',
              isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
            ],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  backgroundColor: dotColor,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // Render single plan card
  const renderPlanCard = (level: MembershipLevel, index: number) => {
    const config = planConfigs[level];
    const isActive = level === currentClass;
    const cardIsDark = config.isDark && !isDark;

    const cardBg = cardIsDark
      ? '#1F2937'
      : isDark
        ? 'rgba(255,255,255,0.08)'
        : '#FFFBEB';

    const cardBorder = cardIsDark
      ? '#374151'
      : isDark
        ? 'rgba(255,255,255,0.1)'
        : '#FEF3C7';

    const textColor = cardIsDark ? '#fff' : colors.text;
    const secondaryTextColor = cardIsDark
      ? 'rgba(255,255,255,0.7)'
      : colors.textSecondary;

    return (
      <View key={level} style={[styles.cardWrapper, { width: CARD_WIDTH }]}>
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
        >
          {/* Diagonal stripes for Gold */}
          {config.isDark && (
            <View style={styles.stripesContainer}>
              {[...Array(20)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stripe,
                    {
                      left: i * 20 - 100,
                      backgroundColor: 'rgba(245,158,11,0.1)',
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Header with badge */}
          <View style={styles.cardHeader}>
            <Text style={[styles.planName, { color: textColor }]}>
              {config.name}
            </Text>
            {config.badge && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: cardIsDark ? '#F59E0B' : '#22C55E',
                  },
                ]}
              >
                <Text style={styles.badgeText}>{config.badge}</Text>
                <View
                  style={[
                    styles.badgeDot,
                    { backgroundColor: cardIsDark ? '#FCD34D' : '#86EFAC' },
                  ]}
                />
              </View>
            )}
            {isActive && (
              <View style={[styles.badge, { backgroundColor: '#22C55E' }]}>
                <Text style={styles.badgeText}>Aktif</Text>
                <View style={[styles.badgeDot, { backgroundColor: '#86EFAC' }]} />
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            {config.originalPrice && (
              <Text style={[styles.originalPrice, { color: secondaryTextColor }]}>
                {config.originalPrice}₺
              </Text>
            )}
            {config.price ? (
              <>
                <Text style={[styles.price, { color: textColor }]}>
                  {config.price}₺
                </Text>
                <Text style={[styles.pricePeriod, { color: secondaryTextColor }]}>
                  / {isAnnual ? 'yıl' : 'ay'} (TRY)
                </Text>
              </>
            ) : (
              <Text style={[styles.price, { color: textColor }]}>Ücretsiz</Text>
            )}
          </View>

          {/* Yearly billing note */}
          {config.price && isAnnual && (
            <Text style={[styles.billingNote, { color: secondaryTextColor }]}>
              {Math.round(config.price / 12)}₺ aylık olarak faturalandırılır
            </Text>
          )}

          {/* Description */}
          <Text style={[styles.description, { color: secondaryTextColor }]}>
            {config.description}
          </Text>

          {/* Dotted separator */}
          <View style={styles.separator}>
            {[...Array(40)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.separatorDot,
                  {
                    backgroundColor: cardIsDark
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(0,0,0,0.15)',
                  },
                ]}
              />
            ))}
          </View>

          {/* Benefits list */}
          <View style={styles.benefitsList}>
            {config.benefits.map((benefit, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <View
                  style={[
                    styles.benefitIcon,
                    {
                      backgroundColor: benefit.included
                        ? '#22C55E'
                        : 'transparent',
                    },
                  ]}
                >
                  {benefit.included ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Ionicons
                      name="close"
                      size={16}
                      color={secondaryTextColor}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.benefitText,
                    {
                      color: benefit.included ? textColor : secondaryTextColor,
                      opacity: benefit.included ? 1 : 0.6,
                    },
                  ]}
                >
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>

          {/* CTA Button - Inside Card */}
          {!isActive && config.price && (
            <TouchableOpacity
              style={[
                styles.ctaButton,
                {
                  backgroundColor: cardIsDark ? '#F59E0B' : '#1F2937',
                },
              ]}
              activeOpacity={0.9}
              onPress={() => handlePurchase(level)}
            >
              <Text style={[styles.ctaButtonText, { color: '#fff' }]}>
                Üyeliğini Başlat
              </Text>
            </TouchableOpacity>
          )}

          {isActive && level !== 'Normal' && (
            <TouchableOpacity
              style={[
                styles.ctaButton,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: cardIsDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                },
              ]}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.ctaButtonText,
                  { color: cardIsDark ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
                ]}
              >
                İptal Et
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.05)',
            },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Billing Toggle */}
        <View
          style={[
            styles.billingToggle,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.toggleOption,
              isAnnual && [
                styles.toggleOptionActive,
                { backgroundColor: isDark ? '#374151' : '#1F2937' },
              ],
            ]}
            onPress={() => setIsAnnual(true)}
          >
            <Text
              style={[
                styles.toggleText,
                { color: isAnnual ? '#fff' : colors.textSecondary },
              ]}
            >
              Yıllık
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              !isAnnual && [
                styles.toggleOptionActive,
                { backgroundColor: isDark ? '#374151' : '#1F2937' },
              ],
            ]}
            onPress={() => setIsAnnual(false)}
          >
            <Text
              style={[
                styles.toggleText,
                { color: !isAnnual ? '#fff' : colors.textSecondary },
              ]}
            >
              Aylık
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Üyelik</Text>
        {renderDots()}
      </View>

      {/* Horizontal scroll cards */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContainer}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentOffset={{ x: currentIndex * (CARD_WIDTH + CARD_SPACING), y: 0 }}
      >
        {membershipLevels.map((level, index) => renderPlanCard(level, index))}
      </Animated.ScrollView>
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
  billingToggle: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
  },
  toggleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
  },
  stripesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    width: 8,
    height: 600,
    transform: [{ rotate: '45deg' }],
    top: -100,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  planName: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '500',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  price: {
    fontSize: 48,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
  },
  billingNote: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 22,
    marginBottom: 20,
  },
  separator: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 4,
    flexWrap: 'wrap',
  },
  separatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  benefitsList: {
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    flex: 1,
  },
  ctaButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
});
