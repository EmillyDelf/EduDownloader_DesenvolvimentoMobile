import React, { useState } from 'react';
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
import MediaDownloadForm from './MediaDownloadForm';
import { getResponsiveContentStyle, globalStyles, responsive } from '../styles';
import { FileFilters, FileIcon, FileStatus } from './FileScreenParts';
import { filterDownloads, formatFileSize, getFileFormat } from './fileScreenUtils';
import styles from './fileScreenStyles';

const filters = [{ id: 'all', label: 'Todos' }, { id: 'video', label: 'Vídeos' }, { id: 'audio', label: 'Áudios' }, { id: 'pdf', label: 'PDF' }];

export default function DownloadsScreen({
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
  safeAreaEdges,
  downloadFlow,
  storageError = '',
  storageWarning = '',
  onRetryStorage,
  actionError = '',
}) {
  const screen = responsive.useResponsive();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [openError, setOpenError] = useState('');
  const filtered = filterDownloads(items, query, kind);
  const hasNavigation = typeof onTabPress === 'function';

  function clearFilters() {
    setQuery('');
    setKind('all');
  }

  async function openItem(item) {
    setOpenError('');
    try { await onOpenItem(item); }
    catch { setOpenError('Não foi possível abrir o arquivo. Verifique sua disponibilidade e o aplicativo compatível.'); }
  }

  function renderDownload({ item }) {
    const metadata = [getFileFormat(item), formatFileSize(item.sizeBytes)].filter(Boolean).join(' · ');
    const canOpen = item.status === 'completed' && typeof onOpenItem === 'function';
    const progressAvailable = item.status === 'completed' || Number.isFinite(item.progress);
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <FileIcon item={item} />
          <View style={styles.details}>
            <Text style={styles.fileTitle}>{item.name}</Text>
            {metadata ? <Text style={styles.metadata}>{metadata}</Text> : null}
          </View>
          {canOpen ? (
            <Pressable
              onPress={() => openItem(item)}
              accessibilityRole='button'
              accessibilityLabel={`Abrir ${item.name}`}
              style={({ pressed }) => [styles.openAction, pressed && styles.pressed]}
            >
              <Image accessible={false} source={require('../../assets/files/action-background.png')} style={styles.openBackground} />
              <Image accessible={false} source={require('../../assets/files/open.png')} style={styles.openIcon} />
            </Pressable>
          ) : null}
        </View>
        <FileStatus status={item.status} />
        {progressAvailable ? <ProgressBar progress={item.status === 'completed' ? 100 : item.progress} accessibilityLabel={`Progresso de ${item.name}`} /> : null}
        {item.status === 'downloading' && !progressAvailable ? <LoadingIndicator size='small' message='Aguardando informações de progresso...' /> : null}
        {item.status === 'failed' ? (
          <ErrorMessage message={item.error || 'Não foi possível baixar este arquivo.'} onRetry={typeof onRetryItem === 'function' ? () => onRetryItem(item) : undefined} />
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
      <SafeAreaView edges={safeAreaEdges || (hasNavigation ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom'])} style={globalStyles.safeArea}>
        <Header
          variant='hero'
          title='Downloads'
          subtitle='Seus arquivos baixados e gerados'
          onBack={onBack}
          logo={<Image accessible={false} source={require('../../assets/files/logo.png')} style={[styles.logo, { marginRight: 9 - screen.heroHorizontalPadding }]} />}
          style={styles.hero}
        />
        <FlatList
          style={styles.list}
          contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width, 'main')]}
          data={isLoading || error ? [] : filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderDownload}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <MediaDownloadForm flow={downloadFlow} />
              <ErrorMessage message={actionError || openError} />
              {storageWarning ? <Text accessibilityRole='alert' style={styles.metadata}>{storageWarning}</Text> : null}
              {!error ? <ErrorMessage message={storageError} onRetry={onRetryStorage} retryLabel='Tentar salvar dados novamente' /> : null}
              <Input variant='search' value={query} onChangeText={setQuery} placeholder='Buscar arquivos' leftIcon={<Image accessible={false} source={require('../../assets/files/search.png')} style={styles.searchIcon} />} />
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
      {hasNavigation ? <BottomNavigation activeTab='downloads' onTabPress={onTabPress} /> : null}
    </View>
  );
}
