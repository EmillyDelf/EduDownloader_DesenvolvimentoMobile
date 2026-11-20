import { PDFDocument } from 'pdf-lib';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File, Directory, Paths } from 'expo-file-system';

export const PDF_PAGE_SIZES = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

export function sanitizePdfName(value = 'documento') {
  const safe = String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  return safe || 'documento';
}

export function calculateImagePlacement(imageWidth, imageHeight, pageWidth, pageHeight, margin) {
  const availableWidth = Math.max(1, pageWidth - margin * 2);
  const availableHeight = Math.max(1, pageHeight - margin * 2);
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

function getPageDimensions(settings) {
  const pageSize = Object.hasOwn(PDF_PAGE_SIZES, settings.pageSize) ? settings.pageSize : 'A4';
  const [baseWidth, baseHeight] = PDF_PAGE_SIZES[pageSize];
  return settings.orientation === 'landscape'
    ? [Math.max(baseWidth, baseHeight), Math.min(baseWidth, baseHeight)]
    : [Math.min(baseWidth, baseHeight), Math.max(baseWidth, baseHeight)];
}

function discardFile(file) {
  try {
    if (file.exists) file.delete();
  } catch {
    // Cleanup must not hide the error that interrupted generation.
  }
}

export async function generatePdf({ images, settings, onProgress = () => {} }) {
  if (!Array.isArray(images) || images.length === 0) throw new Error('Adicione ao menos uma imagem.');
  if (images.length > 20) throw new Error('O PDF aceita no máximo 20 imagens.');

  const pdf = await PDFDocument.create();
  const [pageWidth, pageHeight] = getPageDimensions(settings);
  const margin = Math.max(0, Math.min(50, Number(settings.margin) || 0)) * 72 / 25.4;
  const documentName = sanitizePdfName(settings.name);
  const safeMargin = Math.min(margin, Math.min(pageWidth, pageHeight) / 2 - 1);

  for (let index = 0; index < images.length; index += 1) {
    const source = images[index];
    if (!source?.uri) throw new Error(`A imagem ${index + 1} não possui um arquivo válido.`);

    // Resize only the longest edge; the manipulator derives the other edge proportionally.
    const sourceWidth = Number(source.width) || 2200;
    const sourceHeight = Number(source.height) || 2200;
    const resizeTarget = sourceWidth >= sourceHeight
      ? { width: Math.min(sourceWidth, 2200) }
      : { height: Math.min(sourceHeight, 2200) };
    // SDK 58 exports the manipulator as a named native-module class.
    // The module namespace itself does not expose a top-level `manipulate` function.
    const manipulationContext = ImageManipulator.manipulate(source.uri);
    let manipulatedImage;
    let jpeg;

    try {
      manipulationContext.resize(resizeTarget);
      manipulatedImage = await manipulationContext.renderAsync();
      jpeg = await manipulatedImage.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.9,
      });
    } finally {
      // Release native shared objects even when rendering or saving fails.
      manipulatedImage?.release?.();
      manipulationContext.release?.();
    }

    const jpegFile = new File(jpeg.uri);
    try {
      const bytes = await jpegFile.bytes();
      const embedded = await pdf.embedJpg(bytes);
      const page = pdf.addPage([pageWidth, pageHeight]);
      page.drawImage(embedded, calculateImagePlacement(
        embedded.width, embedded.height, pageWidth, pageHeight, safeMargin,
      ));
    } finally {
      if (jpeg.uri !== source.uri) discardFile(jpegFile);
    }
    onProgress({ completed: index + 1, total: images.length, progress: 0.9 * (index + 1) / images.length });
  }

  const pdfBytes = await pdf.save();
  const outputDirectory = new Directory(Paths.document, 'PDFs');
  outputDirectory.create({ intermediates: true, idempotent: true });
  const fileStem = `${documentName}_${Date.now()}`;
  let filename = `${fileStem}.pdf`;
  let output = new File(outputDirectory, filename);
  for (let suffix = 1; output.exists; suffix += 1) {
    filename = `${fileStem}_${suffix}.pdf`;
    output = new File(outputDirectory, filename);
  }

  output.create();
  try {
    await output.write(pdfBytes);
    if (!output.exists || output.size !== pdfBytes.length) {
      throw new Error('O arquivo PDF foi gravado parcialmente.');
    }
  } catch (error) {
    discardFile(output);
    throw error;
  }

  onProgress({ completed: images.length, total: images.length, progress: 1 });
  return { uri: output.uri, name: filename, size: pdfBytes.length, pageCount: images.length };
}
