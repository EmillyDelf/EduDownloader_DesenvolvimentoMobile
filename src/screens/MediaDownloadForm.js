import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Button from '../components/Button';
import Card from '../components/Card';
import ErrorMessage from '../components/ErrorMessage';
import Header from '../components/Header';
import Input from '../components/Input';
import LoadingIndicator from '../components/LoadingIndicator';
import ProgressBar from '../components/ProgressBar';
import { getResponsiveContentStyle, globalStyles, responsive } from '../styles';
import { formatFileSize } from './fileScreenUtils';
import styles from './mediaDownloadStyles';

const assets = {
  logo: require('../../assets/media/flow-logo.png'),
  headerLink: require('../../assets/media/header-link.png'),
  back: require('../../assets/media/flow-back.png'),
  link: require('../../assets/media/link.png'),
  video: require('../../assets/media/video.png'),
  audio: require('../../assets/media/audio.png'),
  check: require('../../assets/media/check.png'),
  cancel: require('../../assets/media/cancel.png'),
  arrow: require('../../assets/media/arrow.png'),
  play: require('../../assets/media/preview-play.png'),
  playBackground: require('../../assets/media/preview-background.png'),
  ring: require('../../assets/media/progress-ring.png'),
  spinner: require('../../assets/media/progress-spinner.png'),
  openCircle: require('../../assets/media/open-circle.png'),
  openArrow: require('../../assets/media/open-arrow.png'),
  success: require('../../assets/media/success.png'),
  successBackground: require('../../assets/media/success-background.png'),
  fileCircle: require('../../assets/files/history-background.png'),
};

const formatInfo = {
  MP4: { label: 'Vídeo', icon: assets.video },
  MP3: { label: 'Áudio', icon: assets.audio },
};
const operationLabels = {
  original: 'Arquivo original',
  remux: 'Reorganização do arquivo no servidor',
  merge: 'Combinação de vídeo e áudio no servidor',
  transcode: 'Conversão de áudio no servidor',
};
const phases = {
  queued: ['Na fila do servidor', 'Aguardando o início do trabalho.'],
  analyzing: ['Preparando mídia no servidor', 'Confirmando os dados da origem.'],
  downloading: ['Baixando no servidor', 'Recebendo as faixas da origem.'],
  processing: ['Processando no servidor', 'Preparando o formato e a qualidade escolhidos.'],
  verifying: ['Verificando no servidor', 'Conferindo o resultado antes de transferir.'],
  local: ['Transferindo para o dispositivo', 'Salvando uma cópia temporária do arquivo.'],
  verifyingLocal: ['Verificando no dispositivo', 'Conferindo o tamanho, o formato e o SHA-256 antes de salvar.'],
};

