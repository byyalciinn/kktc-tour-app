/**
 * useOptimizedList Hook Tests
 * Tests for FlatList performance optimization hook
 */

import { renderHook } from '@testing-library/react-native';
import { useOptimizedList, LIST_PRESETS } from '@/hooks/useOptimizedList';

describe('useOptimizedList', () => {
  describe('Default Configuration', () => {
    it('should return default list props', () => {
      const { result } = renderHook(() => useOptimizedList());
      
      expect(result.current.listProps).toBeDefined();
      expect(result.current.listProps.removeClippedSubviews).toBe(true);
      expect(result.current.listProps.maxToRenderPerBatch).toBe(10);
      expect(result.current.listProps.windowSize).toBe(5);
      expect(result.current.listProps.initialNumToRender).toBe(8);
    });

    it('should return keyExtractor function', () => {
      const { result } = renderHook(() => useOptimizedList());
      
      expect(result.current.keyExtractor).toBeDefined();
      expect(typeof result.current.keyExtractor).toBe('function');
    });

    it('keyExtractor should generate unique keys', () => {
      const { result } = renderHook(() => useOptimizedList());
      
      const key1 = result.current.keyExtractor({ id: 'item-1' }, 0);
      const key2 = result.current.keyExtractor({ id: 'item-2' }, 1);
      
      expect(key1).toBe('item-1-0');
      expect(key2).toBe('item-2-1');
      expect(key1).not.toBe(key2);
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom initialNumToRender', () => {
      const { result } = renderHook(() => 
        useOptimizedList({ initialNumToRender: 15 })
      );
      
      expect(result.current.listProps.initialNumToRender).toBe(15);
    });

    it('should accept custom maxToRenderPerBatch', () => {
      const { result } = renderHook(() => 
        useOptimizedList({ maxToRenderPerBatch: 20 })
      );
      
      expect(result.current.listProps.maxToRenderPerBatch).toBe(20);
    });

    it('should accept custom windowSize', () => {
      const { result } = renderHook(() => 
        useOptimizedList({ windowSize: 10 })
      );
      
      expect(result.current.listProps.windowSize).toBe(10);
    });

    it('should generate getItemLayout when itemHeight is provided', () => {
      const { result } = renderHook(() => 
        useOptimizedList({ itemHeight: 100 })
      );
      
      expect(result.current.getItemLayout).toBeDefined();
      expect(result.current.listProps.getItemLayout).toBeDefined();
      
      const layout = result.current.getItemLayout!([], 5);
      expect(layout).toEqual({
        length: 100,
        offset: 500,
        index: 5,
      });
    });

    it('should not include getItemLayout when itemHeight is not provided', () => {
      const { result } = renderHook(() => useOptimizedList());
      
      expect(result.current.getItemLayout).toBeUndefined();
      expect(result.current.listProps.getItemLayout).toBeUndefined();
    });
  });

  describe('LIST_PRESETS', () => {
    it('should have cards preset', () => {
      expect(LIST_PRESETS.cards).toBeDefined();
      expect(LIST_PRESETS.cards.initialNumToRender).toBe(5);
      expect(LIST_PRESETS.cards.maxToRenderPerBatch).toBe(8);
      expect(LIST_PRESETS.cards.windowSize).toBe(5);
    });

    it('should have compact preset', () => {
      expect(LIST_PRESETS.compact).toBeDefined();
      expect(LIST_PRESETS.compact.initialNumToRender).toBe(15);
      expect(LIST_PRESETS.compact.maxToRenderPerBatch).toBe(15);
      expect(LIST_PRESETS.compact.windowSize).toBe(7);
    });

    it('should have gallery preset', () => {
      expect(LIST_PRESETS.gallery).toBeDefined();
      expect(LIST_PRESETS.gallery.initialNumToRender).toBe(4);
      expect(LIST_PRESETS.gallery.maxToRenderPerBatch).toBe(6);
      expect(LIST_PRESETS.gallery.windowSize).toBe(3);
    });

    it('should work with presets', () => {
      const { result } = renderHook(() => 
        useOptimizedList(LIST_PRESETS.cards)
      );
      
      expect(result.current.listProps.initialNumToRender).toBe(5);
      expect(result.current.listProps.maxToRenderPerBatch).toBe(8);
    });
  });

  describe('Memoization', () => {
    it('should return stable references', () => {
      const { result, rerender } = renderHook(() => useOptimizedList());
      
      const firstListProps = result.current.listProps;
      const firstKeyExtractor = result.current.keyExtractor;
      
      rerender({});
      
      expect(result.current.listProps).toBe(firstListProps);
      expect(result.current.keyExtractor).toBe(firstKeyExtractor);
    });
  });
});
