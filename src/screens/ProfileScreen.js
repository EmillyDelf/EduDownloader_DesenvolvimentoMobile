import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Card from '../components/Card';
import BottomNavigation from '../components/BottomNavigation';
import {
  cardStyles,
  colors,
  fontFamilies,
  getResponsiveContentStyle,
  globalStyles,
  radii,
  responsive,
  spacing,
  typography,
} from '../styles';

const logoAsset = require('../../assets/files/logo.png');
const storageIcon = require('../../assets/profile/storage.png');
const qualityIcon = require('../../assets/profile/quality.png');
const helpIcon = require('../../assets/profile/help.png');
const aboutIcon = require('../../assets/profile/about.png');

export default function ProfileScreen({
  userName = 'Usuário EduDownloader',
  userSubtitle = 'Perfil local do aplicativo',
  avatarLabel = 'ED',
  appVersion = 'EduDownloader • versão 1.0',
  onPressStorage,
  onPressQuality,
  onPressHelp,
  onPressAbout,
  onTabPress,
  safeAreaEdges,
}) {
  const screen = responsive.useResponsive();
  const hasNavigation = typeof onTabPress === 'function';
  const avatarSize = screen.scaleSize(72, { min: 60, max: 76 });
  const logoSize = screen.scaleSize(55, { min: 44, max: 60 });

  const preferenceItems = [
    {
      id: 'storage',
      title: 'Armazenamento',
      subtitle: 'Veja o espaço usado pelos arquivos',
      icon: storageIcon,
      onPress: onPressStorage,
      fallbackTitle: 'Armazenamento',
      fallbackMessage: 'O gerenciamento detalhado de espaço usado pelos arquivos ainda está em integração.',
    },
    {
      id: 'quality',
      title: 'Qualidade padrão',
      subtitle: 'Defina preferências de download e conversão',
      icon: qualityIcon,
      onPress: onPressQuality,
      fallbackTitle: 'Qualidade padrão',
      fallbackMessage: 'A configuração de qualidade padrão para downloads e conversões ainda está em integração.',
    },
    {
      id: 'help',
      title: 'Ajuda',
      subtitle: 'Dúvidas e informações de uso',
      icon: helpIcon,
      onPress: onPressHelp,
      fallbackTitle: 'Ajuda',
      fallbackMessage: 'Use as abas inferiores para baixar mídias, converter vídeos da galeria, gerar PDFs e consultar seu histórico.',
    },
    {
      id: 'about',
      title: 'Sobre o app',
      subtitle: appVersion,
      icon: aboutIcon,
      onPress: onPressAbout,
      fallbackTitle: 'Sobre o app',
      fallbackMessage: `${appVersion}\nAplicativo educacional para download, conversão de mídias e criação de PDFs.`,
    },
  ];

  function handlePressItem(item) {
    if (typeof item.onPress === 'function') {
      item.onPress();
      return;
    }
    Alert.alert(item.fallbackTitle, item.fallbackMessage);
  }

  return (
    <View style={globalStyles.screen} testID='profile-screen'>
      <SafeAreaView
        edges={safeAreaEdges || (hasNavigation ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom'])}
        style={styles.heroSafeArea}
      >
        <Header
          variant='hero'
          title='Perfil'
          subtitle='Preferências e informações do aplicativo'
          logo={<Image accessible={false} source={logoAsset} resizeMode='contain' style={{ width: logoSize, height: logoSize, marginRight: 9 }} />}
          style={styles.hero}
          contentStyle={[getResponsiveContentStyle(screen.width, 'main'), styles.heroContent]}
          titleStyle={[
            styles.heroTitle,
            {
              fontSize: screen.scaleFont(24, { min: 20, max: 28 }),
              lineHeight: screen.scaleFont(29, { min: 25, max: 34 }),
            },
          ]}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width, 'main')]}
          showsVerticalScrollIndicator={false}
        >
          <Card variant='profileHighlight' style={styles.profileCard}>
            <View
              style={[
                cardStyles.avatarCircle,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            >
              <Text
                accessible={false}
                style={[
                  styles.avatarText,
                  {
                    fontSize: screen.scaleFont(22, { min: 18, max: 24 }),
                    lineHeight: screen.scaleFont(27, { min: 22, max: 30 }),
                  },
                ]}
              >
                {avatarLabel}
              </Text>
            </View>

            <View style={styles.userInfo}>
              <Text
                style={[
                  typography.cardTitleLg,
                  styles.userName,
                  {
                    fontSize: screen.scaleFont(16, { min: 15, max: 18 }),
                    lineHeight: screen.scaleFont(20, { min: 18, max: 22 }),
                  },
                ]}
              >
                {userName}
              </Text>
              <Text
                style={[
                  typography.caption,
                  styles.userSubtitle,
                  {
                    fontSize: screen.scaleFont(12, { min: 11, max: 14 }),
                    lineHeight: screen.scaleFont(16, { min: 14, max: 18 }),
                  },
                ]}
              >
                {userSubtitle}
              </Text>
            </View>
          </Card>

          <Text
            accessibilityRole='header'
            style={[
              typography.sectionTitle,
              styles.sectionHeading,
              {
                fontSize: screen.scaleFont(18, { min: 16, max: 20 }),
                lineHeight: screen.scaleFont(22, { min: 20, max: 26 }),
              },
            ]}
          >
            Preferências
          </Text>

          <View style={styles.preferencesList}>
            {preferenceItems.map(item => (
              <Card
                key={item.id}
                onPress={() => handlePressItem(item)}
                accessibilityLabel={`${item.title}. ${item.subtitle}`}
                style={styles.preferenceCard}
              >
                <View style={styles.iconBox}>
                  <Image
                    source={item.icon}
                    resizeMode='contain'
                    accessible={false}
                    style={styles.itemIcon}
                  />
                </View>

                <View style={styles.itemTextColumn}>
                  <Text
                    style={[
                      typography.cardTitleCompact,
                      styles.itemTitle,
                      {
                        fontSize: screen.scaleFont(14, { min: 13, max: 16 }),
                        lineHeight: screen.scaleFont(18, { min: 16, max: 20 }),
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      typography.micro,
                      styles.itemSubtitle,
                      {
                        fontSize: screen.scaleFont(11, { min: 10, max: 13 }),
                        lineHeight: screen.scaleFont(14, { min: 13, max: 16 }),
                      },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                <Text accessible={false} style={styles.chevron}>›</Text>
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {hasNavigation ? <BottomNavigation activeTab='profile' variant='library' onTabPress={onTabPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroSafeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  hero: {
    paddingTop: 8,
    paddingBottom: 43,
    paddingHorizontal: 0,
  },

  heroContent: {
    gap: 6,
  },

  heroTitle: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.white,
  },

  scroll: {
    flex: 1,
    backgroundColor: colors.white,
  },

  content: {
    paddingTop: 24,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },

  profileCard: {
    minHeight: 128,
    borderRadius: radii.preview,
    backgroundColor: colors.surfaceUploadCircle,
    borderWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },

  avatarText: {
    fontFamily: fontFamilies.bold,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },

  userName: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },

  userSubtitle: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted67,
  },

  sectionHeading: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 32,
    marginBottom: 12,
  },

  preferencesList: {
    gap: 12,
  },

  preferenceCard: {
    minHeight: 72,
    borderRadius: radii.cardLg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.disabledPrimaryBg,
    paddingHorizontal: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.button,
    backgroundColor: colors.surfaceDashed,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemIcon: {
    width: 20,
    height: 20,
  },

  itemTextColumn: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },

  itemTitle: {
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
    color: colors.primary,
  },

  itemSubtitle: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    color: colors.textMuted67,
  },

  chevron: {
    fontFamily: fontFamilies.regular,
    fontWeight: '400',
    fontSize: 24,
    lineHeight: 28,
    color: colors.textMuted52,
    marginRight: 4,
  },
});
