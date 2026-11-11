import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

export const BASE_WIDTH = 440;
export const BASE_HEIGHT = 956;

export const BREAKPOINTS = {
  compactMax: 359,
  tabletMin: 768,
};

export function clamp(value, min, max) {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}

export function getWindowSize() {
  try {
    const win = Dimensions && typeof Dimensions.get === 'function' ? Dimensions.get('window') : null;
    if (win && Number.isFinite(win.width) && Number.isFinite(win.height) && win.width > 0) {
      return { width: win.width, height: win.height };
    }
  } catch {
    // Fallback seguro para ambiente de testes isolados
  }
  return { width: BASE_WIDTH, height: BASE_HEIGHT };
}

export function getFontScale() {
  try {
    if (PixelRatio && typeof PixelRatio.getFontScale === 'function') {
      return PixelRatio.getFontScale();
    }
  } catch {
    // Fallback seguro
  }
  return 1;
}

export function roundPixel(value) {
  try {
    if (PixelRatio && typeof PixelRatio.roundToNearestPixel === 'function') {
      return PixelRatio.roundToNearestPixel(value);
    }
  } catch {
    // Fallback seguro
  }
  return Math.round(value);
}

export function getHorizontalPadding(width = getWindowSize().width) {
  if (width < 360) return 16;
  if (width < 440) return 20;
  return 24;
}

export function getHeroHorizontalPadding(width = getWindowSize().width) {
  if (width < 360) return 16;
  if (width < 420) return 20;
  if (width < 440) return 24;
  return 50;
}

export function getScreenMetrics(width = getWindowSize().width, height = getWindowSize().height) {
  const isCompact = width <= BREAKPOINTS.compactMax;
  const isTablet = width >= BREAKPOINTS.tabletMin;
  const isMedium = !isCompact && !isTablet;
  return {
    width,
    height,
    isCompact,
    isMedium,
    isTablet,
    horizontalPadding: getHorizontalPadding(width),
    heroHorizontalPadding: getHeroHorizontalPadding(width),
    contentMaxWidth: isTablet ? 560 : 480,
    flowContentWidth: isTablet ? 560 : 354,
    mainContentWidth: isTablet ? 560 : 340,
  };
}

export function scaleSize(size, options = {}) {
  const { width = getWindowSize().width, min = size * 0.85, max = size * 1.15 } = options;
  const ratio = clamp(width / BASE_WIDTH, 0.78, 1.2);
  return roundPixel(clamp(size * ratio, min, max));
}

export function scaleFont(size, options = {}) {
  const { width = getWindowSize().width, min = size * 0.88, max = size * 1.18 } = options;
  const widthFactor = clamp(width / BASE_WIDTH, 0.85, 1.1);
  // Text already applies the system font scale natively.
  const adjusted = size * widthFactor;
  return roundPixel(clamp(adjusted, min, max));
}

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const metrics = getScreenMetrics(width, height);
  return {
    ...metrics,
    fontScale,
    scaleSize: (size, opts = {}) => scaleSize(size, { width, ...opts }),
    scaleFont: (size, opts = {}) => scaleFont(size, { width, ...opts }),
  };
}
