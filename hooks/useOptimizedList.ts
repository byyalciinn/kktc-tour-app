/**
 * useOptimizedList Hook
 * 
 * Provides optimized FlatList configuration for better performance.
 * Includes:
 * - Standard FlatList optimization props
 * - getItemLayout calculator for fixed-height items
 * - Memoized keyExtractor
 * 
 * @example
 * const { listProps, keyExtractor } = useOptimizedList({ itemHeight: 100 });
 * <FlatList {...listProps} keyExtractor={keyExtractor} />
 */

import { useCallback, useMemo } from 'react';
import { ViewToken } from 'react-native';

interface UseOptimizedListOptions {
  /** Fixed height of each item (required for getItemLayout optimization) */
  itemHeight?: number;
  /** Number of items to render initially */
  initialNumToRender?: number;
  /** Maximum items to render per batch */
  maxToRenderPerBatch?: number;
  /** Number of screens to render ahead/behind */
  windowSize?: number;
  /** Batching period in ms */
  updateCellsBatchingPeriod?: number;
  /** Callback when viewable items change */
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
}

interface OptimizedListProps {
  removeClippedSubviews: boolean;
  maxToRenderPerBatch: number;
  updateCellsBatchingPeriod: number;
  windowSize: number;
  initialNumToRender: number;
  getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number };
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  viewabilityConfig?: {
    itemVisiblePercentThreshold: number;
    minimumViewTime: number;
  };
}

interface UseOptimizedListReturn {
  /** Props to spread on FlatList */
  listProps: OptimizedListProps;
  /** Memoized key extractor */
  keyExtractor: (item: { id: string }, index: number) => string;
  /** Get item layout function (only if itemHeight provided) */
  getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number };
}

export function useOptimizedList(options: UseOptimizedListOptions = {}): UseOptimizedListReturn {
  const {
    itemHeight,
    initialNumToRender = 8,
    maxToRenderPerBatch = 10,
    windowSize = 5,
    updateCellsBatchingPeriod = 50,
    onViewableItemsChanged,
  } = options;

  // Memoized getItemLayout for fixed-height items
  const getItemLayout = useMemo(() => {
    if (!itemHeight) return undefined;
    
    return (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }, [itemHeight]);

  // Memoized key extractor
  const keyExtractor = useCallback(
    (item: { id: string }, index: number) => `${item.id}-${index}`,
    []
  );

  // Viewability config for onViewableItemsChanged
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }), []);

  // Combined list props
  const listProps = useMemo<OptimizedListProps>(() => ({
    removeClippedSubviews: true,
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    windowSize,
    initialNumToRender,
    ...(getItemLayout && { getItemLayout }),
    ...(onViewableItemsChanged && { 
      onViewableItemsChanged,
      viewabilityConfig,
    }),
  }), [
    maxToRenderPerBatch,
    updateCellsBatchingPeriod,
    windowSize,
    initialNumToRender,
    getItemLayout,
    onViewableItemsChanged,
    viewabilityConfig,
  ]);

  return {
    listProps,
    keyExtractor,
    getItemLayout,
  };
}

/**
 * Preset configurations for common use cases
 */
export const LIST_PRESETS = {
  /** For card-based lists (community posts, tours) */
  cards: {
    initialNumToRender: 5,
    maxToRenderPerBatch: 8,
    windowSize: 5,
    updateCellsBatchingPeriod: 50,
  },
  /** For compact lists (settings, menu items) */
  compact: {
    initialNumToRender: 15,
    maxToRenderPerBatch: 15,
    windowSize: 7,
    updateCellsBatchingPeriod: 30,
  },
  /** For image-heavy lists (gallery, photos) */
  gallery: {
    initialNumToRender: 4,
    maxToRenderPerBatch: 6,
    windowSize: 3,
    updateCellsBatchingPeriod: 100,
  },
} as const;

export default useOptimizedList;
