import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { getTours, deleteTour, TourData } from '@/lib/tourService';
import { featuredTours } from '@/constants/Tours';

export default function AdminToursScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [tours, setTours] = useState<TourData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTours = async () => {
    const { data, error } = await getTours();
    if (error) {
      console.log('Error loading tours:', error);
      // Fallback to local data
      setTours(featuredTours.map(t => ({
        ...t,
        review_count: t.reviewCount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as TourData[]);
    } else {
      setTours(data);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadTours();
      setIsLoading(false);
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTours();
    setRefreshing(false);
  }, []);

  const handleDelete = (tour: TourData) => {
    Alert.alert(
      'Turu Sil',
      `"${tour.title}" turunu silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(tour.id);
            const { success, error } = await deleteTour(tour.id, tour.image);
            setDeletingId(null);
            
            if (success) {
              setTours(prev => prev.filter(t => t.id !== tour.id));
              Alert.alert('Başarılı', 'Tur silindi');
            } else {
              Alert.alert('Hata', error || 'Tur silinemedi');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (tour: TourData) => {
    router.push({
      pathname: '/admin/edit',
      params: { id: tour.id },
    });
  };

  const handleAdd = () => {
    router.push('/admin/add');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tur Yönetimi</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAdd}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tours List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {tours.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz tur yok</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Yeni tur eklemek için + butonuna tıklayın
            </Text>
          </View>
        ) : (
          tours.map((tour) => (
            <View
              key={tour.id}
              style={[
                styles.tourCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <Image source={{ uri: tour.image }} style={styles.tourImage} />
              
              <View style={styles.tourInfo}>
                <Text style={[styles.tourTitle, { color: colors.text }]} numberOfLines={1}>
                  {tour.title}
                </Text>
                <Text style={[styles.tourLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                  {tour.location}
                </Text>
                <View style={styles.tourMeta}>
                  <Text style={[styles.tourDuration, { color: colors.textSecondary }]}>
                    {tour.duration}
                  </Text>
                </View>
              </View>

              <View style={styles.tourActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}
                  onPress={() => handleEdit(tour)}
                >
                  <Ionicons name="pencil" size={18} color="#007AFF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
                  onPress={() => handleDelete(tour)}
                  disabled={deletingId === tour.id}
                >
                  {deletingId === tour.id ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Ionicons name="trash" size={18} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
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
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 8,
    textAlign: 'center',
  },
  tourCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
    gap: 12,
  },
  tourImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  tourInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tourTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  tourLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 6,
  },
  tourMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tourDuration: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tourActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
