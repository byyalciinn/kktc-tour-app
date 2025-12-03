import { StatusBar } from 'expo-status-bar';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useThemeStore } from '@/stores';

// Membership tier accent colors - subtle and elegant
const tierAccents: Record<string, { primary: string; secondary: string; bg: string }> = {
  Normal: {
    primary: '#6B7280',
    secondary: '#9CA3AF',
    bg: 'rgba(107, 114, 128, 0.08)',
  },
  Gold: {
    primary: '#B8860B',
    secondary: '#D4A84B',
    bg: 'rgba(184, 134, 11, 0.08)',
  },
  Business: {
    primary: '#1E3A5F',
    secondary: '#3B5998',
    bg: 'rgba(30, 58, 95, 0.08)',
  },
};

export default function MyPanelScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const memberClass = profile?.member_class || 'Normal';
  const tierColors = tierAccents[memberClass] || tierAccents.Normal;

  // Format date helper
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // Get membership type label
  const getMembershipLabel = (): string => {
    switch (memberClass) {
      case 'Gold':
        return t('profile.goldMember');
      case 'Business':
        return t('profile.businessMember');
      default:
        return t('profile.normalMember');
    }
  };

  // Membership start date (using created_at from profile)
  const membershipStartDate = formatDate(profile?.created_at);

  // Membership end date
  const getMembershipEndDate = (): string => {
    if (memberClass === 'Normal') {
      return t('profile.noEndDate');
    }
    
    // Gold membership with expiry date
    if (memberClass === 'Gold' && profile?.membership_expires_at) {
      return formatDate(profile.membership_expires_at);
    }
    
    // Business is always unlimited, Gold without expiry is also unlimited
    return t('profile.unlimited');
  };

  const membershipEndDate = getMembershipEndDate();
  
  // Check if Gold membership is expiring soon (within 7 days)
  const isExpiringSoon = (): boolean => {
    if (memberClass !== 'Gold' || !profile?.membership_expires_at) return false;
    const expiryDate = new Date(profile.membership_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };
  
  // Check if Gold membership is expired
  const isExpired = (): boolean => {
    if (memberClass !== 'Gold' || !profile?.membership_expires_at) return false;
    const expiryDate = new Date(profile.membership_expires_at);
    return expiryDate < new Date();
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.myPanel')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Membership Status Card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          {/* Tier Indicator Line */}
          <View style={[styles.tierLine, { backgroundColor: tierColors.primary }]} />

          <View style={styles.statusContent}>
            {/* Membership Type */}
            <View style={styles.statusHeader}>
              <Text style={[styles.membershipLabel, { color: tierColors.primary }]}>
                {getMembershipLabel()}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)' },
                ]}
              >
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t('profile.active')}</Text>
              </View>
            </View>

            {/* Member Number */}
            <Text style={[styles.memberNumber, { color: colors.textSecondary }]}>
              {profile?.member_number || '-'}
            </Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('profile.membershipDetails').toUpperCase()}
          </Text>

          <View
            style={[
              styles.detailsCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            {/* Membership Type Row */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                {t('profile.membershipType')}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {getMembershipLabel()}
              </Text>
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
              ]}
            />

            {/* Start Date Row */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                {t('profile.membershipStart')}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{membershipStartDate}</Text>
            </View>

            {/* End Date Row - Only for Gold/Business */}
            {memberClass !== 'Normal' && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                />
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('profile.membershipEnd')}
                  </Text>
                  <Text style={[
                    styles.detailValue, 
                    { 
                      color: isExpired() 
                        ? '#EF4444' 
                        : isExpiringSoon() 
                          ? '#F59E0B' 
                          : colors.text 
                    }
                  ]}>
                    {membershipEndDate}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Expiring Soon Warning */}
        {isExpiringSoon() && (
          <View
            style={[
              styles.warningCard,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)',
              },
            ]}
          >
            <Text style={[styles.warningText, { color: '#F59E0B' }]}>
              Gold üyeliğiniz yakında sona erecek. Avantajlarınızı kaybetmemek için yenileyin.
            </Text>
          </View>
        )}

        {/* Expired Warning */}
        {isExpired() && (
          <View
            style={[
              styles.warningCard,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)',
              },
            ]}
          >
            <Text style={[styles.warningText, { color: '#EF4444' }]}>
              Gold üyeliğiniz sona erdi. Premium avantajlardan yararlanmak için yenileyin.
            </Text>
          </View>
        )}

        {/* Upgrade Prompt for Normal Members */}
        {memberClass === 'Normal' && (
          <TouchableOpacity
            style={[
              styles.upgradeCard,
              {
                backgroundColor: isDark ? 'rgba(184, 134, 11, 0.1)' : 'rgba(184, 134, 11, 0.06)',
                borderColor: isDark ? 'rgba(184, 134, 11, 0.2)' : 'rgba(184, 134, 11, 0.15)',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => router.push('/profile/membership-card')}
          >
            <View style={styles.upgradeContent}>
              <Text style={[styles.upgradeTitle, { color: isDark ? '#D4A84B' : '#B8860B' }]}>
                Gold Üyelik
              </Text>
              <Text style={[styles.upgradeSubtitle, { color: colors.textSecondary }]}>
                Premium avantajlardan yararlanın
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#D4A84B' : '#B8860B'} />
          </TouchableOpacity>
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
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 32,
  },
  tierLine: {
    height: 3,
    width: '100%',
  },
  statusContent: {
    padding: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  membershipLabel: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    color: '#22C55E',
  },
  memberNumber: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
  },
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  detailLabel: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
  },
  detailValue: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
  },
  warningCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    lineHeight: 20,
  },
});
