import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from './colors';

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
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 3,
    backgroundColor: colors.blue,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    backgroundColor: colors.lime,
  },

  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue,
    textAlign: 'right',
  },
});
