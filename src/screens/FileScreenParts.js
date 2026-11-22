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
          hitSlop={{ top: 4, bottom: 4 }}
          style={({ pressed }) => [
            buttonStyles.chip, styles.filter, { minWidth: option.width },
            value === option.id && styles.filterActive, pressed && buttonStyles.pressed,
          ]}
        >
          <Text style={value === option.id ? [buttonStyles.chipTextActive, styles.filterTextActive] : [buttonStyles.chipText, styles.filterText]}>{option.label}</Text>
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

export function FileAvailability({ item }) {
  const messages = { missing: 'Arquivo movido ou removido', unavailable: 'Arquivo indisponível', deleted: 'Arquivo excluído do dispositivo' };
  const message = item.deletionPending ? 'Exclusão pendente. Atualize a biblioteca.' : messages[item.availability];
  return message ? <Text style={styles.metadata} accessibilityLiveRegion='polite'>{message}</Text> : null;
}
