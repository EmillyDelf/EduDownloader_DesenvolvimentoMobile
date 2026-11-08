import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingIndicator({ size = 'large', message = 'Carregando...' }) {
  return (
    <View
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={message || 'Carregando'}
      accessibilityState={{ busy: true }}
      style={styles.container}
    >
      <ActivityIndicator size={size} color='#0F519D' accessible={false} />

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },

  message: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
  },
});
