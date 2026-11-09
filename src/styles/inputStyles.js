import { StyleSheet } from 'react-native';
import colors from './colors';
import { spacing, radii } from './globalStyles';
import { fontFamilies, fontSizes, fontWeights } from './typography';

const inputStyles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    width: '100%',
  },

  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semiBold,
    color: colors.textSecondary,
  },

  labelUrl: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semiBold,
    color: colors.textOverlinePrimary,
    textTransform: 'uppercase',
  },

  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },

  // 1. Input Padrão (ex: "NOME DO ARQUIVO" em Ajustes do PDF — 58px altura, raio 12)
  input: {
    minHeight: 58,
    paddingVertical: spacing.regular,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    color: colors.textDark,
  },

  // 2. Variante URL ("LINK DA MÍDIA" em Colar link — borda rgba(47, 156, 239, 0.38))
  inputUrl: {
    borderColor: colors.borderUrlInput,
    backgroundColor: colors.background,
  },

  // 3. Variante Search ("Buscar arquivos" na aba Downloads — 52px altura, fundo #F8FAFC)
  inputSearch: {
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },

  inputWithLeftIcon: {
    paddingLeft: 44,
  },

  inputWithRightAction: {
    paddingRight: 72,
  },

  // Estados de foco, erro e desabilitado
  inputFocused: {
    borderColor: colors.primary,
  },

  inputError: {
    borderColor: colors.error,
  },

  inputDisabled: {
    backgroundColor: colors.track,
    color: colors.textSecondary,
  },

  // Slots de ícone esquerdo e ação direita ("Colar")
  leftIconSlot: {
    position: 'absolute',
    left: spacing.base,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rightActionSlot: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 1,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rightActionPressed: {
    opacity: 0.7,
  },

  rightActionText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.body,
    fontWeight: fontWeights.semiBold,
    color: colors.primaryDark,
  },

  helperText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.caption,
    color: colors.textPlaceholder,
  },

  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.body,
    color: colors.error,
  },
});

export default inputStyles;
