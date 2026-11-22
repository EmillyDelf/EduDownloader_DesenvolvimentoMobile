import { AppState, Platform } from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { Directory, File, FileMode } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { sha256 } from '@noble/hashes/sha2.js';
import { createDirectMediaIdentifier } from './identifyMedia';
import { createExpoFileServices, createExpoStorage } from './expoAdapters';
import { createMediaRepository } from './mediaRepository';
import { createMediaLibrary } from './mediaLibrary';
import { MediaError } from './mediaContracts';
import { createBackendClient, createBackendSession, createMediaStrategy } from './backendClient';
import { createRemoteJobs } from './remoteJobs';
import { createRemoteTransfer } from './remoteTransfer';

let instance;

function waitForForeground(signal) {
  if (signal.aborted) return Promise.reject(new MediaError('ABORTED', 'Acompanhamento interrompido.'));
  if (!AppState.currentState || AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve, reject) => {
    function abort() {
      subscription.remove();
      reject(new MediaError('ABORTED', 'Acompanhamento interrompido.'));
    }
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      subscription.remove();
      signal.removeEventListener('abort', abort);
      resolve();
    });
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function getMediaLibrary() {
  if (!instance) {
    const files = createExpoFileServices({
      fs: FileSystem, documentDirectory: FileSystem.documentDirectory, platform: Platform.OS,
      intentLauncher: IntentLauncher, sharing: Sharing, Directory, File, FileMode,
    });
    let storage;
    try { storage = createExpoStorage(FileSystem, FileSystem.documentDirectory); }
    catch {
      const unavailable = async () => { throw new MediaError('NO_STORAGE', 'O armazenamento e os downloads locais exigem Android ou iOS compatível.'); };
      storage = { read: unavailable, write: unavailable };
    }
    const session = createBackendSession();
    const client = createBackendClient({
      address: process.env.EXPO_PUBLIC_EDU_API_BASE_URL, allowLoopback: __DEV__,
      getToken: session.getToken, fetchImpl: expoFetch,
    });
    const transfer = createRemoteTransfer({ disk: files.remoteDisk, createHash: () => sha256.create() });
    const remote = client.origin ? createRemoteJobs({ client, transfer, waitForForeground }) : undefined;
    instance = createMediaLibrary({
      identify: createMediaStrategy(createDirectMediaIdentifier(), client, process.env.EXPO_PUBLIC_EDU_BACKEND_SOURCE_HOSTS),
      files, remote, session: remote ? session : undefined,
      repository: createMediaRepository(storage), clipboard: Clipboard,
    });
  }
  return instance;
}
