import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Button from './Button';
import buttonStyles from '../styles/buttons';
import { feedbackStyles } from '../styles/cards';
import { useResponsive } from '../styles/responsive';

export default function ConfirmationDialog({
  visible = false,
  title = 'Confirmar operação',
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}) {
  const screen = useResponsive();
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
      <View style={feedbackStyles.dialogOverlay}>
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={handleCancel}
          style={[feedbackStyles.dialogSurface, screen.isTablet && { maxWidth: 480 }]}
        >
          <ScrollView contentContainerStyle={feedbackStyles.dialogContent} bounces={false}>
            <Text accessibilityRole='header' style={feedbackStyles.dialogTitle}>{title}</Text>

            {description ? <Text style={feedbackStyles.dialogDescription}>{description}</Text> : null}

            <View style={feedbackStyles.dialogActions}>
              <Pressable
                onPress={handleCancel}
                accessibilityRole='button'
                style={({ pressed }) => [
                  buttonStyles.base,
                  buttonStyles.secondary,
                  buttonStyles.fullWidth,
                  pressed && buttonStyles.pressed,
                ]}
              >
                <Text style={buttonStyles.secondaryText}>{cancelLabel}</Text>
              </Pressable>

              <Button title={confirmLabel} onPress={handleConfirm} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
