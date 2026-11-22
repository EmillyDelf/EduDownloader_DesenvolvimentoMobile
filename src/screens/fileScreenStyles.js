import { StyleSheet } from 'react-native';
import { colors, fontFamilies, typography, spacing, radii, cardStyles } from '../styles';

export default StyleSheet.create({
  hero: {
    paddingTop: 6,
    paddingBottom: 39,
    paddingHorizontal: 0,
  },
  heroContent: {
    gap: 3,
  },
  librarySafeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  logo: {
    width: 55,
    height: 55,
    marginRight: 9,
  },
  list: {
    flex: 1,
  },
  listSurface: {
    backgroundColor: colors.white,
  },
  content: {
    paddingTop: 24,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  listHeader: {
    gap: 16,
    paddingBottom: 12,
  },
  heading: {
    ...typography.sectionTitle,
    fontFamily: fontFamilies.semiBold,
    marginTop: 10,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filter: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: colors.disabledPrimaryBg,
  },
  filterActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceUploadCircle,
  },
  filterText: {
    color: colors.textMuted72,
  },
  filterTextActive: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    borderRadius: 14,
    gap: 8,
  },
  downloadCard: {
    backgroundColor: colors.surfaceMuted,
    minHeight: 75,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyCard: {
    minHeight: 88,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  historyRow: {
    gap: 16,
  },
  historyDelete: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 0,
    marginRight: 'auto',
  },
  deleteLabel: {
    ...typography.micro,
    textDecorationLine: 'underline',
  },
  historyDescription: {
    gap: 3,
  },
  downloadDetails: {
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  fileTitle: {
    ...typography.cardTitleCompact,
    flexShrink: 1,
  },
  metadata: {
    ...typography.micro,
    color: colors.textMuted72,
  },
  iconBox: {
    ...cardStyles.iconBox,
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.surfaceUploadCircle,
  },
  historyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconBackground: {
    position: 'absolute',
    width: 52,
    height: 52,
  },
  icon: {
    width: 22,
    height: 22,
  },
  searchIcon: {
    width: 20,
    height: 20,
  },
  searchField: {
    borderColor: colors.disabledPrimaryBg,
    borderRadius: 12,
  },
  openAction: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    marginRight: -7,
  },
  openBackground: {
    position: 'absolute',
    width: 38,
    height: 38,
  },
  openIcon: {
    width: 18,
    height: 18,
    tintColor: colors.blue,
  },
  pressed: {
    opacity: 0.85,
  },
  fileActionsToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 48,
  },
  fileCardControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fileActionsLabel: {
    ...typography.micro,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  fileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 8,
    marginTop: -2,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    minWidth: 86,
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.badge,
    backgroundColor: colors.surfaceHighlight,
  },
  completedBadge: {
    backgroundColor: colors.successSoft,
  },
  badgeText: {
    ...typography.micro,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: colors.blue,
  },
  separator: {
    height: 14,
  },
  sectionHeader: {
    ...typography.sectionTitle,
    fontFamily: fontFamilies.semiBold,
    paddingTop: 24,
    paddingBottom: 10,
    backgroundColor: colors.white,
  },
  empty: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  actionFeedback: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});
