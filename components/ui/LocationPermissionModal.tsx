/**
 * LocationPermissionModal Component
 * 
 * A modal that guides users to enable location permissions
 * with options to open settings or retry permission request.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';

const { width } = Dimensions.get('window');

interface LocationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onRetry?: () => void;
}

export const LocationPermissionModal = memo<LocationPermissionModalProps>(({
  visible,
  onClose,
  onOpenSettings,
  onRetry,
}) => {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={onClose}
          activeOpacity={1}
        />
        
        <View style={[
          styles.container,
          { 
            backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            marginBottom: insets.bottom + 20,
          }
        ]}>
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={isDark ? 60 : 80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}
          
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="location-outline" size={40} color={colors.primary} />
          </View>
          
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('explore.locationPermissionTitle', 'Konum İzni Gerekli')}
          </Text>
          
          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('explore.locationPermissionDescription', 
              'Yakınındaki turistik yerleri ve rotaları görebilmek için konum izni vermeniz gerekiyor. İzin verdikten sonra haritada konumunuzu görebilirsiniz.'
            )}
          </Text>
          
          {/* Features list */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {t('explore.locationFeature1', 'Yakınındaki yerleri keşfet')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {t('explore.locationFeature2', 'Haritada konumunu gör')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {t('explore.locationFeature3', 'Mesafe bilgisi al')}
              </Text>
            </View>
          </View>
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={onOpenSettings}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>
                {t('explore.openSettings', 'Ayarları Aç')}
              </Text>
            </TouchableOpacity>
            
            {onRetry && (
              <TouchableOpacity
                style={[
                  styles.secondaryButton, 
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  }
                ]}
                onPress={onRetry}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  {t('explore.retryPermission', 'Tekrar Dene')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>
              {t('explore.continueWithoutLocation', 'Konum olmadan devam et')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

LocationPermissionModal.displayName = 'LocationPermissionModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    width: width - 32,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  featuresList: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});

export default LocationPermissionModal;
