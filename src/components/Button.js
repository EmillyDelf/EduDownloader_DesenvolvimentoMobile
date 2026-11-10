import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import colors from './colors';

export default function Button({ title, onPress, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.blue,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
});
