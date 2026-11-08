import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Button from './Button';

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onCancel}
          style={styles.dialog}
        >
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <Text accessibilityRole='header' style={styles.title}>{title}</Text>

            {description ? <Text style={styles.description}>{description}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                onPress={onCancel}
                accessibilityRole='button'
                style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}
              >
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>

              <Button title={confirmLabel} onPress={onConfirm} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  dialog: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  content: {
    padding: 24,
    gap: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },

  description: {
    fontSize: 16,
    color: '#555555',
  },

  actions: {
    gap: 12,
  },

  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    borderRadius: 8,
  },

  cancelPressed: {
    opacity: 0.7,
  },

  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
    textAlign: 'center',
  },
});
