import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import {
  colors,
  fontFamilies,
  globalStyles,
  radii,
  responsive,
  typography,
} from '../styles';

const progressRing = require('../../assets/media/progress-ring.png');
const progressSpinner = require('../../assets/media/progress-spinner.png');

export default function ConversionProgressScreen({
  navigation,
  route,
  progress,
  statusText,
  onCancel,
  onComplete,
}) {
  const screen = responsive.useResponsive();
  const contentMaxWidth = screen.isTablet ? 560 : screen.flowContentWidth;
  const ringSize = screen.scaleSize(128, { min: 108, max: 136 });

  const paramProgress = route?.params?.progress;
  const controlledProgress = Number.isFinite(progress)
    ? progress
    : (Number.isFinite(paramProgress) ? paramProgress : null);

  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const completedRef = useRef(false);

  const canAnimate = typeof Animated?.Value === 'function'
    && typeof Animated?.loop === 'function'
    && typeof Animated?.timing === 'function'
    && Boolean(Animated?.Image);
  const spinValue = useRef(canAnimate ? new Animated.Value(0) : null).current;

  useEffect(() => {
    if (controlledProgress !== null || cancelled) return undefined;
    const timer = setInterval(() => {
      setSimulatedProgress(prev => {
        if (prev >= 100) return 100;
        const next = Math.min(100, prev + 2);
        return next;
      });
    }, 120);
    return () => clearInterval(timer);
  }, [controlledProgress, cancelled]);

  const currentProgress = Math.min(
    100,
    Math.max(0, controlledProgress !== null ? controlledProgress : simulatedProgress),
  );
  const displayPercentage = Math.round(currentProgress);

  useEffect(() => {
    if (controlledProgress === null && !cancelled && displayPercentage >= 100 && !completedRef.current) {
      completedRef.current = true;
      if (typeof onComplete === 'function') {
        onComplete();
      } else if (typeof navigation?.replace === 'function') {
        navigation.replace('ConversionComplete', route?.params || {});
      } else if (typeof navigation?.navigate === 'function') {
        navigation.navigate('ConversionComplete', route?.params || {});
      }
    }
  }, [controlledProgress, cancelled, displayPercentage, onComplete, navigation, route]);

  useEffect(() => {
    if (!canAnimate || !spinValue || cancelled || displayPercentage >= 100) return undefined;
    spinValue.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing?.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [canAnimate, spinValue, cancelled, displayPercentage]);

  function handleCancel() {
    setCancelled(true);
    if (typeof onCancel === 'function') {
      onCancel();
      return;
    }
    Alert.alert(
      'Cancelar conversão',
      'A conversão de áudio foi cancelada.',
      [{ text: 'OK', onPress: () => navigation?.goBack?.() }],
    );
  }

  const resolvedStatusText = statusText
    || route?.params?.statusText
    || (cancelled
      ? 'Conversão cancelada'
      : displayPercentage >= 100
        ? 'Áudio extraído!'
        : 'Extraindo áudio...');

  const spin = spinValue
    ? spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    : '0deg';
  const SpinnerImage = canAnimate ? Animated.Image : Image;

  return (
    <SafeAreaView
      testID='conversion-progress-screen'
      edges={['top', 'bottom', 'left', 'right']}
      style={globalStyles.safeArea}
    >
      <StatusBar style='dark' />
      <ScrollView
        style={globalStyles.screen}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: screen.horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentColumn, { maxWidth: contentMaxWidth }]}>
          <View
            style={[
              styles.progressRing,
              { width: ringSize, height: ringSize },
            ]}
          >
            <Image
              source={progressRing}
              resizeMode='contain'
              accessible={false}
              style={{ position: 'absolute', width: ringSize, height: ringSize }}
            />
            <Text
              accessible={false}
              style={[
                typography.metric,
                styles.percentageText,
                {
                  fontSize: screen.scaleFont(24, { min: 20, max: 28 }),
                  lineHeight: screen.scaleFont(32, { min: 26, max: 36 }),
                },
              ]}
            >
              {`${displayPercentage}%`}
            </Text>
          </View>

          <Text
            accessibilityRole='header'
            accessibilityLiveRegion='polite'
            style={[
              typography.statusTitle,
              styles.title,
              {
                fontSize: screen.scaleFont(20, { min: 18, max: 22 }),
                lineHeight: screen.scaleFont(28, { min: 24, max: 32 }),
              },
            ]}
          >
            Convertendo
          </Text>

          <View style={styles.statusRow}>
            <SpinnerImage
              source={progressSpinner}
              resizeMode='contain'
              accessible={false}
              style={[
                styles.spinnerIcon,
                canAnimate ? { transform: [{ rotate: spin }] } : null,
              ]}
            />
            <Text
              style={[
                typography.body,
                styles.statusText,
                {
                  fontSize: screen.scaleFont(14, { min: 13, max: 16 }),
                  lineHeight: screen.scaleFont(20, { min: 18, max: 24 }),
                },
              ]}
            >
              {resolvedStatusText}
            </Text>
          </View>

          <ProgressBar
            progress={currentProgress}
            showPercentage={false}
            accessibilityLabel='Progresso da conversão'
            style={styles.progressBar}
            trackStyle={styles.progressTrack}
            fillStyle={styles.progressFill}
          />

          <Button
            title='Cancelar conversão'
            variant='secondary'
            onPress={handleCancel}
            style={styles.cancelButton}
            textStyle={[
              styles.cancelButtonText,
              { fontSize: screen.scaleFont(14, { min: 13, max: 16 }) },
            ]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },

  contentColumn: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },

  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },

  percentageText: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -1.2,
  },

  title: {
    fontFamily: fontFamilies.medium,
    fontWeight: '500',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },

  spinnerIcon: {
    width: 16,
    height: 16,
  },

  statusText: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted72,
    textAlign: 'center',
    flexShrink: 1,
  },

  progressBar: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 16,
  },

  progressTrack: {
    height: 6,
    borderRadius: radii.pillTrack,
    backgroundColor: colors.surfaceSoft,
  },

  progressFill: {
    backgroundColor: colors.primary,
  },

  cancelButton: {
    minHeight: 54,
    borderRadius: radii.button,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.disabledPrimaryBg,
  },

  cancelButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.textMuted67,
  },
});
