import { StyleSheet } from 'react-native';
import colors from './colors';
import typography, { fontFamilies, fontWeights } from './typography';
import { radii, sizes, spacing } from './spacing';

const buttonStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minWidth: sizes.minTouchTarget,
    minHeight: sizes.buttonHeight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.button,
  },

  fullWidth: {
    width: '100%',
  },

  sizeLg: {
    paddingHorizontal: spacing.xl,
  },

  sizeMd: {
    minHeight: sizes.buttonCompactHeight,
    minWidth: 184,
    paddingHorizontal: spacing.xl,
  },

  sizeSm: {
    minHeight: sizes.minTouchTarget,
    minWidth: sizes.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  primary: {
    backgroundColor: colors.primary,
  },

  primaryText: {
    ...typography.buttonLabel,
    color: colors.white,
  },

  primaryDisabled: {
    backgroundColor: colors.disabledBg,
  },

  primaryTextDisabled: {
    color: colors.disabledText,
  },

  secondary: {
    minHeight: sizes.buttonSecondaryHeight,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  secondaryText: {
    ...typography.buttonLabelSm,
    color: colors.textSecondary,
  },

  outline: {
    minHeight: sizes.inputHeight,
    borderRadius: radii.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  outlineText: {
    ...typography.buttonLabelSm,
    color: colors.primary,
  },

  link: {
    minHeight: sizes.minTouchTarget,
    backgroundColor: colors.transparent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },

  linkText: {
    ...typography.link,
    color: colors.black,
  },

  pressed: {
    opacity: 0.85,
  },

  disabledSubtle: {
    opacity: 0.5,
  },

  chip: {
    minHeight: sizes.minTouchTarget,
    minWidth: 56,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  chipTextActive: {
    ...typography.caption,
    fontFamily: fontFamilies.semiBold,
    fontWeight: fontWeights.semiBold,
    color: colors.lime,
  },
});

const VARIANT_MAP = {
  primary: {
    container: buttonStyles.primary,
    text: buttonStyles.primaryText,
    disabledContainer: buttonStyles.primaryDisabled,
    disabledText: buttonStyles.primaryTextDisabled,
  },
  secondary: {
    container: buttonStyles.secondary,
    text: buttonStyles.secondaryText,
    disabledContainer: buttonStyles.disabledSubtle,
    disabledText: buttonStyles.primaryTextDisabled,
  },
  outline: {
    container: buttonStyles.outline,
    text: buttonStyles.outlineText,
    disabledContainer: buttonStyles.disabledSubtle,
    disabledText: buttonStyles.primaryTextDisabled,
  },
  link: {
    container: buttonStyles.link,
    text: buttonStyles.linkText,
    disabledContainer: buttonStyles.disabledSubtle,
    disabledText: buttonStyles.primaryTextDisabled,
  },
};

const SIZE_MAP = {
  lg: buttonStyles.sizeLg,
  md: buttonStyles.sizeMd,
  sm: buttonStyles.sizeSm,
};

export function getButtonVariantStyles(variant = 'primary', size = 'lg') {
  const resolvedVariant = VARIANT_MAP[variant] || VARIANT_MAP.primary;
  const resolvedSize = variant === 'link' ? null : (SIZE_MAP[size] || SIZE_MAP.lg);
  return {
    ...resolvedVariant,
    sizeStyle: resolvedSize,
  };
}

export default buttonStyles;
