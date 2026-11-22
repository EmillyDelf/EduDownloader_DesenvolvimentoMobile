import React, { useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  cardStyles,
  colors,
  fontFamilies,
  globalStyles,
  radii,
  responsive,
  typography,
} from '../styles';
import { formatFileSize } from './fileScreenUtils';

const converterLogo = require('../../assets/screens/logo-converter.png');
const backIcon = require('../../assets/screens/back-icon.png');
const uploadIcon = require('../../assets/screens/upload-icon.png');
const checkIcon = require('../../assets/screens/check-icon.png');

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '';
  const seconds = Math.floor(milliseconds / 1000);
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60]
    .map(part => String(part).padStart(2, '0'));
  const hours = Math.floor(seconds / 3600);
  if (hours) parts.unshift(String(hours));
  return parts.join(':');
}

export default function ConvertGalleryVideoScreen({ navigation }) {
  const screen = responsive.useResponsive();
  const contentMaxWidth = screen.isTablet ? 560 : screen.flowContentWidth;
  const logoSize = screen.scaleSize(92, { min: 72, max: 104 });
  const uploadCircleSize = screen.scaleSize(56, { min: 48, max: 64 });
  const uploadIconSize = screen.scaleSize(23, { min: 20, max: 28 });
  const badgeCircleSize = screen.scaleSize(40, { min: 36, max: 46 });
  const checkIconSize = screen.scaleSize(20, { min: 18, max: 24 });
  const [video, setVideo] = useState(null);
  const [pickingVideo, setPickingVideo] = useState(false);
  const pickerOpen = useRef(false);

  async function handleOpenGallery() {
    if (pickerOpen.current) return;
    pickerOpen.current = true;
    setPickingVideo(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri || (asset.type && asset.type !== 'video')) {
        Alert.alert('Vídeo indisponível', 'Selecione um vídeo da galeria.');
        return;
      }
      setVideo({
        videoName: asset.fileName?.trim() || 'Vídeo selecionado',
        videoDetails: [formatDuration(asset.duration), formatFileSize(asset.fileSize)].filter(Boolean).join(' • '),
      });
    } catch {
      Alert.alert('Não foi possível abrir a galeria', 'Verifique se o aplicativo tem acesso aos vídeos e tente novamente.');
    } finally {
      pickerOpen.current = false;
      setPickingVideo(false);
    }
  }

  function handleContinue() {
    if (video && !pickerOpen.current) navigation.navigate('FormatChoice', video);
  }

  return (
    <SafeAreaView
      testID='convert-gallery-video-screen'
      edges={['top', 'bottom', 'left', 'right']}
      style={globalStyles.safeArea}
    >
      <StatusBar style='dark' />
      <Header
        title='Converter vídeos da galeria'
        onBack={() => navigation?.goBack()}
        backIcon={backIcon}
        logo={converterLogo}
        style={styles.headerDivider}
      />

      <ScrollView
        style={globalStyles.screen}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: screen.horizontalPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentColumn, { maxWidth: contentMaxWidth }]}>
          <View style={styles.brandSection}>
            <Image
              source={converterLogo}
              resizeMode='contain'
              accessible={false}
              style={{ width: logoSize, height: logoSize }}
            />

            <Text
              accessibilityRole='header'
              style={[
                typography.pageTitle,
                styles.centeredTitle,
                {
                  fontSize: screen.scaleFont(24, { min: 20, max: 28 }),
                  lineHeight: screen.scaleFont(29, { min: 25, max: 34 }),
                  marginTop: screen.scaleSize(28, { min: 16, max: 32 }),
                },
              ]}
            >
              Selecione seu vídeo
            </Text>

            <Text
              style={[
                typography.body,
                styles.centeredSubtitle,
                {
                  fontSize: screen.scaleFont(14, { min: 13, max: 16 }),
                  lineHeight: screen.scaleFont(18, { min: 16, max: 22 }),
                  marginTop: screen.scaleSize(9, { min: 6, max: 12 }),
                },
              ]}
            >
              Selecione um vídeo e confira as opções de áudio. A conversão ainda está pendente.
            </Text>
          </View>

          <Card
            variant='dashed'
            style={[
              styles.dropzoneCard,
              {
                minHeight: screen.scaleSize(260, { min: 220, max: 280 }),
                marginTop: screen.scaleSize(45, { min: 24, max: 48 }),
              },
            ]}
          >
            <View
              style={[
                styles.uploadCircle,
                {
                  width: uploadCircleSize,
                  height: uploadCircleSize,
                  borderRadius: uploadCircleSize / 2,
                },
              ]}
            >
              <Image
                source={uploadIcon}
                resizeMode='contain'
                accessible={false}
                style={{ width: uploadIconSize, height: uploadIconSize }}
              />
            </View>

            <Text
              style={[
                typography.sectionTitle,
                styles.dropzoneTitle,
                {
                  fontSize: screen.scaleFont(18, { min: 16, max: 20 }),
                  lineHeight: screen.scaleFont(22, { min: 20, max: 26 }),
                },
              ]}
            >
              Selecione o vídeo
            </Text>

            <Text
              style={[
                typography.bodySm,
                styles.dropzoneSubtitle,
                {
                  fontSize: screen.scaleFont(13, { min: 12, max: 15 }),
                  lineHeight: screen.scaleFont(16, { min: 15, max: 20 }),
                },
              ]}
            >
              Explore sua galeria
            </Text>

            <Button
              title='Abrir galeria'
              size='md'
              fullWidth={false}
              disabled={pickingVideo}
              onPress={handleOpenGallery}
              style={styles.galleryButton}
              textStyle={{ fontSize: screen.scaleFont(14, { min: 13, max: 16 }) }}
            />
          </Card>

          <Card
            style={[
              styles.infoCard,
              {
                marginTop: screen.scaleSize(20, { min: 14, max: 24 }),
                minHeight: screen.scaleSize(76, { min: 68, max: 84 }),
              },
            ]}
          >
            <View style={styles.infoRow}>
              <View style={styles.infoTexts}>
                <Text
                  style={[
                    typography.body,
                    styles.infoTitle,
                    { fontSize: screen.scaleFont(14, { min: 13, max: 16 }) },
                  ]}
                >
                  Formatos previstos
                </Text>
                <Text
                  style={[
                    typography.caption,
                    styles.infoHelper,
                    { fontSize: screen.scaleFont(12, { min: 11, max: 14 }) },
                  ]}
                >
                  MP4, MOV, MKV — integração pendente
                </Text>
              </View>

              <View
                style={[
                  cardStyles.infoBadgeCircle,
                  {
                    width: badgeCircleSize,
                    height: badgeCircleSize,
                    borderRadius: badgeCircleSize / 2,
                  },
                ]}
              >
                <Image
                  source={checkIcon}
                  resizeMode='contain'
                  accessible={false}
                  style={{ width: checkIconSize, height: checkIconSize }}
                />
              </View>
            </View>
          </Card>

          <Button
            title='Continuar'
            disabled={!video || pickingVideo}
            onPress={handleContinue}
            style={[
              (!video || pickingVideo) && styles.continueButtonDisabled,
              { marginTop: screen.scaleSize(16, { min: 12, max: 20 }) },
            ]}
            textStyle={(!video || pickingVideo) ? styles.continueButtonTextDisabled : undefined}
          />

          <Text
            style={[
              typography.micro,
              styles.selectionStatus,
              {
                fontSize: screen.scaleFont(11, { min: 10, max: 13 }),
                marginTop: screen.scaleSize(9, { min: 6, max: 12 }),
              },
            ]}
          >
            {video?.videoName || 'Nenhum vídeo selecionado'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerDivider: {
    borderBottomColor: colors.disabledPrimaryBg,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 26,
    paddingBottom: 40,
  },

  contentColumn: {
    width: '100%',
    alignSelf: 'center',
  },

  brandSection: {
    alignItems: 'center',
  },

  centeredTitle: {
    textAlign: 'center',
    color: colors.primary,
  },

  centeredSubtitle: {
    textAlign: 'center',
    color: colors.textMuted67,
  },

  dropzoneCard: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.preview,
    backgroundColor: colors.surfaceDashed,
    alignItems: 'center',
    justifyContent: 'center',
  },

  uploadCircle: {
    backgroundColor: colors.surfaceUploadCircle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  dropzoneTitle: {
    textAlign: 'center',
    color: colors.primary,
  },

  dropzoneSubtitle: {
    textAlign: 'center',
    color: colors.textMuted67,
  },

  galleryButton: {
    marginTop: 14,
  },

  infoCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.disabledPrimaryBg,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  infoTexts: {
    flex: 1,
    gap: 6,
  },

  infoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },

  infoHelper: {
    color: colors.textMuted67,
  },

  continueButtonDisabled: {
    backgroundColor: colors.disabledPrimaryBg,
    opacity: 1,
  },

  continueButtonTextDisabled: {
    color: colors.textMuted52,
  },

  selectionStatus: {
    textAlign: 'center',
    color: colors.textMuted52,
  },
});
