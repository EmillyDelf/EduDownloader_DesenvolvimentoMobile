import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import colors from '../styles/colors';
import styles from '../styles/inputStyles';

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
  variant = 'default',
  leftIcon,
  rightActionLabel,
  onRightAction,
  helperText,
  style,
  inputStyle,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const hasRightAction = Boolean(rightActionLabel && typeof onRightAction === 'function');
  const hasDecorators = Boolean(leftIcon || hasRightAction);

  const textInputElement = (
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
      accessibilityHint={error || helperText || undefined}
      accessibilityState={{ disabled: !editable }}
      placeholderTextColor={variant === 'default' ? colors.textSecondary : colors.textPlaceholder}
      style={[
        styles.input,
        variant === 'url' && styles.inputUrl,
        variant === 'search' && styles.inputSearch,
        leftIcon && styles.inputWithLeftIcon,
        hasRightAction && styles.inputWithRightAction,
        isFocused && editable && styles.inputFocused,
        error && styles.inputError,
        !editable && styles.inputDisabled,
        inputStyle,
      ]}
    />
  );

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={variant === 'url' ? styles.labelUrl : styles.label}>
          {label}
        </Text>
      ) : null}

      {hasDecorators ? (
        <View style={styles.fieldWrapper}>
          {leftIcon ? <View style={styles.leftIconSlot}>{leftIcon}</View> : null}
          {textInputElement}
          {hasRightAction ? (
            <Pressable
              onPress={onRightAction}
              disabled={!editable}
              accessibilityRole='button'
              accessibilityLabel={rightActionLabel}
              style={({ pressed }) => [
                styles.rightActionSlot,
                pressed && editable && styles.rightActionPressed,
              ]}
            >
              <Text style={styles.rightActionText}>{rightActionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        textInputElement
      )}

      {helperText && !error ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {error ? (
        <Text accessibilityRole='alert' style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
