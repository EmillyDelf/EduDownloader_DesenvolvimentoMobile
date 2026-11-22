import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Button from '../components/Button';
import Input from '../components/Input';
import { colors, spacing, typography, getResponsiveContentStyle, responsive } from '../styles';

const sizes = ['A4', 'Letter', 'Legal'];
const orientations = [{ value: 'portrait', label: 'Retrato' }, { value: 'landscape', label: 'Paisagem' }];

export default function PdfSettingsScreen({ images = [], initialSettings, onBack, onGenerate }) {
  const screen = responsive.useResponsive();
  const [name, setName] = useState(initialSettings?.name || 'Meu documento');
  const [pageSize, setPageSize] = useState(initialSettings?.pageSize || 'A4');
  const [orientation, setOrientation] = useState(initialSettings?.orientation || 'portrait');
  const [margin, setMargin] = useState(String(initialSettings?.margin ?? 10));
  const validMargin = /^\d{1,2}$/.test(margin) && Number(margin) <= 50;
  const settings = { name: name.trim(), pageSize, orientation, margin: Number(margin) };

  return (
    <SafeAreaView testID='pdf-settings-screen' style={styles.container} edges={['top', 'left', 'right']}>
      <Header title='Configurar PDF' onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width)]} keyboardShouldPersistTaps='handled'>
        <Text style={styles.title}>Configure seu documento</Text>
        <Text style={styles.description}>{images.length} página(s) • Defina como o PDF será criado.</Text>

        <Input value={name} onChangeText={setName} placeholder='Meu documento' label='Nome do arquivo' autoCapitalize='sentences' inputStyle={styles.input} />
        <Text style={styles.label}>Tamanho da página</Text>
        <View style={styles.options}>
          {sizes.map(size => <Button key={size} title={size} size='sm' fullWidth={false} variant={pageSize === size ? 'primary' : 'outline'} onPress={() => setPageSize(size)} style={styles.option} />)}
        </View>
        <Text style={styles.label}>Orientação</Text>
        <View style={styles.options}>
          {orientations.map(option => <Button key={option.value} title={option.label} size='sm' fullWidth={false} variant={orientation === option.value ? 'primary' : 'outline'} onPress={() => setOrientation(option.value)} style={styles.option} />)}
        </View>
        <Input value={margin} onChangeText={setMargin} placeholder='10' label='Margens (mm)' keyboardType='number-pad' autoCapitalize='none' error={!validMargin ? 'Informe um valor entre 0 e 50 mm.' : undefined} inputStyle={styles.input} />
        <Text style={styles.hint}>Use um valor entre 0 e 50 mm. As imagens serão ajustadas proporcionalmente, sem distorção.</Text>
        <Button title='Gerar PDF' onPress={() => onGenerate?.(settings)} disabled={!settings.name || !validMargin || !images.length} style={styles.submit} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg, paddingBottom: 36, gap: spacing.sm },
  title: { ...typography.sectionTitle, color: colors.primary, marginBottom: 4 },
  description: { ...typography.body, color: colors.textMuted72, marginBottom: spacing.md },
  label: { ...typography.cardTitle, color: colors.primary, marginTop: spacing.sm },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, color: colors.textPrimary, backgroundColor: colors.white },
  options: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: { flexGrow: 1, minWidth: 90 },
  hint: { ...typography.caption, color: colors.textMuted72 },
  submit: { marginTop: spacing.lg },
});
