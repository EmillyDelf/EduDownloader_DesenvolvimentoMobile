# GOAL 06 — Download de Mídia e gerenciamento do Histórico

Implementação local em **12/11/2026** no projeto Mobile integrado. A referência inicial tinha 60 testes aprovados. A entrega tem 103 testes aprovados, sem falhas ou skips, e bundle Android/Hermes compilado no principal e em instalação limpa. **Teste visual e execução nativa no Expo Go permanecem pendentes:** John informou que não pode testar agora. Não há aprovação integral em dispositivo.

## Fluxo disponível no aplicativo

1. Abra a Home e toque em **Download de mídia**, ou selecione a aba Downloads.
2. Digite uma URL ou use **Colar**. O componente Input oficial mantém as opções do teclado, acessibilidade e erros.
3. Toque em **Analisar mídia**. Um HEAD assíncrono consulta a origem sem baixar o corpo inteiro para adivinhar dados.
4. Se a origem confirmar `video/mp4` ou `audio/mpeg`, o aplicativo mostra o nome disponível, formato, tamanho informado e opções retornadas. A disponibilidade corresponde ao momento da consulta; a transferência pode falhar depois.
5. Escolha MP4/vídeo ou MP3/áudio somente quando a opção estiver habilitada. MP3 não é conversão: precisa existir diretamente na origem.
6. Escolha a qualidade somente se o identificador retornar variantes reais. No identificador direto, a resolução não é informada; a interface explica que manterá o arquivo original.
7. Inicie o download. O arquivo é transferido por streaming nativo para uma área temporária própria, com progresso real quando há total conhecido.
8. Cancele quando o adaptador declarar suporte. O estado só se torna cancelado depois da confirmação do adaptador, que aciona a interrupção nativa. Uma tentativa de cancelamento rejeitada mantém a transferência em andamento e mostra erro.
9. Ao terminar, o aplicativo verifica resposta HTTP, tamanho disponível, assinatura básica do formato e existência do arquivo final antes de exibir concluído. Depois grava o registro no Histórico.
10. Abra o Histórico para ver, abrir ou excluir um registro. Excluir requer ConfirmationDialog e preserva o arquivo físico.

O formulário está no cabeçalho rolável da lista existente. Busca, filtros, cartões, progresso, estados vazio/carregando/erro e callbacks anteriores permanecem disponíveis. Não foram duplicados Header nem BottomNavigation. As abas mantêm `home`, `downloads`, `pdf`, `history`, `profile`.

Home, Conversão do Paulo, demonstração dos nove componentes, prévia isolada com dados fictícios e telas provisórias de PDF/Perfil foram preservadas. Os nove componentes oficiais não foram alterados nesta GOAL. Inter, Montserrat e a paleta compartilhada continuam vigentes.

## Validação de URLs

`src/media/mediaContracts.js` expõe `validateMediaUrl(value)`:

- Rejeita campo vazio, endereço incompleto, protocolos diferentes de HTTP/HTTPS, credenciais na URL, espaços internos, barras invertidas e caracteres de controle.
- Normaliza espaços externos e remove o fragmento, que não é enviado ao servidor.
- Aceita URLs HTTP/HTTPS diretas, inclusive servidores locais de teste.
- URL sintaticamente válida não significa mídia identificada, disponível ou autorizada. Essas verificações são separadas.
- Erros apresentados não reproduzem exceções nativas com caminhos ou URLs privadas.

HEAD possui timeout de 15 segundos e AbortController. Editar o link invalida a geração anterior e interrompe a consulta; respostas antigas não substituem o estado atual. HTTP inacessível, falha de rede, resposta inválida, HEAD não suportado e MIME desconhecido têm mensagens próprias ou seguras. Não há fallback que baixe um corpo arbitrariamente grande para tentar descobrir a mídia.

## Contrato de identificação e transferência

`createDirectMediaIdentifier(fetchImpl, timeoutMs)` é o adaptador padrão para arquivos diretamente servidos. É substituível por um identificador assíncrono compatível:

