import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import LoadingIndicator from './src/components/LoadingIndicator';
import AppNavigator from './src/navigation/AppNavigator';
import { globalStyles, typography } from './src/styles';

export default function App({ downloadProps = {}, historyProps = {} }) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold,
  });

  return (
    <SafeAreaProvider>
      {!fontsLoaded && !fontError ? (
        <SafeAreaView style={globalStyles.centeredContainer}>
          <LoadingIndicator message='Carregando Inter e Montserrat...' />
        </SafeAreaView>
      ) : (
        <View style={globalStyles.screen}>
          {fontError ? (
            <SafeAreaView edges={['top', 'left', 'right']}>
              <Text accessibilityRole='alert' style={typography.caption}>
                Não foi possível carregar as fontes. Usando a fonte alternativa do sistema.
              </Text>
            </SafeAreaView>
          ) : null}
          <AppNavigator downloadProps={downloadProps} historyProps={historyProps} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
