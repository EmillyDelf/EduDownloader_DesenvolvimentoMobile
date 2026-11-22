import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import colors from '../styles/colors';
import inputStyles from '../styles/inputs';

export default function Input({
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  secureTextEntry = false,
  label,
  error,
  variant = 'default',
  leftIcon = null,
  rightActionLabel,
  onRightAction,
  containerStyle,
  inputStyle,
  fieldStyle,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isSearch = variant === 'search';
  const isAccent = variant === 'accent';
  const hasAddons = Boolean(leftIcon || rightActionLabel);

  const variantStyle = isSearch ? inputStyles.search : isAccent ? inputStyles.accent : null;
  const stateStyles = [
    isFocused && editable && inputStyles.focused,
    error && inputStyles.error,
    !editable && inputStyles.disabled,
  ];

  const textInputProps = {
    value,
    onChangeText,
    placeholder,
    editable,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    secureTextEntry,
    ...(secureTextEntry ? { autoComplete: 'off', textContentType: 'none', importantForAutofill: 'no' } : {}),
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    accessibilityLabel: label || placeholder,
    accessibilityHint: error || undefined,
    accessibilityState: { disabled: !editable },
    placeholderTextColor: colors.textPlaceholder,
  };

  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label ? <Text style={[inputStyles.label, isAccent && inputStyles.labelAccent]}>{label}</Text> : null}

      {hasAddons ? (
        <View style={[inputStyles.fieldWrapper, variantStyle, fieldStyle, ...stateStyles]}>
          {leftIcon}
          <TextInput
            {...textInputProps}
            style={[
              inputStyles.inlineInput,
              isSearch && inputStyles.searchInline,
              !editable && inputStyles.disabledText,
              inputStyle,
            ]}
          />
          {rightActionLabel ? (
            <Pressable
              onPress={onRightAction}
              disabled={!editable || typeof onRightAction !== 'function'}
              accessibilityRole='button'
              accessibilityLabel={rightActionLabel}
              accessibilityState={{ disabled: !editable || typeof onRightAction !== 'function' }}
              style={({ pressed }) => [
                inputStyles.rightAction,
                pressed && editable && typeof onRightAction === 'function' && inputStyles.rightActionPressed,
              ]}
            >
              <Text style={inputStyles.rightActionText}>{rightActionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <TextInput
          {...textInputProps}
          style={[inputStyles.input, variantStyle, fieldStyle, ...stateStyles, inputStyle]}
        />
      )}

      {error ? (
        <Text accessibilityRole='alert' style={inputStyles.errorText}>
          Erro: {error}
        </Text>
      ) : null}
    </View>
  );
}
