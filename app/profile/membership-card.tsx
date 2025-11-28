import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

// Membership level order for display
const membershipLevels = ['Normal', 'Gold', 'Business'] as const;
type MembershipLevel = typeof membershipLevels[number];

// Member class configurations
const memberClassConfig: Record<MembershipLevel, {
  gradient: [string, string];
  icon: string;
  benefits: { text: string; highlight?: boolean }[];
  price: number | null;
  displayName: string;
}> = {
  Normal: {
    gradient: ['#9CA3AF', '#D1D5DB'],
    icon: 'person-circle-outline',
    benefits: [
      { text: 'Temel tur erişimi' },
      { text: 'E-posta desteği' },
    ],
    price: null,
    displayName: 'Normal',
  },
  Gold: {
    gradient: ['#FFB800', '#F59E0B'],
    icon: 'diamond-outline',
    benefits: [
      { text: 'Tüm Normal avantajları' },
      { text: 'Genişletilmiş Favorilerim' },
      { text: 'Reklamsız Uygulama Keyfi' },
      { text: 'Öncelikli destek' },
      { text: '%10 indirim' },
    ],
    price: 299,
    displayName: 'Gold',
  },
  Business: {
    gradient: ['#3B82F6', '#1D4ED8'],
    icon: 'briefcase-outline',
    benefits: [
      { text: 'Tüm Gold avantajları' },
      { text: 'Genişletilmiş Favorilerim' },
      { text: 'Reklamsız Uygulama Keyfi' },
      { text: 'VIP destek hattı' },
      { text: '%20 indirim' },
      { text: 'İşletmenizi uygulamamıza ekleyerek potansiyel müşterilere ulaşın', highlight: true },
    ],
    price: 599,
    displayName: 'Business',
  },
};

