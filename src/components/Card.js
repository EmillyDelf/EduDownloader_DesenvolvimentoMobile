import React from 'react';
import { View, Pressable } from 'react-native';
import { useResponsive } from '../styles/responsive';
import styles from '../styles/cardComponentStyles';

const VARIANT_STYLE_MAP = {
  default: styles.card,
  feature: styles.cardFeature,
  featurePrimary: styles.cardFeaturePrimary,
  selectable: styles.cardSelectable,
  selectableFormat: styles.cardSelectableFormat,
  download: styles.cardDownload,
  history: styles.cardHistory,
  settings: styles.cardSettings,
  profile: styles.cardProfile,
  dropzone: styles.cardDropzone,
  preview: styles.cardPreview,
};

export default function Card({
  children,
  onPress,
  disabled = false,
  accessibilityLabel,
  variant = 'default',
  selected = false,
  style,
}) {
  const { isSmallScreen } = useResponsive();
  const variantStyle = VARIANT_STYLE_MAP[variant] || styles.card;
  const shouldCompact = isSmallScreen && variant !== 'preview';
  const composedStaticStyle =
    variant === 'default' && !selected && !shouldCompact && !style
      ? styles.card
      : [
          styles.card,
          variantStyle,
          shouldCompact && styles.cardCompact,
          selected && styles.cardSelected,
          style,
        ];

  if (!onPress) {
    return <View style={composedStaticStyle}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected ? { disabled, selected } : { disabled }}
      style={({ pressed }) => [
        styles.card,
        variant !== 'default' && variantStyle,
        shouldCompact && styles.cardCompact,
        selected && styles.cardSelected,
        styles.interactiveCard,
        pressed && !disabled && styles.cardPressed,
        disabled && styles.cardDisabled,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
