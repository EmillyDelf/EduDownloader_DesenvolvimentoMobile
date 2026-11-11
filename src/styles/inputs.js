import { StyleSheet } from 'react-native';
import colors from './colors';
import typography, { fontFamilies, fontSizes, fontWeights } from './typography';
import { radii, sizes, spacing } from './spacing';

const inputStyles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing.sm,
  },

  label: {
    ...typography.overline,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },

  labelAccent: {
    color: colors.labelAccent,
  },

  input: {
    minHeight: sizes.inputHeight,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.white,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    color: colors.textHeading,
  },

  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.inputHeight,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.white,
  },

  inlineInput: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.inputHeight - 2,
    paddingVertical: 14,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    color: colors.textHeading,
  },

  search: {
    minHeight: sizes.searchHeight,
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
  },

  accent: {
    borderColor: colors.borderAccent,
  },

  searchInline: {
    minHeight: sizes.searchHeight - 2,
  },

  focused: {
    borderColor: colors.primary,
  },

  error: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.errorSoft,
  },

  disabled: {
    backgroundColor: colors.surfaceSoft,
    color: colors.disabledText,
  },

  disabledText: {
    color: colors.disabledText,
  },

  rightAction: {
    minHeight: sizes.minTouchTarget,
    minWidth: sizes.minTouchTarget,
    maxWidth: '45%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },

  rightActionPressed: {
    opacity: 0.85,
  },

  rightActionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semiBold,
    color: colors.primaryDark,
  },

  errorText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semiBold,
    color: colors.error,
  },
});

export default inputStyles;
