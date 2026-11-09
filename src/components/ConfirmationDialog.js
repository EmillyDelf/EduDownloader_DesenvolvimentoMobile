import React from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import Button from './Button';
import { useResponsive } from '../styles/responsive';
import styles from '../styles/cardComponentStyles';

export default function ConfirmationDialog({
  visible = false,
  title = 'Confirmar operação',
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}) {
  const layout = useResponsive();

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
      <View
        style={[
          styles.dialogOverlay,
          layout.isSmallScreen && styles.dialogOverlayCompact,
        ]}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={handleCancel}
          style={[
            styles.dialogBox,
            layout.isTablet && styles.dialogBoxTablet,
          ]}
        >
          <ScrollView contentContainerStyle={styles.dialogContent} bounces={false}>
            <Text accessibilityRole='header' style={styles.dialogTitle}>{title}</Text>

            {description ? <Text style={styles.dialogDescription}>{description}</Text> : null}

            <View style={styles.dialogActions}>
              <Pressable
                onPress={handleCancel}
                accessibilityRole='button'
                style={({ pressed }) => [styles.dialogCancelButton, pressed && styles.dialogCancelPressed]}
              >
                <Text style={styles.dialogCancelText}>{cancelLabel}</Text>
              </Pressable>

              <Button title={confirmLabel} onPress={handleConfirm} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
