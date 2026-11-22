import { useEffect, useSyncExternalStore } from 'react';
import { getMediaLibrary } from '../media/expoRuntime';

export default function useMediaLibrary(library = getMediaLibrary()) {
  const state = useSyncExternalStore(library.subscribe, library.getSnapshot, library.getSnapshot);
  useEffect(() => { library.initialize(); }, [library]);

  const common = {
    isLoading: state.isLoading, actionError: state.actionError,
    storageError: state.storageError, storageWarning: state.storageWarning, onRetryStorage: library.retryPersistence,
    onOpenItem: library.openItem, onRetryItem: library.capabilities.download ? library.retryItem : undefined,
    canRetryItem: item => (!item.activityType || item.activityType === 'download') && (!item.remoteStrategy || item.status === 'paused'),
    onRetry: library.retryPersistence, onRefresh: library.refresh, refreshing: state.refreshing,
  };
  return {
    onUnmount: library.suspend,
    onPrepareFiles: library.initialize,
    onRegisterGeneratedFile: library.registerGeneratedFile,
    onRefreshFiles: library.refresh,
    downloadProps: {
      ...common, items: state.downloads,
      error: !state.downloads.length ? state.storageError : '',
      actionMessage: state.actionMessage, managingIds: state.managingIds,
      onShareItem: library.capabilities.fileManagement ? library.shareItem : undefined,
      onExportItem: library.capabilities.export ? library.exportItem : undefined,
      onRemoveItem: library.removeDownload, onDeleteFile: library.deleteFile, canDeleteFile: library.canDeleteFile,
    },
    downloadFlow: {
      ...state.flow, serviceAvailable: library.capabilities.download,
      isPreparingStorage: state.isLoading, storageBlocked: !state.storageReady,
      storageError: state.storageError, onRetryStorage: library.retryPersistence,
      onChangeUrl: library.setUrl, onPaste: library.paste, onAnalyze: library.analyze,
      onStopAnalysis: library.stopAnalysis, onResume: () => library.retryItem(state.flow.record),
      backendAvailable: library.capabilities.backend, hasBackendToken: state.hasBackendToken, onSetBackendToken: library.setBackendToken,
      onSelectOption: library.selectOption, onStart: library.start, onCancel: library.cancel,
      onReset: () => library.setUrl('', { resetRetry: true }), onOpen: () => library.openItem(state.flow.record),
    },
    historyProps: {
      ...common, items: state.history,
      error: !state.history.length ? state.storageError : '',
      onDeleteItem: library.removeHistory, deletingIds: state.deletingIds,
    },
  };
}
