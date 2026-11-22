import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ProgressBar from '../components/ProgressBar';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import Button from '../components/Button';
import { colors, spacing, typography } from '../styles';

export default function PdfProgressScreen({ progress = 0, error, onRetry, onBack }) {
  return (
    <SafeAreaView testID='pdf-progress-screen' style={styles.container} edges={['top', 'left', 'right']}>
      <Header title='Gerando PDF' onBack={error ? onBack : undefined} />
      <View style={styles.content}>
        {error ? <>
          <ErrorMessage message={error} onRetry={onRetry} retryLabel='Tentar novamente' />
          <Button title='Voltar às configurações' variant='outline' onPress={onBack} />
        </> : <>
          <LoadingIndicator message='Preparando suas páginas...' />
          <Text style={styles.description}>Estamos convertendo e organizando as imagens no documento.</Text>
          <ProgressBar progress={progress * 100} style={styles.progress} />
        </>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  description: { ...typography.body, color: colors.textMuted72, textAlign: 'center' },
  progress: { marginTop: spacing.md },
});
