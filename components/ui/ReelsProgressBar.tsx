import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReelsProgressBarProps {
  totalCount: number;
  currentIndex: number;
}

/**
 * Instagram Stories benzeri progress bar
 * Her segment bir turu temsil eder
 */
const ReelsProgressBar: React.FC<ReelsProgressBarProps> = ({ totalCount, currentIndex }) => {
  if (totalCount <= 0) return null;

  // Segment genişliğini hesapla (gap dahil)
  const GAP = 4;
  const HORIZONTAL_PADDING = 16;
  const availableWidth = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);
  const totalGaps = (totalCount - 1) * GAP;
  const segmentWidth = (availableWidth - totalGaps) / totalCount;

  return (
    <View style={styles.container}>
      {Array.from({ length: totalCount }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              width: segmentWidth,
              backgroundColor: index <= currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 4,
  },
  segment: {
    height: 3,
    borderRadius: 1.5,
  },
});

export default memo(ReelsProgressBar);
