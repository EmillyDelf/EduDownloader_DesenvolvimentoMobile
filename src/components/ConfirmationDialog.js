import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Button from './Button';
import colors from './colors';

export default function ConfirmationDialog({
  visible = false,
  title = 'Confirmar operação',
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}) {
  if (!visible) {
    return null;
  }

  if (typeof onCancel !== 'function') {
    throw new TypeError('ConfirmationDialog requires an onCancel function when visible.');
  }

  if (typeof onConfirm !== 'function') {
    throw new TypeError('ConfirmationDialog requires an onConfirm function when visible.');
  }

  function handleCancel() {
    onCancel();
  }

  function handleConfirm() {
    onConfirm();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={handleCancel}
          style={styles.dialog}
        >
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <Text accessibilityRole='header' style={styles.title}>{title}</Text>

            {description ? <Text style={styles.description}>{description}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                onPress={handleCancel}
                accessibilityRole='button'
                style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>

              <Button title={confirmLabel} onPress={handleConfirm} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.blueOverlay,
  },

  dialog: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 14,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },

  content: {
    padding: 24,
    gap: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.blue,
  },

  description: {
    fontSize: 16,
    color: colors.blue,
  },

  actions: {
    gap: 12,
  },

  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 8,
  },

  cancelPressed: {
    opacity: 0.7,
  },

  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
    textAlign: 'center',
  },
});
