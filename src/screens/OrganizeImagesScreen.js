
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Button from '../components/Button';
import { colors, spacing, typography, getResponsiveContentStyle, responsive } from '../styles';
import { MAX_PDF_IMAGES, normalizeSelectedImages } from '../pdf/imageSelection';

export default function OrganizeImagesScreen({
  images = [],
  onBack,
  onAddImages,
  onContinue,
  onImagesChange,
}) {
  const screen = responsive.useResponsive();
  const [orderedImages, setOrderedImages] = useState(() => normalizeSelectedImages(images));
  const imagesRef = useRef(orderedImages);

  function updateImages(updated) {
    imagesRef.current = updated;
    setOrderedImages(updated);
    if (typeof onImagesChange === 'function') onImagesChange(updated);
  }

  function moveImage(index, direction) {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= imagesRef.current.length) return;

    const updated = [...imagesRef.current];
    [updated[index], updated[newIndex]] =
      [updated[newIndex], updated[index]];

    updateImages(updated);
  }

  function removeImage(uri) {
    updateImages(imagesRef.current.filter(image => image.uri !== uri));
  }

  function continueToSettings() {
    if (orderedImages.length === 0) {
      Alert.alert('Nenhuma imagem', 'Adicione pelo menos uma imagem.');
      return;
    }

    if (typeof onContinue === 'function') onContinue(orderedImages);
  }

  return (
    <SafeAreaView testID='organize-images-screen' style={styles.container} edges={['top', 'left', 'right']}>
      <Header title='Organizar imagens' onBack={onBack} />

      <ScrollView contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width)]}>
        <Text style={styles.title}>Organize suas páginas</Text>

        <Text style={styles.description}>
          Ajuste a ordem em que as imagens aparecerão no PDF.
        </Text>

        <View style={styles.counterContainer}>
          <Text style={styles.counter}>
            {orderedImages.length}/{MAX_PDF_IMAGES} imagem(ns) selecionada(s)
          </Text>
        </View>

        {orderedImages.map((image, index) => (
          <View key={image.uri} style={styles.imageCard}>
            <Image
              source={{ uri: image.uri }}
              style={styles.thumbnail}
              accessible
              accessibilityLabel={`Prévia da página ${index + 1}`}
            />

            <View style={styles.imageInfo}>
              <Text style={styles.pageTitle}>
                Página {index + 1}
              </Text>

              <Text style={styles.pageDescription}>
                Imagem {index + 1} do documento
              </Text>

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.orderButton,
                    index === 0 && styles.disabledButton,
                  ]}
                  disabled={index === 0}
                  onPress={() => moveImage(index, -1)}
                  accessibilityRole='button'
                  accessibilityLabel={`Mover página ${index + 1} para cima`}
                  accessibilityState={{ disabled: index === 0 }}
                >
                  <Text style={styles.orderText}>↑</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.orderButton,
                    index === orderedImages.length - 1 &&
                      styles.disabledButton,
                  ]}
                  disabled={index === orderedImages.length - 1}
                  onPress={() => moveImage(index, 1)}
                  accessibilityRole='button'
                  accessibilityLabel={`Mover página ${index + 1} para baixo`}
                  accessibilityState={{ disabled: index === orderedImages.length - 1 }}
                >
                  <Text style={styles.orderText}>↓</Text>
                </Pressable>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeImage(image.uri)}
                  accessibilityRole='button'
                  accessibilityLabel={`Remover página ${index + 1}`}
                >
                  <Text style={styles.removeText}>Remover</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={onAddImages}
          disabled={typeof onAddImages !== 'function'}
          accessibilityRole='button'
          accessibilityLabel='Adicionar imagens'
          accessibilityState={{ disabled: typeof onAddImages !== 'function' }}
        >
          <Text style={styles.addText}>+ Adicionar imagens</Text>
        </Pressable>

        <Button title='Continuar' style={[styles.continueButton, orderedImages.length === 0 && styles.disabledButton]} textStyle={styles.continueText} disabled={orderedImages.length === 0 || typeof onContinue !== 'function'} onPress={continueToSettings} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 36,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    fontSize: 14,
    color: colors.textMuted72,
    marginBottom: spacing.lg,
  },
  counterContainer: {
    marginBottom: spacing.md,
  },
  counter: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  imageCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  thumbnail: {
    width: 92,
    height: 112,
    borderRadius: 10,
    backgroundColor: colors.surfaceThumb,
  },
  imageInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 6,
  },
  pageTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  pageDescription: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted72,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  orderButton: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  removeButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  removeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addText: {
    color: colors.primary,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  continueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.85,
  },
});