```js
async function identify(url, { signal }) {
  // Retorne somente opções confirmadas por sua fonte/serviço real.
  return {
    available: true,
    name: 'nome-fornecido-pela-origem.mp4',
    options: [{
      id: 'opcao-estavel',
      format: 'MP4',
      mimeType: 'video/mp4',
      url: 'https://origem-autorizada.exemplo/arquivo.mp4',
      quality: null, // ou um rótulo confirmado pelo serviço, como 720p
      sizeBytes: undefined, // somente quando realmente informado
    }],
  };
}
```

O objeto acima documenta o formato do contrato, não é carregado como dado no aplicativo. O identificador direto obtém o nome de Content-Disposition ou do último segmento do endereço, o tipo de Content-Type e o tamanho de Content-Length, quando válido. Não inventa duração, miniatura, resolução ou uma segunda opção de formato. Conteúdo HTML, playlists, páginas de plataformas e arquivos sem MIME MP4/MP3 confirmado não são tratados como mídia pronta para baixar.

`normalizeMediaMetadata` valida disponibilidade, IDs únicos, URLs e correspondência entre formato e MIME. `createExpoFileServices(...).prepare(option, operationId, callbacks)` cria um handle com:

- `start()`: realiza a transferência e resolve `{ fileUri, sizeBytes, mimeType, verified: true }` após a verificação e gravação.
- `canCancel()`: informa se a transferência pode ser interrompida naquele instante.
- `cancel()`: precisa resolver `true` após solicitar e confirmar a interrupção no adaptador. Valor diferente de true ou rejeição não autoriza estado cancelado.
- `onProgress({ totalBytesWritten, totalBytesExpectedToWrite })`: apenas dados da transferência real.
- `onTransferEnd()`: desabilita cancelamento quando começa a verificação final.

O adaptador Expo usa `expo-file-system/legacy`, que está disponível no SDK 58 e oferece DownloadResumable com progresso/cancelAsync. Os imports usam explicitamente `/legacy`; não são chamadas as funções depreciadas que lançam erro no entrypoint moderno. O uso dessa interface é deliberado para o contrato de transferência cancelável e pode ser substituído futuramente.

A gravação fica em `FileSystem.documentDirectory/edudownloader/downloads/`, dentro do armazenamento privado do aplicativo. Não são solicitadas permissões amplas de galeria/armazenamento externo. Cada operação possui ID e destino próprios; arquivos existentes não são sobrescritos. A área `.part` só é promovida ao destino depois das verificações. Falhas/cancelamentos limpam apenas o temporário daquela operação. A verificação de assinatura é básica, não um decodificador completo nem prova de que todo player suporte o codec.

## Estados e concorrência

| Estado | Significado e saída |
|---|---|
| `idle` | Aguardando link; segue para validating. |
| `validating` | Validação local; segue para identifying ou failed. |
| `identifying` | Consulta assíncrona; segue para ready ou failed; edição invalida o resultado e volta a idle. |
| `ready` | Opção confirmada; permite selecionar formato/qualidade e iniciar. |
| `queued` | Preparação/persistência inicial da operação; não há fila de múltiplas transferências simultâneas. |
| `downloading` | Transferência real; pode concluir, falhar ou ser cancelada efetivamente. |
| `completed` | Arquivo confirmado salvo; progresso final 100%; permite abrir ou analisar outra mídia. |
| `failed` | Falha real; nova tentativa refaz identificação antes de criar outra operação. |
| `cancelled` | Adaptador confirmou interrupção; respostas tardias não podem concluir a mesma operação. |

Pausa/retomada não são oferecidas nesta entrega. Não há botão de pausa nem estado paused produzido pelo serviço. Os contratos de apresentação anteriores continuam capazes de exibir um estado pausado recebido externamente, sem insinuar que a operação local foi implementada.

O bloqueio da operação é adquirido antes do primeiro await. Cliques repetidos não criam transferências simultâneas. Cancelamento possui promessa compartilhada para evitar interrupções duplicadas. Callbacks de uma operação terminada são ignorados. O progresso fica indeterminado se bytes/total forem inválidos ou o tamanho não for informado; nunca é inventado um percentual. Eventos de bytes ficam limitados a 99% até a confirmação final, quando passam a 100%.

