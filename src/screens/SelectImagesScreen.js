
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import Header from '../components/Header';
import Button from '../components/Button';
import { colors, typography, spacing, getResponsiveContentStyle, responsive } from '../styles';
import { MAX_PDF_IMAGES, mergeSelectedImages, normalizeSelectedImages } from '../pdf/imageSelection';

export default function SelectImagesScreen({
  onBack,
  onContinue,
  initialImages = [],
  onImagesChange,
}) {
  const screen = responsive.useResponsive();
  const [images, setImages] = useState(() => normalizeSelectedImages(initialImages));
  const [isSelecting, setIsSelecting] = useState(false);
  const imagesRef = useRef(images);
  const selectingRef = useRef(false);
  const mountedRef = useRef(true);
  const canContinue = images.length > 0 && !isSelecting && typeof onContinue === 'function';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  function updateImages(updated) {
    imagesRef.current = updated;
    setImages(updated);
    if (typeof onImagesChange === 'function') onImagesChange(updated);
  }

  async function selectImages() {
    if (selectingRef.current) return;
    const remaining = MAX_PDF_IMAGES - imagesRef.current.length;
    if (remaining <= 0) {
      Alert.alert('Limite de imagens', 'Você pode selecionar até 20 imagens no total.');
      return;
    }
    selectingRef.current = true;
    setIsSelecting(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mountedRef.current) return;

      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Autorize o acesso à galeria para selecionar imagens.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });

      if (!mountedRef.current || result.canceled) return;
      const merged = mergeSelectedImages(imagesRef.current, result.assets || []);
      updateImages(merged.images);
      if (merged.limitExceeded) {
        Alert.alert('Limite de imagens', 'O limite total é de 20 imagens. As imagens excedentes não foram incluídas.');
      }
    } catch {
      if (mountedRef.current) Alert.alert('Não foi possível selecionar imagens', 'Tente abrir a galeria novamente.');
    } finally {
      selectingRef.current = false;
      if (mountedRef.current) setIsSelecting(false);
    }
  }

  function removeImage(uri) {
    updateImages(imagesRef.current.filter(image => image.uri !== uri));
  }

  return (
    <SafeAreaView testID='select-images-screen' style={styles.container} edges={['top', 'left', 'right']}>
      <Header title='Imagens para PDF' onBack={onBack} />

      <ScrollView contentContainerStyle={[styles.content, getResponsiveContentStyle(screen.width)]}>
        <Text style={styles.title}>Crie seu PDF</Text>

        <Text style={styles.description}>
          Selecione as imagens que deseja transformar em um documento PDF.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.uploadArea, pressed && !isSelecting && styles.pressed, isSelecting && styles.disabledButton]}
          onPress={selectImages}
          accessibilityRole='button'
          accessibilityLabel='Selecionar imagens da galeria'
          accessibilityState={{ disabled: isSelecting, busy: isSelecting }}
          disabled={isSelecting}
        >
          <Text style={styles.uploadIcon}>＋</Text>
          <Text style={styles.uploadTitle}>Selecionar imagens</Text>
          <Text style={styles.uploadDescription}>
            Escolha imagens da galeria do seu dispositivo
          </Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Imagens selecionadas</Text>
          <Text accessibilityLiveRegion='polite' style={styles.counter}>{images.length}/{MAX_PDF_IMAGES}</Text>
        </View>

        {images.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma imagem selecionada ainda.
          </Text>
        ) : (
          <View style={styles.imageGrid}>
            {images.map((image, index) => (
              <View key={image.uri} style={styles.imageCard}>
                <Image source={{ uri: image.uri }} style={styles.thumbnail} accessible accessibilityLabel={`Prévia da página ${index + 1}`} />

                <Text style={styles.imageNumber}>Página {index + 1}</Text>

                <Pressable
                  onPress={() => removeImage(image.uri)}
                  style={styles.removeButton}
                  accessibilityRole='button'
                  accessibilityLabel={`Remover imagem ${index + 1}`}
                  hitSlop={10}
                >
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Button
          title='Continuar'
          style={[styles.continueButton, !canContinue && styles.disabledButton]}
          textStyle={styles.continueText}
          disabled={!canContinue}
          onPress={() => { if (images.length && typeof onContinue === 'function') onContinue(images); }}
        />
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
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textMuted72,
    marginBottom: spacing.xl,
  },
  uploadArea: {
    minHeight: 180,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: 10,
  },
  uploadIcon: {
    fontSize: 38,
    color: colors.primary,
  },
  uploadTitle: {
    ...typography.cardTitle,
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  uploadDescription: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted72,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  counter: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted72,
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageCard: {
    width: '47%',
    marginBottom: 8,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
  },
  imageNumber: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 12,
    marginTop: 6,
  },
  removeButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: colors.white,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 25,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  continueText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
