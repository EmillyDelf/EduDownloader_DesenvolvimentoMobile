import React, { useCallback, useState } from 'react';
import { Alert, BackHandler, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from '../screens/HomeScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ConvertGalleryVideoScreen from '../screens/ConvertGalleryVideoScreen';
import SelectImagesScreen from '../screens/SelectImagesScreen';
import OrganizeImagesScreen from '../screens/OrganizeImagesScreen';
import ComponentsPreview from '../dev/ComponentsPreview';
import DownloadsHistoryPreview from '../dev/DownloadsHistoryPreview';
import BottomNavigation from '../components/BottomNavigation';
import Header from '../components/Header';
import useMediaLibrary from '../hooks/useMediaLibrary';
import { getResponsiveContentStyle, globalStyles, responsive, spacing, typography } from '../styles';
import { normalizeSelectedImages } from '../pdf/imageSelection';

const Stack = createNativeStackNavigator();
const tabs = ['home', 'downloads', 'pdf', 'history', 'profile'];
const contentEdges = ['top', 'left', 'right'];

export function PendingScreen({ title, onBack }) {
  const screen = responsive.useResponsive();
  return (
    <SafeAreaView edges={contentEdges} style={globalStyles.safeArea}>
      <Header title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={[getResponsiveContentStyle(screen.width), { padding: spacing.lg, gap: spacing.md }]}>
        <Text accessibilityRole='header' style={typography.sectionTitle}>{title} — em desenvolvimento</Text>
        <Text style={typography.body}>Tela provisória. A implementação desta área ainda será integrada pela equipe.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function MainTabs({ navigation, downloadProps = {}, historyProps = {} }) {
  const library = useMediaLibrary();
  // Explicitly supplied data remains controlled by its owner; do not attach
  // local deletion/open callbacks to a future backend's unrelated records.
  const downloads = Object.prototype.hasOwnProperty.call(downloadProps, 'items') ? downloadProps : { ...library.downloadProps, ...downloadProps };
  const history = Object.prototype.hasOwnProperty.call(historyProps, 'items') ? historyProps : { ...library.historyProps, ...historyProps };
  const [activeTab, setActiveTab] = useState('home');
  const [visited, setVisited] = useState({ home: true });
  const [pdfStep, setPdfStep] = useState('select');
  const [pdfImages, setPdfImages] = useState([]);

  function selectTab(tab) {
    if (!tabs.includes(tab)) return;
    if (tab === 'pdf') setPdfStep('select');
    setVisited(current => ({ ...current, [tab]: true }));
    setActiveTab(tab);
  }

  // This listener exists only while the main stack screen is focused.
  // Conversion and previews keep the native stack's normal Android back action.
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === 'pdf' && pdfStep === 'organize') {
        setPdfStep('select');
        return true;
      }
      if (activeTab === 'home') return false;
      setActiveTab('home');
      return true;
    });
    return () => subscription.remove();
  }, [activeTab, pdfStep]));

  const home = () => selectTab('home');
  const updatePdfImages = images => setPdfImages(normalizeSelectedImages(images));
  const openPdfSelection = () => setPdfStep('select');

  function openPdfOrganization(images) {
    const selected = normalizeSelectedImages(images);
    if (!selected.length) return;
    setPdfImages(selected);
    setPdfStep('organize');
  }

  function finishPdfInterface() {
    Alert.alert('Geração de PDF em desenvolvimento', 'A seleção e a organização estão prontas. A geração de um arquivo PDF será implementada futuramente. Nenhum arquivo foi criado.');
  }
  const screens = {
    home: <HomeScreen navigation={navigation} onTabPress={selectTab} />,
    downloads: <DownloadsScreen {...downloads} onBack={home} onTabPress={undefined} safeAreaEdges={contentEdges} />,
    history: <HistoryScreen {...history} onBack={home} onTabPress={undefined} safeAreaEdges={contentEdges} />,
    pdf: pdfStep === 'select'
      ? <SelectImagesScreen initialImages={pdfImages} onImagesChange={updatePdfImages} onBack={home} onContinue={openPdfOrganization} />
      : <OrganizeImagesScreen images={pdfImages} onImagesChange={updatePdfImages} onBack={openPdfSelection} onAddImages={openPdfSelection} onContinue={finishPdfInterface} />,
    profile: <PendingScreen title='Perfil' onBack={home} />,
  };

  return (
    <View style={globalStyles.screen} testID='integrated-main-tabs'>
      {tabs.filter(tab => visited[tab]).map(tab => (
        <View
          key={tab}
          testID={`tab-panel-${tab}`}
          style={[globalStyles.screen, { display: activeTab === tab ? 'flex' : 'none' }]}
          accessibilityElementsHidden={activeTab !== tab}
          importantForAccessibility={activeTab === tab ? 'auto' : 'no-hide-descendants'}
        >
          {screens[tab]}
        </View>
      ))}
      <BottomNavigation activeTab={activeTab} onTabPress={selectTab} />
      <StatusBar style={activeTab === 'home' ? 'light' : 'dark'} />
    </View>
  );
}

function FilesPreviewRoute({ navigation }) {
  return <DownloadsHistoryPreview onBack={() => navigation.goBack()} />;
}

export default function AppNavigator({ downloadProps, historyProps }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Main' screenOptions={{ headerShown: false }}>
        <Stack.Screen name='Main'>
          {props => <MainTabs {...props} downloadProps={downloadProps} historyProps={historyProps} />}
        </Stack.Screen>
        <Stack.Screen name='ConvertGalleryVideo' component={ConvertGalleryVideoScreen} />
        <Stack.Screen name='ComponentsPreview' component={ComponentsPreview} />
        <Stack.Screen name='FilesPreview' component={FilesPreviewRoute} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
