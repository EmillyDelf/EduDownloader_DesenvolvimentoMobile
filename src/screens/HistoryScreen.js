import React, { useRef, useState } from 'react';
import { Image, Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import BottomNavigation from '../components/BottomNavigation';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { getResponsiveContentStyle, globalStyles, responsive } from '../styles';
import { FileAvailability, FileFilters, FileIcon, FileStatus } from './FileScreenParts';
import { formatPageCount, formatRecordTime, getFileFormat, getHistorySections, getStatusLabel, isFileAvailable } from './fileScreenUtils';
import styles from './fileScreenStyles';

const filters = [{ id: 'all', label: 'Tudo', width: 64 }, { id: 'download', label: 'Downloads', width: 92 }, { id: 'conversion', label: 'Conversões', width: 96 }, { id: 'pdf', label: 'PDF', width: 64 }];
const activityLabels = { download: 'Download', conversion: 'Conversão', pdf: 'PDF' };

export default function HistoryScreen({
  items = [],
  isLoading = false,
  error = '',
  onRetry,
  onRetryItem,
  canRetryItem,
  onOpenItem,
  onRefresh,
  refreshing = false,
  onBack,
  showBack = true,
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
    const activity = activityLabels[item.activityType];
    const format = getFileFormat(item);
    const metadata = [activity, item.quality || formatPageCount(item) || (format === activity ? '' : format), formatRecordTime(item.completedAt)].filter(Boolean).join(' • ');
    const canOpen = isFileAvailable(item) && typeof onOpenItem === 'function';
    const description = (
      <>
        <Text style={styles.fileTitle}>{item.name}</Text>
        {metadata ? <Text style={styles.metadata}>{metadata}</Text> : null}
      </>
    );
    return (
      <Card variant='historyItem' style={[styles.card, styles.historyCard]}>
        <View style={[styles.row, styles.historyRow]}>
          <FileIcon item={item} history />
          <View style={styles.details}>
            {canOpen ? (
              <Pressable accessibilityRole='button' accessibilityLabel={`Abrir ${item.name}`}
                accessibilityHint={[metadata, getStatusLabel(item.status)].filter(Boolean).join('. ')}
                hitSlop={{ top: 8, left: 4, right: 4 }} onPress={() => openItem(item)}
                style={({ pressed }) => [styles.historyDescription, pressed && styles.pressed]}>
                {description}
              </Pressable>
            ) : <View style={styles.historyDescription}>{description}</View>}
            <View style={styles.statusRow}>
              {typeof onDeleteItem === 'function' ? (
                <Button title='Excluir' variant='link' size='sm' fullWidth={false} style={styles.historyDelete} textStyle={styles.deleteLabel}
                  accessibilityLabel={`Excluir registro de ${item.name}`}
                  disabled={deletingId === item.id || deletingIds.includes(item.id)}
                  onPress={() => { if (!deleteLock.current && !deletingIds.includes(item.id)) setPendingDelete(item); }} />
              ) : null}
              <FileStatus status={item.status} />
            </View>
          </View>
        </View>
        {(item.availability && item.availability !== 'available') || item.deletionPending ? <FileAvailability item={item} /> : null}
        {item.status === 'failed' ? (
          <ErrorMessage message={item.error || 'Esta atividade não foi concluída.'}
            onRetry={typeof onRetryItem === 'function' && (canRetryItem ? canRetryItem(item) : !item.remoteStrategy) ? () => onRetryItem(item) : undefined} />
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
      <SafeAreaView edges={safeAreaEdges || (hasNavigation ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom'])} style={styles.librarySafeArea}>
        <Header
          variant='hero'
          title='Histórico'
          subtitle='Acompanhe suas atividades recentes'
          onBack={showBack ? onBack : undefined}
          logo={<Image accessible={false} source={require('../../assets/files/logo.png')} style={styles.logo} />}
          style={styles.hero}
          contentStyle={[getResponsiveContentStyle(screen.width, 'main'), styles.heroContent]}
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
          style={[styles.list, styles.listSurface]}
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
      {hasNavigation ? <BottomNavigation activeTab='history' variant='library' onTabPress={onTabPress} /> : null}
      <ConfirmationDialog visible={Boolean(pendingDelete)}
        title='Excluir registro do histórico?'
        description='Somente este registro será removido. O arquivo físico no dispositivo será preservado.'
        confirmLabel='Excluir registro' cancelLabel='Manter registro'
        onConfirm={confirmDelete} onCancel={() => { if (!deleteLock.current) setPendingDelete(null); }} />
    </View>
  );
}
