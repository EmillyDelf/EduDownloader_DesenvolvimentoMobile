import React from 'react';
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
  colors,
  globalStyles,
  textVariants,
  useResponsiveContainerStyles,
} from './src/styles';

export default function App() {
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const { centeredScreenContent } = useResponsiveContainerStyles();

  return (
    <View style={globalStyles.screen}>
      <View style={centeredScreenContent}>
        <Text style={[textVariants.heroSuccessTitle, { color: colors.primary }]}>
          Edu Downloader
        </Text>

        <Text style={textVariants.screenSubtitleCentered}>
          Aplicativo iniciado com sucesso!
        </Text>
      </View>
    </View>
  );
}
