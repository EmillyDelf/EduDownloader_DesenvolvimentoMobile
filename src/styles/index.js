import colors from './colors';
import typography, {
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  textVariants,
} from './typography';
import responsive, {
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
} from './responsive';
import globalStyles, {
  spacing,
  radii,
  shadows,
  getAdaptiveContainerStyle,
  useResponsiveContainerStyles,
} from './globalStyles';
import buttonStyles from './buttonStyles';
import inputStyles from './inputStyles';
import headerMenuStyles from './headerMenuStyles';
import cardComponentStyles from './cardComponentStyles';

export {
  colors,
  typography,
  fontFamilies,
  fontWeights,
  fontSizes,
  lineHeights,
  textVariants,
  responsive,
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
  globalStyles,
  spacing,
  radii,
  shadows,
  getAdaptiveContainerStyle,
  useResponsiveContainerStyles,
  buttonStyles,
  inputStyles,
  headerMenuStyles,
  cardComponentStyles,
};

export default {
  colors,
  typography,
  responsive,
  globalStyles,
  spacing,
  radii,
  shadows,
  buttonStyles,
  inputStyles,
  headerMenuStyles,
  cardComponentStyles,
};
