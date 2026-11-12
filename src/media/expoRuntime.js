import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { createDirectMediaIdentifier } from './identifyMedia';
import { createExpoFileServices, createExpoStorage } from './expoAdapters';
import { createMediaRepository } from './mediaRepository';
import { createMediaLibrary } from './mediaLibrary';
import { MediaError } from './mediaContracts';

let instance;

export function getMediaLibrary() {
  if (!instance) {
    const files = createExpoFileServices({ fs: FileSystem, documentDirectory: FileSystem.documentDirectory, platform: Platform.OS, intentLauncher: IntentLauncher, sharing: Sharing });
    let storage;
    try { storage = createExpoStorage(FileSystem, FileSystem.documentDirectory); }
    catch {
      const unavailable = async () => { throw new MediaError('NO_STORAGE', 'O armazenamento e os downloads locais exigem Android ou iOS compatível.'); };
      storage = { read: unavailable, write: unavailable };
    }
    instance = createMediaLibrary({ identify: createDirectMediaIdentifier(), files, repository: createMediaRepository(storage), clipboard: Clipboard });
  }
  return instance;
}
