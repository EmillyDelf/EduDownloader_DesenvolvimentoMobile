import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from '../screens/HomeScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ConvertGalleryVideoScreen from '../screens/ConvertGalleryVideoScreen';
import FormatChoiceScreen from '../screens/FormatChoiceScreen';
import ConversionProgressScreen from '../screens/ConversionProgressScreen';
import ConversionCompleteScreen from '../screens/ConversionCompleteScreen';
import MediaDownloadForm from '../screens/MediaDownloadForm';
import SelectImagesScreen from '../screens/SelectImagesScreen';
import OrganizeImagesScreen from '../screens/OrganizeImagesScreen';
import PdfSettingsScreen from '../screens/PdfSettingsScreen';
import PdfProgressScreen from '../screens/PdfProgressScreen';
import PdfCompleteScreen from '../screens/PdfCompleteScreen';
import ProfileScreen from '../screens/ProfileScreen';
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
const defaultPdfSettings = { name: 'Meu documento', pageSize: 'A4', orientation: 'portrait', margin: 10 };

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
  const onUnmount = library.onUnmount;
  useEffect(() => () => onUnmount?.(), [onUnmount]);
  // Explicitly supplied data remains controlled by its owner; do not attach
  // local deletion/open callbacks to a future backend's unrelated records.
  const downloads = Object.prototype.hasOwnProperty.call(downloadProps, 'items') ? downloadProps : { ...library.downloadProps, ...downloadProps };
  const history = Object.prototype.hasOwnProperty.call(historyProps, 'items') ? historyProps : { ...library.historyProps, ...historyProps };
  const [activeTab, setActiveTab] = useState('home');
  const [visited, setVisited] = useState({ home: true });
  const [pdfStep, setPdfStep] = useState('select');
  const [pdfImages, setPdfImages] = useState([]);
  const [pdfSettings, setPdfSettings] = useState(defaultPdfSettings);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfError, setPdfError] = useState('');
  const [pdfCompletion, setPdfCompletion] = useState(null);
  const generatingPdf = useRef(false);
  const refreshFiles = library.onRefreshFiles;
  useEffect(() => {
    if (activeTab === 'downloads' || activeTab === 'history') refreshFiles?.();
  }, [activeTab, refreshFiles]);

  function selectTab(tab) {
    if (!tabs.includes(tab)) return;
    if (tab === 'pdf' && activeTab !== 'pdf' && pdfStep === 'organize') setPdfStep('select');
    setVisited(current => ({ ...current, [tab]: true }));
    setActiveTab(tab);
  }

  // This listener exists only while the main stack screen is focused.
  // Conversion and previews keep the native stack's normal Android back action.
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === 'pdf') {
        if (generatingPdf.current) return true;
        const previous = { organize: 'select', settings: 'organize', progress: 'settings' }[pdfStep];
        if (previous) {
          setPdfStep(previous);
          return true;
        }
        if (pdfStep === 'complete') setPdfStep('select');
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

  function openPdfSettings(images) {
    const selected = normalizeSelectedImages(images);
    if (!selected.length) return;
    setPdfImages(selected);
    setPdfStep('settings');
  }

  async function generateConfiguredPdf(settings = pdfSettings) {
    if (generatingPdf.current || !pdfImages.length) return;
    generatingPdf.current = true;
    setPdfSettings(settings);
    setPdfError('');
    setPdfCompletion(null);
    setPdfProgress(0);
    setPdfStep('progress');
    try {
      if (library.onPrepareFiles) await library.onPrepareFiles();
      const { generatePdf } = require('../pdf/pdfGenerator');
      const result = await generatePdf({
        images: pdfImages,
        settings,
        onProgress: ({ progress }) => setPdfProgress(progress),
      });
      const registered = await registerPdf(result);
      setPdfCompletion({ result, registered });
      setPdfStep('complete');
    } catch {
      setPdfError('Não foi possível criar o PDF. Confira as imagens e o espaço disponível e tente novamente.');
    } finally {
      generatingPdf.current = false;
    }
  }

  async function registerPdf(result) {
    if (!library.onRegisterGeneratedFile) return true;
    try {
      return await library.onRegisterGeneratedFile({
        fileUri: result.uri, name: result.name, sizeBytes: result.size, pageCount: result.pageCount,
        format: 'PDF', activityType: 'pdf',
      });
    } catch { return false; }
  }

  async function retryPdfRegistration() {
    const { result } = pdfCompletion;
    const registered = await registerPdf(result);
    setPdfCompletion(current => current?.result.uri === result.uri ? { result, registered } : current);
  }

  function startNewPdf() {
    setPdfImages([]);
    setPdfSettings(defaultPdfSettings);
    setPdfCompletion(null);
    setPdfError('');
    setPdfProgress(0);
    openPdfSelection();
  }

  function renderPdfStep() {
    switch (pdfStep) {
      case 'organize':
        return <OrganizeImagesScreen images={pdfImages} onImagesChange={updatePdfImages} onBack={openPdfSelection} onAddImages={openPdfSelection} onContinue={openPdfSettings} />;
      case 'settings':
        return <PdfSettingsScreen images={pdfImages} initialSettings={pdfSettings} onBack={() => setPdfStep('organize')} onGenerate={generateConfiguredPdf} />;
      case 'progress':
        return <PdfProgressScreen progress={pdfProgress} error={pdfError} onRetry={() => generateConfiguredPdf()} onBack={() => setPdfStep('settings')} />;
      case 'complete':
        return <PdfCompleteScreen result={pdfCompletion.result} onBack={() => { openPdfSelection(); home(); }} onNewPdf={startNewPdf}
          libraryError={pdfCompletion.registered ? '' : 'O PDF foi salvo. Ainda não foi possível registrá-lo na biblioteca e no histórico.'}
          onRetryLibrary={pdfCompletion.registered ? undefined : retryPdfRegistration} />;
      default:
        return <SelectImagesScreen initialImages={pdfImages} onImagesChange={updatePdfImages} onBack={home} onContinue={openPdfOrganization} />;
    }
  }
  const screens = {
    home: <HomeScreen navigation={navigation} onTabPress={selectTab} />,
    downloads: <DownloadsScreen {...downloads} onBack={home} showBack={false} onTabPress={undefined} safeAreaEdges={contentEdges} />,
    history: <HistoryScreen {...history} onBack={home} showBack={false} onTabPress={undefined} safeAreaEdges={contentEdges} />,
    pdf: renderPdfStep(),
    profile: <ProfileScreen safeAreaEdges={contentEdges} />,
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
      <BottomNavigation activeTab={activeTab} onTabPress={selectTab} variant={['downloads', 'history', 'profile'].includes(activeTab) ? 'library' : 'default'} />
      <StatusBar style={['home', 'downloads', 'history', 'profile'].includes(activeTab) ? 'light' : 'dark'} />
    </View>
  );
}

function FilesPreviewRoute({ navigation }) {
  return <DownloadsHistoryPreview onBack={() => navigation.goBack()} />;
}

export function MediaDownloadRoute({ navigation }) {
  const { downloadFlow } = useMediaLibrary();
  return <MediaDownloadForm flow={downloadFlow} onExit={() => navigation.goBack()} />;
}

export default function AppNavigator({ downloadProps, historyProps }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Main' screenOptions={{ headerShown: false }}>
        <Stack.Screen name='Main'>
          {props => <MainTabs {...props} downloadProps={downloadProps} historyProps={historyProps} />}
        </Stack.Screen>
        <Stack.Screen name='ConvertGalleryVideo' component={ConvertGalleryVideoScreen} />
        <Stack.Screen name='FormatChoice' component={FormatChoiceScreen} />
        <Stack.Screen name='ConversionProgress' component={ConversionProgressScreen} />
        <Stack.Screen name='ConversionComplete' component={ConversionCompleteScreen} />
        <Stack.Screen name='ComponentsPreview' component={ComponentsPreview} />
        <Stack.Screen name='FilesPreview' component={FilesPreviewRoute} />
        <Stack.Screen name='MediaDownload' component={MediaDownloadRoute} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
