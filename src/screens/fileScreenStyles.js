import { StyleSheet } from 'react-native';
import { colors, typography, spacing, radii, cardStyles } from '../styles';

export default StyleSheet.create({
  hero: {
    paddingTop: 6,
    paddingBottom: 39,
  },
  logo: {
    width: 55,
    height: 55,
  },
  list: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heading: {
    ...typography.sectionTitle,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  fileTitle: {
    ...typography.cardTitleCompact,
    flexShrink: 1,
  },
  metadata: {
    ...typography.caption,
  },
  iconBox: {
    ...cardStyles.iconBox,
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
  openAction: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.badge,
    backgroundColor: colors.surfaceHighlight,
  },
  completedBadge: {
    backgroundColor: colors.lime,
  },
  badgeText: {
    ...typography.micro,
    fontWeight: '600',
    color: colors.blue,
  },
  separator: {
    height: spacing.md,
  },
  sectionHeader: {
    ...typography.sectionTitle,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  empty: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  actionFeedback: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
});
