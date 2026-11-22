import React, { useRef, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Card from '../components/Card';
import Input from '../components/Input';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import BottomNavigation from '../components/BottomNavigation';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { getResponsiveContentStyle, globalStyles, responsive } from '../styles';
import { FileAvailability, FileFilters, FileIcon, FileStatus } from './FileScreenParts';
import { filterDownloads, formatFileSize, formatLibraryDate, formatPageCount, getFileFormat, getFileKind, isFileAvailable } from './fileScreenUtils';
import styles from './fileScreenStyles';

const filters = [{ id: 'all', label: 'Todos', width: 72 }, { id: 'video', label: 'Vídeos', width: 78 }, { id: 'audio', label: 'Áudios', width: 78 }, { id: 'pdf', label: 'PDF', width: 64 }];
const categoryLabels = { video: 'Vídeo', audio: 'Áudio', pdf: 'PDF' };

export default function DownloadsScreen({
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
  onTabPress,
  safeAreaEdges,
  showBack = true,
  referenceDate,
  storageError = '',
  storageWarning = '',
  onRetryStorage,
  actionError = '',
  actionMessage = '',
  managingIds = [],
  onShareItem,
  onExportItem,
  onRemoveItem,
  onDeleteFile,
  canDeleteFile,
}) {
  const screen = responsive.useResponsive();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [openError, setOpenError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const confirmationLock = useRef(false);
  const opening = useRef(false);
  const filtered = filterDownloads(items, query, kind);
  const hasNavigation = typeof onTabPress === 'function';

  function clearFilters() {
    setQuery('');
    setKind('all');
  }

  async function openItem(item) {
    if (opening.current) return;
    opening.current = true;
    setOpenError('');
    try { await onOpenItem(item); }
    catch { setOpenError('Não foi possível abrir o arquivo. Verifique sua disponibilidade e o aplicativo compatível.'); }
    finally { opening.current = false; }
  }

  async function confirmAction() {
    if (!pendingAction || confirmationLock.current) return;
    const { item, action } = pendingAction;
    confirmationLock.current = true;
    setPendingAction(null);
    setOpenError('');
    try {
      if (await (action === 'delete' ? onDeleteFile : onRemoveItem)(item)) setExpandedId(null);
    } catch {
      setOpenError(action === 'delete' ? 'Não foi possível excluir o arquivo.' : 'Não foi possível remover o registro.');
    } finally {
      confirmationLock.current = false;
    }
  }

  function renderDownload({ item }) {
    const format = getFileFormat(item);
    const category = categoryLabels[getFileKind(item)];
    const metadata = [
      category, format === category ? '' : format, formatPageCount(item), formatFileSize(item.sizeBytes),
      formatLibraryDate(item.completedAt ?? item.createdAt, referenceDate),
    ].filter(Boolean).join(' • ');
    const hasFile = isFileAvailable(item);
    const canOpen = hasFile && typeof onOpenItem === 'function';
    const canRemove = Boolean(onRemoveItem && !item.deletionPending && ['completed', 'failed', 'cancelled'].includes(item.status));
    const canDelete = Boolean(onDeleteFile && canDeleteFile?.(item) && !item.deletionPending);
    const canShare = hasFile && onShareItem;
    const canExport = hasFile && onExportItem;
    const busy = managingIds.includes(item.id);
    const expanded = expandedId === item.id;
    const hasActions = canRemove || canDelete || canShare || canExport;
    const progressAvailable = item.status !== 'completed' && Number.isFinite(item.progress);
    return (
      <Card style={[styles.card, styles.downloadCard]}>
        <View style={styles.row}>
          <FileIcon item={item} />
          <View style={[styles.details, styles.downloadDetails]}>
            <Text style={styles.fileTitle}>{item.name}</Text>
            {metadata ? <Text style={styles.metadata}>{metadata}</Text> : null}
          </View>
          {canOpen || hasActions ? (
            <View style={styles.fileCardControls}>
              {canOpen ? (
                <Pressable
                  onPress={() => openItem(item)} disabled={busy}
                  accessibilityRole='button'
                  accessibilityLabel={`Abrir ${item.name}`}
                  style={({ pressed }) => [styles.openAction, pressed && styles.pressed]}
                >
                  <Image accessible={false} source={require('../../assets/files/action-background.png')} style={styles.openBackground} />
                  <Image accessible={false} source={require('../../assets/files/open.png')} style={styles.openIcon} />
                </Pressable>
              ) : null}
              {hasActions ? (
                <Pressable accessibilityRole='button' accessibilityLabel={`Ações de ${item.name}`}
                  accessibilityState={{ expanded, disabled: busy }} disabled={busy}
                  onPress={() => setExpandedId(expanded ? null : item.id)} style={styles.fileActionsToggle}>
                  <Text style={styles.fileActionsLabel}>Ações</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        {(item.availability && item.availability !== 'available') || item.deletionPending ? <FileAvailability item={item} /> : null}
        {item.status !== 'completed' ? <FileStatus status={item.status} /> : null}
        {progressAvailable ? <ProgressBar progress={item.progress} accessibilityLabel={`Progresso de ${item.name}`} /> : null}
        {item.status === 'downloading' && !progressAvailable ? <LoadingIndicator size='small' message='Aguardando informações de progresso...' /> : null}
        {['failed', 'paused'].includes(item.status) ? (
          <ErrorMessage message={item.error || 'Não foi possível baixar este arquivo.'}
            onRetry={typeof onRetryItem === 'function' && (canRetryItem ? canRetryItem(item) : !item.remoteStrategy || item.status === 'paused') ? () => onRetryItem(item) : undefined}
            retryLabel={item.status === 'paused' ? 'Retomar acompanhamento' : undefined} />
        ) : null}
        {hasActions && expanded ? (
          <View style={styles.fileActions}>
            {canShare ? <Button title='Compartilhar' variant='outline' size='sm' fullWidth={false} disabled={busy} onPress={() => onShareItem(item)} /> : null}
            {canExport ? <Button title='Exportar cópia' variant='outline' size='sm' fullWidth={false} disabled={busy} onPress={() => onExportItem(item)} /> : null}
            {canRemove ? <Button title='Remover registro' variant='link' size='sm' fullWidth={false} disabled={busy} onPress={() => setPendingAction({ item, action: 'remove' })} /> : null}
            {canDelete ? <Button title='Excluir arquivo' variant='link' size='sm' fullWidth={false} disabled={busy} onPress={() => setPendingAction({ item, action: 'delete' })} /> : null}
          </View>
        ) : null}
      </Card>
    );
  }

  const empty = isLoading ? <LoadingIndicator message='Carregando downloads...' />
    : error ? <ErrorMessage message={error} onRetry={typeof onRetry === 'function' ? onRetry : undefined} />
      : (
        <Card style={styles.empty}>
          <Text accessibilityRole='header' style={styles.heading}>{items.length ? 'Nenhum arquivo encontrado' : 'Nenhum download por enquanto'}</Text>
          <Text style={styles.metadata}>{items.length ? 'Tente outro termo ou filtro.' : 'Seus downloads aparecerão aqui quando estiverem disponíveis.'}</Text>
          {query || kind !== 'all' ? <Button title='Limpar filtros' variant='secondary' onPress={clearFilters} /> : null}
        </Card>
      );

  return (
    <View style={globalStyles.screen} testID='downloads-screen'>
      <SafeAreaView edges={safeAreaEdges || (hasNavigation ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom'])} style={styles.librarySafeArea}>
        <Header
          variant='hero'
          title='Downloads'
          subtitle='Seus arquivos baixados e gerados'
          onBack={showBack ? onBack : undefined}
          logo={<Image accessible={false} source={require('../../assets/files/logo.png')} style={styles.logo} />}
          style={styles.hero}
          contentStyle={[getResponsiveContentStyle(screen.width, 'main'), styles.heroContent]}
        />
        <FlatList
          style={[styles.list, styles.listSurface]}
          contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width, 'main')]}
          data={isLoading || error ? [] : filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderDownload}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              {actionError || openError ? <ErrorMessage message={actionError || openError} /> : null}
              {actionMessage ? <Text accessibilityLiveRegion='polite' style={styles.metadata}>{actionMessage}</Text> : null}
              {storageWarning ? <Text accessibilityRole='alert' style={styles.metadata}>{storageWarning}</Text> : null}
              {storageError && !error ? <ErrorMessage message={storageError} onRetry={onRetryStorage} retryLabel='Tentar salvar dados novamente' /> : null}
              <Input variant='search' value={query} onChangeText={setQuery} placeholder='Buscar arquivos' fieldStyle={styles.searchField}
                leftIcon={<Image accessible={false} source={require('../../assets/files/search.png')} style={styles.searchIcon} />} />
              <FileFilters options={filters} value={kind} onChange={setKind} />
              <Text accessibilityRole='header' style={styles.heading}>Arquivos recentes</Text>
            </View>
          )}
          ListEmptyComponent={empty}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='on-drag'
          onRefresh={typeof onRefresh === 'function' ? onRefresh : undefined}
          refreshing={refreshing}
        />
      </SafeAreaView>
      {hasNavigation ? <BottomNavigation activeTab='downloads' variant='library' onTabPress={onTabPress} /> : null}
      <ConfirmationDialog visible={Boolean(pendingAction)}
        title={pendingAction?.action === 'delete' ? 'Excluir arquivo do dispositivo?' : 'Remover registro de Downloads?'}
        description={pendingAction?.action === 'delete' ? `“${pendingAction.item.name}” será apagado do dispositivo. A atividade continuará no Histórico.`
          : pendingAction ? `“${pendingAction.item.name}” sairá de Downloads. O arquivo e a atividade no Histórico serão preservados.` : undefined}
        confirmLabel={pendingAction?.action === 'delete' ? 'Excluir arquivo' : 'Remover registro'}
        onConfirm={confirmAction} onCancel={() => setPendingAction(null)} />
    </View>
  );
}
