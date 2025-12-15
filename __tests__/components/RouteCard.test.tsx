/**
 * RouteCard Component Tests
 * Tests for thematic route card component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RouteCard } from '@/components/cards/RouteCard';
import { ThematicRoute } from '@/types';

// Mock dependencies
jest.mock('@/stores', () => ({
  useThemeStore: () => ({
    colorScheme: 'light',
  }),
}));

jest.mock('@/constants/ThematicRoutes', () => ({
  getThemeIcon: jest.fn(() => 'compass-outline'),
  getDifficultyInfo: jest.fn(() => ({ color: '#4CAF50', label: 'Easy' })),
}));

jest.mock('@/components/ui/CachedImage', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ uri, style, testID }: any) => (
      <View testID={testID || 'cached-image'} style={style} />
    ),
  };
});

jest.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, style }: any) => {
    const { View } = require('react-native');
    return <View style={style}>{children}</View>;
  },
}));

// Mock Ionicons to prevent act() warnings
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color }: any) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      const translations: Record<string, string> = {
        'explore.day': 'day',
        'explore.stops': 'stops',
        'explore.stop_one': 'stop',
        'explore.stop_other': 'stops',
        'explore.themes.cultural': 'Cultural',
        'explore.themes.culture': 'Culture',
        'explore.difficulties.easy': 'Easy',
      };

      if (opts?.count !== undefined) {
        const pluralKey = opts.count === 1 ? `${key}_one` : `${key}_other`;
        if (translations[pluralKey]) return translations[pluralKey];
      }

      return translations[key] || key;
    },
  }),
}));

const mockRoute: ThematicRoute = {
  id: 'route-1',
  slug: 'historical-kyrenia-tour',
  title: 'Historical Kyrenia Tour',
  subtitle: 'Explore ancient castles',
  theme: 'culture',
  difficulty: 'easy',
  durationDays: 2,
  durationLabel: '2 Days',
  baseLocation: 'Kyrenia',
  coverImage: 'https://example.com/image.jpg',
  totalStops: 5,
  tags: ['history', 'castle', 'sea'],
  itinerary: [
    {
      dayIndex: 1,
      title: 'Day 1',
      description: 'First day',
      stops: [
        { id: 's1', order: 1, type: 'tour', name: 'Stop 1', description: 'First stop', duration: '1h' },
        { id: 's2', order: 2, type: 'poi', name: 'Stop 2', description: 'Second stop', duration: '2h' },
      ],
    },
  ],
  isActive: true,
  highlighted: true,
};

describe('RouteCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Variant', () => {
    it('should render route title', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} />
      );
      
      expect(getByText('Historical Kyrenia Tour')).toBeTruthy();
    });

    it('should render subtitle when provided', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} />
      );
      
      expect(getByText('Explore ancient castles')).toBeTruthy();
    });

    it('should render base location', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} />
      );
      
      expect(getByText('Kyrenia')).toBeTruthy();
    });

    it('should render duration label', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} />
      );
      
      expect(getByText('2 Days')).toBeTruthy();
    });

    it('should render stops count', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} />
      );
      
      expect(getByText('5 stops')).toBeTruthy();
    });

    it('should render tags', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} />
      );
      
      expect(getByText('history')).toBeTruthy();
      expect(getByText('castle')).toBeTruthy();
      expect(getByText('sea')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const { getByRole } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} />
      );
      
      const button = getByRole('button');
      fireEvent.press(button);
      
      expect(mockOnPress).toHaveBeenCalledWith(mockRoute);
    });
  });

  describe('Compact Variant', () => {
    it('should render compact card', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} variant="compact" />
      );
      
      expect(getByText('Historical Kyrenia Tour')).toBeTruthy();
    });

    it('should render location in compact mode', () => {
      const { getByText } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} variant="compact" />
      );
      
      expect(getByText('Kyrenia')).toBeTruthy();
    });

    it('should call onPress in compact mode', () => {
      const { getByRole } = render(
        <RouteCard route={mockRoute} onPress={mockOnPress} variant="compact" />
      );
      
      const button = getByRole('button');
      fireEvent.press(button);
      
      expect(mockOnPress).toHaveBeenCalledWith(mockRoute);
    });
  });

  describe('Edge Cases', () => {
    it('should handle route without subtitle', () => {
      const routeWithoutSubtitle = { ...mockRoute, subtitle: undefined };
      
      const { queryByText } = render(
        <RouteCard route={routeWithoutSubtitle} onPress={mockOnPress} />
      );
      
      expect(queryByText('Explore ancient castles')).toBeNull();
    });

    it('should handle route with empty tags', () => {
      const routeWithEmptyTags = { ...mockRoute, tags: [] };
      
      const { queryByText } = render(
        <RouteCard route={routeWithEmptyTags} onPress={mockOnPress} />
      );
      
      expect(queryByText('history')).toBeNull();
    });

    it('should calculate stops from itinerary when totalStops is not provided', () => {
      const routeWithoutTotalStops = { ...mockRoute, totalStops: undefined };
      
      const { getByText } = render(
        <RouteCard route={routeWithoutTotalStops} onPress={mockOnPress} />
      );
      
      // Should calculate from itinerary (2 stops in day 1)
      expect(getByText('2 stops')).toBeTruthy();
    });
  });
});
