import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import DownloadsScreen from '../screens/DownloadsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LoadingIndicator from '../components/LoadingIndicator';
import Header from '../components/Header';
import { buttonStyles, colors, globalStyles, spacing, typography } from '../styles';
import { downloadFixtures, historyFixtures, previewReferenceDate } from './downloadHistoryFixtures';

const scenarios = [{ id: 'populated', label: 'Preenchido' }, { id: 'empty', label: 'Vazio' }, { id: 'loading', label: 'Carregando' }, { id: 'error', label: 'Erro' }];

export default function DownloadsHistoryPreview({ onBack } = {}) {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold });
  const [screen, setScreen] = useState('downloads');
  const [scenario, setScenario] = useState('populated');
  const [downloads, setDownloads] = useState(downloadFixtures);
  const [history, setHistory] = useState(historyFixtures);
  const [feedback, setFeedback] = useState('Nenhuma operação real será executada.');

  function chooseScenario(value) {
    setScenario(value);
    setDownloads(downloadFixtures);
    setHistory(historyFixtures);
    setFeedback('Cenário de teste selecionado.');
  }

  function handleTabPress(tab) {
    if (tab === 'downloads' || tab === 'history') {
      setScreen(tab);
    } else {
      Alert.alert('Prévia isolada', 'Somente Downloads e Histórico fazem parte deste teste.');
    }
  }

  function handleRetryItem(item) {
    if (screen === 'downloads') {
      setDownloads(current => current.map(record => record.id === item.id ? { ...record, status: 'completed', progress: 100, error: '' } : record));
    } else {
      setHistory(current => current.map(record => record.id === item.id ? { ...record, status: 'completed', error: '' } : record));
    }
    setFeedback('Nova tentativa simulada: item de teste marcado como concluído.');
  }

  if (!fontsLoaded && !fontError) {
    return <SafeAreaProvider><SafeAreaView style={globalStyles.centeredContainer}><LoadingIndicator message='Carregando fontes da prévia...' /></SafeAreaView></SafeAreaProvider>;
  }

  const props = {
    isLoading: scenario === 'loading',
    error: scenario === 'error' ? 'Falha de carregamento simulada para teste.' : '',
    onRetry: () => { setScenario('populated'); setFeedback('Recuperação simulada concluída.'); },
    onRetryItem: handleRetryItem,
    onOpenItem: item => Alert.alert('Arquivo fictício', `${item.name}\nEsta prévia não abre nem cria arquivos.`),
    onTabPress: handleTabPress,
    safeAreaEdges: ['left', 'right'],
  };

  return (
    <SafeAreaProvider>
      <StatusBar style='dark' />
      <SafeAreaView edges={['top', 'left', 'right']} style={globalStyles.screen}>
        {onBack ? <Header title='Prévia · dados fictícios' onBack={onBack} /> : null}
        <View style={styles.controls}>
          <Text accessibilityRole='header' style={styles.title}>PRÉVIA · DADOS FICTÍCIOS DE TESTE</Text>
          <Text accessibilityLiveRegion='polite' style={styles.feedback}>{feedback}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
            {scenarios.map(option => (
              <Pressable key={option.id} onPress={() => chooseScenario(option.id)} accessibilityRole='button' accessibilityState={{ selected: scenario === option.id }} style={({ pressed }) => [buttonStyles.chip, scenario === option.id && buttonStyles.chipActive, pressed && buttonStyles.pressed]}>
                <Text style={scenario === option.id ? buttonStyles.chipTextActive : buttonStyles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        {screen === 'downloads'
          ? <DownloadsScreen {...props} items={scenario === 'empty' ? [] : downloads} />
          : <HistoryScreen {...props} items={scenario === 'empty' ? [] : history} referenceDate={previewReferenceDate} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.overline,
    color: colors.blue,
  },
  feedback: {
    ...typography.caption,
  },
  options: {
    gap: spacing.sm,
  },
});
