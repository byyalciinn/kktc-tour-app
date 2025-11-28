import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  useColorScheme,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  Category 
} from '@/lib/tourService';

const AVAILABLE_ICONS = [
  'apps-outline',
  'location-outline',
  'business-outline',
  'bus-outline',
  'airplane-outline',
  'boat-outline',
  'car-outline',
  'bicycle-outline',
  'walk-outline',
  'restaurant-outline',
  'cafe-outline',
  'bed-outline',
  'camera-outline',
  'sunny-outline',
  'water-outline',
  'leaf-outline',
  'trail-sign-outline',
  'library-outline',
  'musical-notes-outline',
  'ticket-outline',
];

export default function CategoriesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('location-outline');
  const [sortOrder, setSortOrder] = useState('0');

  const loadCategories = async () => {
    const { data } = await getCategories();
    // Filter out "all" category as it's virtual
    setCategories(data.filter(c => c.id !== 'all'));
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadCategories();
      setIsLoading(false);
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setIcon('location-outline');
    setSortOrder(String(categories.length + 1));
    setIsModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setSortOrder(String(category.sort_order));
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Kategori adı gerekli');
      return;
    }

    setIsSaving(true);

    if (editingCategory) {
      // Update
      const { error } = await updateCategory(editingCategory.id, {
        name: name.trim(),
        icon,
        sort_order: parseInt(sortOrder) || 0,
      });

      if (error) {
        Alert.alert('Hata', error);
      } else {
        await loadCategories();
        setIsModalVisible(false);
      }
    } else {
      // Create
      const { error } = await createCategory({
        name: name.trim(),
        icon,
        sort_order: parseInt(sortOrder) || 0,
      });

      if (error) {
        Alert.alert('Hata', error);
      } else {
        await loadCategories();
        setIsModalVisible(false);
      }
    }

    setIsSaving(false);
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Kategoriyi Sil',
      `"${category.name}" kategorisini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await deleteCategory(category.id);
            if (success) {
              setCategories(prev => prev.filter(c => c.id !== category.id));
            } else {
              Alert.alert('Hata', error || 'Kategori silinemedi');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kategoriler</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Categories List */}
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
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz kategori yok</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Yeni kategori eklemek için + butonuna tıklayın
            </Text>
          </View>
        ) : (
          categories.map((category) => (
            <View
              key={category.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={category.icon as any} size={24} color={colors.primary} />
              </View>
              
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categorySortOrder, { color: colors.textSecondary }]}>
                  Sıra: {category.sort_order}
                </Text>
              </View>

              <View style={styles.categoryActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}
                  onPress={() => openEditModal(category)}
                >
                  <Ionicons name="pencil" size={18} color="#007AFF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
                  onPress={() => handleDelete(category)}
                >
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.primary }]}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Kategori Adı</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Kategori adı"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Sıra Numarası</Text>
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
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>İkon Seç</Text>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: icon === iconName 
                          ? colors.primary 
                          : isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                      },
                    ]}
                    onPress={() => setIcon(iconName)}
                  >
                    <Ionicons 
                      name={iconName as any} 
                      size={24} 
                      color={icon === iconName ? '#fff' : colors.text} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    gap: 12,
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
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 2,
  },
  categorySortOrder: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
