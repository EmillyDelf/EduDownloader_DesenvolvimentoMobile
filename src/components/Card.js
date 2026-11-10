import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import colors from './colors';

export default function Card({ children, onPress, disabled = false, accessibilityLabel }) {
  if (!onPress) {
    return <View style={styles.card}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.card,
        styles.interactiveCard,
        pressed && !disabled && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 14,
    backgroundColor: colors.white,
  },

  interactiveCard: {
    minHeight: 48,
  },

  cardPressed: {
    opacity: 0.8,
    backgroundColor: colors.blueSoft,
  },

  cardDisabled: {
    opacity: 0.5,
  },
});
