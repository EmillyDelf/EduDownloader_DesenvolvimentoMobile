import React from 'react';
import { Text, View } from 'react-native';
import { feedbackStyles } from '../styles/cards';

export default function ProgressBar({
  progress = 0,
  showPercentage = true,
  accessibilityLabel = 'Progresso',
  style,
}) {
  const boundedProgress = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
  const percentage = `${Math.round(boundedProgress)}%`;

  return (
    <View
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: boundedProgress, text: percentage }}
      style={[feedbackStyles.progressContainer, style]}
    >
      <View style={feedbackStyles.progressTrack}>
        <View style={[feedbackStyles.progressFill, { width: `${boundedProgress}%` }]} />
      </View>

      {showPercentage ? <Text style={feedbackStyles.progressPercentage}>{percentage}</Text> : null}
    </View>
  );
}
