import React from 'react';
import { Pressable, Text } from 'react-native';
import buttonStyles, { getButtonVariantStyles } from '../styles/buttons';
import { useResponsive } from '../styles/responsive';

export default function Button({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'lg',
  fullWidth,
  leftIcon = null,
  rightIcon = null,
  style,
  textStyle,
  accessibilityLabel,
}) {
  const screen = useResponsive();
  const variantStyles = getButtonVariantStyles(variant, size);
  const shouldStretch = fullWidth ?? variant !== 'link';
  const height = size === 'lg' ? (variant === 'secondary' ? 54 : variant === 'outline' ? 58 : 56) : 48;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        buttonStyles.base,
        variantStyles.container,
        size !== 'lg' && variantStyles.sizeStyle,
        { minHeight: screen.scaleSize(height, { min: 48, max: height + 4 }) },
        shouldStretch && buttonStyles.fullWidth,
        pressed && !disabled && buttonStyles.pressed,
        disabled && variantStyles.disabledContainer,
        style,
      ]}
    >
      {leftIcon}
      <Text
        style={[
          variantStyles.text,
          { flexShrink: 1 },
          disabled && variantStyles.disabledText,
          textStyle,
        ]}
      >
        {title}
      </Text>
      {rightIcon}
    </Pressable>
  );
}
