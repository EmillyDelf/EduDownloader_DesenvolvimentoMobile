# Fixtures próprias da GOAL 06

`authorized.mp4` é um vídeo sintético de um segundo, 32 × 32, com cor sólida azul.
`authorized.mp3` é um tom sintético de 440 Hz com um segundo de duração.
Não contêm conteúdo de terceiros, informações pessoais nem material extraído de plataformas.

Gerados localmente com FFmpeg, sem downloads:

```text
ffmpeg -f lavfi -i color=c=0x0131CD:s=32x32:r=1 -t 1 -c:v mpeg4 -pix_fmt yuv420p -movflags +faststart -an authorized.mp4
ffmpeg -f lavfi -i sine=frequency=440:duration=1 -c:a libmp3lame -b:a 32k authorized.mp3
```

Os testes servem esses arquivos em HTTP apenas no loopback do próprio computador,
comparam os bytes salvos e verificam a interrupção de uma resposta lenta.
Os testes não acionam um player, um dispositivo Android/iOS nem a ponte nativa do Expo.
