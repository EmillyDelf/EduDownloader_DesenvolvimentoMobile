import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from './colors';

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
              style={({ pressed }) => [
                styles.tab,
                isSelected && styles.tabSelected,
                pressed && styles.tabPressed,
              ]}
            >
              <Image
                source={tab.icon}
                resizeMode='contain'
                tintColor={isSelected ? colors.lime : colors.blue}
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

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.white,
  },

  navigation: {
    flexDirection: 'row',
  },

  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 70,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 18,
    paddingHorizontal: 2,
    gap: 7,
  },

  tabPressed: {
    opacity: 0.7,
  },

  tabSelected: {
    backgroundColor: colors.blue,
  },

  icon: {
    width: 22,
    height: 22,
  },

  label: {
    alignSelf: 'stretch',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '400',
    color: colors.blue,
    textAlign: 'center',
  },

  labelSelected: {
    fontWeight: '600',
    color: colors.lime,
  },
});
