import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import colors from '../styles/colors';
import styles from '../styles/cardComponentStyles';

export default function LoadingIndicator({ size = 'large', message = 'Carregando...' }) {
  return (
    <View
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={message || 'Carregando'}
      accessibilityState={{ busy: true }}
      style={styles.loadingContainer}
    >
      <ActivityIndicator size={size} color={colors.primary} accessible={false} />

      {message ? <Text style={styles.loadingMessage}>{message}</Text> : null}
    </View>
  );
}
