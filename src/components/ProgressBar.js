import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/cardComponentStyles';

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
      style={styles.progressContainer}
    >
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${boundedProgress}%` }]} />
      </View>

      {showPercentage ? <Text style={styles.progressPercentage}>{percentage}</Text> : null}
    </View>
  );
}
