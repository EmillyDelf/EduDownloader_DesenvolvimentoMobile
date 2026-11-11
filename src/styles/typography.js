import { StyleSheet } from 'react-native';
import colors from './colors';
import { scaleFont } from './responsive';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  brandRegular: 'Montserrat_400Regular',
  brandSemiBold: 'Montserrat_600SemiBold',
  brandBold: 'Montserrat_700Bold',
};

export const fontSizes = {
  xs: scaleFont(11, { min: 10, max: 13 }),
  sm: scaleFont(12, { min: 11, max: 14 }),
  md: scaleFont(13, { min: 12, max: 15 }),
  base: scaleFont(14, { min: 13, max: 16 }),
  subhead: scaleFont(15, { min: 14, max: 17 }),
  lg: scaleFont(16, { min: 14, max: 18 }),
  title: scaleFont(18, { min: 16, max: 20 }),
  h3: scaleFont(20, { min: 18, max: 22 }),
  avatar: scaleFont(22, { min: 18, max: 24 }),
  h2: scaleFont(24, { min: 20, max: 28 }),
  h1: scaleFont(28, { min: 24, max: 32 }),
  display: scaleFont(30, { min: 24, max: 34 }),
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

export const lineHeights = {
  xs: scaleFont(15, { min: 14, max: 18 }),
  sm: scaleFont(16, { min: 15, max: 19 }),
  md: scaleFont(18, { min: 16, max: 21 }),
  base: scaleFont(20, { min: 18, max: 24 }),
  subhead: scaleFont(22, { min: 20, max: 25 }),
  lg: scaleFont(24, { min: 21, max: 27 }),
  title: scaleFont(24, { min: 21, max: 27 }),
  h3: scaleFont(28, { min: 24, max: 32 }),
  h2: scaleFont(32, { min: 26, max: 36 }),
  h1: scaleFont(34, { min: 28, max: 38 }),
};

const typography = StyleSheet.create({
  display: {
    fontFamily: fontFamilies.brandRegular,
    fontSize: fontSizes.display,
    fontWeight: fontWeights.regular,
    color: colors.textPrimary,
  },
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h1,
    lineHeight: lineHeights.h1,
    fontWeight: fontWeights.bold,
    color: colors.textHeading,
  },
  heroTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.h2,
    lineHeight: lineHeights.h2,
    fontWeight: fontWeights.semiBold,
    color: colors.white,
  },
  pageTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.h2,
    lineHeight: lineHeights.h2,
    fontWeight: fontWeights.semiBold,
    color: colors.textHeading,
  },
  sectionTitle: {
    fontFamily: fontFamilies.brandSemiBold,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
    fontWeight: fontWeights.semiBold,
    color: colors.textHeading,
  },
  headerTitle: {
    fontFamily: fontFamilies.brandSemiBold,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
    fontWeight: fontWeights.semiBold,
    color: colors.textPrimary,
  },
  statusTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.h3,
    lineHeight: lineHeights.h3,
    fontWeight: fontWeights.medium,
    color: colors.black,
  },
  cardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.subhead,
    lineHeight: lineHeights.subhead,
    fontWeight: fontWeights.semiBold,
    color: colors.textHeading,
  },
  cardTitleLg: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.semiBold,
    color: colors.textHeading,
  },
  cardTitleCompact: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semiBold,
    color: colors.textHeading,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  bodySm: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  micro: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
  },
  overline: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.semiBold,
    color: colors.textSecondary,
  },
  buttonLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.subhead,
    lineHeight: lineHeights.subhead,
    fontWeight: fontWeights.semiBold,
    color: colors.white,
    textAlign: 'center',
  },
  buttonLabelSm: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semiBold,
    textAlign: 'center',
  },
  link: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.subhead,
    lineHeight: lineHeights.subhead,
    fontWeight: fontWeights.semiBold,
    color: colors.black,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  tabLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabLabelActive: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semiBold,
    color: colors.success,
    textAlign: 'center',
  },
  metric: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.h2,
    lineHeight: lineHeights.h2,
    fontWeight: fontWeights.semiBold,
    letterSpacing: -1.2,
    color: colors.black,
  },
});

export default typography;
