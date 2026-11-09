import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../styles/colors';
import styles from '../styles/headerMenuStyles';

const navigationTabs = [
  { id: 'home', label: 'Início', icon: require('../../assets/navigation/home.png') },
  { id: 'downloads', label: 'Downloads', icon: require('../../assets/navigation/downloads.png') },
  { id: 'pdf', label: 'PDF', icon: require('../../assets/navigation/pdf.png') },
  { id: 'history', label: 'Histórico', icon: require('../../assets/navigation/history.png') },
  { id: 'profile', label: 'Perfil', icon: require('../../assets/navigation/profile.png') },
];

export default function BottomNavigation({ activeTab = 'home', onTabPress }) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <View accessibilityRole='tablist' style={styles.navigation}>
        {navigationTabs.map(tab => {
          const isSelected = activeTab === tab.id;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabPress?.(tab.id)}
              accessibilityRole='tab'
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isSelected }}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <Image
                source={tab.icon}
                resizeMode='contain'
                tintColor={isSelected ? colors.success : colors.textSecondary}
                accessible={false}
                style={styles.icon}
              />
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
