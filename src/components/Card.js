import React from 'react';
import { Pressable, View } from 'react-native';
import { cardStyles, getCardVariantStyles } from '../styles/cards';
import { useResponsive } from '../styles/responsive';

export default function Card({
  children,
  onPress,
  disabled = false,
  accessibilityLabel,
  variant = 'default',
  selected = false,
  style,
}) {
  const screen = useResponsive();
  const variantStyles = getCardVariantStyles(variant, selected);
  const responsiveStyle = variant === 'soft'
    ? { minHeight: screen.scaleSize(130, { min: 112, max: 142 }) }
    : null;

  if (!onPress) {
    return <View style={[...variantStyles, responsiveStyle, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        ...variantStyles,
        responsiveStyle,
        cardStyles.interactive,
        pressed && !disabled && cardStyles.pressed,
        disabled && cardStyles.disabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
