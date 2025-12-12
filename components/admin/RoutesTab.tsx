/**
 * Routes Tab Component - Advanced Route Management
 * 
 * Features:
 * - Create/Edit/Delete routes
 * - Multi-day itinerary editor
 * - Image upload with optimization
 * - Season picker
 * - Stop management per day
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EdgeInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '@/constants/Colors';
import { ThematicRoute, RouteTheme, RouteDay, RouteStop, RouteStopType, TimeOfDay } from '@/types';
import {
  getThematicRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  toggleRouteHighlighted,
  toggleRouteActive,
  uploadRouteCoverImage,
  uploadRouteStopImage,
  SEASON_OPTIONS,
  RouteInput,
} from '@/lib/routeService';
import { useRouteStore } from '@/stores';

interface RoutesTabProps {
  colors: typeof Colors.light;
  isDark: boolean;
  insets: EdgeInsets;
}

// Theme options
const THEME_OPTIONS: { value: RouteTheme; label: string; icon: string }[] = [
  { value: 'history', label: 'Tarihi', icon: 'library-outline' },
  { value: 'food', label: 'Yeme-İçme', icon: 'restaurant-outline' },
  { value: 'nature', label: 'Doğa', icon: 'leaf-outline' },
  { value: 'beach', label: 'Sahil', icon: 'water-outline' },
  { value: 'culture', label: 'Kültür', icon: 'color-palette-outline' },
  { value: 'adventure', label: 'Macera', icon: 'compass-outline' },
];

// Difficulty options
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Kolay', color: '#22C55E' },
  { value: 'moderate', label: 'Orta', color: '#F59E0B' },
  { value: 'challenging', label: 'Zor', color: '#EF4444' },
];

// Stop type options
const STOP_TYPE_OPTIONS: { value: RouteStopType; label: string; icon: string }[] = [
  { value: 'tour', label: 'Tur', icon: 'map-outline' },
  { value: 'poi', label: 'Görülecek Yer', icon: 'location-outline' },
  { value: 'restaurant', label: 'Restoran', icon: 'restaurant-outline' },
  { value: 'cafe', label: 'Kafe', icon: 'cafe-outline' },
  { value: 'activity', label: 'Aktivite', icon: 'bicycle-outline' },
  { value: 'viewpoint', label: 'Manzara', icon: 'eye-outline' },
  { value: 'beach', label: 'Plaj', icon: 'water-outline' },
];

// Time of day options
const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Sabah' },
  { value: 'noon', label: 'Öğle' },
  { value: 'afternoon', label: 'Öğleden Sonra' },
  { value: 'evening', label: 'Akşam' },
];

// Check if route is a local fallback (not in Supabase)
const isLocalRoute = (id: string): boolean => {
  // Local routes have IDs like 'route-1', 'route-2', etc.
  // Supabase routes have UUID format
  return id.startsWith('route-') || !id.includes('-') || id.length < 32;
};

// Empty stop template
const createEmptyStop = (order: number): RouteStop => ({
  id: `stop_${Date.now()}_${order}`,
  order,
  type: 'poi',
  name: '',
  description: '',
  timeOfDay: 'morning',
  duration: '',
});

// Empty day template
const createEmptyDay = (dayIndex: number): RouteDay => ({
  dayIndex,
  title: `${dayIndex}. Gün`,
  description: '',
  stops: [createEmptyStop(1)],
});

export default function RoutesTab({ colors, isDark, insets }: RoutesTabProps) {
  // State
  const [routes, setRoutes] = useState<ThematicRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<ThematicRoute | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeStep, setActiveStep] = useState<'basic' | 'itinerary'>('basic');
  
  // Season picker state
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  
  // Toggle active state
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);

  // Form state - Basic Info
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [theme, setTheme] = useState<RouteTheme>('history');
  const [baseLocation, setBaseLocation] = useState('');
  const [region, setRegion] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [durationLabel, setDurationLabel] = useState('');
  const [coverImageUri, setCoverImageUri] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [highlighted, setHighlighted] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'moderate' | 'challenging'>('easy');
  const [bestSeason, setBestSeason] = useState('');
  
  // Form state - Itinerary
  const [itinerary, setItinerary] = useState<RouteDay[]>([createEmptyDay(1)]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Route store
  const refreshRoutes = useRouteStore((state) => state.refreshRoutes);

  // Load routes
  const loadRoutes = useCallback(async () => {
    const { data, error } = await getThematicRoutes();
    if (!error) {
      setRoutes(data);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadRoutes();
      setIsLoading(false);
    };
    init();
  }, [loadRoutes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  }, [loadRoutes]);

  // Filter routes
  const filteredRoutes = routes.filter(route => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      route.title.toLowerCase().includes(query) ||
      route.baseLocation.toLowerCase().includes(query)
    );
  });

  // Reset form
  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setTheme('history');
    setBaseLocation('');
    setRegion('');
    setDurationDays(1);
    setDurationLabel('');
    setCoverImageUri('');
    setCoverImageUrl('');
    setTags('');
    setHighlighted(false);
    setDifficulty('easy');
    setBestSeason('');
    setItinerary([createEmptyDay(1)]);
    setActiveDayIndex(0);
    setActiveStep('basic');
  };

  // Open add modal
  const openAddModal = () => {
    setEditingRoute(null);
    resetForm();
    setIsModalVisible(true);
  };

  // Open edit modal
  const openEditModal = (route: ThematicRoute) => {
    // Check if this is a local fallback route
    if (isLocalRoute(route.id)) {
      Alert.alert(
        'Düzenleme Yapılamaz',
        'Bu rota yerel verilerden yüklendi ve düzenlenemez. Lütfen önce "Yeni Rota Ekle" ile Supabase\'e kaydedin.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    setEditingRoute(route);
    setTitle(route.title);
    setSubtitle(route.subtitle || '');
    setTheme(route.theme);
    setBaseLocation(route.baseLocation);
    setRegion(route.region || '');
    setDurationDays(route.durationDays);
    setDurationLabel(route.durationLabel || '');
    setCoverImageUri('');
    setCoverImageUrl(route.coverImage);
    setTags(route.tags.join(', '));
    setHighlighted(route.highlighted || false);
    setDifficulty(route.difficulty || 'easy');
    setBestSeason(route.bestSeason || '');
    setItinerary(route.itinerary.length > 0 ? route.itinerary : [createEmptyDay(1)]);
    setActiveDayIndex(0);
    setActiveStep('basic');
    setIsModalVisible(true);
  };

  // Pick cover image
  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverImageUri(result.assets[0].uri);
      setCoverImageUrl(''); // Clear URL when new image selected
    }
  };

  // Update duration days and sync itinerary
  const handleDurationChange = (days: number) => {
    const newDays = Math.max(1, Math.min(14, days));
    setDurationDays(newDays);
    
    // Sync itinerary
    if (newDays > itinerary.length) {
      const newDaysToAdd = [];
      for (let i = itinerary.length + 1; i <= newDays; i++) {
        newDaysToAdd.push(createEmptyDay(i));
      }
      setItinerary([...itinerary, ...newDaysToAdd]);
    } else if (newDays < itinerary.length) {
      setItinerary(itinerary.slice(0, newDays));
      if (activeDayIndex >= newDays) {
        setActiveDayIndex(newDays - 1);
      }
    }
  };

  // Update day
  const updateDay = (dayIndex: number, updates: Partial<RouteDay>) => {
    setItinerary(prev => prev.map((day, idx) => 
      idx === dayIndex ? { ...day, ...updates } : day
    ));
  };

  // Add stop to day
  const addStopToDay = (dayIndex: number) => {
    const day = itinerary[dayIndex];
    const newStop = createEmptyStop(day.stops.length + 1);
    updateDay(dayIndex, { stops: [...day.stops, newStop] });
  };

  // Update stop
  const updateStop = (dayIndex: number, stopIndex: number, updates: Partial<RouteStop>) => {
    const day = itinerary[dayIndex];
    const newStops = day.stops.map((stop, idx) => 
      idx === stopIndex ? { ...stop, ...updates } : stop
    );
    updateDay(dayIndex, { stops: newStops });
  };

  // Remove stop
  const removeStop = (dayIndex: number, stopIndex: number) => {
    const day = itinerary[dayIndex];
    if (day.stops.length <= 1) {
      Alert.alert('Uyarı', 'Her günde en az bir durak olmalı');
      return;
    }
    const newStops = day.stops.filter((_, idx) => idx !== stopIndex)
      .map((stop, idx) => ({ ...stop, order: idx + 1 }));
    updateDay(dayIndex, { stops: newStops });
  };

  // Generate slug
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Save route
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Rota başlığı gerekli');
      return;
    }
    if (!baseLocation.trim()) {
      Alert.alert('Hata', 'Konum gerekli');
      return;
    }
    if (!coverImageUri && !coverImageUrl) {
      Alert.alert('Hata', 'Kapak görseli gerekli');
      return;
    }

    setIsSaving(true);

    try {
      let finalCoverUrl = coverImageUrl;
      const slug = generateSlug(title);

      // Upload cover image if new one selected
      if (coverImageUri) {
        setIsUploadingImage(true);
        const { url, error } = await uploadRouteCoverImage(coverImageUri, slug);
        setIsUploadingImage(false);
        
        if (error || !url) {
          Alert.alert('Hata', error || 'Kapak görseli yüklenemedi');
          setIsSaving(false);
          return;
        }
        finalCoverUrl = url;
      }

      const input: RouteInput = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        theme,
        baseLocation: baseLocation.trim(),
        region: region.trim() || undefined,
        durationDays,
        durationLabel: durationLabel.trim() || `${durationDays} Gün`,
        coverImage: finalCoverUrl,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        highlighted,
        difficulty,
        bestSeason: bestSeason || undefined,
        itinerary,
      };

      if (editingRoute) {
        const { error } = await updateRoute(editingRoute.id, input);
        if (error) {
          Alert.alert('Hata', error);
        } else {
          await loadRoutes();
          await refreshRoutes();
          setIsModalVisible(false);
          Alert.alert('Başarılı', 'Rota güncellendi');
        }
      } else {
        const { error } = await createRoute(input);
        if (error) {
          Alert.alert('Hata', error);
        } else {
          await loadRoutes();
          await refreshRoutes();
          setIsModalVisible(false);
          Alert.alert('Başarılı', 'Rota oluşturuldu');
        }
      }
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Bir hata oluştu');
    }

    setIsSaving(false);
  };

  // Toggle active status
  const handleToggleActive = async (route: ThematicRoute) => {
    if (isLocalRoute(route.id)) {
      Alert.alert('Yapılamaz', 'Bu rota yerel verilerden yüklendi.');
      return;
    }
    
    setTogglingActiveId(route.id);
    const newStatus = !route.isActive;
    const { success, error } = await toggleRouteActive(route.id, newStatus);
    setTogglingActiveId(null);
    
    if (success) {
      setRoutes(prev => prev.map(r => 
        r.id === route.id ? { ...r, isActive: newStatus } : r
      ));
      await refreshRoutes();
    } else {
      Alert.alert('Hata', error || 'Durum değiştirilemedi');
    }
  };

  // Delete route
  const handleDelete = (route: ThematicRoute) => {
    // Check if this is a local fallback route
    if (isLocalRoute(route.id)) {
      Alert.alert(
        'Silme Yapılamaz',
        'Bu rota yerel verilerden yüklendi ve silinemez.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    
    Alert.alert(
      'Rotayı Sil',
      `"${route.title}" rotasını silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await deleteRoute(route.id);
            if (success) {
              setRoutes(prev => prev.filter(r => r.id !== route.id));
              await refreshRoutes();
            } else {
              Alert.alert('Hata', error || 'Rota silinemedi');
            }
          },
        },
      ]
    );
  };

  // Get theme info
  const getThemeInfo = (themeValue: RouteTheme) => {
    return THEME_OPTIONS.find(t => t.value === themeValue) || THEME_OPTIONS[0];
  };

  // Get season label
  const getSeasonLabel = (value: string) => {
    return SEASON_OPTIONS.find(s => s.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{routes.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Toplam</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {routes.filter(r => r.highlighted).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Öne Çıkan</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rota ara..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Yeni Rota Ekle</Text>
        </TouchableOpacity>

        {/* Routes List */}
        {filteredRoutes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Rota bulunamadı</Text>
          </View>
        ) : (
          filteredRoutes.map((route) => {
            const themeInfo = getThemeInfo(route.theme);
            const isLocal = isLocalRoute(route.id);
            return (
              <View
                key={route.id}
                style={[
                  styles.routeCard, 
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', 
                    borderColor: isLocal ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    opacity: isLocal ? 0.7 : 1,
                  }
                ]}
              >
                <Image source={{ uri: route.coverImage }} style={styles.routeImage} />
                <View style={styles.routeInfo}>
                  <View style={styles.routeHeader}>
                    <Text style={[styles.routeTitle, { color: colors.text }]} numberOfLines={1}>
                      {route.title}
                    </Text>
                    {route.isActive === false && (
                      <View style={[styles.inactiveBadge, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]}>
                        <Text style={styles.inactiveBadgeText}>Pasif</Text>
                      </View>
                    )}
                    {isLocal && (
                      <View style={[styles.localBadge, { backgroundColor: '#F59E0B20' }]}>
                        <Ionicons name="cloud-offline-outline" size={10} color="#F59E0B" />
                      </View>
                    )}
                  </View>
                  <View style={styles.routeMeta}>
                    <View style={[styles.themeBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name={themeInfo.icon as any} size={12} color={colors.primary} />
                      <Text style={[styles.themeBadgeText, { color: colors.primary }]}>{themeInfo.label}</Text>
                    </View>
                    <Text style={[styles.routeLocation, { color: colors.textSecondary }]}>{route.baseLocation}</Text>
                  </View>
                  <Text style={[styles.routeDuration, { color: colors.textSecondary }]}>
                    {route.durationLabel || `${route.durationDays} Gün`} • {route.itinerary.reduce((acc, day) => acc + day.stops.length, 0)} Durak
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  {/* Active/Inactive Toggle */}
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: route.isActive !== false ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)' }]}
                    onPress={() => handleToggleActive(route)}
                    disabled={isLocal || togglingActiveId === route.id}
                  >
                    {togglingActiveId === route.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons 
                        name={route.isActive !== false ? 'eye' : 'eye-off'} 
                        size={18} 
                        color={isLocal ? '#999' : (route.isActive !== false ? '#22C55E' : '#9CA3AF')} 
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: isLocal ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 122, 255, 0.1)' }]}
                    onPress={() => openEditModal(route)}
                    disabled={isLocal}
                  >
                    <Ionicons name="pencil" size={18} color={isLocal ? '#999' : '#007AFF'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: isLocal ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 59, 48, 0.1)' }]}
                    onPress={() => handleDelete(route)}
                    disabled={isLocal}
                  >
                    <Ionicons name="trash" size={18} color={isLocal ? '#999' : '#FF3B30'} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Edit Modal - Part 1 continues in next section */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingRoute ? 'Rota Düzenle' : 'Yeni Rota'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.primary }]}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Step Tabs */}
          <View style={[styles.stepTabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5' }]}>
            <TouchableOpacity
              style={[styles.stepTab, activeStep === 'basic' && { backgroundColor: colors.card }]}
              onPress={() => setActiveStep('basic')}
            >
              <Ionicons name="information-circle-outline" size={18} color={activeStep === 'basic' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.stepTabText, { color: activeStep === 'basic' ? colors.primary : colors.textSecondary }]}>
                Temel Bilgiler
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepTab, activeStep === 'itinerary' && { backgroundColor: colors.card }]}
              onPress={() => setActiveStep('itinerary')}
            >
              <Ionicons name="calendar-outline" size={18} color={activeStep === 'itinerary' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.stepTabText, { color: activeStep === 'itinerary' ? colors.primary : colors.textSecondary }]}>
                Günlük Program
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {activeStep === 'basic' ? (
              /* Basic Info Form */
              <View style={styles.formSection}>
                {/* Cover Image */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Kapak Görseli *</Text>
                <TouchableOpacity
                  style={[styles.imagePickerButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                  onPress={pickCoverImage}
                >
                  {coverImageUri || coverImageUrl ? (
                    <Image source={{ uri: coverImageUri || coverImageUrl }} style={styles.coverPreview} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                      <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                        Fotoğraf Seç
                      </Text>
                    </View>
                  )}
                  {isUploadingImage && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="large" color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Title */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Başlık *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                  placeholder="Rota başlığı"
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />

                {/* Subtitle */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Alt Başlık</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                  placeholder="Kısa açıklama"
                  placeholderTextColor={colors.textSecondary}
                  value={subtitle}
                  onChangeText={setSubtitle}
                />

                {/* Theme */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Tema *</Text>
                <View style={styles.themeGrid}>
                  {THEME_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.themeOption, { backgroundColor: theme === option.value ? colors.primary : isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}
                      onPress={() => setTheme(option.value)}
                    >
                      <Ionicons name={option.icon as any} size={18} color={theme === option.value ? '#fff' : colors.text} />
                      <Text style={[styles.themeOptionText, { color: theme === option.value ? '#fff' : colors.text }]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Location */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Konum *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                  placeholder="Örn: Girne"
                  placeholderTextColor={colors.textSecondary}
                  value={baseLocation}
                  onChangeText={setBaseLocation}
                />

                {/* Region */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Bölge</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                  placeholder="Örn: Kuzey Kıbrıs"
                  placeholderTextColor={colors.textSecondary}
                  value={region}
                  onChangeText={setRegion}
                />

                {/* Duration */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Süre (Gün) *</Text>
                <View style={styles.durationRow}>
                  <TouchableOpacity
                    style={[styles.durationButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}
                    onPress={() => handleDurationChange(durationDays - 1)}
                  >
                    <Ionicons name="remove" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <View style={[styles.durationDisplay, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.durationValue, { color: colors.primary }]}>{durationDays}</Text>
                    <Text style={[styles.durationUnit, { color: colors.primary }]}>Gün</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.durationButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}
                    onPress={() => handleDurationChange(durationDays + 1)}
                  >
                    <Ionicons name="add" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Duration Label */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Süre Etiketi</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                  placeholder="Örn: 3 Gün 2 Gece"
                  placeholderTextColor={colors.textSecondary}
                  value={durationLabel}
                  onChangeText={setDurationLabel}
                />

                {/* Difficulty */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Zorluk</Text>
                <View style={styles.difficultyRow}>
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.difficultyOption, { backgroundColor: difficulty === option.value ? option.color : isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}
                      onPress={() => setDifficulty(option.value as any)}
                    >
                      <Text style={[styles.difficultyText, { color: difficulty === option.value ? '#fff' : colors.text }]}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Best Season */}
                <Text style={[styles.formLabel, { color: colors.text }]}>En İyi Sezon</Text>
                <TouchableOpacity
                  style={[styles.seasonButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}
                  onPress={() => setShowSeasonPicker(true)}
                >
                  <Text style={[styles.seasonButtonText, { color: bestSeason ? colors.text : colors.textSecondary }]}>
                    {bestSeason ? getSeasonLabel(bestSeason) : 'Sezon seçin'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Tags */}
                <Text style={[styles.formLabel, { color: colors.text }]}>Etiketler</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                  placeholder="Tarihi, Girne, Aile (virgülle ayırın)"
                  placeholderTextColor={colors.textSecondary}
                  value={tags}
                  onChangeText={setTags}
                />

                {/* Highlighted */}
                <View style={styles.switchRow}>
                  <View>
                    <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Öne Çıkan</Text>
                    <Text style={[styles.switchDescription, { color: colors.textSecondary }]}>Keşfet sayfasında göster</Text>
                  </View>
                  <Switch
                    value={highlighted}
                    onValueChange={setHighlighted}
                    trackColor={{ false: '#767577', true: colors.primary + '80' }}
                    thumbColor={highlighted ? colors.primary : '#f4f3f4'}
                  />
                </View>
              </View>
            ) : (
              /* Itinerary Editor */
              <View style={styles.formSection}>
                {/* Day Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
                  {itinerary.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.dayTab, activeDayIndex === index && { backgroundColor: colors.primary }]}
                      onPress={() => setActiveDayIndex(index)}
                    >
                      <Text style={[styles.dayTabText, { color: activeDayIndex === index ? '#fff' : colors.text }]}>
                        {day.dayIndex}. Gün
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Active Day Editor */}
                {itinerary[activeDayIndex] && (
                  <View style={styles.dayEditor}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Gün Başlığı</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                      placeholder="Örn: Girne Kalesi ve Çevresi"
                      placeholderTextColor={colors.textSecondary}
                      value={itinerary[activeDayIndex].title}
                      onChangeText={(text) => updateDay(activeDayIndex, { title: text })}
                    />

                    <Text style={[styles.formLabel, { color: colors.text }]}>Gün Açıklaması</Text>
                    <TextInput
                      style={[styles.formInput, styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', color: colors.text }]}
                      placeholder="Bu günün genel açıklaması"
                      placeholderTextColor={colors.textSecondary}
                      value={itinerary[activeDayIndex].description || ''}
                      onChangeText={(text) => updateDay(activeDayIndex, { description: text })}
                      multiline
                      numberOfLines={3}
                    />

                    {/* Stops */}
                    <View style={styles.stopsHeader}>
                      <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Duraklar</Text>
                      <TouchableOpacity
                        style={[styles.addStopButton, { backgroundColor: colors.primary + '15' }]}
                        onPress={() => addStopToDay(activeDayIndex)}
                      >
                        <Ionicons name="add" size={18} color={colors.primary} />
                        <Text style={[styles.addStopText, { color: colors.primary }]}>Durak Ekle</Text>
                      </TouchableOpacity>
                    </View>

                    {itinerary[activeDayIndex].stops.map((stop, stopIndex) => (
                      <View key={stop.id} style={[styles.stopCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                        <View style={styles.stopHeader}>
                          <View style={[styles.stopNumber, { backgroundColor: colors.primary }]}>
                            <Text style={styles.stopNumberText}>{stopIndex + 1}</Text>
                          </View>
                          <TouchableOpacity onPress={() => removeStop(activeDayIndex, stopIndex)}>
                            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          style={[styles.stopInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', color: colors.text }]}
                          placeholder="Durak adı"
                          placeholderTextColor={colors.textSecondary}
                          value={stop.name}
                          onChangeText={(text) => updateStop(activeDayIndex, stopIndex, { name: text })}
                        />

                        <View style={styles.stopTypeRow}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {STOP_TYPE_OPTIONS.map((type) => (
                              <TouchableOpacity
                                key={type.value}
                                style={[styles.stopTypeChip, { backgroundColor: stop.type === type.value ? colors.primary : isDark ? 'rgba(255,255,255,0.08)' : '#fff' }]}
                                onPress={() => updateStop(activeDayIndex, stopIndex, { type: type.value })}
                              >
                                <Ionicons name={type.icon as any} size={14} color={stop.type === type.value ? '#fff' : colors.textSecondary} />
                                <Text style={[styles.stopTypeText, { color: stop.type === type.value ? '#fff' : colors.text }]}>{type.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        <View style={styles.stopTimeRow}>
                          {TIME_OPTIONS.map((time) => (
                            <TouchableOpacity
                              key={time.value}
                              style={[styles.timeChip, { backgroundColor: stop.timeOfDay === time.value ? colors.primary + '20' : 'transparent' }]}
                              onPress={() => updateStop(activeDayIndex, stopIndex, { timeOfDay: time.value })}
                            >
                              <Text style={[styles.timeChipText, { color: stop.timeOfDay === time.value ? colors.primary : colors.textSecondary }]}>{time.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <TextInput
                          style={[styles.stopInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', color: colors.text }]}
                          placeholder="Süre (örn: 1-2 saat)"
                          placeholderTextColor={colors.textSecondary}
                          value={stop.duration || ''}
                          onChangeText={(text) => updateStop(activeDayIndex, stopIndex, { duration: text })}
                        />

                        <TextInput
                          style={[styles.stopInput, styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff', color: colors.text }]}
                          placeholder="Açıklama"
                          placeholderTextColor={colors.textSecondary}
                          value={stop.description || ''}
                          onChangeText={(text) => updateStop(activeDayIndex, stopIndex, { description: text })}
                          multiline
                          numberOfLines={2}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Season Picker Sheet */}
      <Modal
        visible={showSeasonPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeasonPicker(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity 
            style={styles.sheetBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowSeasonPicker(false)}
          />
          <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
            {/* Handle */}
            <View style={styles.sheetHandleContainer}>
              <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            </View>
            
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>En İyi Sezon</Text>
              <TouchableOpacity onPress={() => setShowSeasonPicker(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {/* Options */}
            <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
              {SEASON_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sheetOption,
                    { 
                      backgroundColor: bestSeason === option.value 
                        ? colors.primary + '15' 
                        : isDark ? 'rgba(255,255,255,0.06)' : '#F8F8F8',
                      borderColor: bestSeason === option.value 
                        ? colors.primary 
                        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                    }
                  ]}
                  onPress={() => {
                    setBestSeason(option.value);
                    setShowSeasonPicker(false);
                  }}
                >
                  <View style={styles.sheetOptionContent}>
                    <Text style={[
                      styles.sheetOptionText, 
                      { color: bestSeason === option.value ? colors.primary : colors.text }
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  {bestSeason === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              
              {/* Clear selection */}
              {bestSeason && (
                <TouchableOpacity
                  style={[styles.sheetClearButton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                  onPress={() => {
                    setBestSeason('');
                    setShowSeasonPicker(false);
                  }}
                >
                  <Text style={[styles.sheetClearText, { color: colors.textSecondary }]}>Seçimi Temizle</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  addButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  routeCard: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 12, marginBottom: 12, gap: 12 },
  routeImage: { width: 80, height: 80, borderRadius: 12 },
  routeInfo: { flex: 1, justifyContent: 'center' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  localBadge: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  inactiveBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  routeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  themeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  themeBadgeText: { fontSize: 11, fontWeight: '500' },
  routeLocation: { fontSize: 13 },
  routeDuration: { fontSize: 12, marginTop: 4 },
  cardActions: { justifyContent: 'center', gap: 6 },
  actionButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { fontSize: 16, fontWeight: '600' },
  stepTabs: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 12, borderRadius: 12, padding: 4 },
  stepTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  stepTabText: { fontSize: 14, fontWeight: '500' },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  formSection: { paddingTop: 8 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  formInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 14 },
  imagePickerButton: { height: 180, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden' },
  coverPreview: { width: '100%', height: '100%' },
  imagePickerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePickerText: { fontSize: 14, marginTop: 8 },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  themeOptionText: { fontSize: 13, fontWeight: '500' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  durationButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  durationDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  durationValue: { fontSize: 24, fontWeight: '700' },
  durationUnit: { fontSize: 16, fontWeight: '500' },
  difficultyRow: { flexDirection: 'row', gap: 10 },
  difficultyOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10 },
  difficultyText: { fontSize: 14, fontWeight: '500' },
  seasonButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  seasonButtonText: { fontSize: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  switchDescription: { fontSize: 13, marginTop: 2 },
  dayTabs: { marginBottom: 16 },
  dayTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 8, backgroundColor: 'rgba(0,0,0,0.05)' },
  dayTabText: { fontSize: 14, fontWeight: '600' },
  dayEditor: { marginTop: 8 },
  stopsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12 },
  addStopButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addStopText: { fontSize: 14, fontWeight: '500' },
  stopCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  stopNumber: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stopNumberText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  stopInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  stopTypeRow: { marginBottom: 10 },
  stopTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  stopTypeText: { fontSize: 12, fontWeight: '500' },
  stopTimeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  timeChipText: { fontSize: 12, fontWeight: '500' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  pickerContent: { borderRadius: 20, padding: 20 },
  pickerTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 4 },
  pickerOptionText: { fontSize: 16 },
  // Sheet styles for season picker
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%' },
  sheetHandleContainer: { alignItems: 'center', paddingVertical: 12 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif' },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  sheetOptionContent: { flex: 1 },
  sheetOptionText: { fontSize: 16, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif' },
  sheetClearButton: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  sheetClearText: { fontSize: 15, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif' },
});
