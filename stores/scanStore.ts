/**
 * Scan Store - Zustand store for image scanning and analysis
 */

import { create } from 'zustand';
import { analyzeImage, VisionAnalysisResult } from '@/lib/visionService';
import { logger } from '@/lib/logger';

// Free tier scan limit
const FREE_SCAN_LIMIT = 10;
const COOLDOWN_HOURS = 24;

interface ScanState {
  // Current scan state
  imageUri: string | null;
  isAnalyzing: boolean;
  analysisResult: VisionAnalysisResult | null;
  error: string | null;
  
  // Scan usage tracking
  scanCount: number;
  lastScanTimestamp: number | null; // Unix timestamp of first scan in current period
  
  // Scan history
  scanHistory: Array<{
    id: string;
    imageUri: string;
    result: VisionAnalysisResult;
    timestamp: Date;
  }>;
  
  // Actions
  setImageUri: (uri: string | null) => void;
  analyzeCurrentImage: (provider?: 'gemini' | 'openai' | 'anthropic') => Promise<void>;
  clearAnalysis: () => void;
  clearHistory: () => void;
  removeScanFromHistory: (id: string) => void;
  canScan: (isPremium: boolean) => boolean;
  getRemainingScans: (isPremium: boolean) => number;
  getCooldownRemaining: () => number; // Returns remaining cooldown in milliseconds
  resetIfCooldownExpired: () => void;
}

export const useScanStore = create<ScanState>((set, get) => ({
  // Initial state
  imageUri: null,
  isAnalyzing: false,
  analysisResult: null,
  error: null,
  scanCount: 0,
  lastScanTimestamp: null,
  scanHistory: [],

  // Set current image URI
  setImageUri: (uri) => {
    set({ imageUri: uri, analysisResult: null, error: null });
  },

  // Analyze the current image (default: gemini - most cost-effective)
  analyzeCurrentImage: async (provider = 'gemini') => {
    const { imageUri } = get();
    
    if (!imageUri) {
      set({ error: 'No image selected' });
      return;
    }

    // Reset if cooldown expired
    get().resetIfCooldownExpired();

    set({ isAnalyzing: true, error: null });

    // Minimum animation duration (8 seconds) for premium feel
    const MIN_ANIMATION_DURATION = 8000;
    const startTime = Date.now();

    try {
      const result = await analyzeImage(imageUri, provider);
      
      // Calculate remaining time to show animation
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_ANIMATION_DURATION - elapsed);
      
      // Wait for minimum animation duration
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      // Add to history if successful
      if (result.success) {
        const historyItem = {
          id: Date.now().toString(),
          imageUri,
          result,
          timestamp: new Date(),
        };
        
        const now = Date.now();
        set((state) => {
          // If this is the first scan in a new period, set the timestamp
          const newTimestamp = state.lastScanTimestamp === null ? now : state.lastScanTimestamp;
          return {
            analysisResult: result,
            isAnalyzing: false,
            scanCount: state.scanCount + 1,
            lastScanTimestamp: newTimestamp,
            scanHistory: [historyItem, ...state.scanHistory].slice(0, 20), // Keep last 20
          };
        });
      } else {
        set({
          analysisResult: result,
          isAnalyzing: false,
          error: result.error || 'Analysis failed',
        });
      }
      
      logger.info('Scan analysis completed', { success: result.success });
    } catch (error) {
      logger.error('Scan analysis error', error);
      set({
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      });
    }
  },

  // Clear current analysis
  clearAnalysis: () => {
    set({
      imageUri: null,
      analysisResult: null,
      error: null,
    });
  },

  // Clear all history
  clearHistory: () => {
    set({ scanHistory: [] });
  },

  // Remove single item from history
  removeScanFromHistory: (id) => {
    set((state) => ({
      scanHistory: state.scanHistory.filter((item) => item.id !== id),
    }));
  },

  // Check if cooldown has expired and reset if needed
  resetIfCooldownExpired: () => {
    const { lastScanTimestamp } = get();
    if (lastScanTimestamp === null) return;
    
    const now = Date.now();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    
    if (now - lastScanTimestamp >= cooldownMs) {
      set({ scanCount: 0, lastScanTimestamp: null });
    }
  },

  // Get remaining cooldown time in milliseconds
  getCooldownRemaining: () => {
    const { lastScanTimestamp, scanCount } = get();
    
    // No cooldown if haven't used all scans
    if (scanCount < FREE_SCAN_LIMIT || lastScanTimestamp === null) return 0;
    
    const now = Date.now();
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    const elapsed = now - lastScanTimestamp;
    
    return Math.max(0, cooldownMs - elapsed);
  },

  // Check if user can scan
  canScan: (isPremium: boolean) => {
    if (isPremium) return true;
    
    // Reset if cooldown expired
    get().resetIfCooldownExpired();
    
    const { scanCount } = get();
    return scanCount < FREE_SCAN_LIMIT;
  },

  // Get remaining scans for free users
  getRemainingScans: (isPremium: boolean) => {
    if (isPremium) return Infinity;
    
    // Reset if cooldown expired
    get().resetIfCooldownExpired();
    
    const { scanCount } = get();
    return Math.max(0, FREE_SCAN_LIMIT - scanCount);
  },
}));

// Selectors for optimized re-renders
export const selectIsAnalyzing = (state: ScanState) => state.isAnalyzing;
export const selectAnalysisResult = (state: ScanState) => state.analysisResult;
export const selectScanHistory = (state: ScanState) => state.scanHistory;
export const selectImageUri = (state: ScanState) => state.imageUri;
