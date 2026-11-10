import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import colors from './colors';

export default function Input({
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  label,
  error,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessibilityLabel={label || placeholder}
        accessibilityHint={error || undefined}
        accessibilityState={{ disabled: !editable }}
        placeholderTextColor={colors.blueMuted}
        style={[
          styles.input,
          isFocused && editable && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      />

      {error ? (
        <Text accessibilityRole='alert' style={styles.errorText}>
          Erro: {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
  },

  input: {
    minHeight: 58,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 12,
    backgroundColor: colors.white,
    fontSize: 14,
    color: colors.blue,
  },

  inputFocused: {
    borderColor: colors.blue,
  },

  inputError: {
    borderColor: colors.blue,
    borderWidth: 2,
    backgroundColor: colors.blueSoft,
  },

  inputDisabled: {
    backgroundColor: colors.blueSoft,
    color: colors.blueDisabled,
  },

  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue,
  },
});
