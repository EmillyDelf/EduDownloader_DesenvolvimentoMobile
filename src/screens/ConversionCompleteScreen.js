import React from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/Button';
import Card from '../components/Card';
import {
  colors,
  fontFamilies,
  globalStyles,
  radii,
  responsive,
  typography,
} from '../styles';

const converterLogo = require('../../assets/screens/logo-converter.png');
const successBackground = require('../../assets/media/success-background.png');
const successIcon = require('../../assets/media/success.png');
const audioIcon = require('../../assets/media/audio.png');
const openArrowIcon = require('../../assets/media/open-arrow.png');

export default function ConversionCompleteScreen({
  navigation,
  route,
  fileName,
  fileDetails,
  onDownload,
  onOpenFile,
  onConvertAnother,
}) {
  const screen = responsive.useResponsive();
  const contentMaxWidth = screen.isTablet ? 560 : screen.flowContentWidth;
  const logoSize = screen.scaleSize(55, { min: 44, max: 60 });
  const badgeSize = screen.scaleSize(96, { min: 80, max: 104 });
  const checkSize = badgeSize / 2;

  const paramVideoName = route?.params?.videoName;
  const resolvedFileName = fileName
    || route?.params?.fileName
    || (paramVideoName ? paramVideoName.replace(/\.[^.]+$/, '.mp3') : 'IMG_4921_concert.mp3');

  const paramQuality = route?.params?.quality;
  const resolvedFileDetails = fileDetails
    || route?.params?.fileDetails
    || (paramQuality ? `${paramQuality} • Áudio MP3` : '192kbps • 4.1 MB');

  function handleDownload() {
    if (typeof onDownload === 'function') {
      onDownload();
      return;
    }
    Alert.alert('Download', `Download do áudio ${resolvedFileName} ainda está em integração.`);
  }

  function handleOpenFile() {
    if (typeof onOpenFile === 'function') {
      onOpenFile();
      return;
    }
    Alert.alert('Arquivo convertido', `${resolvedFileName} (${resolvedFileDetails}).`);
  }

  function handleConvertAnother() {
    if (typeof onConvertAnother === 'function') {
      onConvertAnother();
      return;
    }
    if (typeof navigation?.navigate === 'function') {
      navigation.navigate('ConvertGalleryVideo');
      return;
    }
    Alert.alert('Converter outro vídeo', 'Selecione outro vídeo da galeria para iniciar uma nova conversão.');
  }

  return (
    <SafeAreaView
      testID='conversion-complete-screen'
      edges={['top', 'bottom', 'left', 'right']}
      style={globalStyles.safeArea}
    >
      <StatusBar style='dark' />
      <View style={styles.topBar}>
        <Image
          source={converterLogo}
          resizeMode='contain'
          accessible={false}
          style={{ width: logoSize, height: logoSize }}
        />
      </View>

      <ScrollView
        style={globalStyles.screen}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: screen.horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentColumn, { maxWidth: contentMaxWidth }]}>
          <View style={[styles.successBadge, { width: badgeSize, height: badgeSize }]}>
            <Image
              source={successBackground}
              resizeMode='contain'
              accessible={false}
              style={{ position: 'absolute', width: badgeSize, height: badgeSize }}
            />
            <Image
              source={successIcon}
              resizeMode='contain'
              accessible={false}
              style={{ width: checkSize, height: checkSize }}
            />
          </View>

          <Text
            accessibilityRole='header'
            accessibilityLiveRegion='polite'
            style={[
              typography.h1,
              styles.title,
              {
                fontSize: screen.scaleFont(28, { min: 24, max: 32 }),
                lineHeight: screen.scaleFont(34, { min: 28, max: 38 }),
              },
            ]}
          >
            Conversão concluída!
          </Text>

          <Text
            style={[
              typography.body,
              styles.subtitle,
              {
                fontSize: screen.scaleFont(14, { min: 13, max: 16 }),
                lineHeight: screen.scaleFont(20, { min: 18, max: 22 }),
                marginBottom: screen.scaleSize(42, { min: 28, max: 44 }),
              },
            ]}
          >
            Seu áudio foi extraído e salvo com sucesso.
          </Text>

          <Card variant='summary' style={styles.fileCard}>
            <View style={styles.audioBadge}>
              <Image
                source={audioIcon}
                resizeMode='contain'
                accessible={false}
                style={styles.audioIcon}
              />
            </View>

            <View style={styles.fileInfo}>
              <Text
                numberOfLines={1}
                style={[
                  typography.cardTitle,
                  styles.fileName,
                  {
                    fontSize: screen.scaleFont(14, { min: 13, max: 16 }),
                    lineHeight: screen.scaleFont(18, { min: 16, max: 20 }),
                  },
                ]}
              >
                {resolvedFileName}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  typography.caption,
                  styles.fileMeta,
                  {
                    fontSize: screen.scaleFont(12, { min: 11, max: 14 }),
                    lineHeight: screen.scaleFont(16, { min: 14, max: 18 }),
                  },
                ]}
              >
                {resolvedFileDetails}
              </Text>
            </View>

            <Pressable
              onPress={handleOpenFile}
              accessibilityRole='button'
              accessibilityLabel={`Abrir ${resolvedFileName}`}
              style={({ pressed }) => [styles.openButtonTouch, pressed && styles.pressed]}
            >
              <View style={styles.openCircle}>
                <Image
                  source={openArrowIcon}
                  resizeMode='contain'
                  accessible={false}
                  style={styles.openArrowIcon}
                />
              </View>
            </Pressable>
          </Card>

          <View style={styles.actions}>
            <Button
              title='Download'
              variant='primary'
              onPress={handleDownload}
              style={styles.downloadButton}
              textStyle={[
                styles.downloadButtonText,
                { fontSize: screen.scaleFont(15, { min: 14, max: 17 }) },
              ]}
            />

            <Button
              title='Converter outro vídeo'
              variant='link'
              onPress={handleConvertAnother}
              style={styles.convertAnotherButton}
              textStyle={[
                styles.convertAnotherText,
                {
                  fontSize: screen.scaleFont(16, { min: 14, max: 18 }),
                  lineHeight: screen.scaleFont(24, { min: 21, max: 27 }),
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 11,
    paddingRight: 12,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 48,
  },

  contentColumn: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },

  successBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  title: {
    fontFamily: fontFamilies.bold,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitle: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted67,
    textAlign: 'center',
  },

  fileCard: {
    width: '100%',
    minHeight: 92,
    borderRadius: radii.cardLg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  audioBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceUploadCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  audioIcon: {
    width: 24,
    height: 24,
  },

  fileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },

  fileName: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },

  fileMeta: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted67,
  },

  openButtonTouch: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  openCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceUploadCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  openArrowIcon: {
    width: 18,
    height: 18,
  },

  pressed: {
    opacity: 0.85,
  },

  actions: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
    gap: 14,
  },

  downloadButton: {
    minHeight: 56,
    borderRadius: radii.button,
  },

  downloadButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.white,
  },

  convertAnotherButton: {
    paddingVertical: 8,
  },

  convertAnotherText: {
    fontFamily: fontFamilies.medium,
    fontWeight: '500',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
