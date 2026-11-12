import React from 'react';
import { Image, Text, View } from 'react-native';
import Input from '../components/Input';
import Card from '../components/Card';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { formatFileSize } from './fileScreenUtils';
import { getStatusLabel } from './fileScreenUtils';
import styles from './mediaDownloadStyles';

const assets = {
  link: require('../../assets/media/link.png'),
  video: require('../../assets/media/video.png'),
  audio: require('../../assets/media/audio.png'),
  check: require('../../assets/media/check.png'),
  cancel: require('../../assets/media/cancel.png'),
  arrow: require('../../assets/media/arrow.png'),
  success: require('../../assets/media/success.png'),
  successBackground: require('../../assets/media/success-background.png'),
};

export default function MediaDownloadForm({ flow = {} }) {
  const status = flow.status || 'idle';
  const analyzing = ['validating', 'identifying'].includes(status);
  const transferring = ['queued', 'downloading'].includes(status);
  const locked = transferring || flow.isPreparingStorage;
  const options = flow.media?.options || [];
  const selected = options.find(option => option.id === flow.selectedOptionId);
  const selectedFormat = selected?.format;
  const available = options.filter(option => option.format === selectedFormat);
  const hasQuality = available.some(option => option.quality);
  const canAnalyze = typeof flow.onAnalyze === 'function' && !locked && !analyzing;

  return (
    <View testID='media-download-form' style={styles.form}>
      <Text accessibilityRole='header' style={styles.title}>Baixar mídia por link</Text>
      <Text style={styles.helper}>Insira a URL de um arquivo de vídeo ou áudio cujo download você tem autorização para realizar.</Text>
      <Input
        label='Link da mídia' placeholder='https://...'
        variant='accent' value={flow.url || ''} onChangeText={flow.onChangeUrl}
        keyboardType='url' autoCapitalize='none' autoCorrect={false}
        editable={!locked && typeof flow.onChangeUrl === 'function'} error={flow.fieldError}
        leftIcon={<Image accessible={false} source={assets.link} style={styles.icon20} />}
        rightActionLabel='Colar' onRightAction={flow.onPaste}
      />
      <Card variant='infoBanner' style={styles.info}>
        <View style={styles.row}>
          <View style={styles.infoBadge}><Image accessible={false} source={assets.check} style={styles.icon20} /></View>
          <Text style={styles.helper}>MP4 para vídeo e MP3 para áudio. Apenas formatos confirmados pela origem serão habilitados.</Text>
        </View>
      </Card>
      <Button title={analyzing ? 'Analisando mídia...' : 'Analisar mídia'} disabled={!canAnalyze} onPress={flow.onAnalyze} />
      {analyzing ? <LoadingIndicator message='Consultando a origem da mídia...' /> : null}
      {!flow.serviceAvailable ? <Text accessibilityRole='alert' style={styles.helper}>O serviço de download não está disponível neste ambiente. Nenhuma transferência será simulada.</Text> : null}
      <ErrorMessage message={flow.error} />
      <ErrorMessage message={flow.actionError} />

      {flow.media ? (
        <>
          <Card variant='summary' style={styles.summary}>
            <Text accessibilityRole='header' style={styles.label}>Mídia identificada</Text>
            <Text style={styles.fileTitle}>{flow.media.name || 'Arquivo direto identificado'}</Text>
            <Text style={styles.helper}>Disponível na origem · {selectedFormat === 'MP4' ? 'Vídeo MP4' : 'Áudio MP3'}</Text>
            {selected?.sizeBytes !== undefined ? <Text style={styles.helper}>Tamanho informado: {formatFileSize(selected.sizeBytes)}</Text> : null}
          </Card>
          <Text accessibilityRole='header' style={styles.label}>Escolha o formato</Text>
          <View style={styles.formatOptions}>
            {['MP4', 'MP3'].map(format => {
              const supported = options.some(option => option.format === format);
              return (
                <Card
                  key={format} variant='selectable' selected={selectedFormat === format}
                  disabled={locked || status !== 'ready' || !supported}
                  accessibilityLabel={`${format}, ${format === 'MP4' ? 'vídeo' : 'áudio'}, ${supported ? 'disponível' : 'indisponível nesta origem'}`}
                  onPress={() => flow.onSelectOption?.(options.find(option => option.format === format)?.id)}
                  style={styles.formatCard}
                >
                  <View style={styles.formatRow}>
                    <Image accessible={false} source={format === 'MP4' ? assets.video : assets.audio} style={styles.icon24} />
                    <View style={styles.formatText}>
                      <Text style={styles.fileTitle}>{format}</Text>
                      <Text style={styles.helper}>{format === 'MP4' ? 'Vídeo' : 'Áudio'}</Text>
                    </View>
                  </View>
                  <Text style={styles.helper}>{supported ? selectedFormat === format ? 'Selecionado' : 'Disponível' : 'Indisponível'}</Text>
                </Card>
              );
            })}
          </View>
          <Text style={styles.helper}>Selecionar MP3 não converte um vídeo. A origem precisa fornecer o áudio nesse formato.</Text>
          <Text accessibilityRole='header' style={styles.label}>Qualidade do download</Text>
          {hasQuality ? available.map(option => (
            <Card key={option.id} variant='selectable' selected={selected?.id === option.id}
              disabled={locked || status !== 'ready'} onPress={() => flow.onSelectOption?.(option.id)}
              accessibilityLabel={`Qualidade ${option.quality || 'original'}`}>
              <Text style={styles.fileTitle}>{option.quality || 'Original (sem resolução informada)'}</Text>
              {option.sizeBytes !== undefined ? <Text style={styles.helper}>{formatFileSize(option.sizeBytes)}</Text> : null}
            </Card>
          )) : (
            <Card variant='summary'>
              <Text style={styles.helper}>Qualidade não informada pela origem. O arquivo original será mantido, sem escolher ou converter a resolução.</Text>
            </Card>
          )}
          <Button title={selectedFormat === 'MP3' ? 'Iniciar download do áudio' : 'Iniciar download do vídeo'}
            disabled={status !== 'ready' || !selected || !flow.serviceAvailable || flow.isPreparingStorage || flow.storageBlocked}
            onPress={flow.onStart}
            rightIcon={<Image accessible={false} source={assets.arrow} style={styles.icon18} />}
          />
        </>
      ) : null}

      {transferring ? (
        <Card variant='summary'>
          <Text accessibilityRole='header' style={styles.fileTitle}>{status === 'queued' ? 'Preparando transferência' : 'Baixando mídia'}</Text>
          {Number.isFinite(flow.progress) ? <ProgressBar progress={flow.progress} accessibilityLabel='Progresso real da transferência' /> : <LoadingIndicator message={status === 'queued' ? 'Preparando armazenamento...' : 'Transferindo; tamanho total não informado pela origem.'} />}
          {flow.canCancel ? <Button title={flow.isCancelling ? 'Cancelando...' : 'Cancelar download'} variant='secondary'
            disabled={flow.isCancelling} onPress={flow.onCancel}
            leftIcon={<Image accessible={false} source={assets.cancel} style={styles.icon20} />} /> : null}
          {!flow.canCancel && status === 'downloading' ? <Text style={styles.helper}>Aguarde a transferência ou a verificação final do arquivo.</Text> : null}
        </Card>
      ) : null}
      {status === 'completed' ? (
        <Card variant='summary'>
          <View style={styles.successBadge}>
            <Image accessible={false} source={assets.successBackground} style={styles.successBackground} />
            <Image accessible={false} source={assets.success} style={styles.successIcon} />
          </View>
          <Text accessibilityRole='header' style={styles.title}>Download concluído!</Text>
          <Text style={styles.helper}>O arquivo foi verificado e salvo no armazenamento local do aplicativo.</Text>
          <Text style={styles.fileTitle}>{flow.record?.name}</Text>
          <ProgressBar progress={100} />
          <Button title='Abrir arquivo' onPress={flow.onOpen} disabled={typeof flow.onOpen !== 'function'} />
        </Card>
      ) : null}
      {status === 'cancelled' ? <Text accessibilityLiveRegion='polite' style={styles.helper}>Download cancelado. A transferência foi interrompida.</Text> : null}
      {['completed', 'cancelled'].includes(status) ? <Button title='Baixar outra mídia' variant='link' onPress={flow.onReset} /> : null}
      <Text accessibilityLiveRegion='polite' style={styles.helper}>Estado: {({ idle: 'aguardando link', validating: 'validando', identifying: 'identificando', ready: 'pronto para iniciar' })[status] || getStatusLabel(status)}</Text>
    </View>
  );
}
