import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from './Button';
import colors from './colors';

export default function ErrorMessage({ message, onRetry, retryLabel = 'Tentar novamente' }) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text accessibilityRole='alert' accessibilityLiveRegion='polite' style={styles.message}>
        Erro: {message}
      </Text>

      {onRetry ? <Button title={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 12,
    backgroundColor: colors.blueSoft,
  },

  message: {
    fontSize: 14,
    color: colors.blue,
  },
});
