import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useThemeStore, useTermsStore, useAuthStore } from '@/stores';

interface TermsAcceptanceSheetProps {
  visible: boolean;
  onAccept: () => void;
  onCancel?: () => void;
}

export default function TermsAcceptanceSheet({ 
  visible, 
  onAccept,
  onCancel 
}: TermsAcceptanceSheetProps) {
  const { t } = useTranslation();
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  const { user } = useAuthStore();
  const { acceptTerms } = useTermsStore();
  
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!user || !agreed) return;
    
    setIsSubmitting(true);
    const result = await acceptTerms(user.id);
    setIsSubmitting(false);
    
    if (result.success) {
      onAccept();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          {onCancel && (
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onCancel}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('terms.title')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Community Guidelines Section */}
          <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('terms.communityGuidelines')}
              </Text>
            </View>
            <Text style={[styles.sectionText, { color: colors.textSecondary }]}>
              {t('terms.guidelinesContent')}
            </Text>
          </View>

          {/* Prohibited Content Section */}
          <View style={[styles.section, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('terms.prohibitedContent')}
              </Text>
            </View>
            <View style={styles.bulletList}>
              <BulletItem text={t('terms.noHateSpeech')} color={colors.textSecondary} />
              <BulletItem text={t('terms.noHarassment')} color={colors.textSecondary} />
              <BulletItem text={t('terms.noExplicitContent')} color={colors.textSecondary} />
              <BulletItem text={t('terms.noSpam')} color={colors.textSecondary} />
              <BulletItem text={t('terms.noMisinformation')} color={colors.textSecondary} />
            </View>
          </View>

          {/* Warning Section */}
          <View style={[styles.warningBox, { backgroundColor: 'rgba(255,107,107,0.1)' }]}>
            <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
            <Text style={[styles.warningText, { color: '#FF6B6B' }]}>
              {t('terms.violationWarning')}
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {/* Checkbox */}
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              { borderColor: agreed ? colors.primary : colors.textSecondary },
              agreed && { backgroundColor: colors.primary }
            ]}>
              {agreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text }]}>
              {t('terms.agreeCheckbox')}
            </Text>
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            style={[
              styles.acceptButton,
              { backgroundColor: agreed ? colors.primary : colors.textSecondary },
              !agreed && styles.acceptButtonDisabled
            ]}
            disabled={!agreed || isSubmitting}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <Text style={styles.acceptButtonText}>{t('common.loading')}</Text>
            ) : (
              <Text style={styles.acceptButtonText}>{t('terms.acceptButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function BulletItem({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.bulletItem}>
      <View style={[styles.bullet, { backgroundColor: color }]} />
      <Text style={[styles.bulletText, { color }]}>{text}</Text>
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
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  sectionText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 22,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    gap: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
  },
  acceptButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
