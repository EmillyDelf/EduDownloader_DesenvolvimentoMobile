import { StyleSheet } from 'react-native';
import colors from './colors';
import { spacing, radii } from './globalStyles';
import { fontFamilies, fontSizes, fontWeights } from './typography';

const buttonStyles = StyleSheet.create({
  // Base compartilhada por todos os botões
  button: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },

  // Variantes de tamanho
  sizeSm: {
    minHeight: 36,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radii.pill,
  },

  sizeMd: {
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
  },

  sizeLg: {
    minHeight: 56,
    width: '100%',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.md,
  },

  // 1. Variante Primária (Azul Figma #0F519D — "Continuar", "Gerar PDF", "Download", "Abrir galeria")
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },

  primaryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semiBold,
    color: colors.textInverse,
    textAlign: 'center',
  },

  // 2. Variante Verde / Legada (#1E5D3B)
  success: {
    backgroundColor: colors.brandGreen,
    borderRadius: radii.sm,
  },

  successText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.bold,
    color: colors.textInverse,
    textAlign: 'center',
  },

  // 3. Variante Secundária Tonal (#EAF3FF — ações secundárias de fluxo)
  secondary: {
    backgroundColor: colors.surfaceTonal,
    borderRadius: radii.md,
  },

  secondaryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semiBold,
    color: colors.primary,
    textAlign: 'center',
  },

  // 4. Variante Outline Ação ("+ Adicionar mais imagens" — #FFFFFF com borda #E5EAF0 e texto #0F519D)
  outline: {
    minHeight: 58,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },

  outlineText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semiBold,
    color: colors.primary,
    textAlign: 'center',
  },

  // 5. Variante Cancelar ("Cancelar download", "Cancelar PDF", "Cancelar conversão")
  cancel: {
    minHeight: 54,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },

  cancelText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semiBold,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // 6. Variante Link Sublinhado ("Visualizar PDF", "Baixar outra mídia", "Converter outro vídeo")
  link: {
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.transparent,
  },

  linkText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.button,
    fontWeight: fontWeights.semiBold,
    color: colors.textBlack,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // 7. Variante Ação Inline ("Colar" dentro do campo de URL)
  inline: {
    minHeight: 32,
    minWidth: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.transparent,
  },

  inlineText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semiBold,
    color: colors.primaryDark,
    textAlign: 'center',
  },

  // 8. Variante Filter Chip ("Todos", "Vídeos", "Áudios", "PDF", "Tudo", "Downloads", "Conversões")
  chip: {
    minHeight: 36,
    minWidth: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chipSelected: {
    backgroundColor: colors.surfaceTonal,
    borderColor: colors.primary,
  },

  chipText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  chipTextSelected: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: fontWeights.semiBold,
    color: colors.primary,
  },

  // 9. Variante Botão Circular de Ícone (Play/Open 38x38 verde ou Voltar 32x32 azul)
  icon: {
    width: 38,
    height: 38,
    minWidth: 38,
    minHeight: 38,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 19,
    backgroundColor: colors.successSurface,
  },

  iconBlue: {
    width: 32,
    height: 32,
    minWidth: 32,
    minHeight: 32,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: radii.xxl,
    backgroundColor: colors.surfaceIconTint,
  },

  // Texto padrão legado para retrocompatibilidade
  buttonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.subtitle,
    fontWeight: fontWeights.semiBold,
    color: colors.textInverse,
    textAlign: 'center',
  },

  sizeSmCompact: {
    paddingHorizontal: spacing.md,
  },

  sizeMdCompact: {
    paddingHorizontal: spacing.lg,
  },

  sizeLgCompact: {
    minHeight: 52,
    paddingVertical: spacing.regular,
    paddingHorizontal: spacing.lg,
  },

  outlineCompact: {
    minHeight: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },

  cancelCompact: {
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },

  // Estados de interação
  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.disabledBackground,
  },

  buttonTextDisabled: {
    color: colors.textDisabled,
  },
});

export default buttonStyles;
