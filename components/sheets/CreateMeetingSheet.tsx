import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/Colors';
import { useToast } from '@/components/ui';
import { CreateMeetingInput, MeetingSession } from '@/types';
import { useMeetingStore, useThemeStore } from '@/stores';

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.85;

interface CreateMeetingSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (session: MeetingSession, inviteCode: string) => void;
}

export default function CreateMeetingSheet({
  visible,
  onClose,
  onCreated,
}: CreateMeetingSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const isEnglish = (i18n.language || '').toLowerCase().startsWith('en');

  const { createSession, isSubmitting } = useMeetingStore();

  const [title, setTitle] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height - SHEET_HEIGHT,
          useNativeDriver: true,
          damping: 24,
          stiffness: 260,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const resetForm = () => {
    setTitle('');
    setDestinationText('');
    setDescription('');
    setScheduledAt(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setPendingDate(null);
  };

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 24,
        stiffness: 260,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetForm();
      onClose();
    });
  }, [slideAnim, fadeAnim, onClose]);

  const formatScheduledAt = useCallback(
    (value: Date | null) => {
      if (!value) return t('meeting.form.scheduledPlaceholder');
      return value.toLocaleString(isEnglish ? 'en-US' : 'tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    },
    [isEnglish, t]
  );

  const handleOpenPicker = useCallback(() => {
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
      return;
    }
    setShowDatePicker((prev) => !prev);
  }, []);

  const handleDateChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
        if (event.type === 'dismissed') return;
        const nextDate = selectedDate ?? scheduledAt ?? new Date();
        setPendingDate(nextDate);
        setShowTimePicker(true);
        return;
      }
      if (selectedDate) {
        setScheduledAt(selectedDate);
      }
    },
    [scheduledAt]
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowTimePicker(false);
      if (event.type === 'dismissed') {
        setPendingDate(null);
        return;
      }
      const baseDate = pendingDate ?? scheduledAt ?? new Date();
      const nextDate = new Date(baseDate);
      if (selectedDate) {
        nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      }
      setScheduledAt(nextDate);
      setPendingDate(null);
    },
    [pendingDate, scheduledAt]
  );

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('meeting.validation.titleRequired'));
      return;
    }
    if (!destinationText.trim()) {
      Alert.alert(t('common.error'), t('meeting.validation.destinationRequired'));
      return;
    }

    const scheduledValue = scheduledAt ? scheduledAt.toISOString() : undefined;

    const input: CreateMeetingInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      destinationText: destinationText.trim(),
      scheduledAt: scheduledValue,
    };

    const { success, session, inviteCode, error } = await createSession(input);
    if (!success || !session || !inviteCode) {
      toast.error(error || t('meeting.errors.createFailed'));
      return;
    }

    toast.success(t('meeting.create.success'));
    onCreated?.(session, inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleClose();
  }, [
    title,
    description,
    destinationText,
    scheduledAt,
    createSession,
    t,
    toast,
    onCreated,
    handleClose,
  ]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' },
              ]}
            />
          )}
        </Animated.View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: colors.card,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('meeting.create.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('meeting.create.subtitle')}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.text }]}>{t('meeting.form.titleLabel')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('meeting.form.titlePlaceholder')}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('meeting.form.destinationLabel')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={destinationText}
              onChangeText={setDestinationText}
              placeholder={t('meeting.form.destinationPlaceholder')}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('meeting.form.descriptionLabel')}</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('meeting.form.descriptionPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('meeting.form.scheduledLabel')}</Text>
            <TouchableOpacity
              style={[
                styles.dateInput,
                {
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                },
              ]}
              onPress={handleOpenPicker}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text
                style={[
                  styles.dateText,
                  { color: scheduledAt ? colors.text : colors.textSecondary },
                ]}
              >
                {formatScheduledAt(scheduledAt)}
              </Text>
              <Ionicons
                name={showDatePicker && Platform.OS === 'ios' ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {Platform.OS === 'ios' && showDatePicker ? (
              <View
                style={[
                  styles.pickerCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                  },
                ]}
              >
                <DateTimePicker
                  value={scheduledAt ?? new Date()}
                  mode="datetime"
                  display="inline"
                  onChange={handleDateChange}
                  locale={isEnglish ? 'en-US' : 'tr-TR'}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </View>
            ) : null}

            {Platform.OS === 'android' && showDatePicker ? (
              <DateTimePicker
                value={scheduledAt ?? new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            ) : null}

            {Platform.OS === 'android' && showTimePicker ? (
              <DateTimePicker
                value={pendingDate ?? scheduledAt ?? new Date()}
                mode="time"
                display="default"
                onChange={handleTimeChange}
                is24Hour={!isEnglish}
              />
            ) : null}

            <View style={[styles.capacityCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.capacityLabel, { color: colors.textSecondary }]}>
                {t('meeting.form.capacityLabel')}
              </Text>
              <Text style={[styles.capacityValue, { color: colors.text }]}>
                {t('meeting.form.capacityValue')}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color="#FFF" />
                <Text style={styles.submitText}>{t('meeting.create.submit')}</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,120,0.3)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  content: {
    paddingBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  pickerCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    height: 100,
    marginBottom: 14,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  capacityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  capacityLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  capacityValue: {
    marginLeft: 'auto',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});
