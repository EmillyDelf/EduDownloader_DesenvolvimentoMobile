import { StyleSheet } from 'react-native';
import colors from './colors';
import { spacing, radii } from './globalStyles';
import { fontFamilies, fontSizes, fontWeights, lineHeights, textVariants } from './typography';

const cardComponentStyles = StyleSheet.create({
  // 1. Cartão Padrão (Resumo de arquivo, dicas, estimativa — #F8FAFC, borda #E5EAF0, raio 14)
  card: {
    padding: spacing.base,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },

  interactiveCard: {
    minHeight: 48,
  },

  cardPressed: {
    opacity: 0.8,
  },

  cardDisabled: {
    opacity: 0.5,
  },

  // 2. Cartão de Funcionalidade (Tela Inicial e Ferramentas de PDF — 340x130, raio 10)
  cardFeature: {
    minHeight: 130,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    borderRadius: radii.md,
    borderWidth: 0,
    backgroundColor: colors.surfaceFeature,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  cardFeaturePrimary: {
    minHeight: 130,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    borderRadius: radii.md,
    borderWidth: 0,
    backgroundColor: colors.surfaceFeatureTint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  featureCardContent: {
    flex: 1,
    gap: spacing.sm,
  },

  featureCardArrow: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.semiBold,
    color: colors.primary,
  },

  // 3. Cartão Selecionável / Radio (Formato MP4/MP3, Qualidade 480p/720p/1080p, Página A4/Carta, Orientação, Margens)
  cardSelectable: {
    minHeight: 78,
    padding: spacing.base,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },

  cardSelectableFormat: {
    minHeight: 78,
    padding: spacing.base,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },

  cardCompact: {
    padding: spacing.md,
  },

  cardSelected: {
    backgroundColor: colors.surfaceTonal,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  // 4. Cartões de Listagem (Downloads, Histórico, Preferências do Perfil e Card de Usuário)
  cardDownload: {
    minHeight: 75,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.regular,
    borderRadius: radii.xl,
    borderWidth: 0,
    backgroundColor: colors.surfaceSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  cardHistory: {
    minHeight: 88,
    paddingHorizontal: spacing.regular,
    paddingVertical: spacing.regular,
    borderRadius: radii.xl,
    borderWidth: 0,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  cardSettings: {
    minHeight: 72,
    paddingHorizontal: spacing.regular,
    paddingVertical: spacing.regular,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  cardProfile: {
    minHeight: 128,
    padding: spacing.lg,
    borderRadius: radii.xxl,
    borderWidth: 0,
    backgroundColor: colors.surfaceTonal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },

  // 5. Dropzone Tracejado (Seleção de imagens / vídeo — 260px altura, raio 16, borda tracejada #2F9CEF)
  cardDropzone: {
    minHeight: 260,
    padding: spacing.xxl,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  // 6. Card de Preview de Mídia (220px altura, raio 16, topo #2F9CEF de 132px)
  cardPreview: {
    minHeight: 220,
    padding: 0,
    borderRadius: radii.xxl,
    borderWidth: 0,
    backgroundColor: colors.surfaceTonal,
    overflow: 'hidden',
  },

  previewBanner: {
    height: 132,
    width: '100%',
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewPlayButton: {
    width: 64,
    height: 64,
    borderRadius: spacing.section,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewBody: {
    padding: spacing.base,
    gap: 6,
  },

  // 7. Elementos Internos de Cartões (Ícones, Avatares, Badges, Radio, Miniaturas de Página)
  iconBoxBlue: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceTonal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBoxLargeBlue: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceTonal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircleBlue: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceTonal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBoxNeutral: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircleGreen: {
    width: 40,
    height: 40,
    borderRadius: radii.xl2,
    backgroundColor: colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.avatar,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.avatar,
    color: colors.textInverse,
    textAlign: 'center',
  },

  successHeroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.xl,
    backgroundColor: colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusPillCompleted: {
    minWidth: 86,
    height: 22,
    paddingHorizontal: 10,
    borderRadius: radii.pillSm,
    backgroundColor: colors.successSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fileBadgeText: textVariants.fileBadgeText,

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
  },

  pageThumbnailCard: {
    flex: 1,
    minWidth: 132,
    gap: spacing.sm,
  },

  pageThumbnailBox: {
    height: 116,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAccent,
    padding: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },

  pageOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageOrderText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semiBold,
    color: colors.textInverse,
    textAlign: 'center',
  },

  settingsChevron: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.heading,
    color: colors.textPlaceholder,
  },

  // 8. ProgressBar (Nota: container e track não definem `width` para preservar o seletor do teste em tests/components.test.cjs)
  progressContainer: {
    gap: spacing.sm,
  },

  progressTrack: {
    height: 6,
    borderRadius: radii.xs,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },

  progressPercentage: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semiBold,
    color: colors.textDark,
    textAlign: 'right',
  },

  // 9. LoadingIndicator (Padrão e tela de progresso 42%)
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    gap: spacing.md,
  },

  loadingMessage: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },

  loadingCircularRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 6,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 10. ErrorMessage
  errorContainer: {
    padding: spacing.base,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.errorSurface,
  },

  errorMessageText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    color: colors.error,
  },

  // 11. ConfirmationDialog
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.overlay,
  },

  dialogOverlayCompact: {
    padding: spacing.base,
  },

  dialogBox: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },

  dialogBoxTablet: {
    maxWidth: 480,
  },

  dialogContent: {
    padding: spacing.xxl,
    gap: spacing.base,
  },

  dialogTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.status,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },

  dialogDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.subtitle,
    color: colors.textMuted,
  },

  dialogActions: {
    gap: spacing.md,
  },

  dialogCancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },

  dialogCancelPressed: {
    opacity: 0.7,
  },

  dialogCancelText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.semiBold,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default cardComponentStyles;
