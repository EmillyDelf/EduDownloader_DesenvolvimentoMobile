import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { headerStyles } from '../styles/headers';
import { useResponsive } from '../styles/responsive';

function renderHeaderAction(label, onPress, onDark = false, icon = null) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => [headerStyles.action, pressed && headerStyles.actionPressed]}
    >
      {icon ? (
        <Image source={icon} resizeMode='contain' accessible={false} style={{ width: 20, height: 20, alignSelf: 'center' }} />
      ) : (
        <Text style={[headerStyles.actionText, onDark && headerStyles.actionTextOnDark]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function renderLogo(logo) {
  if (!logo) return null;
  if (React.isValidElement(logo)) return logo;
  return (
    <Image
      source={logo}
      resizeMode='contain'
      accessible={false}
      style={headerStyles.logo}
    />
  );
}

export default function Header({
  title,
  onBack,
  backIcon = null,
  rightActionLabel,
  onRightAction,
  variant = 'compact',
  subtitle,
  logo = null,
  showAccentBar = false,
  contentStyle,
  style,
}) {
  const screen = useResponsive();
  if (variant === 'hero') {
    const hasTopControls = Boolean(onBack || (rightActionLabel && onRightAction) || logo);
    return (
      <View style={[
        headerStyles.hero,
        { paddingHorizontal: screen.heroHorizontalPadding, minHeight: screen.scaleSize(200, { min: 168, max: 210 }) },
        style,
      ]}>
        {hasTopControls ? (
          <View style={headerStyles.heroTopRow}>
            {onBack ? renderHeaderAction('Voltar', onBack, true) : <View />}
            {rightActionLabel && onRightAction
              ? renderHeaderAction(rightActionLabel, onRightAction, true)
              : renderLogo(logo)}
          </View>
        ) : null}

        <View style={[headerStyles.heroContent, contentStyle]}>
          <Text accessibilityRole='header' style={headerStyles.heroTitle}>
            {title}
          </Text>
          {subtitle ? <Text style={headerStyles.heroSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
    );
  }

  const content = (
    <>
      {onBack ? renderHeaderAction('Voltar', onBack, false, backIcon) : null}

      <Text
        accessibilityRole='header'
        style={showAccentBar ? headerStyles.titleAccent : headerStyles.title}
      >
        {title}
      </Text>

      {rightActionLabel && onRightAction
        ? renderHeaderAction(rightActionLabel, onRightAction)
        : renderLogo(logo)}
    </>
  );

  if (showAccentBar) {
    return (
      <View style={[headerStyles.accentWrapper, style]}>
        <View style={headerStyles.accentBar}>
          <View style={headerStyles.accentBarPrimary} />
          <View style={headerStyles.accentBarSuccess} />
        </View>
        <View style={headerStyles.compactRow}>{content}</View>
      </View>
    );
  }

  return <View style={[headerStyles.compact, style]}>{content}</View>;
}
