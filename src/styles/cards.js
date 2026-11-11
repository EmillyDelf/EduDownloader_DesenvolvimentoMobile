import { StyleSheet } from 'react-native';
import colors from './colors';
import typography, { fontFamilies, fontWeights } from './typography';
import { scaleSize } from './responsive';
import { radii, sizes, spacing } from './spacing';

function makeCircleStyle(size, backgroundColor, radius = size / 2) {
  return {
    width: size,
    height: size,
    borderRadius: radius,
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export const cardStyles = StyleSheet.create({
  base: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.cardLg,
    backgroundColor: colors.white,
  },

  soft: {
    minHeight: scaleSize(130, { min: 112, max: 142 }),
    padding: spacing.xl,
    borderRadius: radii.button,
    borderColor: colors.cardActionBorder,
    backgroundColor: colors.surfaceAction,
    justifyContent: 'center',
  },

  selectable: {
    borderRadius: radii.card,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  formatOption: {
    borderRadius: radii.cardLg,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  selected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },

  summary: {
    borderRadius: radii.card,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },

  dashed: {
    padding: spacing.xxl,
    borderRadius: radii.preview,
    borderStyle: 'dashed',
    borderColor: colors.accentBlue,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listAlt: {
    borderWidth: 0,
    borderRadius: radii.cardLg,
    backgroundColor: colors.surfaceCardAlt,
  },

  historyItem: {
    borderWidth: 0,
    borderRadius: radii.cardLg,
    backgroundColor: colors.surfaceSoft,
  },

  profileHighlight: {
    borderWidth: 0,
    borderRadius: radii.preview,
    backgroundColor: colors.surfaceHighlight,
  },

  infoBanner: {
    borderWidth: 0,
    borderRadius: radii.card,
    backgroundColor: colors.infoBlueSoft,
  },

  mediaPreview: {
    borderWidth: 0,
    borderRadius: radii.preview,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },

  mediaPreviewBanner: {
    height: scaleSize(132, { min: 112, max: 148 }),
    borderRadius: radii.preview,
    backgroundColor: colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  interactive: {
    minHeight: sizes.minTouchTarget,
  },

  pressed: {
    opacity: 0.85,
    backgroundColor: colors.surfaceHighlight,
  },

  disabled: {
    opacity: 0.5,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.button,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircle: makeCircleStyle(sizes.iconCircle, colors.surfaceHighlight),

  uploadIconBox: makeCircleStyle(sizes.uploadIconBox, colors.surfaceHighlight, radii.circleIcon),

  badgeIconCircle: makeCircleStyle(sizes.badgeIconCircle, colors.surfaceSuccess, radii.round),

  infoBadgeCircle: makeCircleStyle(sizes.badgeIconCircle, colors.successSoft, radii.round),

  actionCircle: makeCircleStyle(sizes.actionCircle, colors.surfaceHighlight, radii.round),

  actionCircleSuccess: makeCircleStyle(38, colors.surfaceSuccess, 19),

  optionIconCircle: makeCircleStyle(sizes.actionCircle, colors.white, radii.round),

  optionIconCircleMuted: makeCircleStyle(sizes.actionCircle, colors.surfaceIconMuted, radii.round),

  successCircle: makeCircleStyle(sizes.successCircle, colors.surfaceSuccess),

  avatarCircle: makeCircleStyle(sizes.avatarCircle, colors.primary),

  thumbnailBox: {
    width: sizes.thumbnailWidth,
    height: sizes.thumbnailHeight,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceThumb,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  playCircle: makeCircleStyle(sizes.playCircle, colors.white),

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: colors.primary,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  badgeSuccess: {
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radii.badge,
    backgroundColor: colors.surfaceSuccess,
    alignSelf: 'flex-start',
  },

  badgeSuccessText: {
    ...typography.micro,
    fontFamily: fontFamilies.semiBold,
    fontWeight: fontWeights.semiBold,
    color: colors.successDark,
  },

  orderBadge: {
    width: sizes.orderBadge,
    height: sizes.orderBadge,
    borderRadius: radii.orderBadge,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  orderBadgeText: {
    ...typography.micro,
    fontFamily: fontFamilies.bold,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },

  title: {
    ...typography.cardTitleLg,
    color: colors.textHeading,
  },

  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

const CARD_VARIANT_MAP = {
  default: null,
  soft: cardStyles.soft,
  selectable: cardStyles.selectable,
  formatOption: cardStyles.formatOption,
  summary: cardStyles.summary,
  dashed: cardStyles.dashed,
  listAlt: cardStyles.listAlt,
  historyItem: cardStyles.historyItem,
  profileHighlight: cardStyles.profileHighlight,
  infoBanner: cardStyles.infoBanner,
  mediaPreview: cardStyles.mediaPreview,
};

export function getCardVariantStyles(variant = 'default', selected = false) {
  return [
    cardStyles.base,
    CARD_VARIANT_MAP[variant] || null,
    selected && cardStyles.selected,
  ];
}

export const feedbackStyles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },

  loadingMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  progressContainer: {
    gap: spacing.sm,
  },

  progressTrack: {
    height: sizes.progressHeight,
    borderRadius: radii.pillTrack,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: radii.pillTrack,
    backgroundColor: colors.lime,
  },

  progressPercentage: {
    ...typography.buttonLabelSm,
    color: colors.textHeading,
    textAlign: 'right',
  },

  progressRing: {
    width: sizes.progressCircle,
    height: sizes.progressCircle,
    borderRadius: sizes.progressCircle / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorContainer: {
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radii.card,
    backgroundColor: colors.errorSoft,
  },

  errorMessage: {
    ...typography.body,
    fontFamily: fontFamilies.semiBold,
    fontWeight: fontWeights.semiBold,
    color: colors.error,
  },

  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.overlay,
  },

  dialogSurface: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: radii.cardLg,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },

  dialogContent: {
    padding: spacing.xxl,
    gap: spacing.lg,
  },

  dialogTitle: {
    ...typography.sectionTitle,
    color: colors.textHeading,
  },

  dialogDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },

  dialogActions: {
    gap: spacing.md,
  },
});

export default {
  cardStyles,
  getCardVariantStyles,
  feedbackStyles,
};
