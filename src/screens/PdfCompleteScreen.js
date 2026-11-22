import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Directory, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Header from '../components/Header';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import { colors, spacing, typography } from '../styles';
import { formatFileSize } from './fileScreenUtils';

export default function PdfCompleteScreen({ result, onNewPdf, onBack, libraryError, onRetryLibrary }) {
  const [busy, setBusy] = useState(false);
  const actionRunning = useRef(false);

  async function performFileAction(action, errorTitle, errorMessage) {
    if (actionRunning.current) return;
    actionRunning.current = true;
    setBusy(true);
    try {
      const file = new File(result.uri);
      if (!file.exists) {
        Alert.alert('PDF indisponível', 'O arquivo foi movido ou removido.');
        return;
      }
      await action(file);
    } catch {
      Alert.alert(errorTitle, errorMessage);
    } finally {
      actionRunning.current = false;
      setBusy(false);
    }
  }

  function preview() {
    return performFileAction(
      file => file.preview({ title: result.name, mimeType: 'application/pdf' }),
      'Visualização indisponível',
      'Não foi possível abrir este PDF no visualizador do dispositivo.',
    );
  }

  function exportPdf() {
    return performFileAction(async file => {
      let directory;
      try {
        directory = await Directory.pickDirectoryAsync();
      } catch (error) {
        if (['ERR_PICKER_CANCELLED', 'ERR_FILE_PICKING_CANCELLED'].includes(error?.code)) return;
        throw error;
      }
      await file.copy(directory, { overwrite: false });
      Alert.alert('PDF exportado', result.name);
    }, 'Não foi possível exportar', 'Escolha uma pasta onde seja possível salvar uma nova cópia do PDF.');
  }

  function share() {
    return performFileAction(async file => {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartilhamento indisponível', 'Use a opção de exportar o PDF para uma pasta.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Compartilhar PDF',
      });
    }, 'Não foi possível compartilhar', 'Tente compartilhar o PDF novamente.');
  }

  return (
    <SafeAreaView testID='pdf-complete-screen' style={styles.container} edges={['top', 'left', 'right']}>
      <Header title='PDF concluído' onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
          <Text accessible={false} style={styles.success}>✓</Text>
          <Text accessibilityRole='header' style={styles.title}>Seu PDF está pronto!</Text>
          <Text style={styles.description}>{result.name}</Text>
          <Text style={styles.meta}>{result.pageCount} página(s) • {formatFileSize(result.size)}</Text>
          {libraryError ? <ErrorMessage message={libraryError} onRetry={onRetryLibrary} retryLabel='Registrar PDF novamente' /> : null}
          <Button title='Visualizar PDF' onPress={preview} disabled={busy} style={styles.action} />
          <Button title='Exportar PDF' onPress={exportPdf} disabled={busy} variant='outline' style={styles.action} />
          <Button title='Compartilhar PDF' onPress={share} disabled={busy} variant='outline' style={styles.action} />
          <Button title='Criar outro PDF' onPress={onNewPdf} disabled={busy} variant='link' style={styles.action} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  column: { alignItems: 'center', width: '100%', maxWidth: 480 },
  success: { fontSize: 58, color: colors.successDark, marginBottom: spacing.md },
  title: { ...typography.sectionTitle, color: colors.primary, textAlign: 'center' },
  description: { ...typography.body, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.md },
  meta: { ...typography.caption, color: colors.textMuted72, marginTop: spacing.sm, marginBottom: spacing.xl },
  action: { marginTop: spacing.md, width: '100%' },
});
