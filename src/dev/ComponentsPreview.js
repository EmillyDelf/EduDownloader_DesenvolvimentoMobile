import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import Button from '../components/Button';
import Input from '../components/Input';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import Card from '../components/Card';
import LoadingIndicator from '../components/LoadingIndicator';
import ProgressBar from '../components/ProgressBar';
import ErrorMessage from '../components/ErrorMessage';
import ConfirmationDialog from '../components/ConfirmationDialog';
import colors from '../components/colors';
import { buttonStyles, cardStyles, getResponsiveContentStyle, typography, responsive } from '../styles';

const tabLabels = {
  home: 'Início',
  downloads: 'Downloads',
  pdf: 'PDF',
  history: 'Histórico',
  profile: 'Perfil',
};

export default function ComponentsPreview({ navigation } = {}) {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  const screen = responsive.useResponsive();
  const [activeTab, setActiveTab] = useState('home');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('Demonstração integrada: nove componentes, nova paleta.');
  const [link, setLink] = useState('');
  const [inputError, setInputError] = useState('');
  const [inputEditable, setInputEditable] = useState(true);
  const [cardPresses, setCardPresses] = useState(0);
  const [loadingSize, setLoadingSize] = useState('large');
  const [progress, setProgress] = useState(0);
  const [showPercentage, setShowPercentage] = useState(true);
  const [hasError, setHasError] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [confirmCount, setConfirmCount] = useState(0);
  const [cancelCount, setCancelCount] = useState(0);

  useEffect(() => {
    if (!fontsLoaded && !fontError) {
      return;
    }
    globalThis.__EDU_COMPONENT_DEMO_READY__ = 'nova-paleta-integrada';
    console.info('[EduDownloader] Demonstração integrada montada.');

    return () => {
      delete globalThis.__EDU_COMPONENT_DEMO_READY__;
    };
  }, [fontsLoaded, fontError]);

  function handleButtonPress() {
    setStatus('Botão principal pressionado.');
    Alert.alert('Botão funcionando', 'A ação foi executada.');
  }

  function handleLinkChange(value) {
    setLink(value);
    setInputError('');
  }

  function handleCardPress() {
    setCardPresses(count => count + 1);
    setStatus('Cartão pressionado.');
  }

  function handleRetry() {
    setHasError(false);
    setStatus('Recuperação simulada concluída.');
  }

  function handleConfirm() {
    setDialogVisible(false);
    setConfirmCount(count => count + 1);
    setStatus('Confirmação recebida. Nenhum arquivo foi alterado.');
  }

  function handleCancel() {
    setDialogVisible(false);
    setCancelCount(count => count + 1);
    setStatus('Cancelamento recebido.');
  }

  function handleTabPress(tabId) {
    setActiveTab(tabId);
    setStatus(`Aba selecionada: ${tabLabels[tabId]}.`);
  }

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
      <StatusBar style='dark' />
        <SafeAreaView style={styles.loadingScreen}>
          <LoadingIndicator message='Carregando Inter e Montserrat...' />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style='dark' />
      <View testID='componentes-demo-integrada' style={styles.screen}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
          <Header
            title='Componentes'
            showAccentBar
            onBack={() => navigation?.goBack ? navigation.goBack() : setStatus('Voltar acionado, sem trocar de tela.')}
            rightActionLabel='Ajuda'
            onRightAction={() => Alert.alert('Teste visual', 'Role para testar os nove componentes. Use as cinco abas no rodapé.')}
          />
          <Text accessibilityLiveRegion='polite' style={styles.status}>{status}</Text>

          <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width)]}
              keyboardShouldPersistTaps='handled'
              keyboardDismissMode='on-drag'
            >
              <Text style={styles.description}>
                Aba atual: {tabLabels[activeTab]}. Teste apenas simulações, sem downloads ou conversões.
              </Text>
              <Text accessibilityLiveRegion='polite' style={styles.description}>
                {fontError ? 'Não foi possível carregar as fontes. Demonstração disponível com fonte alternativa.' : 'Tipografia: Inter e Montserrat carregadas.'}
              </Text>
              <Text style={styles.description}>
                Layout: {screen.isTablet ? 'tablet' : screen.isCompact ? 'compacto' : 'celular'} · {Math.round(screen.width)} px.
              </Text>
              <Header variant='hero' title='EduDownloader' subtitle='Componentes oficiais e estilos integrados' />

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>1. Botões</Text>
                <Button title='Botão azul: testar ação' onPress={handleButtonPress} />
                <Button title='Botão desativado' onPress={handleButtonPress} disabled />
                <Button title='Botão secundário' variant='secondary' onPress={() => setStatus('Botão secundário pressionado.')} />
                <Button title='Botão com contorno' variant='outline' onPress={() => setStatus('Botão com contorno pressionado.')} />
                <Button title='Botão de link' variant='link' onPress={() => setStatus('Botão de link pressionado.')} />
                <Button title='Botão compacto' size='sm' fullWidth={false} onPress={() => setStatus('Botão compacto pressionado.')} />
                <View style={styles.progressOptions}>
                  {['Todos', 'Vídeos', 'Áudios', 'PDF'].map(filter => (
                    <Pressable
                      key={filter}
                      onPress={() => setActiveFilter(filter)}
                      accessibilityRole='button'
                      accessibilityState={{ selected: activeFilter === filter }}
                      style={({ pressed }) => [buttonStyles.chip, activeFilter === filter && buttonStyles.chipActive, pressed && buttonStyles.pressed]}
                    >
                      <Text style={activeFilter === filter ? buttonStyles.chipTextActive : buttonStyles.chipText}>{filter}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.description}>Filtro de teste: {activeFilter}</Text>
                <Text style={styles.description}>Confira texto branco, pressão e aparência desativada.</Text>
              </View>

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>2. Campo de texto</Text>
                <Input
                  label='Link do conteúdo'
                  value={link}
                  onChangeText={handleLinkChange}
                  placeholder='https://exemplo.com/aula'
                  keyboardType='url'
                  autoCapitalize='none'
                  autoCorrect={false}
                  editable={inputEditable}
                  error={inputError}
                />
                <Text style={styles.description}>Texto digitado: {link || '(vazio)'}</Text>
                <Input
                  variant='search'
                  label='Busca de exemplo'
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder='Buscar conteúdo de exemplo'
                />
                <Input
                  variant='accent'
                  label='Campo com ação'
                  value={link}
                  onChangeText={handleLinkChange}
                  placeholder='Use a ação Exemplo'
                  rightActionLabel='Exemplo'
                  onRightAction={() => handleLinkChange('https://exemplo.com/aula')}
                  editable={inputEditable}
                  error={inputError}
                  keyboardType='url'
                  autoCapitalize='none'
                  autoCorrect={false}
                />
                <Button
                  title={inputError ? 'Limpar erro do campo' : 'Mostrar erro do campo'}
                  onPress={() => setInputError(inputError ? '' : 'Informe um link válido.')}
                />
                <Button
                  title={inputEditable ? 'Desativar edição' : 'Ativar edição'}
                  onPress={() => setInputEditable(!inputEditable)}
                />
              </View>

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>3. Cartões</Text>
                <Card onPress={handleCardPress} accessibilityLabel='Abrir aula de exemplo'>
                  <Text style={styles.cardTitle}>Aula de exemplo.pdf</Text>
                  <Text style={styles.description}>Toque para simular a abertura.</Text>
                </Card>
                <Text style={styles.description}>Toques no cartão: {cardPresses}</Text>
                <Card>
                  <Text style={styles.cardTitle}>Cartão informativo</Text>
                  <Text style={styles.description}>Superfície branca e contorno azul suave.</Text>
                </Card>
                <Card onPress={handleCardPress} disabled accessibilityLabel='Cartão desativado'>
                  <Text style={styles.cardTitle}>Cartão desativado</Text>
                  <Text style={styles.description}>Tocar aqui não deve aumentar o contador.</Text>
                </Card>
                <Card variant='soft' onPress={handleCardPress} accessibilityLabel='Cartão tonal'>
                  <Text style={styles.cardTitle}>Cartão tonal</Text>
                  <Text style={styles.description}>Mesma ação, com os estilos compartilhados.</Text>
                </Card>
                {['720p', '1080p'].map(quality => (
                  <Card
                    key={quality}
                    variant='selectable'
                    selected={selectedQuality === quality}
                    onPress={() => setSelectedQuality(quality)}
                    accessibilityLabel={`Selecionar qualidade ${quality}`}
                  >
                    <Text style={cardStyles.title}>{quality}</Text>
                    <Text style={styles.description}>{selectedQuality === quality ? 'Selecionado' : 'Toque para selecionar'}</Text>
                  </Card>
                ))}
                <Card variant='dashed' onPress={() => setStatus('Cartão tracejado pressionado.')} accessibilityLabel='Área de seleção de exemplo'>
                  <Text style={styles.cardTitle}>Área de seleção de exemplo</Text>
                  <Text style={styles.description}>Apenas uma demonstração visual.</Text>
                </Card>
              </View>

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>4. Carregamento</Text>
                <LoadingIndicator size={loadingSize} message='Preparando arquivo de exemplo...' />
                <Button
                  title={loadingSize === 'large' ? 'Usar tamanho pequeno' : 'Usar tamanho grande'}
                  onPress={() => setLoadingSize(loadingSize === 'large' ? 'small' : 'large')}
                />
              </View>

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>5. Progresso</Text>
                <ProgressBar progress={progress} showPercentage={showPercentage} />
                <View style={styles.progressOptions}>
                  {[0, 25, 50, 75, 100].map(value => (
                    <Pressable
                      key={value}
                      onPress={() => setProgress(value)}
                      accessibilityRole='button'
                      accessibilityLabel={`Definir progresso em ${value}%`}
                      accessibilityState={{ selected: progress === value }}
                      style={({ pressed }) => [
                        styles.progressOption,
                        progress === value && styles.progressSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[
                        styles.progressText,
                        progress === value && styles.progressTextSelected,
                      ]}>
                        {value}%
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Button
                  title={showPercentage ? 'Ocultar percentual' : 'Mostrar percentual'}
                  onPress={() => setShowPercentage(!showPercentage)}
                />
              </View>

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>6. Erro e recuperação</Text>
                <ErrorMessage
                  message={hasError ? 'Não foi possível carregar o arquivo de exemplo.' : ''}
                  onRetry={handleRetry}
                />
                {!hasError ? (
                  <Text accessibilityLiveRegion='polite' style={styles.description}>Recuperação concluída.</Text>
                ) : null}
                <Button title='Simular erro novamente' onPress={() => setHasError(true)} />
              </View>

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>7. Confirmação</Text>
                <Button title='Abrir confirmação' onPress={() => setDialogVisible(true)} />
                <Text style={styles.description}>
                  Confirmações: {confirmCount} · Cancelamentos: {cancelCount}
                </Text>
                <Text style={styles.description}>
                  Teste Confirmar, Cancelar e, no Android, o voltar do sistema com o diálogo aberto.
                </Text>
              </View>

              <Text style={styles.description}>
                O cabeçalho e o menu ficam disponíveis durante todo o teste. Confira as cinco abas e seus ícones.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />

        <ConfirmationDialog
          visible={dialogVisible}
          title='Confirmar operação de teste?'
          description='Esta ação é apenas uma simulação e não modifica arquivos.'
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirmLabel='Confirmar teste'
          cancelLabel='Cancelar teste'
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },

  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.white,
  },

  status: {
    ...typography.caption,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.blue,
  },

  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: 20,
    gap: 24,
  },

  section: {
    gap: 12,
  },

  heading: {
    ...typography.sectionTitle,
  },

  description: {
    ...typography.body,
  },

  cardTitle: {
    ...typography.cardTitle,
  },

  progressOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  progressOption: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 8,
  },

  progressSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue,
  },

  progressText: {
    ...typography.caption,
    color: colors.blue,
  },

  progressTextSelected: {
    color: colors.lime,
  },

  pressed: {
    opacity: 0.8,
  },
});