Workers nativos e o estado compartilhado continuam ativos ao alternar abas. Se o processo do aplicativo for encerrado, registros queued/downloading reaparecem como interrompidos/falhos, sem fabricar conclusão. Retomada automática de transferências após encerramento e serviço de background não foram implementados.

## Histórico, abertura e exclusão

O fluxo usa `createMediaRepository(storage)` e `createMediaLibrary(...)`, fora de HistoryScreen. O repositório oferece inicialização, consulta, upsert, atualização e remoção de histórico, além de gravação conjunta de download terminal e atividade. IDs estáveis evitam duplicar o registro da mesma operação. Uma nova tentativa cria um novo ID, representando outra tentativa real; o registro da falha anterior permanece visível.

Os filtros por atividade, datas/horários locais e grupos Hoje/Ontem/datas completas continuam na tela. A busca textual existente em Downloads foi preservada. O Histórico original não possuía busca textual e continua com filtros por atividade.

**Abertura:** mantém `onOpenItem(item)`. O adaptador padrão aceita somente arquivos concluídos com URI local da área gerenciada, verifica existência e tamanho e só então invoca a plataforma. Android recebe URI content:// com permissão temporária de leitura e ACTION_VIEW. Falha/ausência de aplicativo compatível produz mensagem útil. No iOS, abre a folha do sistema para escolher aplicativo compatível via expo-sharing; essa API não confirma que o usuário efetivamente abriu o arquivo e pode ser cancelada por ele. Registros fornecidos por outros serviços continuam livres para usar outro callback de abertura.

**Exclusão:** a ação Excluir registro abre ConfirmationDialog. Cancelar não altera os dados. Confirmar fecha o diálogo e mostra atividade enquanto salva. Falha preserva a lista e apresenta erro. Bloqueios no componente e na biblioteca evitam exclusão duplicada. A lista controlada e os grupos são atualizados após a gravação bem-sucedida. Essa operação não chama exclusão de arquivos físicos; o download correspondente pode continuar disponível em Downloads.

`HistoryScreen` acrescenta `onDeleteItem(item)`, `deletingIds`, `storageError`, `storageWarning`, `onRetryStorage` e `actionError`, mantendo as propriedades anteriores. `DownloadsScreen` acrescenta `downloadFlow` e os estados de erro/aviso de armazenamento e ações. Callback externo de exclusão deve atualizar os dados controlados e rejeitar (ou retornar false) se falhar.

## Persistência local e integração

O estado persistido tem schema versão 1, com `downloads` e `history`. Downloads e Histórico consomem a mesma biblioteca por `useMediaLibrary`, sem importar uma tela da outra. O resultado contém nome, formato, qualidade quando conhecida, tamanho confirmado, status, ID, data e URI real. A origem é guardada localmente para permitir nova tentativa; não há log de URLs sensíveis nem sincronização entre dispositivos.

`createJournalStorage(io)` escreve uma nova geração em temporário e renomeia para um nome definitivo exclusivo. O repositório serializa as transações e publica o estado após gravar. Mantém duas gerações válidas; uma gravação JSON danificada pode ser recuperada da anterior, com aviso visível para conferir registros recentes. Gerações danificadas/incompatíveis não são sobrescritas silenciosamente. Schema desconhecido ou estrutura inválida bloqueiam a leitura/gravação com erro, preservando os dados.

Se a transferência terminou, mas a gravação do histórico falhou, o arquivo real e o resultado em memória permanecem disponíveis, com aviso de dados não salvos. **Tentar salvar dados novamente** tenta persistir o mesmo resultado, sem baixar de novo. Fechar o aplicativo antes de recuperar uma falha de gravação pode perder esse último registro; não há promessa fictícia de persistência em caso de erro. Limpar dados/desinstalar o aplicativo também remove o armazenamento privado.

Um backend futuro pode substituir os adaptadores `identify`, `files` e `storage`, ou fornecer `downloadProps`/`historyProps` ao App como antes. Quando `items` é fornecido externamente, a navegação preserva a responsabilidade do chamador e não injeta callbacks locais de exclusão/abertura em registros de outro provedor.

## Dependências e preservação

