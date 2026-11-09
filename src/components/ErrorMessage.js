import React from 'react';
import { View, Text } from 'react-native';
import Button from './Button';
import styles from '../styles/cardComponentStyles';

export default function ErrorMessage({ message, onRetry, retryLabel = 'Tentar novamente' }) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.errorContainer}>
      <Text accessibilityRole='alert' accessibilityLiveRegion='polite' style={styles.errorMessageText}>
        Erro: {message}
      </Text>

      {onRetry ? <Button title={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
}
