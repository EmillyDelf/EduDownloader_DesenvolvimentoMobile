import React from 'react';
import { Pressable, Text } from 'react-native';
import { useResponsive } from '../styles/responsive';
import styles from '../styles/buttonStyles';

const VARIANT_CONTAINER_MAP = {
  primary: styles.primary,
  success: styles.success,
  secondary: styles.secondary,
  outline: styles.outline,
  cancel: styles.cancel,
  link: styles.link,
  inline: styles.inline,
  chip: styles.chip,
  icon: styles.icon,
  iconBlue: styles.iconBlue,
};

const VARIANT_TEXT_MAP = {
  primary: styles.primaryText,
  success: styles.successText,
  secondary: styles.secondaryText,
  outline: styles.outlineText,
  cancel: styles.cancelText,
  link: styles.linkText,
  inline: styles.inlineText,
  chip: styles.chipText,
};

const SIZE_STYLE_MAP = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export default function Button({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'md',
  selected = false,
  leftIcon,
  rightIcon,
  children,
  accessibilityLabel,
  style,
  textStyle,
}) {
  const { isSmallScreen } = useResponsive();
  const variantContainerStyle = VARIANT_CONTAINER_MAP[variant] || styles.primary;
  const variantTextStyle = VARIANT_TEXT_MAP[variant] || styles.buttonText;
  const sizeStyle = variant === 'primary' || variant === 'secondary' || variant === 'success'
    ? SIZE_STYLE_MAP[size]
    : null;
  const compactSizeStyle = isSmallScreen
    ? variant === 'outline'
      ? styles.outlineCompact
      : variant === 'cancel'
        ? styles.cancelCompact
        : sizeStyle
          ? size === 'lg'
            ? styles.sizeLgCompact
            : size === 'sm'
              ? styles.sizeSmCompact
              : styles.sizeMdCompact
          : null
    : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={selected ? { disabled, selected } : { disabled }}
      style={({ pressed }) => [
        styles.button,
        sizeStyle,
        variantContainerStyle,
        compactSizeStyle,
        variant === 'chip' && selected && styles.chipSelected,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {leftIcon || null}
      {title !== undefined && title !== null ? (
        <Text
          style={[
            styles.buttonText,
            variantTextStyle,
            variant === 'chip' && selected && styles.chipTextSelected,
            disabled && styles.buttonTextDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
      ) : null}
      {children || null}
      {rightIcon || null}
    </Pressable>
  );
}
