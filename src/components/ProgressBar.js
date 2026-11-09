import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressBar({
  progress = 0,
  showPercentage = true,
  accessibilityLabel = 'Progresso',
}) {
  const boundedProgress = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
  const percentage = `${Math.round(boundedProgress)}%`;

  return (
    <View
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: boundedProgress, text: percentage }}
      style={styles.container}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${boundedProgress}%` }]} />
      </View>

      {showPercentage ? <Text style={styles.percentage}>{percentage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },

  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    backgroundColor: '#0F519D',
  },

  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D355D',
    textAlign: 'right',
  },
});
