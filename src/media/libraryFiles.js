import { cleanFilename, matchesMediaSignature, mediaMimeTypes, MediaError } from './mediaContracts';

export const libraryTypes = {
  MP4: { mimeType: mediaMimeTypes.MP4, kind: 'video', uti: 'public.mpeg-4' },
  MP3: { mimeType: mediaMimeTypes.MP3, kind: 'audio', uti: 'public.mp3' },
  PDF: { mimeType: 'application/pdf', kind: 'pdf', uti: 'com.adobe.pdf' },
};
const generatedPdf = /^([a-zA-Z0-9_-]{1,64})_(\d{13})(?:_\d+)?\.pdf$/;
const pickerCancelled = new Set(['ERR_PICKER_CANCELLED', 'ERR_FILE_PICKING_CANCELLED']);

export function canonicalLocalUri(value) {
  if (typeof value !== 'string' || !value.startsWith('file:///') || value.length > 2048 || /[?#\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const parts = value.slice(8).split('/');
    if (parts.some(part => !part)) return null;
    return 'file:///' + parts.map((part, index) => {
      const name = decodeURIComponent(part);
      if (index === 0 && /^[a-zA-Z]:$/.test(name) && name === part) return name;
      if (name === '.' || name === '..' || /[/\\:\u0000-\u001f\u007f]/.test(name)) throw new Error();
      // Expo Go uses a literal, URL-encoded experience key as a directory name.
      if (/%(?:2[eEfF]|5[cC]|25|00)/.test(name)
        && !(/^data\/(?:user\/\d+|data)\/host\.exp\.exponent\/files\/ExperienceData$/.test(parts.slice(0, index).join('/'))
          && /^%40[A-Za-z0-9_-]+%2[fF][A-Za-z0-9_-]+$/.test(name))) throw new Error();
      return encodeURIComponent(name);
    }).join('/');
  } catch { return null; }
}

const unavailable = () => new MediaError('FILE_MISSING', 'O arquivo foi movido, removido ou deixou de estar acessível.');
const invalid = () => new MediaError('INVALID_LIBRARY_FILE', 'O arquivo ou os metadados não correspondem a um resultado válido.');

export function createLibraryFileServices({ fs, documentDirectory, platform, intentLauncher, sharing, File, FileMode, Directory }) {
  const root = documentDirectory ? canonicalLocalUri(documentDirectory.replace(/\/$/, '')) : null;
  const pdfDirectory = root && `${root}/PDFs/`;
  const downloadDirectory = root && `${root}/edudownloader/downloads/`;
  const conversionDirectory = root && `${root}/edudownloader/conversions/`;
  const available = Boolean(root && ['android', 'ios'].includes(platform));

  function ownership(item, uri) {
    const { id, format, activityType } = item;
    const filename = uri.slice(uri.lastIndexOf('/') + 1);
    if (activityType === 'pdf' && format === 'PDF' && uri === pdfDirectory + filename && generatedPdf.test(filename)
      && (!id || id === 'generated:' + uri)) return 'managed';
    if (activityType === 'conversion' && ['MP3', 'MP4'].includes(format) && uri === conversionDirectory + filename
      && (!id || id === 'generated:' + uri)
      && /^[A-Za-z0-9_-]{1,160}\.(mp3|mp4)$/.test(filename) && filename.endsWith('.' + format.toLowerCase())) return 'managed';
    if ((!activityType || activityType === 'download') && ['MP3', 'MP4'].includes(format)
      && uri.startsWith(downloadDirectory) && /^[A-Za-z0-9_-]+\.(mp3|mp4)$/.test(uri.slice(downloadDirectory.length))
      && (typeof id !== 'string' || filename === id + '.' + format.toLowerCase())) return 'managed';
    return 'external';
  }

  function resolve(item) {
    const uri = canonicalLocalUri(item?.fileUri);
    const type = Object.hasOwn(libraryTypes, item?.format) && libraryTypes[item.format];
    if (!available || item?.status !== 'completed' || !type || !uri || !uri.toLowerCase().endsWith('.' + item.format.toLowerCase())
      || (item.mimeType && item.mimeType !== type.mimeType)) throw new MediaError('NO_LOCAL_FILE', 'Este registro não possui um arquivo local válido.');
    if (uri.startsWith(root + '/edudownloader/library/')) throw invalid();
    const derived = ownership(item, uri);
    if (derived !== 'managed' && item.fileOwnership !== 'external') throw new MediaError('NO_LOCAL_FILE', 'Este registro não possui uma referência externa autorizada.');
    return { uri, type, managed: derived === 'managed' && item.fileOwnership !== 'external' };
  }

  async function stat(uri) {
    try { return await fs.getInfoAsync(uri); }
    catch { throw new MediaError('FILE_PERMISSION', 'Não foi possível acessar o arquivo. Confira as permissões do dispositivo.'); }
  }

  async function existing(item) {
    const resolved = resolve(item);
    if (item.availability === 'deleted') throw unavailable();
    const info = await stat(resolved.uri);
    if (!info?.exists || info.isDirectory || !Number.isSafeInteger(info.size) || info.size <= 0) throw unavailable();
    if (Number.isSafeInteger(item.sizeBytes) && item.sizeBytes !== info.size) {
      throw new MediaError('FILE_CHANGED', 'O conteúdo do arquivo mudou desde o registro.');
    }
    return { ...resolved, size: info.size };
  }

  async function checkPdf(uri, size, pageCount) {
    const handle = new File(uri).open(FileMode.ReadOnly);
    try {
      const textAt = async (offset, length) => {
        handle.offset = offset;
        const bytes = await handle.readBytes(length);
        return Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      };
      const header = await textAt(0, 8);
      const tail = await textAt(Math.max(0, size - 2048), Math.min(size, 2048));
      const xref = Number(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail)?.[1]);
      if (!/^%PDF-[12]\.\d$/.test(header) || !Number.isSafeInteger(xref) || xref < 8 || xref >= size) throw invalid();
      const table = await textAt(xref, Math.min(768, size - xref));
      if (!/^xref\b/.test(table) && !/^\d+\s+\d+\s+obj\b[\s\S]*\/Type\s*\/XRef\b/.test(table)) throw invalid();
    } finally { await handle.close(); }
    try {
      const { PDFDocument } = require('pdf-lib');
      const document = await PDFDocument.load(await new File(uri).bytes(), { throwOnInvalidObject: true, updateMetadata: false });
      const count = document.getPageCount();
      if (count < 1 || (pageCount && pageCount !== count)) throw invalid();
      return count;
    } catch { throw invalid(); }
  }

  async function share(uri, type, dialogTitle) {
    if (!await sharing?.isAvailableAsync?.()) throw new MediaError('NO_APP', 'O compartilhamento está indisponível neste ambiente.');
    await sharing.shareAsync(uri, { mimeType: type.mimeType, UTI: type.uti, dialogTitle });
  }

  return {
    available,
    canExport: available && Boolean(Directory && File),
    async discoverPdfs() {
      if (!available || !File) return [];
      if (!(await stat(pdfDirectory)).exists) return [];
      return (await fs.readDirectoryAsync(pdfDirectory)).flatMap(name => {
        const match = generatedPdf.exec(name);
        return match ? [{ fileUri: pdfDirectory + name, name, completedAt: new Date(Number(match[2])).toISOString() }] : [];
      });
    },
    async verifyGenerated(input) {
      if (!input || !Object.hasOwn(libraryTypes, input.format)
        || !(input.activityType === 'pdf' && input.format === 'PDF'
          || input.activityType === 'conversion' && ['MP3', 'MP4'].includes(input.format))) throw invalid();
      const { name, fileUri, format, activityType, mimeType, pageCount, sizeBytes } = input;
      const uri = canonicalLocalUri(fileUri);
      const type = libraryTypes[format];
      if (!available || !File || !uri || typeof name !== 'string' || !name || name !== cleanFilename(name)
        || !name.toLowerCase().endsWith('.' + format.toLowerCase()) || !uri.toLowerCase().endsWith('.' + format.toLowerCase())
        || (mimeType !== undefined && mimeType !== type.mimeType)
        || (input.fileOwnership !== undefined && !['managed', 'external'].includes(input.fileOwnership))
        || (sizeBytes !== undefined && (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0))
        || (pageCount !== undefined && (!Number.isSafeInteger(pageCount) || pageCount <= 0))
        || (root && (uri.startsWith(root + '/edudownloader/library/') || uri.startsWith(downloadDirectory)))) throw invalid();
      const fileOwnership = input.fileOwnership === 'external' ? 'external' : ownership(input, uri);
      if (fileOwnership === 'external' && input.fileOwnership !== 'external') throw invalid();
      if (activityType === 'pdf' && (fileOwnership !== 'managed' || uri !== pdfDirectory + name)) throw invalid();
      const { size } = await existing({ ...input, status: 'completed', fileOwnership });
      let verifiedPages;
      if (format === 'PDF') verifiedPages = await checkPdf(uri, size, pageCount);
      else {
        const handle = new File(uri).open(FileMode.ReadOnly);
        try {
          if (!matchesMediaSignature(await handle.readBytes(16), format)) throw invalid();
        } finally { await handle.close(); }
      }
      return {
        fileUri: uri, name, format, activityType, kind: type.kind, mimeType: type.mimeType,
        sizeBytes: size, fileOwnership, ...(verifiedPages ? { pageCount: verifiedPages } : {}),
      };
    },
    canDelete(item) {
      try { return Boolean(File) && resolve(item).managed && item.availability !== 'deleted'; }
      catch { return false; }
    },
    async availability(item) {
      if (item.availability === 'deleted') return 'deleted';
      try { await existing(item); return 'available'; }
      catch (error) { return error.code === 'FILE_MISSING' ? 'missing' : 'unavailable'; }
    },
    async deletionOutcome(item) {
      try {
        const { uri, managed } = resolve(item);
        if (!managed) return 'unavailable';
        return (await stat(uri)).exists ? 'available' : 'missing';
      } catch { return 'unavailable'; }
    },
    async open(item) {
      const { uri, type } = await existing(item);
      try {
        if (File?.prototype?.preview && (platform === 'android' || item.format === 'PDF')) {
          await new File(uri).preview({ title: item.name, mimeType: type.mimeType });
        } else if (platform === 'android') {
          const data = await fs.getContentUriAsync(uri);
          await intentLauncher.startActivityAsync('android.intent.action.VIEW', { data, flags: 1, type: type.mimeType });
        } else await share(uri, type, 'Abrir arquivo com aplicativo compatível');
      } catch (error) {
        if (error instanceof MediaError) throw error;
        throw new MediaError('OPEN_FAILED', 'Não foi possível abrir o arquivo. Verifique as permissões e se há um aplicativo compatível.');
      }
    },
    async share(item) {
      const { uri, type } = await existing(item);
      try { await share(uri, type, 'Compartilhar arquivo'); }
      catch (error) {
        if (pickerCancelled.has(error?.code)) return false;
        if (error instanceof MediaError) throw error;
        throw new MediaError('SHARE_FAILED', 'Não foi possível compartilhar este arquivo.');
      }
      return true;
    },
    async export(item) {
      const { uri } = await existing(item);
      if (!Directory || !File) throw new MediaError('EXPORT_UNAVAILABLE', 'O seletor de pastas está indisponível.');
      try {
        const directory = await Directory.pickDirectoryAsync();
        if (!directory) return false;
        const targetName = item.name === cleanFilename(item.name) && item.name.toLowerCase().endsWith('.' + item.format.toLowerCase())
          ? item.name : decodeURIComponent(uri.slice(uri.lastIndexOf('/') + 1));
        // SAF provides a tree URI; it cannot be joined with an ordinary file name.
        const target = directory.uri.startsWith('file:///') ? new File(directory, targetName) : directory;
        if (canonicalLocalUri(target.uri) === uri) throw new Error('Destination is the source');
        await new File(uri).copy(target, { overwrite: false });
      } catch (error) {
        if (pickerCancelled.has(error?.code)) return false;
        throw new MediaError('EXPORT_FAILED', 'Não foi possível exportar. Escolha uma pasta gravável sem um arquivo de mesmo nome.');
      }
      return true;
    },
    async deleteOwned(item) {
      const { uri, managed } = resolve(item);
      if (!managed || item.availability === 'deleted') throw new MediaError('NOT_OWNED', 'Somente arquivos gerenciados pelo aplicativo podem ser excluídos.');
      const before = await stat(uri);
      if (!before.exists) return;
      if (before.isDirectory || (Number.isSafeInteger(item.sizeBytes) && before.size !== item.sizeBytes)) {
        throw new MediaError('FILE_CHANGED', 'O caminho agora contém outro item. A exclusão foi interrompida.');
      }
      try {
        // File.delete targets the single validated file in app-private storage.
        await new File(uri).delete();
      } catch {
        if ((await stat(uri)).exists) throw new MediaError('FILE_DELETE_FAILED', 'Não foi possível excluir o arquivo. Confira as permissões.');
      }
      if ((await stat(uri)).exists) throw new MediaError('FILE_DELETE_FAILED', 'O dispositivo não confirmou a exclusão do arquivo.');
    },
  };
}
