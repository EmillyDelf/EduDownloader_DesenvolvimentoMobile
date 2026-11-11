import { StyleSheet } from 'react-native';
import colors from './colors';
import typography, { fontFamilies, fontSizes, fontWeights } from './typography';
import { getHeroHorizontalPadding } from './responsive';
import { radii, sizes, spacing } from './spacing';

export const headerStyles = StyleSheet.create({
  compact: {
    minHeight: sizes.headerCompactHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },

  compactInfo: {
    borderBottomColor: colors.borderInfo,
  },

  accentWrapper: {
    backgroundColor: colors.surfaceHeaderAccent,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardActionBorder,
  },

  accentBar: {
    height: 4,
    width: '100%',
    flexDirection: 'row',
  },

  accentBarPrimary: {
    flex: 4,
    backgroundColor: colors.primary,
  },

  accentBarSuccess: {
    flex: 1,
    backgroundColor: colors.success,
  },

  compactRow: {
    minHeight: sizes.headerCompactHeight - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  title: {
    ...typography.headerTitle,
    flex: 1,
    color: colors.textPrimary,
  },

  titleAccent: {
    ...typography.headerTitle,
    flex: 1,
    color: colors.primaryDark,
  },

  action: {
    minHeight: sizes.minTouchTarget,
    minWidth: sizes.minTouchTarget,
    maxWidth: '30%',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },

  actionPressed: {
    opacity: 0.85,
  },

  actionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semiBold,
    color: colors.primary,
    textAlign: 'center',
  },

  actionTextOnDark: {
    color: colors.white,
  },

  hero: {
    minHeight: sizes.headerHeroMinHeight,
    backgroundColor: colors.primary,
    paddingHorizontal: getHeroHorizontalPadding(),
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  heroContent: {
    gap: spacing.xs,
  },

  heroContentHome: {
    paddingHorizontal: 10,
  },

  heroTitle: {
    ...typography.heroTitle,
    color: colors.white,
  },

  heroSubtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.92,
  },

  logo: {
    width: sizes.logoHeader,
    height: sizes.logoHeader,
  },
});

export const bottomNavigationStyles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  safeAreaHome: {
    backgroundColor: colors.navSoftTint,
  },

  navigation: {
    flexDirection: 'row',
  },

  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.bottomNavHeight,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: 18,
    paddingHorizontal: 2,
    gap: 7,
  },

  tabPressed: {
    opacity: 0.85,
  },

  tabSelected: {
    backgroundColor: colors.primary,
  },

  icon: {
    width: sizes.navIcon,
    height: sizes.navIcon,
  },

  label: {
    ...typography.tabLabel,
    alignSelf: 'stretch',
    color: colors.textSecondary,
  },

  labelSelected: {
    ...typography.tabLabelActive,
    alignSelf: 'stretch',
    color: colors.success,
  },
});

export default {
  headerStyles,
  bottomNavigationStyles,
};