| Módulo | Declaração no package.json | Resolvido no lockfile | Motivo |
|---|---|---|---|
| expo-file-system | ~58.0.13 | 58.0.13 | Transferência real, progresso/cancelamento e persistência de metadados/arquivos. |
| expo-intent-launcher | ~58.0.3 | 58.0.3 | Abertura Android por aplicativo compatível. |
| expo-sharing | ~58.0.22 | 58.0.23 | Folha de aplicativos compatíveis no iOS. |
| expo-clipboard | ~58.0.4 | 58.0.4 | Ação Colar da interface de link. |

Versões selecionadas pelo Expo CLI para o SDK 58 e registradas também no lockfile. O launcher interno do Expo não encontrou npm.cmd; a instalação foi concluída pelo npm PowerShell após o Expo já ter gravado as versões compatíveis. expo-sharing exige as atualizações transitivas de @expo/config-plugins, @expo/plist e @expo/require-utils presentes no lockfile. Nenhuma ferramenta de lint/TypeScript foi acrescentada.

`App.js`, `app.json`, `index.js`, componentes, estilos compartilhados, fontes, navegação oficial, telas do Paulo e arquivos não relacionados mantêm os bytes da referência anterior à GOAL 06. AppNavigator foi ampliado apenas para conectar a biblioteca. Nenhum componente oficial precisou ser alterado.

Figma foi consultado em modo de leitura: fluxo de download `7:433`, `7:394`, `7:354`, `7:336`, `7:315`. O layout foi adaptado ao formulário integrado à listagem existente, sem inventar a duração/miniatura do exemplo estático nem trocar as fontes exigidas no pedido. Oito ícones foram exportados dos nós originais e têm geometria/callsites verificados; a procedência está em `assets/media/README.md`. Não houve edição do Figma.

## Tarefas informadas no pedido / Trello

Mapeamento por nomes fornecidos na GOAL, sem consultar ou alterar cartões/status remotos. Concluída abaixo indica implementação e verificação local do escopo descrito, **não aprovação nativa/visual em um aparelho**.

| Tarefa | Situação | Evidência ou limite |
|---|---|---|
| Interface de download de mídia e campo de link | Concluída | MediaDownloadForm no aplicativo principal, Input oficial, testes de composição e preservação da lista. |
| Validação de link | Concluída | Função separada; vazio, malformação, protocolo, credenciais e controles testados. |
| Identificação de mídia direta MP4/MP3 | Concluída | HEAD real, MIME/metadados reais, erros/rede/timeout/resposta inválida testados. |
| Identificação de páginas/plataformas, extração ou múltiplas variantes | Dependente de serviço externo | Mensagem de indisponibilidade e contrato assíncrono preparados; nenhum contorno de DRM/acesso. |
| Seleção MP4 | Concluída | Vídeo, seleção e disponibilidade controladas pelas opções identificadas. |
| Seleção MP3 | Concluída | Áudio direto; indisponível sem fonte MP3, sem falsa conversão. |
| Seleção de qualidade | Parcial | Interface/contrato prontos e testados com variantes fornecidas; identificador direto não conhece resoluções e desabilita essa escolha. |
| Botão de iniciar, transferência e estado concluído | Concluída | Transferência nativa implementada; testes reais de HTTP/disco via adaptador injetado; sucesso exige arquivo confirmado. |
| Indicador de progresso | Concluída | Bytes reais; valor desconhecido indeterminado; 100% apenas após confirmação. |
| Cancelamento | Concluída | Interrupção nativa, confirmação, limpeza própria e proteção contra corrida; teste HTTP cancela após receber bytes. |
| Gerenciamento de estados | Concluída | Transições, cliques duplicados, resultados obsoletos e falhas de persistência cobertos. |
| Pausa/retomada/background | Parcial | Não oferecidos; sem botão/estado fictício no serviço local. |
| Visualização/abertura de arquivos | Parcial | Contratos Android/iOS implementados e testados com chamadas nativas substituídas; confirmação em dispositivo e aplicativo compatível pendente. |
| Exclusão de registros | Concluída | Confirmação/cancelamento/falha/duplicação/grupos testados; arquivo físico preservado. |
| Gerenciamento do histórico | Concluída | Consultar/adicionar/atualizar/remover, IDs e serialização; filtros/grupos anteriores preservados. |
| Persistência local e integração com Downloads | Concluída | Reabertura lógica e leitura de arquivos persistidos testadas; resultado real compartilhado sem duplicação. |
| Sincronização remota de histórico | Dependente de serviço externo | Não há backend nem promessa de sincronização entre dispositivos. |
| Teste visual e execução nativa no Expo Go | Parcial | Servidores/fixtures/roteiro preparados; usuário informou indisponibilidade para testar nesta sessão. |

