# GOAL 2.5 — Auditoria técnica dos motores do EduDownloader Mobile

19 de novembro de 2026 · Windows x64, Python 3.14.6

## Execução e regressão

| Verificação | Resultado |
| --- | --- |
| `npm ci` | Código 0. Instalou 484 pacotes pelo lockfile existente. O npm manteve os três alertas moderados já registrados na integração. |
| `node --test tests/*.test.cjs` | 133 aprovados antes e depois, com zero falhas, saltos ou cancelamentos. Os 178 arquivos móveis auditados coincidem byte a byte com a entrega final do GOAL 01. |
| `npx expo-doctor` | 20 de 20 verificações aprovadas. |
| `npx expo export --platform android --output-dir ../EduDownloader-Goal02-Android-Validacao --max-workers 2` | Código 0. Metro compilou 1.193 módulos e 151 assets. Bytecode Hermes conferido junto com os assets referenciados. |
| `python -m pytest -q -s` | 53 aprovados em 46,04 segundos. Incluiu motores reais, HTTP no Uvicorn, integração, segurança, encerramento e cotas nativas. |
| `python -m pip check` e `python -m compileall -q backend/app backend/tests` | Passaram. O Starlette emitiu um aviso de depreciação do `httpx` usado pelo TestClient. |
| Dependências Python no OSV | A consulta exata dos 32 pares pacote/versão retornou zero avisos naquela data. [OSV](https://osv.dev/) |
| ESLint e TypeScript | A tentativa de lint encontrou a configuração ausente. O compilador TypeScript local e o `tsconfig.json` seguem ausentes. Os manifestos móveis mantiveram seus bytes. |

O bundle `index-8a348c9e3e846c75508717ee7f899dbe.hbc` tem 3.040.140 bytes e SHA-256 `55a14d2f6fbd0369f8c092fe2f5af92789651dcc1ea0e7c1ca9a4db884892b60`. Foram verificadas as strings dos fluxos do GOAL 01, PDF e escolha de áudio. A validação do aplicativo nesta etapa usou testes e compilação.

## Mídias reais

As fixtures foram geradas no teste com as fontes sintéticas `testsrc2` e `sine` do FFmpeg. Um servidor HTTP local serviu os arquivos. O cliente conferiu os bytes, o MIME, o SHA-256 e a resposta parcial por `Range`. Os binários de mídia de teste são temporários.

| Saída verificada | Evidência FFprobe | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| MP4 original | H.264 e AAC, 320 × 180, 1,2 s | 39.622 | `7c53c5486819a5881d94dd9049342f953d266ae16792062e95327815eef84f6d` |
| MP3 original | MP3, 128 kbps, 0,8 s | 13.835 | `b5a0766ded8b8514229061192c57720df6737fb266f399c2368736946fed398e` |
| MP4 combinado | H.264 e AAC de arquivos separados, 640 × 360, 2,4 s | 190.356 | `724a09ddf2097ee3bab899ce8e2d99341105fbc1307f96b328bf8bce4434bb59` |
| MP3 convertido | MP3, 192 kbps, 2,4 s | 58.975 | `c1ccc1a937b095afeaf0c3f1316f87eee0a5b7c56921316662b1ba002f5cf767` |

O yt-dlp identificou no DASH as representações reais de 180p e 360p e a fonte de áudio. O cancelamento foi observado durante HTTP com bytes em avanço e durante codificação real. O teste de codificação desacelerou apenas a entrada da fixture para deixar o intervalo de observação reproduzível. Foram constatados encerramento do processo pai e do descendente, limpeza de temporários, expiração, rejeição de arquivo incompleto e reinício com tarefa ativa. Um teste separado executou Deno e comprovou a recusa de acesso de rede sem permissão.

### Verificações externas

- O vídeo `flower.mp4` do MDN foi analisado e baixado com HTTPS. A saída verificada tem 1.128.375 bytes, H.264/AAC, 960 × 540 e 5,055 s, com SHA-256 `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451`. [Fixture CC0 do MDN](https://github.com/mdn/interactive-examples/tree/main/live-examples/media/cc0-videos)
- A análise de *Big Buck Bunny* pelo extrator YouTube retornou 144p, 240p, 360p, 480p, 720p e 1080p, além dos três perfis MP3. Uma segunda tentativa de transferência em 144p observou 2.142.811 de 3.753.637 bytes da primeira stream em 171,6 s, a cerca de 12,5 kB/s. A tarefa encerrou com `TASK_TIMEOUT` no prazo de 180 s. [Vídeo](https://www.youtube.com/watch?v=YE7VzlLtp-4) · [Licença CC BY 3.0 da Blender Foundation](https://peach.blender.org/about/)
- A mesma API analisou, baixou e verificou o trailer de 33 s do projeto Peach no YouTube. A variante de 144p usou o MP4 original. A tarefa concluiu em 37,13 s. O FFprobe mediu H.264/AAC, 256 × 144 e 33,067 s. O cliente recebeu 1.994.838 bytes com SHA-256 `b9a7e21457bfb096e26a026e85732b35200b68b26f2bbd0708ca23511b14815a`. Copyright 2008 Blender Foundation, CC BY 3.0. [Trailer usado](https://www.youtube.com/watch?v=GJVwbyAY4Sk) · [Trailer no projeto oficial](https://peach.blender.org/trailer-page/)

## Segurança e estabilidade

| Risco ou falha | Controle e evidência |
| --- | --- |
| SSRF | Hosts de entrada explícitos e proxy restrito a cada operação. O proxy revisa hosts de cada conexão, resolve DNS absoluto, rejeita respostas com IP privado ou reservado e conecta pelo IP público verificado. Há testes de loopback, redes IPv4 e IPv6, credenciais, redirecionamento interno e respostas DNS mistas ou alteradas. |
| Processos fora de controle | Um processo de espera só lança o motor depois da atribuição ao Job Object. O objeto encerra os descendentes ao fechar. Testes observaram a árvore, o teto de CPU e memória e o limite de saída do motor. |
| Caminho e arquivo indevidos | A API aceita UUID e opção de uma análise do próprio cliente. Resultados usam caminhos gerados em diretório privado. O teste exercitou travessia, cliente alheio, arquivo inválido, saída parcial e verificação antes da entrega. |
| Exaustão | Tamanho declarado e bytes recebidos têm limites. O espaço tem reserva, cota e piso livre. Fila, análises simultâneas, prazos, quantidade de registros e taxa por cliente têm limites. Os testes exercitaram fila cheia, cota insuficiente, política de tamanho e expiração do prazo. |
| Duplicidade e cancelamento | A chave de idempotência vincula cliente, análise e opção. Cancelamento repetido mantém o estado e a conclusão preserva o arquivo já verificado. Os testes cobriram fila, download e FFmpeg. |
| Vazamento em respostas e logs | Erros públicos têm códigos fixos. Logs de falha registram o código e suprimem URLs dos clientes HTTP. O teste com nível INFO verificou ausência dos valores sensíveis de teste. Os logs de acesso do ponto de entrada local ficam desabilitados. |
| Metadados e compatibilidade | A análise direta usa HEAD. O manifesto tem limite de tamanho, rejeita DTD e preserva duração disponível. Motores ausentes aparecem na saúde. Foram corrigidos um parâmetro CLI obsoleto e a perda da duração explícita do manifesto. |

## Limitações e integração

O isolamento de rede é a política do proxy, com subprocessos confiáveis e sem plugins remotos. O Windows x64 foi o ambiente testado. Uma implantação pública requer isolamento adicional no nível de rede, TLS, gerenciamento de segredos, métrica e armazenamento persistente. A fila atual é de uma instância e reinicia sem tarefas prévias. A disponibilidade das plataformas externas varia por conteúdo e pela origem.

O [relatório de implementação](GOAL02_MOTORES_BACKEND.md) descreve a adaptação planejada do React Native. O [README do backend](../backend/README.md) contém os comandos, os contratos, as versões, os limites e a procedência dos motores.
