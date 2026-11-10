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
import Button from './src/components/Button';
import Input from './src/components/Input';
import Header from './src/components/Header';
import BottomNavigation from './src/components/BottomNavigation';
import Card from './src/components/Card';
import LoadingIndicator from './src/components/LoadingIndicator';
import ProgressBar from './src/components/ProgressBar';
import ErrorMessage from './src/components/ErrorMessage';
import ConfirmationDialog from './src/components/ConfirmationDialog';
import colors from './src/components/colors';

const tabLabels = {
  home: 'Início',
  downloads: 'Downloads',
  pdf: 'PDF',
  history: 'Histórico',
  profile: 'Perfil',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
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
    globalThis.__EDU_COMPONENT_DEMO_READY__ = 'nova-paleta-integrada';
    console.info('[EduDownloader] Demonstração integrada montada.');

    return () => {
      delete globalThis.__EDU_COMPONENT_DEMO_READY__;
    };
  }, []);

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

  return (
    <SafeAreaProvider>
      <View testID='componentes-demo-integrada' style={styles.screen}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
          <Header
            title='Componentes'
            onBack={() => setStatus('Voltar acionado, sem trocar de tela.')}
            rightActionLabel='Ajuda'
            onRightAction={() => Alert.alert('Teste visual', 'Role para testar os nove componentes. Use as cinco abas no rodapé.')}
          />
          <Text accessibilityLiveRegion='polite' style={styles.status}>{status}</Text>

          <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps='handled'
              keyboardDismissMode='on-drag'
            >
              <Text style={styles.description}>
                Aba atual: {tabLabels[activeTab]}. Teste apenas simulações, sem downloads ou conversões.
              </Text>

              <View style={styles.section}>
                <Text accessibilityRole='header' style={styles.heading}>1. Botões</Text>
                <Button title='Botão azul: testar ação' onPress={handleButtonPress} />
                <Button title='Botão desativado' onPress={handleButtonPress} disabled />
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

  status: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.blue,
  },

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 20,
    gap: 24,
  },

  section: {
    gap: 12,
  },

  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.blue,
  },

  description: {
    fontSize: 14,
    color: colors.blue,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
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
    fontSize: 14,
    color: colors.blue,
  },

  progressTextSelected: {
    color: colors.lime,
  },

  pressed: {
    opacity: 0.8,
  },
});
