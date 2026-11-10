import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import colors from './colors';

export default function Header({ title, onBack, rightActionLabel, onRightAction }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole='button'
          accessibilityLabel='Voltar'
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>Voltar</Text>
        </Pressable>
      ) : null}

      <Text accessibilityRole='header' style={styles.title}>
        {title}
      </Text>

      {rightActionLabel && onRightAction ? (
        <Pressable
          onPress={onRightAction}
          accessibilityRole='button'
          accessibilityLabel={rightActionLabel}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{rightActionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.blueBorder,
    backgroundColor: colors.white,
  },

  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.blue,
  },

  action: {
    minHeight: 48,
    minWidth: 48,
    maxWidth: '30%',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  actionPressed: {
    opacity: 0.7,
  },

  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue,
    textAlign: 'center',
  },
});
