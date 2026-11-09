import * as ReactNative from 'react-native';

export const BASE_WIDTH = 440;
export const BASE_HEIGHT = 956;

export const BREAKPOINTS = {
  small: 360,
  regular: 440,
  tablet: 768,
};

export function getWindowMetrics(customDimensions) {
  if (
    customDimensions &&
    typeof customDimensions.width === 'number' &&
    customDimensions.width > 0
  ) {
    return {
      width: customDimensions.width,
      height:
        typeof customDimensions.height === 'number' && customDimensions.height > 0
          ? customDimensions.height
          : BASE_HEIGHT,
      fontScale:
        typeof customDimensions.fontScale === 'number' && customDimensions.fontScale > 0
          ? customDimensions.fontScale
          : 1,
    };
  }

  if (
    ReactNative.Dimensions &&
    typeof ReactNative.Dimensions.get === 'function'
  ) {
    const win = ReactNative.Dimensions.get('window');
    if (win && typeof win.width === 'number' && win.width > 0) {
      return {
        width: win.width,
        height: typeof win.height === 'number' && win.height > 0 ? win.height : BASE_HEIGHT,
        fontScale: typeof win.fontScale === 'number' && win.fontScale > 0 ? win.fontScale : 1,
      };
    }
  }

  return {
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    fontScale: 1,
  };
}

function roundPixel(value) {
  if (
    ReactNative.PixelRatio &&
    typeof ReactNative.PixelRatio.roundToNearestPixel === 'function'
  ) {
    return ReactNative.PixelRatio.roundToNearestPixel(value);
  }
  return Math.round(value * 100) / 100;
}

export function scale(size, customWidth) {
  const { width } = getWindowMetrics(
    typeof customWidth === 'number' ? { width: customWidth } : customWidth
  );
  const clampedWidth = Math.min(Math.max(width, 280), 600);
  return roundPixel((clampedWidth / BASE_WIDTH) * size);
}

export function verticalScale(size, customHeight) {
  const { height } = getWindowMetrics(
    typeof customHeight === 'number'
      ? { width: BASE_WIDTH, height: customHeight }
      : customHeight
  );
  const clampedHeight = Math.min(Math.max(height, 560), 1200);
  return roundPixel((clampedHeight / BASE_HEIGHT) * size);
}

export function moderateScale(size, factor = 0.5, customWidth) {
  const scaled = scale(size, customWidth);
  return roundPixel(size + (scaled - size) * factor);
}

export function responsiveFontSize(size, customWidth) {
  return moderateScale(size, 0.35, customWidth);
}

export function getResponsiveLayout(customDimensions) {
  const { width, height, fontScale } = getWindowMetrics(customDimensions);
  const isSmallScreen = width < BREAKPOINTS.small;
  const isRegularScreen = width >= BREAKPOINTS.small && width < BREAKPOINTS.regular;
  const isLargeScreen = width >= BREAKPOINTS.regular && width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet;

  // No Figma (440px): telas de fluxo usam 43px de padding (354px conteúdo) e abas usam 50px (340px conteúdo).
  // Em telas menores, reduzimos proporcionalmente o padding para preservar área útil.
  let flowPaddingHorizontal = 43;
  let tabPaddingHorizontal = 50;

  if (isSmallScreen) {
    flowPaddingHorizontal = 16;
    tabPaddingHorizontal = 16;
  } else if (isRegularScreen) {
    flowPaddingHorizontal = Math.max(20, Math.round((width / BASE_WIDTH) * 32));
    tabPaddingHorizontal = Math.max(24, Math.round((width / BASE_WIDTH) * 38));
  } else if (isTablet) {
    flowPaddingHorizontal = 32;
    tabPaddingHorizontal = 40;
  }

  const contentMaxWidth = isTablet ? 560 : 480;
  const availableFlowWidth = Math.min(width - flowPaddingHorizontal * 2, contentMaxWidth);
  const availableTabWidth = Math.min(width - tabPaddingHorizontal * 2, contentMaxWidth);

  return {
    width,
    height,
    fontScale,
    isSmallScreen,
    isRegularScreen,
    isLargeScreen,
    isTablet,
    flowPaddingHorizontal,
    tabPaddingHorizontal,
    contentMaxWidth,
    availableFlowWidth,
    availableTabWidth,
  };
}

export function getGridColumnWidth(
  columns = 2,
  gap = 16,
  containerPadding,
  customWidth
) {
  const layout = getResponsiveLayout(
    typeof customWidth === 'number' ? { width: customWidth } : customWidth
  );
  const padding =
    typeof containerPadding === 'number'
      ? containerPadding
      : layout.flowPaddingHorizontal;
  const usableWidth = Math.min(layout.width - padding * 2, layout.contentMaxWidth);
  const totalGaps = Math.max(0, columns - 1) * gap;
  return Math.max(72, Math.floor((usableWidth - totalGaps) / columns));
}

export function useResponsive() {
  if (typeof ReactNative.useWindowDimensions === 'function') {
    const windowDimensions = ReactNative.useWindowDimensions();
    return getResponsiveLayout(windowDimensions);
  }
  return getResponsiveLayout();
}

const responsive = {
  BASE_WIDTH,
  BASE_HEIGHT,
  BREAKPOINTS,
  getWindowMetrics,
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  getResponsiveLayout,
  getGridColumnWidth,
  useResponsive,
};

export default responsive;
