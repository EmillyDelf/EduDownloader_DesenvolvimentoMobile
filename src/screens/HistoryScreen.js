import React, { useRef, useState } from 'react';
import { Image, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import BottomNavigation from '../components/BottomNavigation';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { getResponsiveContentStyle, globalStyles, responsive } from '../styles';
import { FileFilters, FileIcon, FileStatus } from './FileScreenParts';
import { formatRecordTime, getFileFormat, getHistorySections } from './fileScreenUtils';
import styles from './fileScreenStyles';

const filters = [{ id: 'all', label: 'Tudo' }, { id: 'download', label: 'Downloads' }, { id: 'conversion', label: 'Conversões' }, { id: 'pdf', label: 'PDF' }];
const activityLabels = { download: 'Download', conversion: 'Conversão', pdf: 'PDF' };

export default function HistoryScreen({
  items = [],
  isLoading = false,
  error = '',
  onRetry,
  onRetryItem,
  onOpenItem,
  onRefresh,
  refreshing = false,
  onBack,
  onTabPress,
  referenceDate,
  safeAreaEdges,
  onDeleteItem,
  deletingIds = [],
  storageError = '',
  storageWarning = '',
  onRetryStorage,
  actionError = '',
}) {
  const screen = responsive.useResponsive();
  const [activityType, setActivityType] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [localError, setLocalError] = useState('');
  const deleteLock = useRef(false);
  const openLock = useRef(false);
  const sections = getHistorySections(items, activityType, referenceDate);
  const hasNavigation = typeof onTabPress === 'function';

  async function openItem(item) {
    if (openLock.current) return;
    openLock.current = true;
    setLocalError('');
    try { await onOpenItem(item); }
    catch { setLocalError('Não foi possível abrir o arquivo. Verifique se ele existe e se há um aplicativo compatível.'); }
    finally { openLock.current = false; }
  }

  async function confirmDelete() {
    if (!pendingDelete || deleteLock.current || typeof onDeleteItem !== 'function') return;
    const item = pendingDelete;
    deleteLock.current = true;
    setPendingDelete(null);
    setDeletingId(item.id);
    setLocalError('');
    try {
      if (await onDeleteItem(item) === false) throw new Error('Deletion was not confirmed');
    } catch {
      setLocalError('Não foi possível excluir o registro. Ele foi preservado. Tente novamente.');
    } finally {
      deleteLock.current = false;
      setDeletingId(null);
    }
  }

  function renderRecord({ item }) {
    const metadata = [activityLabels[item.activityType], getFileFormat(item), formatRecordTime(item.completedAt)].filter(Boolean).join(' · ');
    const canOpen = item.status === 'completed' && typeof onOpenItem === 'function';
    return (
      <Card variant='historyItem' style={styles.card} onPress={canOpen ? () => openItem(item) : undefined} accessibilityLabel={canOpen ? `Abrir ${item.name}` : undefined}>
        <View style={styles.row}>
          <FileIcon item={item} history />
          <View style={styles.details}>
            <Text style={styles.fileTitle}>{item.name}</Text>
            {metadata ? <Text style={styles.metadata}>{metadata}</Text> : null}
            <View style={styles.statusRow}><FileStatus status={item.status} /></View>
          </View>
        </View>
        {item.status === 'failed' ? (
          <ErrorMessage message={item.error || 'Esta atividade não foi concluída.'} onRetry={typeof onRetryItem === 'function' ? () => onRetryItem(item) : undefined} />
        ) : null}
        {typeof onDeleteItem === 'function' ? (
          <Button title='Excluir registro' variant='link' size='sm' fullWidth={false}
            accessibilityLabel={`Excluir registro de ${item.name}`}
            disabled={deletingId === item.id || deletingIds.includes(item.id)}
            onPress={event => {
              event?.stopPropagation?.();
              if (!deleteLock.current && !deletingIds.includes(item.id)) setPendingDelete(item);
            }} />
        ) : null}
      </Card>
    );
  }

  const empty = isLoading ? <LoadingIndicator message='Carregando histórico...' />
    : error ? <ErrorMessage message={error} onRetry={typeof onRetry === 'function' ? onRetry : undefined} />
      : (
        <Card style={styles.empty}>
          <Text accessibilityRole='header' style={styles.heading}>{items.length ? 'Nenhuma atividade neste filtro' : 'Seu histórico está vazio'}</Text>
          <Text style={styles.metadata}>{items.length ? 'Escolha outra categoria para visualizar as atividades.' : 'Suas atividades anteriores aparecerão aqui quando estiverem disponíveis.'}</Text>
          {activityType !== 'all' ? <Button title='Mostrar tudo' variant='secondary' onPress={() => setActivityType('all')} /> : null}
        </Card>
      );

  return (
    <View style={globalStyles.screen} testID='history-screen'>
      <SafeAreaView edges={safeAreaEdges || (hasNavigation ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom'])} style={globalStyles.safeArea}>
        <Header
          variant='hero'
          title='Histórico'
          subtitle='Acompanhe suas atividades recentes'
          onBack={onBack}
          logo={<Image accessible={false} source={require('../../assets/files/logo.png')} style={[styles.logo, { marginRight: 9 - screen.heroHorizontalPadding }]} />}
          style={styles.hero}
        />
        {actionError || localError || (storageError && !error) || storageWarning || deletingId ? (
          <View style={styles.actionFeedback}>
            <ErrorMessage message={actionError || localError} />
            {storageWarning ? <Text accessibilityRole='alert' style={styles.metadata}>{storageWarning}</Text> : null}
            {!error ? <ErrorMessage message={storageError} onRetry={onRetryStorage} retryLabel='Tentar salvar dados novamente' /> : null}
            {deletingId ? <LoadingIndicator size='small' message='Excluindo registro do histórico...' /> : null}
          </View>
        ) : null}
        <SectionList
          style={styles.list}
          contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width, 'main')]}
          sections={isLoading || error ? [] : sections}
          keyExtractor={item => String(item.id)}
          renderItem={renderRecord}
          renderSectionHeader={({ section }) => <Text accessibilityRole='header' style={styles.sectionHeader}>{section.title}</Text>}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={<FileFilters options={filters} value={activityType} onChange={setActivityType} />}
          ListEmptyComponent={empty}
          stickySectionHeadersEnabled={false}
          onRefresh={typeof onRefresh === 'function' ? onRefresh : undefined}
          refreshing={refreshing}
        />
      </SafeAreaView>
      {hasNavigation ? <BottomNavigation activeTab='history' onTabPress={onTabPress} /> : null}
      <ConfirmationDialog visible={Boolean(pendingDelete)}
        title='Excluir registro do histórico?'
        description='Somente este registro será removido. O arquivo físico no dispositivo será preservado.'
        confirmLabel='Excluir registro' cancelLabel='Manter registro'
        onConfirm={confirmDelete} onCancel={() => { if (!deleteLock.current) setPendingDelete(null); }} />
    </View>
  );
}
