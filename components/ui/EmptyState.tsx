import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'favorites' | 'search' | 'error';
}

/**
 * Reusable empty state component with different variants
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const getVariantStyles = () => {
    switch (variant) {
      case 'favorites':
        return {
          iconBg: isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 107, 107, 0.1)',
          iconColor: '#FF6B6B',
        };
      case 'search':
        return {
          iconBg: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
          iconColor: '#3B82F6',
        };
      case 'error':
        return {
          iconBg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          iconColor: '#EF4444',
        };
      default:
        return {
          iconBg: isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)',
          iconColor: colors.textSecondary,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${subtitle || ''}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: variantStyles.iconBg }]}>
        <Ionicons name={icon} size={48} color={variantStyles.iconColor} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Pre-configured empty state for favorites
 */
export function FavoritesEmptyState({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      icon="heart-outline"
      title="Henüz favori yok"
      subtitle="Beğendiğiniz turları favorilere ekleyerek daha sonra kolayca bulabilirsiniz"
      actionLabel={onExplore ? "Turları Keşfet" : undefined}
      onAction={onExplore}
      variant="favorites"
    />
  );
}

/**
 * Pre-configured empty state for search results
 */
export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon="search-outline"
      title="Sonuç bulunamadı"
      subtitle={`"${query}" için sonuç bulunamadı. Farklı anahtar kelimeler deneyin.`}
      variant="search"
    />
  );
}

/**
 * Pre-configured empty state for errors
 */
export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Bir şeyler yanlış gitti"
      subtitle="Veriler yüklenirken bir hata oluştu. Lütfen tekrar deneyin."
      actionLabel={onRetry ? "Tekrar Dene" : undefined}
      onAction={onRetry}
      variant="error"
    />
  );
}

/**
 * Pre-configured empty state for no tours in category
 */
export function NoToursEmptyState() {
  return (
    <EmptyState
      icon="map-outline"
      title="Bu kategoride tur yok"
      subtitle="Başka bir kategori seçerek turları keşfedebilirsiniz"
    />
  );
}

/**
 * Pre-configured empty state for login required
 */
export function LoginRequiredEmptyState({ onLogin }: { onLogin?: () => void }) {
  return (
    <EmptyState
      icon="person-outline"
      title="Giriş Yapın"
      subtitle="Bu özelliği kullanmak için hesabınıza giriş yapmanız gerekiyor"
      actionLabel={onLogin ? "Giriş Yap" : undefined}
      onAction={onLogin}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  actionText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
