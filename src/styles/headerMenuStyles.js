import { StyleSheet } from 'react-native';
import colors from './colors';
import { spacing, radii } from './globalStyles';
import { fontFamilies, fontSizes, fontWeights, lineHeights } from './typography';
import { getResponsiveLayout } from './responsive';

const defaultLayout = getResponsiveLayout();

const headerMenuStyles = StyleSheet.create({
  // Faixa bicolor de topo (4px: 80% azul #0F519D + 20% verde #24AF42 na tela Colar link)
  brandAccentRow: {
    flexDirection: 'row',
    width: '100%',
    height: spacing.xs,
  },

  brandAccentPrimary: {
    flex: 4,
    backgroundColor: colors.primary,
  },

  brandAccentSuccess: {
    flex: 1,
    backgroundColor: colors.success,
  },

  // 1. Top App Bar de Fluxo (74px de altura — etapas de Download, PDF e Conversão)
  header: {
    minHeight: 74,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },

  headerSubtle: {
    backgroundColor: colors.surfaceSubtle,
    borderBottomColor: colors.borderLightBlue,
  },

  title: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.title,
    fontWeight: fontWeights.semiBold,
    color: colors.textPrimary,
  },

  titleBrand: {
    color: colors.primaryDark,
  },

  action: {
    minHeight: 48,
    minWidth: 48,
    maxWidth: '30%',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },

  actionPressed: {
    opacity: 0.7,
  },

  actionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semiBold,
    color: colors.primary,
    textAlign: 'center',
  },

  heroActionText: {
    color: colors.textInverse,
  },

  headerCompact: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },

  backIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.xxl,
    backgroundColor: colors.surfaceIconTint,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerLogo: {
    width: 55,
    height: 55,
  },

  // 2. Hero Header Banner (200px de altura — 5 telas principais: Início, Downloads, PDF, Histórico, Perfil)
  heroHeader: {
    minHeight: 200,
    width: '100%',
    backgroundColor: colors.primary,
    paddingHorizontal: defaultLayout.tabPaddingHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    justifyContent: 'space-between',
  },

  heroTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  heroBody: {
    width: '100%',
    maxWidth: defaultLayout.contentMaxWidth,
    alignSelf: 'center',
    gap: 6,
    marginTop: 'auto',
  },

  heroTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.heading,
    color: colors.textInverse,
  },

  heroSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body,
    color: colors.textInverse,
  },

  // 3. Menu Inferior (BottomNavigation — 5 abas de 70px de altura)
  safeArea: {
    backgroundColor: colors.surface,
  },

  navigation: {
    flexDirection: 'row',
  },

  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 70,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xxs,
    gap: 7,
  },

  tabPressed: {
    opacity: 0.7,
  },

  icon: {
    width: 22,
    height: 22,
  },

  label: {
    alignSelf: 'stretch',
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  labelSelected: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: fontWeights.semiBold,
    color: colors.success,
  },
});

export default headerMenuStyles;
