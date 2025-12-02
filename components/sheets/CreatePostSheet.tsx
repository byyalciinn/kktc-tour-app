import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { CommunityPostType, CreatePostInput } from '@/types';
import { useCommunityStore, useAuthStore, useThemeStore, useTourStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import { optimizeCommunityImage } from '@/lib/imageOptimizer';

const { width, height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.9;

interface CreatePostSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Post type options
const POST_TYPES: { id: CommunityPostType; icon: string; labelKey: string; color: string }[] = [
  { id: 'photo', icon: 'camera', labelKey: 'community.types.photo', color: '#4A90D9' },
  { id: 'review', icon: 'chatbubble', labelKey: 'community.types.review', color: '#50C878' },
  { id: 'suggestion', icon: 'bulb', labelKey: 'community.types.suggestion', color: '#FFB347' },
];

export default function CreatePostSheet({
  visible,
  onClose,
  onSuccess,
}: CreatePostSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  // Stores
  const { user } = useAuthStore();
  const { createPost, isSubmitting } = useCommunityStore();
  const { tours } = useTourStore();

  // Form state
  const [postType, setPostType] = useState<CommunityPostType>('photo');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Animation
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Show/hide animation
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 300,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Reset form
      setPostType('photo');
      setTitle('');
      setContent('');
      setImages([]);
      setSelectedTourId(null);
      setLocation('');
      onClose();
    });
  }, [slideAnim, fadeAnim, onClose]);

  // Pan responder for drag to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 25,
            stiffness: 300,
          }).start();
        }
      },
    })
  ).current;

  // Pick images with optimization
  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1, // Get full quality, we'll optimize ourselves
        selectionLimit: 5 - images.length,
        exif: false, // Don't include EXIF data to reduce size
      });

      if (!result.canceled && result.assets) {
        setIsUploading(true);
        const uploadedUrls: string[] = [];

        for (const asset of result.assets) {
          try {
            // Optimize image before upload (target ~250KB)
            const optimized = await optimizeCommunityImage(asset.uri);
            
            if (optimized && optimized.base64) {
              const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
              
              const { data, error } = await supabase.storage
                .from('community')
                .upload(fileName, decode(optimized.base64), {
                  contentType: 'image/jpeg',
                });

              if (!error && data) {
                const { data: urlData } = supabase.storage
                  .from('community')
                  .getPublicUrl(data.path);
                
                uploadedUrls.push(urlData.publicUrl);
                
                // Log compression stats
                if (optimized.compressionRatio) {
                  console.log(`[Community] Image optimized: ${optimized.compressionRatio}% reduction`);
                }
              }
            }
          } catch (optimizeError) {
            console.error('[Community] Image optimization failed:', optimizeError);
          }
        }

        setImages([...images, ...uploadedUrls]);
        setIsUploading(false);
      }
    } catch (error) {
      setIsUploading(false);
      Alert.alert(t('common.error'), t('community.imageUploadError'));
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Submit post
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredMessage'));
      return;
    }

    // Validation
    if (postType === 'photo' && images.length === 0) {
      Alert.alert(t('common.error'), t('community.validation.photoRequired'));
      return;
    }

    if ((postType === 'review' || postType === 'suggestion') && !content.trim()) {
      Alert.alert(t('common.error'), t('community.validation.contentRequired'));
      return;
    }

    const input: CreatePostInput = {
      type: postType,
      title: title.trim() || undefined,
      content: content.trim() || undefined,
      images,
      tourId: selectedTourId || undefined,
      location: location.trim() || undefined,
    };

    const { success, error } = await createPost(user.id, input);

    if (success) {
      Alert.alert(
        t('community.postCreated.title'),
        t('community.postCreated.message'),
        [{ text: t('common.done'), onPress: handleClose }]
      );
      onSuccess?.();
    } else {
      Alert.alert(t('common.error'), error || t('errors.generic'));
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            height: SHEET_HEIGHT,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Solid Background - Not transparent for better readability */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' },
          ]}
        />

        {/* Handle */}
        <View style={styles.handleContainer}>
          <View
            style={[
              styles.handle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' },
            ]}
          />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('community.createPost')}
          </Text>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (isSubmitting || isUploading) && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? (
              <View style={styles.submitButtonLoading}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={styles.submitButtonText}>{t('common.sending')}</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>{t('common.send')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Post Type Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('community.postType')}
              </Text>
              <View style={styles.typeOptions}>
                {POST_TYPES.map((type) => {
                  const isActive = postType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor: isActive
                            ? `${type.color}25`
                            : isDark
                            ? 'rgba(255,255,255,0.1)'
                            : '#F5F5F5',
                          borderColor: isActive ? type.color : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                        },
                      ]}
                      onPress={() => setPostType(type.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={24}
                        color={isActive ? type.color : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typeOptionText,
                          { color: isActive ? type.color : colors.text },
                        ]}
                      >
                        {t(type.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('community.titleOptional')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                placeholder={t('community.titlePlaceholder')}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                value={title}
                onChangeText={setTitle}
                maxLength={200}
              />
            </View>

            {/* Content */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {postType === 'photo' ? t('community.captionOptional') : t('community.content')}
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
                placeholder={
                  postType === 'photo'
                    ? t('community.captionPlaceholder')
                    : postType === 'review'
                    ? t('community.reviewPlaceholder')
                    : t('community.suggestionPlaceholder')
                }
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Images */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('community.photos')} ({images.length}/5)
              </Text>
              <View style={styles.imagesGrid}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity
                    style={[
                      styles.addImageButton,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                        borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                      },
                    ]}
                    onPress={handlePickImages}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Text style={[styles.addImageText, { color: colors.textSecondary }]}>
                        {t('common.loading')}
                      </Text>
                    ) : (
                      <>
                        <Ionicons name="add" size={32} color={colors.textSecondary} />
                        <Text style={[styles.addImageText, { color: colors.textSecondary }]}>
                          {t('community.addPhoto')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('community.locationOptional')}
              </Text>
              <View
                style={[
                  styles.inputWithIcon,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.inputInner, { color: colors.text }]}
                  placeholder={t('community.locationPlaceholder')}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            {/* Moderation Notice */}
            <View
              style={[
                styles.notice,
                {
                  backgroundColor: isDark ? 'rgba(255,179,71,0.15)' : 'rgba(255,179,71,0.1)',
                  borderColor: isDark ? 'rgba(255,179,71,0.3)' : 'rgba(255,179,71,0.2)',
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={20} color="#FFB347" />
              <Text style={[styles.noticeText, { color: colors.text }]}>
                {t('community.moderationNotice')}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  typeOptionText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    minHeight: 120,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
  },
  inputInner: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    width: (width - 40 - 24) / 3,
    height: (width - 40 - 24) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  addImageButton: {
    width: (width - 40 - 24) / 3,
    height: (width - 40 - 24) / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addImageText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
  },
});
