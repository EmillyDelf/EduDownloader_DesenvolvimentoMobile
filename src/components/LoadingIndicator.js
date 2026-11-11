import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import colors from '../styles/colors';
import { feedbackStyles } from '../styles/cards';

export default function LoadingIndicator({ size = 'large', message = 'Carregando...', style }) {
  return (
    <View
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={message || 'Carregando'}
      accessibilityState={{ busy: true }}
      style={[feedbackStyles.loadingContainer, style]}
    >
      <ActivityIndicator size={size} color={colors.primary} accessible={false} />

      {message ? <Text style={feedbackStyles.loadingMessage}>{message}</Text> : null}
    </View>
  );
}
