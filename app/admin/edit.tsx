import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { getTourById, updateTour, pickImage, takePhoto, TourData, getCategories, Category } from '@/lib/tourService';

export default function EditTourScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [tour, setTour] = useState<TourData | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('₺');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const [highlights, setHighlights] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await getCategories();
      const filtered = data.filter(c => c.id !== 'all');
      setCategories(filtered);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadTour = async () => {
      if (!id) {
        Alert.alert('Hata', 'Tur ID bulunamadı');
        router.back();
        return;
      }

      const { data, error } = await getTourById(id);
      
      if (error || !data) {
        Alert.alert('Hata', 'Tur yüklenemedi');
        router.back();
        return;
      }

      setTour(data);
      setTitle(data.title);
      setLocation(data.location);
      setDescription(data.description || '');
      setPrice(String(data.price));
      setCurrency(data.currency);
      setDuration(data.duration);
      setCategory(data.category);
      setHighlights(data.highlights?.join(', ') || '');
      setOriginalImageUrl(data.image || '');
      setLatitude(data.latitude ? String(data.latitude) : '');
      setLongitude(data.longitude ? String(data.longitude) : '');
      setIsLoading(false);
    };

    loadTour();
  }, [id]);

  const handlePickImage = async () => {
    Alert.alert(
      'Resim Seç',
      'Resim kaynağını seçin',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Galeri',
          onPress: async () => {
            const { uri, error } = await pickImage();
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            if (uri) setImageUri(uri);
          },
        },
        {
          text: 'Kamera',
          onPress: async () => {
            const { uri, error } = await takePhoto();
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            if (uri) setImageUri(uri);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!id || !tour) return;

    // Validation
    if (!title.trim()) {
      Alert.alert('Hata', 'Tur başlığı gerekli');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Hata', 'Konum gerekli');
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      Alert.alert('Hata', 'Geçerli bir fiyat girin');
      return;
    }
    if (!duration.trim()) {
      Alert.alert('Hata', 'Süre gerekli');
      return;
    }

    setIsSaving(true);

    const highlightsArray = highlights
      .split(',')
      .map(h => h.trim())
      .filter(h => h.length > 0);

    // Parse coordinates if provided
    const parsedLatitude = latitude.trim() ? parseFloat(latitude.trim()) : undefined;
    const parsedLongitude = longitude.trim() ? parseFloat(longitude.trim()) : undefined;
    
    // Validate coordinates if provided
    if (latitude.trim() && (isNaN(parsedLatitude!) || parsedLatitude! < -90 || parsedLatitude! > 90)) {
      Alert.alert('Hata', 'Geçerli bir enlem girin (-90 ile 90 arası)');
      setIsSaving(false);
      return;
    }
    if (longitude.trim() && (isNaN(parsedLongitude!) || parsedLongitude! < -180 || parsedLongitude! > 180)) {
      Alert.alert('Hata', 'Geçerli bir boylam girin (-180 ile 180 arası)');
      setIsSaving(false);
      return;
    }

    const { data, error } = await updateTour(
      id,
      {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        price: Number(price),
        currency,
        duration: duration.trim(),
        category,
        highlights: highlightsArray,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      },
      imageUri || undefined,
      originalImageUrl
    );

    setIsSaving(false);

    if (error) {
      console.log('Update error:', error);
      Alert.alert(
        'Güncelleme Hatası', 
        `${error}\n\nNot: Supabase Dashboard'da RLS politikalarını kontrol edin.`,
        [
          { text: 'Tamam' },
          { 
            text: 'Yeniden Dene', 
            onPress: handleSave 
          },
        ]
      );
    } else {
      Alert.alert('Başarılı', 'Tur güncellendi', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    }
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
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Turu Düzenle</Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Picker */}
          <TouchableOpacity
            style={[
              styles.imagePicker,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0',
              },
            ]}
            onPress={handlePickImage}
          >
            {imageUri || originalImageUrl ? (
              <>
                <Image 
                  source={{ uri: imageUri || originalImageUrl }} 
                  style={styles.selectedImage} 
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="camera" size={24} color="#fff" />
                  <Text style={styles.imageOverlayText}>Değiştir</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePickerContent}>
                <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                  Resim Ekle (800x600)
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: colors.text }]}>Başlık *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                  color: colors.text,
                },
              ]}
              placeholder="Tur başlığı"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, { color: colors.text }]}>Konum *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                  color: colors.text,
                },
              ]}
              placeholder="Konum (örn: Girne, KKTC)"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, { color: colors.text }]}>Açıklama</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                  color: colors.text,
                },
              ]}
              placeholder="Tur açıklaması"
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.formSection, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Fiyat *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.formSection, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Süre *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="1 Gün"
                placeholderTextColor={colors.textSecondary}
                value={duration}
                onChangeText={setDuration}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, { color: colors.text }]}>Kategori</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        category === cat.id
                          ? colors.primary
                          : isDark
                          ? 'rgba(255,255,255,0.08)'
                          : '#F5F5F5',
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={18}
                    color={category === cat.id ? '#fff' : colors.text}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: category === cat.id ? '#fff' : colors.text },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.label, { color: colors.text }]}>Öne Çıkanlar</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                  color: colors.text,
                },
              ]}
              placeholder="Virgülle ayırın (örn: Rehberli tur, Öğle yemeği)"
              placeholderTextColor={colors.textSecondary}
              value={highlights}
              onChangeText={setHighlights}
            />
          </View>

          {/* Coordinates Section */}
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: colors.text }]}>Harita Koordinatları (Opsiyonel)</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Haritada pin göstermek için koordinat girin
            </Text>
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                      color: colors.text,
                    },
                  ]}
                  placeholder="Enlem (örn: 35.3387)"
                  placeholderTextColor={colors.textSecondary}
                  value={latitude}
                  onChangeText={setLatitude}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                      color: colors.text,
                    },
                  ]}
                  placeholder="Boylam (örn: 33.3183)"
                  placeholderTextColor={colors.textSecondary}
                  value={longitude}
                  onChangeText={setLongitude}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  saveButton: {
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
  },
  imagePicker: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginTop: 4,
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 16,
  },
  categoriesContainer: {
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 12,
  },
});