function BackendCredential({ hasToken, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  function save(value) {
    if (!onSave(value)) { setError('Confira a credencial ou aguarde o fim da tarefa atual.'); return; }
    setExpanded(false);
    setToken('');
    setError('');
  }
  if (!expanded) return <Button variant='link' title={hasToken ? 'Gerenciar credencial da sessão' : 'Informar credencial da sessão'} onPress={() => setExpanded(true)} />;
  return (
    <Card style={styles.hint}>
      <Input label='CREDENCIAL DA SESSÃO' value={token} onChangeText={setToken} secureTextEntry
        autoCapitalize='none' autoCorrect={false} error={error} />
      <Button variant='link' title='Usar nesta sessão' disabled={!token.trim()} onPress={() => save(token)} />
      {hasToken ? <Button variant='link' title='Encerrar sessão do servidor' onPress={() => save('')} /> : null}
      <Button variant='link' title='Fechar configuração' onPress={() => { setToken(''); setExpanded(false); setError(''); }} />
    </Card>
  );
}

function FileSummary({ name, format, details, onOpen }) {
  return (
    <Card variant='summary' style={[styles.summary, styles.fileSummary]}>
      <View style={styles.fileBadge}>
        <Image accessible={false} source={assets.fileCircle} style={styles.fileCircle} />
        {formatInfo[format] ? <Image accessible={false} source={formatInfo[format].icon} style={styles.icon24} /> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={onOpen ? styles.savedTitle : styles.fileTitle}>{name}</Text>
        {details ? <Text style={styles.helper}>{details}</Text> : null}
      </View>
      {onOpen ? (
        <Pressable onPress={onOpen} accessibilityRole='button' accessibilityLabel={`Abrir ${name}`}
          style={({ pressed }) => [styles.openAction, pressed && styles.pressed]}>
          <Image accessible={false} source={assets.openCircle} style={styles.openCircle} />
          <Image accessible={false} source={assets.openArrow} style={styles.icon24} />
        </Pressable>
      ) : <Text style={styles.formatBadge}>{format}</Text>}
    </Card>
  );
}

export default function MediaDownloadForm({ flow = {}, onExit }) {
  const screen = responsive.useResponsive();
  const [choiceStep, setChoiceStep] = useState(flow.status === 'ready' ? 'format' : 'link');
  const [openErrorUri, setOpenErrorUri] = useState(null);
  const opening = useRef(false);
  const status = flow.status || 'idle';
  const analyzing = status === 'validating' || status === 'identifying';
  const transferring = status === 'queued' || status === 'downloading';
  const canStart = flow.serviceAvailable === true && typeof flow.onStart === 'function'
    && !flow.isPreparingStorage && !flow.storageBlocked;
  const options = flow.media?.options || [];
  const selected = options.find(option => option.id === flow.selectedOptionId);
  const format = selected?.format;
  const record = flow.record;
  const saved = status === 'completed' && record?.status === 'completed'
    && typeof record.fileUri === 'string' && record.fileUri.startsWith('file://')
    && Number.isFinite(record.sizeBytes) && record.sizeBytes > 0;
  const terminalError = status === 'paused' || (status === 'failed' && Boolean(record)) || (status === 'completed' && !saved);
  const currentStep = saved ? 'complete'
    : transferring || status === 'cancelled' || terminalError ? 'transfer'
      : status === 'ready' && selected ? choiceStep : 'link';
  const selectionStep = currentStep === 'format' || currentStep === 'quality';
  const centered = currentStep === 'transfer' || currentStep === 'complete';
  const title = { link: 'Baixar mídia por link', format: 'Download de mídia', quality: 'Qualidade do download' }[currentStep];

  function goBack() {
    if (currentStep === 'quality') setChoiceStep('format');
    else if (currentStep === 'format') setChoiceStep('link');
    else { flow.onStopAnalysis?.(); onExit?.(); }
  }

  usePreventRemove(selectionStep, goBack);
  const stopAnalysis = flow.onStopAnalysis;
  useEffect(() => () => stopAnalysis?.(), [stopAnalysis]);

  function analyze() {
    if (analyzing || typeof flow.onAnalyze !== 'function') return;
    setChoiceStep('format');
    if (status !== 'ready') flow.onAnalyze();
  }

  function reset() {
    flow.onReset?.();
    setChoiceStep('link');
    setOpenErrorUri(null);
  }

  async function openFile() {
    if (opening.current || typeof flow.onOpen !== 'function') return;
    opening.current = true;
    setOpenErrorUri(null);
    try {
      if (await flow.onOpen() === false) setOpenErrorUri(record.fileUri);
    } catch {
      setOpenErrorUri(record.fileUri);
    } finally {
      opening.current = false;
    }
  }

  const formats = [...new Set(options.map(option => option.format))];
  const inFormat = options.filter(option => option.format === format);
  const showQualities = inFormat.some(option => option.quality);
  const progress = Number.isFinite(flow.progress) ? Math.round(Math.max(0, Math.min(100, flow.progress))) : null;
  const phase = phases[flow.phase?.name];
  const track = flow.phase?.track;
  const trackCount = flow.phase?.trackCount;
  const trackText = Number.isInteger(track) && Number.isInteger(trackCount) && trackCount > 1 ? ` Faixa ${track} de ${trackCount}.` : '';
  const metadata = [record?.format, record?.quality, formatFileSize(record?.sizeBytes)].filter(Boolean).join(' • ');

  return (
    <SafeAreaView style={globalStyles.safeArea} testID='media-download-form'>
      <StatusBar style='dark' />
      <Header title={title} titleStyle={[styles.headerTitle, currentStep === 'link' && styles.linkHeaderTitle]} onBack={goBack}
        backIcon={currentStep === 'link' ? (
          <View style={styles.headerLink}><Image accessible={false} source={assets.headerLink} style={styles.icon20} /></View>
        ) : assets.back}
        logo={currentStep === 'format' ? undefined : <Image accessible={false} source={assets.logo} resizeMode='contain' style={styles.headerLogo} />}
        style={[styles.header, centered && styles.borderlessHeader]} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView key={currentStep} style={styles.flex}
          contentContainerStyle={[
            getResponsiveContentStyle(screen.width, 'flow'),
            styles.scrollContent,
            currentStep === 'link' && styles.linkContent,
            currentStep === 'transfer' && styles.transferContent,
            currentStep === 'complete' && [styles.completeContent, { paddingBottom: screen.height >= 800 ? 144 : 24 }],
          ]}
          keyboardShouldPersistTaps='handled' keyboardDismissMode='on-drag'>
          {currentStep === 'link' ? (
            <View testID='download-link' style={styles.linkStage}>
              <Image accessible={false} source={assets.logo} resizeMode='contain' style={styles.mainLogo} />
              <View style={styles.linkIntro}>
                <Text accessibilityRole='header' style={styles.title}>Cole o link da mídia</Text>
                <Text style={styles.description}>Insira a URL do vídeo ou áudio que deseja baixar.</Text>
              </View>
              <Input label='LINK DA MÍDIA' placeholder='https://...' variant='accent'
                value={flow.url || ''} onChangeText={flow.onChangeUrl} editable={typeof flow.onChangeUrl === 'function'}
                keyboardType='url' autoCapitalize='none' autoCorrect={false} error={flow.fieldError}
                leftIcon={<Image accessible={false} source={assets.link} style={styles.icon20} />}
                rightActionLabel='Colar' onRightAction={flow.onPaste} fieldStyle={styles.urlField} />
              <Card variant='infoBanner' style={styles.info}>
                <View style={styles.infoBadge}><Image accessible={false} source={assets.check} style={styles.icon20} /></View>
                <View style={styles.optionText}>
                  <Text style={styles.fileTitle}>Escolha o formato na próxima etapa</Text>
                  <Text style={styles.helper}>MP4 para vídeo ou MP3 para áudio, conforme a origem.</Text>
                </View>
              </Card>
              <Button title={analyzing ? 'Analisando mídia...' : 'Continuar'} onPress={analyze}
                disabled={analyzing || typeof flow.onAnalyze !== 'function'} style={styles.primary} />
              {analyzing ? <LoadingIndicator message='Consultando a origem da mídia...' /> : (
                <Text style={styles.centeredHelper}>O link será analisado antes de iniciar o download.</Text>
              )}
              <ErrorMessage message={flow.error} />
              {flow.backendAvailable ? <BackendCredential hasToken={flow.hasBackendToken} onSave={flow.onSetBackendToken} /> : null}
            </View>
          ) : null}

          {currentStep === 'format' ? (
            <View testID='download-format'>
              <Text accessibilityRole='header' style={styles.overline}>MÍDIA ENCONTRADA</Text>
              <Card variant='summary' style={[styles.summary, styles.previewCard]}>
                <View style={styles.previewVisual}>
                  <Image accessible={false} source={assets.playBackground} style={styles.playBackground} />
                  <Image accessible={false} source={format === 'MP3' ? assets.audio : assets.play} style={styles.icon24} />
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.fileTitle}>{flow.media.name}</Text>
                  <Text style={styles.helper}>{selected.operation ? operationLabels[selected.operation] : `${formatInfo[format]?.label} confirmado na origem`}</Text>
                </View>
              </Card>
              <Text accessibilityRole='header' style={[styles.overline, styles.selectionLabel]}>ESCOLHA O FORMATO</Text>
              <View style={styles.formatOptions} accessibilityRole='radiogroup'>
                {formats.map(value => (
                  <Card key={value} variant='selectable' selected={format === value} accessibilityRole='radio'
                    accessibilityLabel={`${value}, ${formatInfo[value]?.label || value}`} style={[styles.option, styles.formatOption]}
                    onPress={() => { if (value !== format) flow.onSelectOption?.(options.find(option => option.format === value)?.id); }}>
                    <View style={styles.formatIcon}><Image accessible={false} source={formatInfo[value]?.icon} style={styles.icon24} /></View>
                    <View style={styles.optionText}>
                      <Text style={styles.fileTitle}>{value}</Text>
                      <Text style={styles.helper}>{formatInfo[value]?.label}</Text>
                    </View>
                    <View accessible={false} style={[styles.radio, format === value && styles.radioSelected]} />
                  </Card>
                ))}
              </View>
              <Card style={styles.hint}><Text style={styles.hintText}>
                {formats.length === 1 ? `A origem disponibiliza apenas ${format}. Você poderá conferir a qualidade na próxima etapa.` : 'Você poderá escolher a qualidade depois.'}
              </Text></Card>
              <Button title='Continuar' onPress={() => setChoiceStep('quality')} disabled={!selected} style={styles.primary} />
            </View>
          ) : null}

          {currentStep === 'quality' ? (
            <View testID='download-quality'>
              <Text accessibilityRole='header' style={styles.overline}>ARQUIVO SELECIONADO</Text>
              <FileSummary name={flow.media.name} format={format} details={selected.quality} />
              <Text accessibilityRole='header' style={[styles.overline, styles.selectionLabel]}>
                {format === 'MP3' ? 'QUALIDADE DO ÁUDIO' : 'QUALIDADE DO VÍDEO'}
              </Text>
              {showQualities ? (
                <View style={styles.qualityOptions} accessibilityRole='radiogroup'>
                  <Text style={styles.helper}>{selected.operation === 'transcode' ? 'A taxa de saída não recupera detalhes ausentes na origem.' : 'Escolha uma qualidade disponibilizada pela origem.'}</Text>
                  {inFormat.map(option => (
                    <Card key={option.id} variant='selectable' selected={selected.id === option.id} accessibilityRole='radio'
                      accessibilityLabel={`Qualidade ${option.quality || 'original'}`} style={styles.option}
                      onPress={() => flow.onSelectOption?.(option.id)}>
                      <View style={styles.optionText}>
                        <Text style={styles.fileTitle}>{option.quality || 'Original'}</Text>
                        <Text style={styles.helper}>{formatFileSize(option.sizeBytes) || (option.estimatedSizeBytes ? `Estimativa: ${formatFileSize(option.estimatedSizeBytes)}` : 'Tamanho não informado')}</Text>
                      </View>
                      <View accessible={false} style={[styles.radio, selected.id === option.id && styles.radioSelected]} />
                    </Card>
                  ))}
                </View>
              ) : <Card style={styles.hint}><Text style={styles.helper}>{selected.operation && selected.operation !== 'original'
                ? operationLabels[selected.operation] : 'Qualidade não informada pela origem. O arquivo original será mantido.'}</Text></Card>}
              <Card style={[styles.hint, styles.sizeSummary]}>
                <Text style={styles.helper}>Tamanho informado</Text>
                <Text style={styles.fileTitle}>{formatFileSize(selected.sizeBytes) || 'Não informado'}</Text>
              </Card>
              {!flow.serviceAvailable ? (
                <Text accessibilityRole='alert' style={styles.helper}>O serviço de download não está disponível neste ambiente. Nenhuma transferência será simulada.</Text>
              ) : null}
              {flow.storageError ? (
                <ErrorMessage message={flow.storageError || 'Não foi possível preparar o armazenamento local.'}
                  onRetry={flow.onRetryStorage} retryLabel='Tentar preparar o armazenamento' />
              ) : null}
              {flow.isPreparingStorage ? <LoadingIndicator size='small' message='Preparando armazenamento...' /> : null}
              <Button title={format === 'MP3' ? 'Download do áudio' : 'Download do vídeo'}
                disabled={!canStart} onPress={canStart ? flow.onStart : undefined}
                rightIcon={<Image accessible={false} source={assets.arrow} style={styles.icon18} />}
                style={styles.primary} />
            </View>
          ) : null}

          {currentStep === 'transfer' ? (
            <View testID='download-transfer' style={styles.transferStage}>
              {transferring ? (
                <>
                  <View style={styles.progressRing}>
                    <Image accessible={false} source={assets.ring} style={styles.ringImage} />
                    {progress === null ? <LoadingIndicator size='small' message='' /> : (
                      <Text accessible={false} style={styles.metric}>{progress}%</Text>
                    )}
                  </View>
                  <Text accessibilityRole='header' accessibilityLiveRegion='polite' style={styles.statusTitle}>{phase?.[0] || (status === 'queued' ? 'Preparando transferência' : 'Baixando mídia')}</Text>
                  <View style={styles.transferDescription}>
                    <Image accessible={false} source={assets.spinner} style={styles.icon16} />
                    <Text style={styles.description}>{phase ? phase[1] + trackText : status === 'queued' ? 'Preparando armazenamento...' : progress === null ? 'Transferindo; tamanho total não informado pela origem.' : 'Recebendo o arquivo da origem...'}</Text>
                  </View>
                  {progress !== null ? <ProgressBar progress={flow.progress} showPercentage={false} accessibilityLabel={phase?.[0] || 'Progresso real da transferência'} style={styles.progressBar} trackStyle={styles.progressTrack} fillStyle={styles.progressFill} /> : null}
                  {flow.phase?.isCancelling && !flow.isCancelling ? <Text accessibilityLiveRegion='polite' style={styles.helper}>Aguardando o cancelamento no servidor...</Text> : null}
                  {flow.canCancel && flow.onCancel ? (
                    <Button title={flow.isCancelling ? 'Cancelando...' : 'Cancelar download'} variant='outline'
                      disabled={flow.isCancelling} onPress={flow.onCancel} style={styles.cancelButton}
                      leftIcon={<Image accessible={false} source={assets.cancel} style={styles.icon20} />} />
                  ) : null}
                  <ErrorMessage message={flow.actionError} />
                </>
              ) : status === 'cancelled' ? (
                <>
                  <Text accessibilityRole='header' accessibilityLiveRegion='polite' style={styles.title}>Download cancelado</Text>
                  <Text style={styles.description}>A transferência foi interrompida.</Text>
                  <Button title='Baixar outra mídia' variant='link' onPress={reset} />
                </>
              ) : (
                <>
                  <Text accessibilityRole='header' style={styles.title}>{status === 'paused' && !record?.remote?.retry ? 'Acompanhamento pausado' : 'Falha no download'}</Text>
                  <ErrorMessage message={flow.error || 'O serviço não confirmou que o arquivo foi salvo.'}
                    onRetry={status === 'paused' ? flow.onResume : flow.onAnalyze ? analyze : undefined}
                    retryLabel={status === 'paused' ? (record?.remote?.retry ? 'Tentar novamente' : 'Retomar acompanhamento') : undefined} />
                  {status === 'paused' && flow.backendAvailable ? <BackendCredential hasToken={flow.hasBackendToken} onSave={flow.onSetBackendToken} /> : null}
                  <Button title='Usar outro link' variant='link' onPress={reset} />
                </>
              )}
            </View>
          ) : null}

          {currentStep === 'complete' ? (
            <View testID='download-complete' style={styles.completeStage}>
              <View style={styles.successBadge}>
                <Image accessible={false} source={assets.successBackground} style={styles.successBackground} />
                <Image accessible={false} source={assets.success} style={styles.successIcon} />
              </View>
              <Text accessibilityRole='header' accessibilityLiveRegion='polite' style={styles.title}>
                {flow.persistencePending ? 'Arquivo salvo no dispositivo' : 'Download concluído!'}
              </Text>
              <Text style={styles.description}>{flow.persistencePending
                ? 'A biblioteca ainda não confirmou o registro do arquivo.'
                : 'Seu arquivo foi salvo com sucesso no dispositivo.'}</Text>
              {flow.persistencePending ? <ErrorMessage message={flow.storageError || 'Não foi possível gravar o registro.'}
                onRetry={flow.onRetryStorage} retryLabel='Tentar salvar dados novamente' /> : null}
              <View style={styles.savedFile}><FileSummary name={record.name} format={record.format} details={metadata}
                onOpen={typeof flow.onOpen === 'function' ? openFile : undefined} /></View>
              <Button title='Abrir arquivo' onPress={openFile} disabled={typeof flow.onOpen !== 'function'} style={styles.primary} />
              <Button title='Baixar outra mídia' variant='link' onPress={reset} />
              {openErrorUri === record.fileUri ? <ErrorMessage message='Não foi possível abrir o arquivo. Verifique se ele existe e se há um aplicativo compatível.' /> : null}
            </View>
          ) : null}
          <ErrorMessage message={flow.actionError} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
