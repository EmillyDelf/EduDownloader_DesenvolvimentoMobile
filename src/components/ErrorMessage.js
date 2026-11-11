import React from 'react';
import { Text, View } from 'react-native';
import Button from './Button';
import { feedbackStyles } from '../styles/cards';

export default function ErrorMessage({
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
  style,
}) {
  if (!message) {
    return null;
  }

  return (
    <View style={[feedbackStyles.errorContainer, style]}>
      <Text
        accessibilityRole='alert'
        accessibilityLiveRegion='polite'
        style={feedbackStyles.errorMessage}
      >
        Erro: {message}
      </Text>

      {onRetry ? <Button title={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
}
