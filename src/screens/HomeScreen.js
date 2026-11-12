import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import {
  colors,
  globalStyles,
  headerStyles,
  responsive,
  typography,
} from '../styles';

const homeLogo = require('../../assets/screens/logo-home.png');

export default function HomeScreen({ navigation, onTabPress }) {
  const screen = responsive.useResponsive();

  const cardsContainerStyle = {
    width: '100%',
    maxWidth: screen.mainContentWidth,
    alignSelf: 'center',
    paddingTop: screen.scaleSize(88, { min: 28, max: 92 }),
    paddingBottom: screen.scaleSize(32, { min: 20, max: 40 }),
    gap: screen.scaleSize(54, { min: 20, max: 54 }),
  };

  const titleStyle = {
    ...typography.sectionTitle,
    fontSize: screen.scaleFont(18, { min: 16, max: 20 }),
    lineHeight: screen.scaleFont(22, { min: 20, max: 26 }),
    color: colors.primary,
  };

  const subtitleStyle = {
    ...typography.caption,
    fontSize: screen.scaleFont(12, { min: 11, max: 14 }),
    lineHeight: screen.scaleFont(15, { min: 14, max: 18 }),
    color: colors.textMuted72,
  };

  const arrowStyle = {
    ...typography.pageTitle,
    fontSize: screen.scaleFont(24, { min: 20, max: 28 }),
    lineHeight: screen.scaleFont(29, { min: 24, max: 34 }),
    color: colors.primary,
  };

  const horizontalMargin = screen.isTablet ? 24 : screen.isCompact ? 16 : 20;

  return (
    <View testID='home-screen' style={globalStyles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.heroSafeArea}>
        <Header
          variant='hero'
          title='Olá!'
          subtitle='Oque deseja fazer hoje?'
          logo={homeLogo}
          contentStyle={headerStyles.heroContentHome}
        />
      </SafeAreaView>

      <ScrollView
        style={globalStyles.screen}
        contentContainerStyle={[styles.scrollBody, { paddingHorizontal: horizontalMargin }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={cardsContainerStyle}>
          <Card
            variant='soft'
            onPress={() => onTabPress?.('downloads')}
            accessibilityLabel='Download de mídia. Baixe vídeos e áudios em MP4 ou MP3'
            style={styles.primaryActionCard}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardTextGroup}>
                <Text style={titleStyle}>Download de mídia</Text>
                <Text style={subtitleStyle}>Baixe vídeos e áudios em MP4 ou MP3</Text>
              </View>
              <Text accessible={false} style={arrowStyle}>→</Text>
            </View>
          </Card>

          <Card
            variant='soft'
            onPress={() => navigation?.navigate('ConvertGalleryVideo')}
            accessibilityLabel='Converter vídeo. Transforme vídeos da galeria em áudio'
            style={styles.secondaryActionCard}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardTextGroup}>
                <Text style={titleStyle}>Converter vídeo</Text>
                <Text style={subtitleStyle}>Transforme vídeos da galeria em áudio</Text>
              </View>
              <Text accessible={false} style={arrowStyle}>→</Text>
            </View>
          </Card>

          <Card
            variant='soft'
            onPress={() => onTabPress?.('pdf')}
            accessibilityLabel='Ferramentas de PDF. Crie e organize arquivos em PDF'
            style={styles.secondaryActionCard}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardTextGroup}>
                <Text style={titleStyle}>Ferramentas de PDF</Text>
                <Text style={subtitleStyle}>Crie e organize arquivos em PDF</Text>
              </View>
              <Text accessible={false} style={arrowStyle}>→</Text>
            </View>
          </Card>
          <Button
            title='Demonstração dos componentes'
            variant='link'
            onPress={() => navigation?.navigate('ComponentsPreview')}
          />
          <Button
            title='Prévia de Downloads e Histórico (dados fictícios)'
            variant='link'
            onPress={() => navigation?.navigate('FilesPreview')}
          />
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  heroSafeArea: {
    backgroundColor: colors.primary,
  },

  scrollBody: {
    flexGrow: 1,
    backgroundColor: colors.white,
  },

  primaryActionCard: {
    borderWidth: 0,
    backgroundColor: colors.surfaceActionPrimary,
  },

  secondaryActionCard: {
    borderWidth: 0,
    backgroundColor: colors.surfaceActionSecondary,
  },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  cardTextGroup: {
    flex: 1,
    gap: 14,
  },
});
