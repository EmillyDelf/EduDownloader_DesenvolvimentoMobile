import { StyleSheet } from 'react-native';
import colors from './colors';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  montserratRegular: 'Montserrat_400Regular',
  montserratSemiBold: 'Montserrat_600SemiBold',
  montserratBold: 'Montserrat_700Bold',
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

export const fontSizes = {
  xs: 10,
  sm: 11,
  caption: 12,
  item: 13,
  body: 14,
  button: 15,
  subtitle: 16,
  title: 18,
  status: 20,
  avatar: 22,
  heading: 24,
  hero: 28,
  display: 30,
};

export const lineHeights = {
  xs: 12,
  sm: 13,
  caption: 15,
  item: 16,
  bodyTight: 17,
  button: 18,
  subtitle: 19,
  body: 20,
  title: 22,
  link: 24,
  avatar: 27,
  status: 28,
  heading: 29,
  progress: 32,
  hero: 34,
};

export const textVariants = StyleSheet.create({
  heroSuccessTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.hero,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.hero,
    color: colors.textDark,
    textAlign: 'center',
  },

  heroBannerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.heading,
    color: colors.textInverse,
  },

  heroBannerSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    color: colors.textInverse,
  },

  screenTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.heading,
    color: colors.textDark,
  },

  screenTitleCentered: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.heading,
    color: colors.textDark,
    textAlign: 'center',
  },

  screenSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    color: colors.textSecondary,
  },

  screenSubtitleCentered: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  progressPercentage: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.progress,
    color: colors.textBlack,
  },

  loadingStatusTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.status,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.status,
    color: colors.textBlack,
    textAlign: 'center',
  },

  loadingStatusSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    color: colors.textLoading,
    textAlign: 'center',
  },

  dialogTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.status,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },

  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.title,
    color: colors.textPrimary,
  },

  featureCardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.title,
    color: colors.primaryDark,
  },

  sectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.title,
    color: colors.textDark,
  },

  profileName: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.subtitle,
    color: colors.textDark,
  },

  optionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.button,
    color: colors.textDark,
  },

  optionTitleSelected: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.button,
    color: colors.primary,
  },

  buttonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.button,
    color: colors.textInverse,
    textAlign: 'center',
  },

  linkText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.link,
    color: colors.textBlack,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    color: colors.textSecondary,
  },

  bodyStrong: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.bodyTight,
    color: colors.textDark,
  },

  listItemTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.item,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.item,
    color: colors.textDark,
  },

  overline: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },

  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.caption,
    color: colors.textSecondary,
  },

  captionStrong: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.caption,
    color: colors.primary,
  },

  metadata: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.sm,
    color: colors.textPlaceholder,
  },

  badgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.sm,
    color: colors.successText,
    textAlign: 'center',
  },

  fileBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.bodyTight,
    color: colors.primary,
    textAlign: 'center',
  },

  statusPillText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.xs,
    color: colors.successText,
    textAlign: 'center',
  },
});

const typography = {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  textVariants,
};

export default typography;
