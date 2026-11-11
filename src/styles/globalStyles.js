import { StyleSheet } from 'react-native';
import colors from './colors';
import typography from './typography';
import { spacing } from './spacing';
import { getHorizontalPadding, getScreenMetrics, getWindowSize } from './responsive';

const FIGMA_GUTTER_BY_VARIANT = {
  flow: 43,
  main: 50,
};

export function getResponsiveContentStyle(width = getWindowSize().width, variant = 'default') {
  const { isTablet, contentMaxWidth } = getScreenMetrics(width);
  if (isTablet) {
    return {
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: 24,
    };
  }

  const figmaGutter = FIGMA_GUTTER_BY_VARIANT[variant];
  if (figmaGutter && width >= 440) {
    return {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingHorizontal: figmaGutter,
    };
  }

  return {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: getHorizontalPadding(width),
  };
}

const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    width: '100%',
    maxWidth: spacing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xl,
    gap: spacing.sectionGap,
  },
  centeredContainer: {
    flex: 1,
    width: '100%',
    maxWidth: spacing.maxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.itemGap,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  sectionLabel: {
    ...typography.overline,
    textTransform: 'uppercase',
  },
  pageHeaderBlock: {
    gap: spacing.xs,
  },
  pageTitle: {
    ...typography.pageTitle,
  },
  pageSubtitle: {
    ...typography.body,
  },
  helperText: {
    ...typography.caption,
    color: colors.textPlaceholder,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: colors.border,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.overlay,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default globalStyles;