## Executar, testar e compilar

Depois de extrair o ZIP, entre na pasta raiz do projeto:

```powershell
npm ci
npm start
node --test tests/*.test.cjs
npx expo export --platform android --output-dir ../EduDownloader-GOAL06-Android --dump-assetmap --max-workers 2
```

Para usar o Metro sem consultas de rede do CLI:

```powershell
npx expo start --offline --port 8086
```

No SDK 58, não combine `--offline` com `--lan`; o CLI rejeita essa combinação. Use o endereço exp:// exibido pelo Metro no Expo Go compatível com SDK 58. Computador e celular precisam conseguir se comunicar na rede local. O teste não exige backend.

### Roteiro visual e de APIs nativas no Expo Go — pendente

Para testar fontes controladas sem depender de plataformas, abra outro terminal na raiz:

```powershell
node scripts/serve-authorized-fixtures.cjs --host 0.0.0.0 --port 8096
```

Esse script expõe somente duas fixtures sintéticas próprias de teste, nunca diretórios/código. Para restringir ao computador, omita --host ou use 127.0.0.1. Encerre com Ctrl+C. Não foi alterado firewall nem criada regra de rede persistente. Substitua IP-DO-COMPUTADOR pelo IPv4 atual que o Expo exibe; os endereços não são preenchidos automaticamente no fluxo principal.

- `http://IP-DO-COMPUTADOR:8096/authorized.mp4`: vídeo sintético de 1 segundo.
- `http://IP-DO-COMPUTADOR:8096/authorized.mp3`: tom sintético de 1 segundo.
- `http://IP-DO-COMPUTADOR:8096/slow.mp4`: o mesmo vídeo com envio real dos bytes deliberadamente lento para testar cancelamento.

Confira no aparelho:

1. Home → Downloads, campo vazio, URL inválida e mensagens compreensíveis.
2. Cole uma URL da fixture MP4; analise; confirme MP4 habilitado, MP3 indisponível e qualidade não informada. Faça o mesmo para MP3, invertendo os formatos.
3. Inicie uma transferência; confirme o resultado real e o mesmo arquivo no Histórico. Abra usando um aplicativo compatível.
4. Use slow.mp4, acompanhe bytes/progresso e cancele. Confira estado cancelado, ausência de conclusão tardia e nova tentativa.
5. Exclua um registro: cancelar deve mantê-lo; confirmar deve remover apenas o registro e reagrupar as datas. O arquivo deve continuar em Downloads e no dispositivo.
6. Feche e reabra o aplicativo, mantendo os dados do projeto/Expo Go; confira a persistência. Encerrar uma transferência deve mostrar interrupção, não conclusão inventada.
7. Confira fontes ampliadas, tela compacta/tablet, rolagem, teclado, seleção, contraste, leitor de tela, áreas seguras e retorno Android.
8. Navegue por Histórico, Conversão, PDF/Perfil provisórios e ambas as demonstrações. A prévia antiga continua identificada como fictícia; as fixtures HTTP deste roteiro são arquivos realmente transferidos de um servidor local.

Os servidores foram iniciados e tiveram respostas HEAD/GET conferidas nesta sessão; foram encerrados após o usuário informar que não pode testar agora. Nenhum resultado visual ou nativo foi declarado aprovado.

## Resultados e limites da evidência

