import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useResponsive } from '../styles/responsive';
import styles from '../styles/headerMenuStyles';

export default function Header({
  title,
  subtitle,
  onBack,
  rightActionLabel,
  onRightAction,
  rightElement,
  variant = 'default',
  showBrandAccent = false,
  style,
  titleStyle,
}) {
  const layout = useResponsive();

  if (variant === 'hero') {
    return (
      <View
        style={[
          styles.heroHeader,
          { paddingHorizontal: layout.tabPaddingHorizontal },
          style,
        ]}
      >
        {rightElement || (rightActionLabel && onRightAction) ? (
          <View style={styles.heroTopRow}>
            {rightElement || null}
            {rightActionLabel && onRightAction ? (
              <Pressable
                onPress={onRightAction}
                accessibilityRole='button'
                accessibilityLabel={rightActionLabel}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              >
                <Text style={[styles.actionText, styles.heroActionText]}>{rightActionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.heroBody, { maxWidth: layout.contentMaxWidth }]}>
          <Text accessibilityRole='header' style={[styles.heroTitle, titleStyle]}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    );
  }

  const headerContent = (
    <View
      style={[
        styles.header,
        layout.isSmallScreen && styles.headerCompact,
        variant === 'subtle' && styles.headerSubtle,
        style,
      ]}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole='button'
          accessibilityLabel='Voltar'
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>Voltar</Text>
        </Pressable>
      ) : null}

      <Text
        accessibilityRole='header'
        style={[
          styles.title,
          variant === 'subtle' && styles.titleBrand,
          titleStyle,
        ]}
      >
        {title}
      </Text>

      {rightActionLabel && onRightAction ? (
        <Pressable
          onPress={onRightAction}
          accessibilityRole='button'
          accessibilityLabel={rightActionLabel}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{rightActionLabel}</Text>
        </Pressable>
      ) : null}

      {rightElement || null}
    </View>
  );

  if (!showBrandAccent) {
    return headerContent;
  }

  return (
    <View>
      <View style={styles.brandAccentRow}>
        <View style={styles.brandAccentPrimary} />
        <View style={styles.brandAccentSuccess} />
      </View>
      {headerContent}
    </View>
  );
}
