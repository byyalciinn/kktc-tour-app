/**
 * Scan Tab - Premium camera scanner with elegant analyzing animation
 */

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useScanStore } from '@/stores/scanStore';

const { width, height } = Dimensions.get('window');
const FRAME_SIZE = width * 0.72;
const ANALYZING_IMAGE_SIZE = width * 0.65;

export default function ScanScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Camera
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Store
  const {
    imageUri,
    isAnalyzing,
    analysisResult,
    setImageUri,
    analyzeCurrentImage,
    clearAnalysis,
  } = useScanStore();

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cornerAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Analysis steps
  const [analysisStep, setAnalysisStep] = useState(0);
  const analysisSteps = [
    { key: 'detecting' },
    { key: 'analyzing' },
    { key: 'identifying' },
    { key: 'finishing' },
  ];

  // Request permission
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Camera scanning line animation
  useEffect(() => {
    if (!imageUri && !isAnalyzing) {
      const scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      scanAnimation.start();
      return () => scanAnimation.stop();
    }
  }, [imageUri, isAnalyzing]);

  // Corner animation
  useEffect(() => {
    const cornerPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(cornerAnim, {
          toValue: 0.7,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    cornerPulse.start();
    return () => cornerPulse.stop();
  }, []);

  // Analyzing animation - Premium scanner effect
  useEffect(() => {
    if (isAnalyzing) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Scanner line - continuous up-down
      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      scanLoop.start();

      // Progress bar - 8 seconds total
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Step animation - change every 2 seconds
      const stepInterval = setInterval(() => {
        setAnalysisStep((prev) => (prev + 1) % analysisSteps.length);
      }, 2000);

      return () => {
        scanLoop.stop();
        clearInterval(stepInterval);
      };
    } else {
      fadeAnim.setValue(0);
      progressAnim.setValue(0);
      scanLineAnim.setValue(0);
      setAnalysisStep(0);
    }
  }, [isAnalyzing]);

  // Navigate to result
  useEffect(() => {
    if (analysisResult && analysisResult.success && !isAnalyzing) {
      router.push('/scan-result' as any);
    }
  }, [analysisResult, isAnalyzing]);

  // Take photo
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });

      if (photo?.uri) {
        setImageUri(photo.uri);
        setTimeout(() => analyzeCurrentImage('openai'), 300);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('permissions.cameraError'));
    }
  }, [setImageUri, analyzeCurrentImage, t]);

  // Gallery
  const handleGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissions.required'), t('permissions.galleryRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setTimeout(() => analyzeCurrentImage('openai'), 300);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('permissions.galleryRequired'));
    }
  }, [setImageUri, analyzeCurrentImage, t]);

  const toggleFlash = useCallback(() => setFlash((prev) => !prev), []);
  const handleClose = useCallback(() => clearAnalysis(), [clearAnalysis]);

  // Corner brackets for camera
  const renderCorner = (position: 'tl' | 'tr' | 'bl' | 'br', color: string = '#FFF') => {
    const cornerStyle = {
      tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
      tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
      bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
      br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
    };

    return (
      <Animated.View
        style={[
          styles.corner,
          cornerStyle[position],
          { borderColor: color, opacity: cornerAnim },
        ]}
      />
    );
  };

  // Permission screen
  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <Ionicons name="camera-outline" size={56} color="rgba(255,255,255,0.6)" />
        <Text style={styles.permissionText}>{t('scan.cameraPermission')}</Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>{t('scan.enableCamera')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================
  // PREMIUM ANALYZING SCREEN - White, Elegant
  // ============================================
  if (isAnalyzing && imageUri) {
    return (
      <View style={styles.analyzingScreen}>
        <StatusBar style="dark" />
        
        <Animated.View style={[styles.analyzingContent, { opacity: fadeAnim }]}>
          {/* Close button */}
          <View style={[styles.analyzingHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity 
              style={styles.analyzingCloseBtn} 
              onPress={handleClose}
              disabled
            >
              <Ionicons name="close" size={24} color="transparent" />
            </TouchableOpacity>
          </View>

          {/* Image with scanner */}
          <View style={styles.analyzingImageSection}>
            <View style={styles.analyzingImageWrapper}>
              {/* Shadow */}
              <View style={styles.analyzingImageShadow} />
              
              {/* Image container */}
              <View style={styles.analyzingImageContainer}>
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.analyzingImage}
                  resizeMode="cover"
                />
                
                {/* Corner brackets - dark for white bg */}
                <View style={styles.analyzingCorners}>
                  <View style={[styles.analyzeCorner, styles.analyzeCornerTL]} />
                  <View style={[styles.analyzeCorner, styles.analyzeCornerTR]} />
                  <View style={[styles.analyzeCorner, styles.analyzeCornerBL]} />
                  <View style={[styles.analyzeCorner, styles.analyzeCornerBR]} />
                </View>

                {/* Scanner line - moves up and down */}
                <Animated.View
                  style={[
                    styles.scannerLine,
                    {
                      transform: [
                        {
                          translateY: scanLineAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, ANALYZING_IMAGE_SIZE - 4],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['transparent', colors.primary, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.scannerLineGradient}
                  />
                </Animated.View>
              </View>
            </View>
          </View>

          {/* Status text */}
          <View style={styles.analyzingTextSection}>
            <Text style={styles.analyzingTitle}>
              {t(`scan.steps.${analysisSteps[analysisStep].key}`)}
            </Text>
            <Text style={styles.analyzingSubtitle}>
              {t('scan.aiAnalyzing')}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.analyzingFooter, { paddingBottom: insets.bottom + 40 }]}>
            <Text style={styles.analyzingFooterText}>
              {t('scan.discoveredWith')}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ============================================
  // CAMERA SCREEN
  // ============================================
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={flash}
      />

      <View style={styles.overlay}>
        {/* Top */}
        <View style={[styles.overlayTop, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={handleClose}>
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerBtn} onPress={toggleFlash}>
              <Ionicons
                name={flash ? 'flash' : 'flash-off'}
                size={24}
                color={flash ? '#FFD700' : '#FFF'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.instructionWrapper}>
            <BlurView intensity={50} tint="dark" style={styles.instructionBlur}>
              <Text style={styles.instructionText}>{t('scan.placeInFrame')}</Text>
            </BlurView>
          </View>
        </View>

        {/* Frame */}
        <View style={styles.frameRow}>
          <View style={styles.frameSide} />
          <View style={styles.frameCenter}>
            {renderCorner('tl')}
            {renderCorner('tr')}
            {renderCorner('bl')}
            {renderCorner('br')}

            <Animated.View
              style={[
                styles.cameraScanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, FRAME_SIZE - 4],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <View style={styles.frameSide} />
        </View>

        {/* Bottom */}
        <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 90 }]}>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.sideBtn} onPress={handleGallery}>
              <View style={styles.sideBtnInner}>
                <Ionicons name="images-outline" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
              <View style={styles.captureBtnOuter}>
                <View style={[styles.captureBtnInner, { backgroundColor: colors.primary }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => setFacing((f: CameraType) => (f === 'back' ? 'front' : 'back'))}
            >
              <View style={styles.sideBtnInner}>
                <Ionicons name="camera-reverse-outline" size={24} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayTop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionBlur: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  instructionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  frameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frameSide: {
    flex: 1,
    height: FRAME_SIZE,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  frameCenter: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 2,
  },
  cameraScanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  bottomArea: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 30,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 50,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  sideBtnInner: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
  },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  // ============================================
  // ANALYZING SCREEN STYLES - Premium White
  // ============================================
  analyzingScreen: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  analyzingContent: {
    flex: 1,
  },
  analyzingHeader: {
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  analyzingCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingImageSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingImageWrapper: {
    position: 'relative',
  },
  analyzingImageShadow: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: -20,
    bottom: -20,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 20,
  },
  analyzingImageContainer: {
    width: ANALYZING_IMAGE_SIZE,
    height: ANALYZING_IMAGE_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  },
  analyzingImage: {
    width: '100%',
    height: '100%',
  },
  analyzingCorners: {
    ...StyleSheet.absoluteFillObject,
  },
  analyzeCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#333',
  },
  analyzeCornerTL: {
    top: 12,
    left: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  analyzeCornerTR: {
    top: 12,
    right: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  analyzeCornerBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  analyzeCornerBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  scannerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
  },
  scannerLineGradient: {
    flex: 1,
  },
  analyzingTextSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  analyzingTitle: {
    color: '#111',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  analyzingSubtitle: {
    color: '#666',
    fontSize: 15,
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  analyzingFooter: {
    alignItems: 'center',
    paddingTop: 30,
  },
  analyzingFooterText: {
    color: '#999',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },

  // Permission
  permissionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 20,
    marginBottom: 28,
    textAlign: 'center',
    paddingHorizontal: 50,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  permissionButton: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});