| Camada | Evidência |
|---|---|
| Referência antes da GOAL 06 | 60 testes, zero falhas/skips. |
| Suíte final no principal | 103 testes, zero falhas/skips; nenhum teste antigo removido ou asserção enfraquecida. Apenas mocks de hooks foram ampliados conforme as novas dependências. |
| Instalação limpa | npm ci --offline --no-audit --no-fund; 481 pacotes instalados; 103 testes aprovados novamente. |
| Compilação Android | Metro/Hermes no principal e na cópia limpa: 996 módulos, 108 entradas de assets. Não é APK/AAB nem execução em aparelho. |
| HTTP e arquivos reais no computador | Fixtures próprias MP4/MP3 transferidas por loopback, bytes comparados; transferência lenta interrompida após receber dados; JSON reaberto e exclusão de histórico preservando o arquivo. |
| Fronteiras nativas | FileSystem é injetado sobre Node nesses testes; IntentLauncher e Sharing são substituídos por registradores de chamadas. Isso não executa a ponte nativa do Expo nem abre um player real. |
| UI automatizada | Controles nativos simulados; validação de callbacks, estados, fontes, ícones, geometria, contratos e navegação. Não é inspeção visual renderizada. |
| Lint e typecheck | npm run lint / npm run typecheck não estão configurados e ESLint/TypeScript estão ausentes. Não foram declarados aprovados. Babel valida sintaxe/imports e o Metro compila. |
| Visual/nativo em Expo Go | Pendente de teste e confirmação do usuário. |

Não se oferece download de qualquer URL arbitrária, extração de plataformas, conversão MP4→MP3, escolha de resolução inventada, pausa/retomada, download em background garantido, backend ou sincronização remota. URLs que não ofereçam HEAD/MIME compatível exigem um serviço real futuro. Rede do aparelho, política HTTP da plataforma, aplicativos instalados e permissões/folhas do sistema ainda precisam ser verificados no dispositivo.

## Arquivos e entrega

Criados: `src/media/mediaContracts.js`, `identifyMedia.js`, `mediaRepository.js`, `expoAdapters.js`, `mediaLibrary.js`, `expoRuntime.js`; `src/hooks/useMediaLibrary.js`; `src/screens/MediaDownloadForm.js`, `mediaDownloadStyles.js`; oito PNGs e README em `assets/media/`; `tests/media.test.cjs`, `media-files.test.cjs`, `media-ui.test.cjs`; helpers `loadMedia.cjs`, `nodeFileBridge.cjs`; fixtures próprias MP4/MP3 e README; `scripts/serve-authorized-fixtures.cjs`; esta documentação.

Modificados nesta GOAL: `src/screens/DownloadsScreen.js`, `HistoryScreen.js`, `fileScreenStyles.js`; `src/navigation/AppNavigator.js`; `tests/screens.test.cjs`, `tests/helpers/mobileHarness.cjs`; `package.json`, `package-lock.json`; notas de atualização em `docs/downloads-historico.md` e `docs/INTEGRACAO_EQUIPE.md`.

O backup verificável anterior à GOAL 06 contém fontes, documentação e estado Git locais anteriores, inclusive trabalho não rastreado. Não inclui node_modules/.expo nem substitui o histórico Git. Foi mantido fora do projeto, sem apagar backups anteriores.

Entrega: **EduDownloader_Mobile_Downloads_Historico_GOAL06.zip**, fora da pasta principal, com uma pasta raiz única. Inclui fontes, configurações/lockfile, assets, testes/fixtures, scripts e documentação. Exclui .git, node_modules, .expo, caches, logs, backups, temporários, arquivos pessoais, outros ZIPs/RARs e builds. CRC, extração, arquivos obrigatórios e SHA-256 são conferidos contra os arquivos integrados e a cópia limpa testada.

O Git Mobile permanece na branch local `main`, commit `9399ce2da5112faba5c33ce28c99d974e0801ed5`, com alterações locais anteriores preservadas e as novas mudanças sem stage/commit. Não houve branch, commit, push, pull, fetch, merge, rebase ou sincronização remota. O repositório desktop em dev/v3.0 não foi alterado.

Referências primárias consultadas: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [FileSystem Legacy](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem-legacy/), [IntentLauncher](https://docs.expo.dev/versions/v58.0.0/sdk/intent-launcher/), [Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/), [Clipboard](https://docs.expo.dev/versions/v58.0.0/sdk/clipboard/) e o código dos módulos instalados. [Figma de referência](https://www.figma.com/design/IS2PX0pWbk5YJnMJZITZFm).
