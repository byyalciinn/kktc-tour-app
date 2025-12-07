/**
 * Scan Store - Zustand store for image scanning and analysis
 */

import { create } from 'zustand';
import { analyzeImage, VisionAnalysisResult } from '@/lib/visionService';
import { logger } from '@/lib/logger';

// Free tier scan limit
const FREE_SCAN_LIMIT = 1;

interface ScanState {
  // Current scan state
  imageUri: string | null;
  isAnalyzing: boolean;
  analysisResult: VisionAnalysisResult | null;
  error: string | null;
  
  // Scan usage tracking
  dailyScanCount: number;
  lastScanDate: string | null;
  
  // Scan history
  scanHistory: Array<{
    id: string;
    imageUri: string;
    result: VisionAnalysisResult;
    timestamp: Date;
  }>;
  
  // Actions
  setImageUri: (uri: string | null) => void;
  analyzeCurrentImage: (provider?: 'openai' | 'anthropic') => Promise<void>;
  clearAnalysis: () => void;
  clearHistory: () => void;
  removeScanFromHistory: (id: string) => void;
  canScan: (isPremium: boolean) => boolean;
  getRemainingScans: (isPremium: boolean) => number;
}

export const useScanStore = create<ScanState>((set, get) => ({
  // Initial state
  imageUri: null,
  isAnalyzing: false,
  analysisResult: null,
  error: null,
  dailyScanCount: 0,
  lastScanDate: null,
  scanHistory: [],

  // Set current image URI
  setImageUri: (uri) => {
    set({ imageUri: uri, analysisResult: null, error: null });
  },

  // Analyze the current image
  analyzeCurrentImage: async (provider = 'openai') => {
    const { imageUri, dailyScanCount, lastScanDate } = get();
    
    if (!imageUri) {
      set({ error: 'No image selected' });
      return;
    }

    // Reset daily count if new day
    const today = new Date().toDateString();
    let currentCount = dailyScanCount;
    if (lastScanDate !== today) {
      currentCount = 0;
    }

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
        
        const today = new Date().toDateString();
        set((state) => ({
          analysisResult: result,
          isAnalyzing: false,
          dailyScanCount: state.lastScanDate === today ? state.dailyScanCount + 1 : 1,
          lastScanDate: today,
          scanHistory: [historyItem, ...state.scanHistory].slice(0, 20), // Keep last 20
        }));
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

  // Check if user can scan
  canScan: (isPremium: boolean) => {
    if (isPremium) return true;
    
    const { dailyScanCount, lastScanDate } = get();
    const today = new Date().toDateString();
    
    // Reset count if new day
    if (lastScanDate !== today) return true;
    
    return dailyScanCount < FREE_SCAN_LIMIT;
  },

  // Get remaining scans for free users
  getRemainingScans: (isPremium: boolean) => {
    if (isPremium) return Infinity;
    
    const { dailyScanCount, lastScanDate } = get();
    const today = new Date().toDateString();
    
    // Reset count if new day
    if (lastScanDate !== today) return FREE_SCAN_LIMIT;
    
    return Math.max(0, FREE_SCAN_LIMIT - dailyScanCount);
  },
}));

// Selectors for optimized re-renders
export const selectIsAnalyzing = (state: ScanState) => state.isAnalyzing;
export const selectAnalysisResult = (state: ScanState) => state.analysisResult;
export const selectScanHistory = (state: ScanState) => state.scanHistory;
export const selectImageUri = (state: ScanState) => state.imageUri;
