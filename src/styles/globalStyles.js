import { StyleSheet } from 'react-native';
import colors from './colors';
import { getResponsiveLayout, useResponsive } from './responsive';

const defaultLayout = getResponsiveLayout();

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  regular: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  section: 32,
  flowHorizontal: 43,
  tabHorizontal: 50,
};

export const radii = {
  xs: 3,
  sm: 8,
  md: 10,
  pillSm: 11,
  lg: 12,
  xl: 14,
  xxl: 16,
  pill: 18,
  xl2: 20,
  xl3: 28,
  full: 999,
};

export const shadows = {
  card: {
    shadowColor: colors.textBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: colors.textBlack,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};

const globalStyles = StyleSheet.create({
  // Containers estruturais de tela
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },

  // 1. Layout das 5 Abas Principais (Início, Downloads, PDF, Histórico, Perfil)
  tabScreenContent: {
    flex: 1,
    width: '100%',
    maxWidth: defaultLayout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: defaultLayout.tabPaddingHorizontal,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },

  // 2. Layout das Telas de Fluxo / Etapas (Download por Link, PDF, Conversão)
  flowScreenContent: {
    flex: 1,
    width: '100%',
    maxWidth: defaultLayout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: defaultLayout.flowPaddingHorizontal,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },

  // 3. Layout de Telas Centralizadas (Carregamento 42% e Telas de Sucesso)
  centeredScreenContent: {
    flex: 1,
    width: '100%',
    maxWidth: defaultLayout.contentMaxWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: defaultLayout.flowPaddingHorizontal,
    paddingVertical: spacing.section,
    gap: spacing.base,
  },

  // Utilitários de Flexbox e Grids Responsivos
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },

  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Grid de 2 colunas (ex: MP4/MP3, Retrato/Paisagem, Grid 2x2 de imagens do PDF)
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
    width: '100%',
  },

  twoColumnItem: {
    flex: 1,
    minWidth: 132,
  },

  // Grid de 3 colunas (ex: Tamanho da Página A4/Carta/Ajustar e Margens Sem/Normal/Ampla)
  threeColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    width: '100%',
  },

  threeColumnItem: {
    flex: 1,
    minWidth: 84,
  },

  // Seções e Agrupamentos
  section: {
    width: '100%',
    gap: spacing.md,
  },

  sectionSpaced: {
    width: '100%',
    gap: spacing.base,
  },

  sectionHeader: {
    width: '100%',
    gap: 6,
    marginBottom: spacing.xs,
  },

  heroBrandSection: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  // Divisores e Sombras
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: colors.border,
  },

  dividerBlue: {
    height: 1,
    width: '100%',
    backgroundColor: colors.borderLightBlue,
  },

  elevatedContainer: {
    backgroundColor: colors.background,
    ...shadows.elevated,
  },
});

export function getAdaptiveContainerStyle(type = 'flow', customDimensions) {
  const layout = getResponsiveLayout(customDimensions);
  const paddingHorizontal =
    type === 'tab' ? layout.tabPaddingHorizontal : layout.flowPaddingHorizontal;

  return {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal,
  };
}

export function useResponsiveContainerStyles() {
  const layout = useResponsive();

  return {
    layout,
    tabScreenContent: [
      globalStyles.tabScreenContent,
      {
        maxWidth: layout.contentMaxWidth,
        paddingHorizontal: layout.tabPaddingHorizontal,
      },
    ],
    flowScreenContent: [
      globalStyles.flowScreenContent,
      {
        maxWidth: layout.contentMaxWidth,
        paddingHorizontal: layout.flowPaddingHorizontal,
      },
    ],
    centeredScreenContent: [
      globalStyles.centeredScreenContent,
      {
        maxWidth: layout.contentMaxWidth,
        paddingHorizontal: layout.flowPaddingHorizontal,
      },
    ],
  };
}

export default globalStyles;
