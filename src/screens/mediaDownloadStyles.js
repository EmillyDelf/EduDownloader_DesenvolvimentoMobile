import { StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../styles';

export default StyleSheet.create({
  form: { gap: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.pageTitle },
  label: { ...typography.caption, fontWeight: '600' },
  fileTitle: { ...typography.cardTitle, flexShrink: 1 },
  helper: { ...typography.caption, flexShrink: 1 },
  info: { backgroundColor: colors.surfaceHighlight, padding: spacing.lg },
  infoBadge: { width: 40, height: 40, borderRadius: radii.round, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summary: { gap: spacing.md },
  formatOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  formatCard: { flexGrow: 1, flexBasis: 145, minWidth: 140 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  formatText: { flex: 1, minWidth: 0 },
  icon18: { width: 18, height: 18 },
  icon20: { width: 20, height: 20 },
  icon24: { width: 24, height: 24 },
  successBadge: { width: 96, height: 96, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  successBackground: { position: 'absolute', width: 96, height: 96 },
  successIcon: { width: 48, height: 48 },
});
