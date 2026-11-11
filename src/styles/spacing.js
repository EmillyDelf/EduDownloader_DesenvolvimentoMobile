import { getHeroHorizontalPadding, getHorizontalPadding, scaleSize } from './responsive';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPadding: getHorizontalPadding(),
  heroPadding: getHeroHorizontalPadding(),
  sectionGap: scaleSize(24, { min: 16, max: 28 }),
  itemGap: scaleSize(12, { min: 8, max: 16 }),
  maxContentWidth: 560,
  flowContentWidth: 354,
  mainContentWidth: 340,
};

export const radii = {
  pillTrack: 3,
  sm: 8,
  button: 10,
  badge: 11,
  card: 12,
  cardLg: 14,
  orderBadge: 14,
  preview: 16,
  chip: 18,
  round: 20,
  circleIcon: 28,
};

export const sizes = {
  minTouchTarget: 48,
  buttonHeight: scaleSize(56, { min: 48, max: 60 }),
  buttonSecondaryHeight: scaleSize(54, { min: 48, max: 58 }),
  buttonCompactHeight: 48,
  inputHeight: scaleSize(58, { min: 52, max: 62 }),
  searchHeight: scaleSize(52, { min: 48, max: 56 }),
  headerCompactHeight: scaleSize(74, { min: 64, max: 80 }),
  headerHeroMinHeight: scaleSize(200, { min: 168, max: 210 }),
  bottomNavHeight: 70,
  navIcon: 22,
  progressHeight: 6,
  progressCircle: scaleSize(128, { min: 104, max: 140 }),
  logoHeader: scaleSize(55, { min: 44, max: 60 }),
  orderBadge: 28,
  badgeIconCircle: 40,
  actionCircle: 40,
  iconCircle: 52,
  uploadIconBox: 56,
  playCircle: 64,
  avatarCircle: 72,
  successCircle: 96,
  thumbnailWidth: scaleSize(169, { min: 140, max: 190 }),
  thumbnailHeight: scaleSize(116, { min: 96, max: 132 }),
};

export default {
  spacing,
  radii,
  sizes,
};
