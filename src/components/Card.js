import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

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
    borderColor: '#E5EAF0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },

  interactiveCard: {
    minHeight: 48,
  },

  cardPressed: {
    opacity: 0.8,
  },

  cardDisabled: {
    opacity: 0.5,
  },
});
