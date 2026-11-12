import { useEffect, useSyncExternalStore } from 'react';
import { getMediaLibrary } from '../media/expoRuntime';

export default function useMediaLibrary(library = getMediaLibrary()) {
  const state = useSyncExternalStore(library.subscribe, library.getSnapshot, library.getSnapshot);
  useEffect(() => { library.initialize(); }, [library]);

  const common = {
    isLoading: state.isLoading, actionError: state.actionError,
    storageError: state.storageError, storageWarning: state.storageWarning, onRetryStorage: library.retryPersistence,
    onOpenItem: library.openItem, onRetryItem: library.capabilities.download ? library.retryItem : undefined,
    onRetry: library.retryPersistence,
  };
  return {
    downloadProps: {
      ...common, items: state.downloads,
      error: !state.downloads.length ? state.storageError : '',
      downloadFlow: {
        ...state.flow, serviceAvailable: library.capabilities.download,
        isPreparingStorage: state.isLoading, storageBlocked: Boolean(state.storageError),
        onChangeUrl: library.setUrl, onPaste: library.paste, onAnalyze: library.analyze,
        onSelectOption: library.selectOption, onStart: library.start, onCancel: library.cancel,
        onReset: () => library.setUrl(''), onOpen: () => library.openItem(state.flow.record),
      },
    },
    historyProps: {
      ...common, items: state.history,
      error: !state.history.length ? state.storageError : '',
      onDeleteItem: library.removeHistory, deletingIds: state.deletingIds,
    },
  };
}
