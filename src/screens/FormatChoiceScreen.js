import React, { useState } from 'react';
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
import Header from '../components/Header';
import {
  colors,
  fontFamilies,
  globalStyles,
  radii,
  responsive,
  typography,
} from '../styles';

const converterLogo = require('../../assets/screens/logo-converter.png');
const backIcon = require('../../assets/screens/back-icon.png');
const playIcon = require('../../assets/screens/play-icon.png');
const arrowRightIcon = require('../../assets/screens/arrow-right-white.png');

const QUALITY_OPTIONS = [
  {
    id: '128',
    title: '128 kbps',
    subtitle: 'Padrão • Tamanho de arquivo menor',
  },
  {
    id: '192',
    title: '192 kbps',
    subtitle: 'Alto • Bom equilíbrio',
  },
  {
    id: '320',
    title: '320 kbps',
    subtitle: 'Taxa de bits mais alta • Arquivo maior',
  },
];

export default function FormatChoiceScreen({ navigation, route }) {
  const screen = responsive.useResponsive();
  const contentMaxWidth = screen.isTablet ? 560 : screen.flowContentWidth;
  const [selectedQuality, setSelectedQuality] = useState('192');

  const videoName = route?.params?.videoName;
  const videoDetails = route?.params?.videoDetails;

  function handleConvert() {
    if (!videoName) return;
    const selected = QUALITY_OPTIONS.find(option => option.id === selectedQuality);
    Alert.alert(
      'Conversão para áudio',
      `Qualidade selecionada: ${selected.title}. O processamento e a exportação de áudio ainda estão pendentes.`,
    );
  }

  return (
    <SafeAreaView
      testID='format-choice-screen'
      edges={['top', 'bottom', 'left', 'right']}
      style={globalStyles.safeArea}
    >
      <StatusBar style='dark' />
      <Header
        title='Escolha de formato'
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
          <Text
            accessibilityRole='header'
            style={[
              typography.micro,
              styles.sectionLabel,
              {
                fontSize: screen.scaleFont(12, { min: 11, max: 13 }),
                lineHeight: screen.scaleFont(15, { min: 14, max: 17 }),
              },
            ]}
          >
            ARQUIVO SELECIONADO
          </Text>

          <View style={styles.previewCard}>
            <View style={styles.thumbnailArea}>
              <View style={styles.playButtonCircle}>
                <Image
                  source={playIcon}
                  resizeMode='contain'
                  accessible={false}
                  style={styles.playIcon}
                />
              </View>
            </View>

            <View style={styles.previewInfoArea}>
              <Text
                numberOfLines={1}
                style={[
                  typography.sectionTitle,
                  styles.videoTitle,
                  {
                    fontSize: screen.scaleFont(15, { min: 14, max: 17 }),
                    lineHeight: screen.scaleFont(18, { min: 16, max: 20 }),
                  },
                ]}
              >
                {videoName || 'Nenhum vídeo selecionado'}
              </Text>
              {videoDetails ? <Text
                style={[
                  typography.caption,
                  styles.videoSubtitle,
                  {
                    fontSize: screen.scaleFont(12, { min: 11, max: 14 }),
                    lineHeight: screen.scaleFont(15, { min: 13, max: 17 }),
                  },
                ]}
              >
                {videoDetails}
              </Text> : null}
            </View>
          </View>

          <View style={styles.qualitySection}>
            <Text
              accessibilityRole='header'
              style={[
                typography.micro,
                styles.sectionLabel,
                {
                  fontSize: screen.scaleFont(12, { min: 11, max: 13 }),
                  lineHeight: screen.scaleFont(15, { min: 14, max: 17 }),
                },
              ]}
            >
              QUALIDADE DO ÁUDIO
            </Text>

            <Text
              style={[
                typography.body,
                styles.qualityDescription,
                {
                  fontSize: screen.scaleFont(13, { min: 12, max: 15 }),
                  lineHeight: screen.scaleFont(16, { min: 15, max: 19 }),
                },
              ]}
            >
              Escolha a qualidade ideal para sua conversão
            </Text>

            <View style={styles.optionsList}>
              {QUALITY_OPTIONS.map(option => {
                const isSelected = selectedQuality === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedQuality(option.id)}
                    accessibilityRole='radio'
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${option.title}. ${option.subtitle}`}
                    style={({ pressed }) => [
                      styles.optionCard,
                      isSelected ? styles.optionCardSelected : styles.optionCardUnselected,
                      pressed && styles.optionCardPressed,
                    ]}
                  >
                    <View style={styles.optionTextColumn}>
                      <Text
                        style={[
                          typography.sectionTitle,
                          styles.optionTitle,
                          {
                            fontSize: screen.scaleFont(15, { min: 14, max: 17 }),
                            lineHeight: screen.scaleFont(18, { min: 16, max: 20 }),
                          },
                        ]}
                      >
                        {option.title}
                      </Text>
                      <Text
                        style={[
                          typography.caption,
                          styles.optionSubtitle,
                          {
                            fontSize: screen.scaleFont(12, { min: 11, max: 14 }),
                            lineHeight: screen.scaleFont(15, { min: 13, max: 17 }),
                          },
                        ]}
                      >
                        {option.subtitle}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioOuter,
                        isSelected ? styles.radioOuterSelected : styles.radioOuterUnselected,
                      ]}
                    >
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={handleConvert}
            disabled={!videoName}
            accessibilityRole='button'
            accessibilityLabel='Converter para áudio'
            accessibilityState={{ disabled: !videoName }}
            style={({ pressed }) => [
              styles.convertButton,
              !videoName && styles.convertButtonDisabled,
              pressed && styles.convertButtonPressed,
            ]}
          >
            <Text
              style={[
                typography.buttonLabel,
                styles.convertButtonText,
                {
                  fontSize: screen.scaleFont(15, { min: 14, max: 17 }),
                  lineHeight: screen.scaleFont(18, { min: 16, max: 20 }),
                },
              ]}
            >
              Converter para áudio
            </Text>
            <Image
              source={arrowRightIcon}
              resizeMode='contain'
              accessible={false}
              style={styles.arrowIcon}
            />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.actionBlueSoft,
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 40,
  },

  contentColumn: {
    width: '100%',
    alignSelf: 'center',
  },

  sectionLabel: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.textMuted72,
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  previewCard: {
    borderRadius: radii.preview,
    backgroundColor: colors.surfaceUploadCircle,
    overflow: 'hidden',
  },

  thumbnailArea: {
    height: 132,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  playButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  playIcon: {
    width: 24,
    height: 24,
    marginLeft: 3,
  },

  previewInfoArea: {
    padding: 16,
    gap: 6,
  },

  videoTitle: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },

  videoSubtitle: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted72,
  },

  qualitySection: {
    marginTop: 28,
  },

  qualityDescription: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted72,
    marginBottom: 16,
  },

  optionsList: {
    gap: 12,
  },

  optionCard: {
    minHeight: 78,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionCardUnselected: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  optionCardSelected: {
    backgroundColor: colors.surfaceUploadCircle,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  optionCardPressed: {
    opacity: 0.85,
  },

  optionTextColumn: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },

  optionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },

  optionSubtitle: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted72,
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterUnselected: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  radioOuterSelected: {
    backgroundColor: colors.primary,
  },

  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },

  convertButton: {
    marginTop: 28,
    minHeight: 56,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },

  convertButtonPressed: {
    opacity: 0.9,
  },

  convertButtonDisabled: {
    opacity: 0.55,
  },

  convertButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },

  arrowIcon: {
    width: 18,
    height: 18,
    position: 'absolute',
    right: 20,
  },
});
