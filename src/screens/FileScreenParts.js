import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { buttonStyles } from '../styles';
import styles from './fileScreenStyles';
import { getFileKind, getStatusLabel } from './fileScreenUtils';

const fileIcons = {
  video: require('../../assets/files/video.png'),
  audio: require('../../assets/files/audio.png'),
  pdf: require('../../assets/files/pdf.png'),
};

export function FileFilters({ options, value, onChange }) {
  return (
    <View style={styles.filters}>
      {options.map(option => (
        <Pressable
          key={option.id}
          onPress={() => onChange(option.id)}
          accessibilityRole='button'
          accessibilityLabel={option.label}
          accessibilityState={{ selected: value === option.id }}
          style={({ pressed }) => [buttonStyles.chip, value === option.id && buttonStyles.chipActive, pressed && buttonStyles.pressed]}
        >
          <Text style={value === option.id ? buttonStyles.chipTextActive : buttonStyles.chipText}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FileIcon({ item, history = false }) {
  const icon = history && item.activityType === 'download'
    ? require('../../assets/files/download.png') : fileIcons[getFileKind(item)];
  return (
    <View accessible={false} style={history ? styles.historyIcon : styles.iconBox}>
      {history ? <Image accessible={false} source={require('../../assets/files/history-background.png')} style={styles.historyIconBackground} /> : null}
      {icon ? <Image accessible={false} source={icon} resizeMode='contain' style={styles.icon} /> : <Text style={styles.metadata}>ARQ</Text>}
    </View>
  );
}

export function FileStatus({ status }) {
  return (
    <View style={[styles.badge, status === 'completed' && styles.completedBadge]}>
      <Text style={styles.badgeText}>{getStatusLabel(status)}</Text>
    </View>
  );
}
