/**
 * Premium Paywall Sheet Component
 * Elegant subscription upgrade UI with monthly/yearly plans
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/themeStore';
import { Colors } from '@/constants/Colors';
import { 
  useSubscriptionStore, 
  PLANS, 
  FREE_TIER_LIMITS 
} from '@/stores/subscriptionStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  trigger?: 'favorites' | 'scan' | 'feature';
}

type SelectablePlan = 'monthly' | 'yearly';

export const PaywallSheet: React.FC<PaywallSheetProps> = ({
  visible,
  onClose,
  trigger = 'favorites',
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { subscribe, restorePurchases, isLoading } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<SelectablePlan>('yearly');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 280,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSubscribe = useCallback(async () => {
    const { success } = await subscribe(selectedPlan);
    if (success) {
      onClose();
    }
  }, [selectedPlan, subscribe, onClose]);

  const handleRestorePurchases = useCallback(async () => {
    const { success } = await restorePurchases();
    if (success) {
      onClose();
    }
  }, [restorePurchases, onClose]);

  // Calculate savings for yearly plan
  const monthlyCost = PLANS.monthly.price;
  const yearlyCost = PLANS.yearly.price;
  const yearlyMonthlyCost = yearlyCost / 12;
  const savingsPercent = Math.round(((monthlyCost * 12 - yearlyCost) / (monthlyCost * 12)) * 100);

  const features = [
    { icon: 'heart', label: t('paywall.features.unlimitedFavorites') },
    { icon: 'ban', label: t('paywall.features.adFree') },
    { icon: 'headset', label: t('paywall.features.prioritySupport') },
    { icon: 'sparkles', label: t('paywall.features.specialDiscounts') },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View 
        style={[
          styles.backdrop, 
          { 
            opacity: fadeAnim,
            backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
          }
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            paddingBottom: insets.bottom + 20,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Handle Bar */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* Premium Icon */}
          <View style={styles.iconSection}>
            <LinearGradient
              colors={[colors.primary, '#FF6B6B']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="diamond" size={36} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('paywall.title')}
          </Text>

          {/* Subtitle - Dynamic based on trigger */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {trigger === 'favorites' 
              ? t('paywall.favoriteLimitReached', { limit: FREE_TIER_LIMITS.maxFavorites })
              : trigger === 'scan'
              ? t('paywall.scanLimitReached')
              : t('paywall.unlockPremium')
            }
          </Text>

          {/* Plan Cards */}
          <View style={styles.plansContainer}>
            {/* Yearly Plan - Best Value */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedPlan('yearly')}
              style={[
                styles.planCard,
                {
                  backgroundColor: selectedPlan === 'yearly' 
                    ? isDark ? 'rgba(240,58,82,0.12)' : 'rgba(240,58,82,0.08)'
                    : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: selectedPlan === 'yearly' ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  borderWidth: selectedPlan === 'yearly' ? 2 : 1,
                },
              ]}
            >
              {/* Best Value Badge */}
              <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.bestValueText}>{t('paywall.bestValue')}</Text>
              </View>

              <View style={styles.planCardInner}>
                {/* Radio */}
                <View style={[
                  styles.radioOuter, 
                  { borderColor: selectedPlan === 'yearly' ? colors.primary : colors.textSecondary }
                ]}>
                  {selectedPlan === 'yearly' && (
                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>

                {/* Plan Info */}
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: colors.text }]}>
                    {t('paywall.plans.yearly.name')}
                  </Text>
                  <Text style={[styles.planSavings, { color: colors.primary }]}>
                    {t('paywall.savePercent', { percent: savingsPercent })}
                  </Text>
                </View>

                {/* Price */}
                <View style={styles.planPriceContainer}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>
                    ₺{yearlyCost.toFixed(2)}
                  </Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>
                    /{t('paywall.year')}
                  </Text>
                </View>
              </View>

              {/* Monthly equivalent */}
              <View style={[styles.monthlyEquivalent, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.monthlyEquivalentText, { color: colors.textSecondary }]}>
                  {t('paywall.justPerMonth', { price: yearlyMonthlyCost.toFixed(2) })}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Monthly Plan */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedPlan('monthly')}
              style={[
                styles.planCard,
                styles.planCardSimple,
                {
                  backgroundColor: selectedPlan === 'monthly' 
                    ? isDark ? 'rgba(240,58,82,0.12)' : 'rgba(240,58,82,0.08)'
                    : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: selectedPlan === 'monthly' ? colors.primary : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  borderWidth: selectedPlan === 'monthly' ? 2 : 1,
                },
              ]}
            >
              <View style={styles.planCardInner}>
                {/* Radio */}
                <View style={[
                  styles.radioOuter, 
                  { borderColor: selectedPlan === 'monthly' ? colors.primary : colors.textSecondary }
                ]}>
                  {selectedPlan === 'monthly' && (
                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>

                {/* Plan Info */}
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: colors.text }]}>
                    {t('paywall.plans.monthly.name')}
                  </Text>
                </View>

                {/* Price */}
                <View style={styles.planPriceContainer}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>
                    ₺{monthlyCost.toFixed(2)}
                  </Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>
                    /{t('paywall.month')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Features List */}
          <View style={styles.featuresSection}>
            <Text style={[styles.featuresTitle, { color: colors.text }]}>
              {t('paywall.premiumFeatures')}
            </Text>
            <View style={styles.featuresList}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={[styles.featureIconContainer, { backgroundColor: isDark ? 'rgba(240,58,82,0.15)' : 'rgba(240,58,82,0.1)' }]}>
                    <Ionicons name={feature.icon as any} size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.text }]}>
                    {feature.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Legal Links */}
          <View style={styles.legalSection}>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>
              {t('paywall.legalText')}
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity>
                <Text style={[styles.legalLink, { color: colors.primary }]}>
                  {t('paywall.termsOfService')}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.legalDot, { color: colors.textSecondary }]}>•</Text>
              <TouchableOpacity>
                <Text style={[styles.legalLink, { color: colors.primary }]}>
                  {t('paywall.privacyPolicy')}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.legalDot, { color: colors.textSecondary }]}>•</Text>
              <TouchableOpacity onPress={handleRestorePurchases} disabled={isLoading}>
                <Text style={[styles.legalLink, { color: colors.primary }]}>
                  {t('paywall.restorePurchases')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Subscribe Button */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSubscribe}
            disabled={isLoading}
            style={styles.ctaButton}
          >
            <LinearGradient
              colors={[colors.primary, '#E02D45']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {t('paywall.subscribe')}
                  </Text>
                  <View style={styles.ctaPriceTag}>
                    <Text style={styles.ctaPriceText}>
                      ₺{selectedPlan === 'yearly' ? yearlyCost.toFixed(2) : monthlyCost.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.92,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Icon Section
  iconSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F03A52',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },

  // Title
  title: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 16,
  },

  // Plans
  plansContainer: {
    gap: 12,
    marginBottom: 28,
  },
  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  planCardSimple: {
    paddingVertical: 4,
  },
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  bestValueBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 20,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 2,
  },
  planSavings: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  planPriceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginTop: 2,
  },
  monthlyEquivalent: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: -4,
  },
  monthlyEquivalentText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
  },

  // Features
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    flex: 1,
  },

  // Legal
  legalSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  legalText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  legalLink: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  legalDot: {
    fontSize: 12,
  },

  // CTA
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F03A52',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
  },
  ctaPriceTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ctaPriceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '700',
  },
});

export default PaywallSheet;
