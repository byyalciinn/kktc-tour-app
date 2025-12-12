import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Pressable,
  useColorScheme,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';

// Types
export interface AnimatedFabItemProps {
  id: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  description?: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}

interface AnimatedFabProps {
  isFabOpen: boolean;
  handleFabPress: () => void;
  onClickOutside: () => void;
  items?: AnimatedFabItemProps[];
  children?: React.ReactNode;
  fabIcon?: keyof typeof Ionicons.glyphMap;
  backgroundColor?: string;
  style?: ViewStyle;
  minContentHeight?: number;
}

// Animated Menu Item Component - separate component to use hooks properly
interface AnimatedMenuItemProps {
  item: AnimatedFabItemProps;
  index: number;
  progress: SharedValue<number>;
  backgroundColor?: string;
  colors: typeof Colors.light | typeof Colors.dark;
  isDark: boolean;
}

const AnimatedMenuItem: React.FC<AnimatedMenuItemProps> = ({
  item,
  index,
  progress,
  backgroundColor,
  colors,
  isDark,
}) => {
  const itemAnimatedStyle = useAnimatedStyle(() => {
    const delay = index * 0.1;
    const itemProgress = interpolate(
      progress.value,
      [delay, delay + 0.3],
      [0, 1],
      Extrapolation.CLAMP
    );
    
    return {
      opacity: itemProgress,
      transform: [
        { translateX: interpolate(itemProgress, [0, 1], [-20, 0], Extrapolation.CLAMP) },
        { scale: interpolate(itemProgress, [0, 1], [0.8, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.menuItem, itemAnimatedStyle]}>
      <TouchableOpacity
        style={[
          styles.menuItemButton,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            opacity: item.disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => {
          if (!item.disabled) {
            item.onPress();
          }
        }}
        activeOpacity={0.8}
        disabled={item.disabled}
      >
        {/* Icon */}
        {item.icon && (
          <View
            style={[
              styles.menuItemIconContainer,
              { backgroundColor: backgroundColor || colors.primary },
            ]}
          >
            <Ionicons name={item.icon} size={22} color="#FFFFFF" />
          </View>
        )}

        {/* Content */}
        <View style={styles.menuItemContent}>
          {item.label && (
            <Text style={[styles.menuItemLabel, { color: colors.text }]}>
              {item.label}
            </Text>
          )}
          {item.description && (
            <Text
              style={[styles.menuItemDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
        </View>

        {/* Badge for disabled items - blue color */}
        {item.disabled && item.badge && (
          <View style={[styles.badge, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}

        {/* Arrow */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textSecondary}
          style={styles.menuItemArrow}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 0.8,
};

const AnimatedFab: React.FC<AnimatedFabProps> = ({
  isFabOpen,
  handleFabPress,
  onClickOutside,
  items = [],
  children,
  fabIcon = 'add',
  backgroundColor,
  style,
  minContentHeight = 200,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  // Animation values
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Update animations when open state changes
  React.useEffect(() => {
    progress.value = withSpring(isFabOpen ? 1 : 0, SPRING_CONFIG);
    rotation.value = withSpring(isFabOpen ? 45 : 0, SPRING_CONFIG);
  }, [isFabOpen]);

  // FAB button animated style
  const fabAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.1, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  // Overlay animated style
  const overlayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      pointerEvents: isFabOpen ? 'auto' : 'none',
    };
  });

  // Menu container animated style
  const menuAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [20, 0], Extrapolation.CLAMP) },
        { scale: interpolate(progress.value, [0, 1], [0.9, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <>
      {/* Overlay */}
      <AnimatedPressable
        style={[styles.overlay, overlayAnimatedStyle]}
        onPress={onClickOutside}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={20}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' },
            ]}
          />
        )}
      </AnimatedPressable>

      {/* Menu Container */}
      {isFabOpen && (
        <Animated.View
          style={[
            styles.menuContainer,
            menuAnimatedStyle,
            {
              minHeight: minContentHeight,
              backgroundColor: isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
            style,
          ]}
        >
          {/* Custom children or default items */}
          {children || (
            <View style={styles.menuContent}>
              {items.map((item, index) => (
                <AnimatedMenuItem
                  key={item.id}
                  item={item}
                  index={index}
                  progress={progress}
                  backgroundColor={backgroundColor}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* FAB Button */}
      <AnimatedTouchable
        style={[
          styles.fab,
          fabAnimatedStyle,
          {
            backgroundColor: backgroundColor || colors.primary,
            shadowColor: backgroundColor || colors.primary,
          },
        ]}
        onPress={handleFabPress}
        activeOpacity={0.9}
      >
        <Ionicons name={fabIcon} size={28} color="#FFFFFF" />
      </AnimatedTouchable>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 998,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    left: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  menuContent: {
    gap: 4,
  },
  menuItem: {
    overflow: 'hidden',
  },
  menuItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 14,
  },
  menuItemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
    gap: 2,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  menuItemDescription: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    lineHeight: 18,
  },
  menuItemArrow: {
    marginLeft: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  fab: {
    position: 'absolute',
    bottom: 0,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default AnimatedFab;
