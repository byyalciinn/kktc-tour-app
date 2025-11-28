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
  useColorScheme,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { createTour, pickImage, takePhoto, getCategories, Category } from '@/lib/tourService';

export default function AddTourScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('₺');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const [highlights, setHighlights] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await getCategories();
      // Filter out "all" category
      const filtered = data.filter(c => c.id !== 'all');
      setCategories(filtered);
      if (filtered.length > 0) {
        setCategory(filtered[0].id);
      }
    };
    loadCategories();
  }, []);

  const handlePickImage = async () => {
    Alert.alert(
      'Resim Seç',
      'Resim kaynağını seçin',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Galeri',
          onPress: async () => {
            const uri = await pickImage();
            if (uri) setImageUri(uri);
          },
        },
        {
          text: 'Kamera',
          onPress: async () => {
            const uri = await takePhoto();
            if (uri) setImageUri(uri);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
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

    setIsLoading(true);

    const highlightsArray = highlights
      .split(',')
      .map(h => h.trim())
      .filter(h => h.length > 0);

    const { data, error } = await createTour(
      {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        price: Number(price),
        currency,
        duration: duration.trim(),
        category,
        highlights: highlightsArray,
      },
      imageUri || undefined
    );

    setIsLoading(false);

    if (error) {
      Alert.alert('Hata', error);
    } else {
      Alert.alert('Başarılı', 'Tur eklendi', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    }
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Yeni Tur Ekle</Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
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
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.selectedImage} />
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
        </ScrollView>
      </KeyboardAvoidingView>
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
});
