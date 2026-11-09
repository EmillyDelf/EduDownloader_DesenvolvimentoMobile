import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

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
        placeholderTextColor='#64748B'
        style={[
          styles.input,
          isFocused && editable && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
        ]}
      />

      {error ? (
        <Text accessibilityRole='alert' style={styles.errorText}>
          {error}
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
    color: '#64748B',
  },

  input: {
    minHeight: 58,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#0D355D',
  },

  inputFocused: {
    borderColor: '#0F519D',
  },

  inputError: {
    borderColor: '#B42318',
  },

  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#64748B',
  },

  errorText: {
    fontSize: 14,
    color: '#B42318',
  },
});