export default function MembershipCardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { profile } = useAuth();

  // Map old member_class values to new ones
  const mapMemberClass = (memberClass: string | null | undefined): MembershipLevel => {
    if (memberClass === 'Silver') return 'Business';
    if (memberClass === 'Gold' || memberClass === 'Business') return memberClass as MembershipLevel;
    return 'Normal';
  };

  const currentClass = mapMemberClass(profile?.member_class);
  const config = memberClassConfig[currentClass];
  
  // Selected level for upgrade
  const [selectedLevel, setSelectedLevel] = useState<MembershipLevel | null>(null);

  const handleUpgrade = () => {
    if (!selectedLevel || selectedLevel === 'Normal') {
      Alert.alert('Seçim Yapın', 'Lütfen yükseltmek istediğiniz üyelik seviyesini seçin.');
      return;
    }

    const selectedConfig = memberClassConfig[selectedLevel];
    Alert.alert(
      'Üyeliği Yükselt',
      `${selectedConfig.displayName} üyeliğe yükseltmek için ${selectedConfig.price}₺ ödemeniz gerekmektedir.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Satın Al', onPress: () => {
          // TODO: Implement payment
          Alert.alert('Başarılı', 'Ödeme işlemi başlatılıyor...');
        }},
      ]
    );
  };

  // Check if upgrade button should be enabled
  const isUpgradeEnabled = selectedLevel && selectedLevel !== 'Normal' && selectedLevel !== currentClass;
  
  // Get selected level price
  const selectedPrice = selectedLevel ? memberClassConfig[selectedLevel].price : null;

  // Get benefits to display (selected level or current level)
  const displayedBenefitsLevel = selectedLevel && selectedLevel !== currentClass ? selectedLevel : currentClass;
  const displayedBenefitsConfig = memberClassConfig[displayedBenefitsLevel];

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Üyelik Kartı</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Membership Card */}
        <LinearGradient
          colors={config.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.membershipCard}
        >
          {/* Card Pattern */}
          <View style={styles.cardPattern}>
            <View style={[styles.patternCircle, styles.patternCircle1]} />
            <View style={[styles.patternCircle, styles.patternCircle2]} />
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Top Row */}
            <View style={styles.cardTopRow}>
              <View style={styles.cardBadge}>
                <Ionicons name={config.icon as any} size={20} color="#fff" />
              </View>
              <Text style={styles.cardType}>{currentClass.toUpperCase()} ÜYE</Text>
            </View>

            {/* Member Info */}
            <View style={styles.cardMiddle}>
              <Text style={styles.cardName}>
                {profile?.full_name || 'Kullanıcı'}
              </Text>
              <Text style={styles.cardNumber}>
                Üye No: {profile?.member_number || '------'}
              </Text>
            </View>

            {/* Bottom Row */}
            <View style={styles.cardBottomRow}>
              <View>
                <Text style={styles.cardLabel}>Üyelik Tarihi</Text>
                <Text style={styles.cardValue}>
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
                    : '-'
                  }
                </Text>
              </View>
              <View style={styles.cardLogo}>
                <Ionicons name="airplane" size={24} color="rgba(255,255,255,0.8)" />
                <Text style={styles.cardLogoText}>KKTC Tour</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Benefits Section */}
        <View style={styles.section}>
          <View style={styles.benefitsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ÜYELİK AVANTAJLARI
            </Text>
            {selectedLevel && selectedLevel !== currentClass && (
              <View style={[styles.benefitsLevelBadge, { backgroundColor: displayedBenefitsConfig.gradient[0] + '20' }]}>
                <Text style={[styles.benefitsLevelText, { color: displayedBenefitsConfig.gradient[0] }]}>
                  {displayedBenefitsConfig.displayName}
                </Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.benefitsCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                borderColor: selectedLevel && selectedLevel !== currentClass 
                  ? displayedBenefitsConfig.gradient[0] + '40'
                  : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            {displayedBenefitsConfig.benefits.map((benefit, index) => (
              <View 
                key={index} 
                style={[
                  styles.benefitRow,
                  benefit.highlight && styles.benefitRowHighlight,
                  benefit.highlight && { backgroundColor: displayedBenefitsConfig.gradient[0] + '10' },
                  index < displayedBenefitsConfig.benefits.length - 1 && [
                    styles.benefitRowBorder,
                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                  ]
                ]}
              >
                <View style={[
                  styles.benefitIcon, 
                  { backgroundColor: benefit.highlight ? displayedBenefitsConfig.gradient[0] : displayedBenefitsConfig.gradient[0] + '20' }
                ]}>
                  <Ionicons 
                    name={benefit.highlight ? 'star' : 'checkmark'} 
                    size={16} 
                    color={benefit.highlight ? '#fff' : displayedBenefitsConfig.gradient[0]} 
                  />
                </View>
                <Text style={[
                  styles.benefitText, 
                  { color: benefit.highlight ? displayedBenefitsConfig.gradient[0] : colors.text },
                  benefit.highlight && styles.benefitTextHighlight
                ]}>
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Membership Levels */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>
            ÜYELİK SEVİYELERİ
          </Text>
          <View style={styles.levelsContainer}>
            {membershipLevels.map((level) => {
              const levelConfig = memberClassConfig[level];
              const isActive = level === currentClass;
              const isSelected = level === selectedLevel;
              const isPast = 
                (currentClass === 'Gold' && level === 'Normal') ||
                (currentClass === 'Business' && (level === 'Normal' || level === 'Gold'));
              const canSelect = level !== 'Normal' && level !== currentClass && !isPast;
              
              return (
                <TouchableOpacity 
                  key={level}
                  style={[
                    styles.levelCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                      borderColor: isSelected 
                        ? levelConfig.gradient[0] 
                        : isActive 
                          ? levelConfig.gradient[0] 
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                      borderWidth: isSelected || isActive ? 2 : 1,
                    },
                  ]}
                  activeOpacity={canSelect ? 0.7 : 1}
                  onPress={() => canSelect && setSelectedLevel(level)}
                >
                  <LinearGradient
                    colors={levelConfig.gradient}
                    style={styles.levelBadge}
                  >
                    <Ionicons name={levelConfig.icon as any} size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.levelName, { color: colors.text }]}>
                    {levelConfig.displayName}
                  </Text>
                  
                  {/* Price for Gold and Business */}
                  {levelConfig.price && !isActive && !isPast && (
                    <Text style={[styles.levelPrice, { color: levelConfig.gradient[0] }]}>
                      {levelConfig.price}₺
                    </Text>
                  )}
                  
                  {isActive && (
                    <View style={[styles.activeIndicator, { backgroundColor: '#22C55E' }]}>
                      <Text style={styles.activeText}>Aktif</Text>
                    </View>
                  )}
                  {isSelected && !isActive && (
                    <View style={[styles.selectedIndicator, { borderColor: levelConfig.gradient[0] }]}>
                      <Ionicons name="checkmark" size={14} color={levelConfig.gradient[0]} />
                    </View>
                  )}
                  {isPast && (
                    <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={styles.completedIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Upgrade Button */}
        {currentClass !== 'Business' && (
          <TouchableOpacity
            style={[
              styles.upgradeButton, 
              { 
                backgroundColor: isUpgradeEnabled ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }
            ]}
            activeOpacity={isUpgradeEnabled ? 0.9 : 1}
            onPress={handleUpgrade}
            disabled={!isUpgradeEnabled}
          >
            <Ionicons name="arrow-up-circle" size={22} color={isUpgradeEnabled ? '#fff' : colors.textSecondary} />
            <Text style={[
              styles.upgradeButtonText,
              { color: isUpgradeEnabled ? '#fff' : colors.textSecondary }
            ]}>
              {selectedPrice ? `${selectedPrice}₺ - Üyeliği Yükselt` : 'Üyelik Seçin'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Max Level Message */}
        {currentClass === 'Business' && (
          <View style={[styles.maxLevelCard, { backgroundColor: config.gradient[0] + '15' }]}>
            <Ionicons name="trophy" size={32} color={config.gradient[0]} />
            <Text style={[styles.maxLevelTitle, { color: config.gradient[0] }]}>
              En Yüksek Seviye!
            </Text>
            <Text style={[styles.maxLevelText, { color: colors.textSecondary }]}>
              Tebrikler! Business üyelik ile tüm avantajlardan yararlanıyorsunuz.
            </Text>
          </View>
        )}
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

  // Membership Card
  membershipCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    minHeight: 200,
  },
  cardPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  patternCircle1: {
    width: 200,
    height: 200,
    top: -80,
    right: -60,
  },
  patternCircle2: {
    width: 150,
    height: 150,
    bottom: -50,
    left: -40,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardType: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  cardMiddle: {
    marginVertical: 20,
  },
  cardName: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  cardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLogoText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  // Benefits
  benefitsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitsLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  benefitsLevelText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  benefitsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  benefitRowBorder: {
    borderBottomWidth: 1,
  },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
    flex: 1,
  },
  benefitRowHighlight: {
    paddingVertical: 16,
  },
  benefitTextHighlight: {
    fontWeight: '600',
  },

  // Levels
  levelsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  levelCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelName: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  levelPrice: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
  },
  selectedIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  completedIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Upgrade Button
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },

  // Max Level
  maxLevelCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
  },
  maxLevelTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
  },
  maxLevelText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
  },
});
