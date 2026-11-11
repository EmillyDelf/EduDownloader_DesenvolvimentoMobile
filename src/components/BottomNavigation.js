import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../styles/colors';
import { bottomNavigationStyles } from '../styles/headers';
import { useResponsive } from '../styles/responsive';

const navigationTabs = [
  { id: 'home', label: 'Início', icon: require('../../assets/navigation/home.png') },
  { id: 'downloads', label: 'Downloads', icon: require('../../assets/navigation/downloads.png') },
  { id: 'pdf', label: 'PDF', icon: require('../../assets/navigation/pdf.png') },
  { id: 'history', label: 'Histórico', icon: require('../../assets/navigation/history.png') },
  { id: 'profile', label: 'Perfil', icon: require('../../assets/navigation/profile.png') },
];

export default function BottomNavigation({ activeTab = 'home', onTabPress }) {
  const screen = useResponsive();
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={bottomNavigationStyles.safeArea}>
      <View accessibilityRole='tablist' style={bottomNavigationStyles.navigation}>
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
                bottomNavigationStyles.tab,
                isSelected && bottomNavigationStyles.tabSelected,
                pressed && bottomNavigationStyles.tabPressed,
              ]}
            >
              <Image
                source={tab.icon}
                resizeMode='contain'
                tintColor={isSelected ? colors.success : colors.textSecondary}
                accessible={false}
                style={bottomNavigationStyles.icon}
              />
              <Text
                style={[
                  bottomNavigationStyles.label,
                  isSelected && bottomNavigationStyles.labelSelected,
                  { fontSize: screen.scaleFont(12, { min: 11, max: 14 }) },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
