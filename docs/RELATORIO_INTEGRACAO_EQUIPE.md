# Integração da equipe do EduDownloader Mobile

19 de novembro de 2026 · Entrega local para revisão

## 1. Versão-base e cópia de trabalho

A `main` local, a referência local `origin/main` e a `main` consultada diretamente no GitHub coincidiam em `f65cf5ed6379a9da3f340105d6614bbbabb6c2b0`. O clone iniciou e terminou com a árvore de trabalho limpa. A entrega fica em `C:\Users\Usuario\Desktop\EduDownloader_Mobile_Integrado`. [Commit oficial](https://github.com/EmillyDelf/EduDownloader_DesenvolvimentoMobile/commit/f65cf5ed6379a9da3f340105d6614bbbabb6c2b0)

| Origem lida | Raiz sob a Área de Trabalho | Arquivos inventariados |
| --- | --- | ---: |
| Base oficial | `EduDownloader_DesenvolvimentoMobile` | 136 |
| Emilly | `EduDownloader_Emilly/EduDownloader_Mobile` | 141 |
| Paulo | `EduDownloader_Paulo/EduDownloader_DesenvolvimentoMobile` | 141 |

A comparação usa caminhos relativos e SHA-256 de conteúdo. Para comparar código e texto, CRLF e LF foram normalizados. A verificação final dos três conjuntos usou os bytes originais, com todos os hashes coincidentes. A pasta de entrega contém o código e os recursos do projeto, com instalação reproduzível pelo lockfile. A exportação Android está na pasta irmã `EduDownloader-Mobile-Bundle-Validacao`.

## 2. Diferenças encontradas

| Entrega | Adições em relação à base | Alterações em relação à base | Ausência em relação à base |
| --- | --- | --- | --- |
| Emilly | `PDF_TEST_MATRIX.md`, `src/pdf/pdfGenerator.js`, `src/screens/PdfSettingsScreen.js`, `src/screens/PdfProgressScreen.js`, `src/screens/PdfCompleteScreen.js`, `tests/pdf-pure.test.cjs` | `app.json`, `docs/INTEGRACAO_EMILLY_PDF.md`, `docs/INTEGRACAO_EQUIPE.md`, `package.json`, `package-lock.json`, `src/navigation/AppNavigator.js`, `tests/pdf-interface.test.cjs` | `README.md` |
| Paulo | `assets/screens/arrow-right-white.png`, `assets/screens/arrow-right-white.svg`, `assets/screens/play-icon.png`, `assets/screens/play-icon.svg`, `src/screens/FormatChoiceScreen.js`, `tests/format-choice.test.cjs` | `package.json`, `package-lock.json`, `src/navigation/AppNavigator.js`, `src/screens/ConvertGalleryVideoScreen.js`, `tests/navigation.test.cjs` | `README.md` |

Os componentes, tokens de estilo, seleção e organização de imagens já coincidiam nas três versões. A cópia integrada preserva 126 dos 136 arquivos da base byte a byte. Os dez arquivos adaptados são `README.md`, os dois documentos de integração da tabela, os dois manifestos npm, o navegador, a tela de seleção de vídeo e os testes `helpers/mobileHarness.cjs`, `navigation.test.cjs` e `pdf-interface.test.cjs`.

## 3. PDF da Emilly

- `src/pdf/pdfGenerator.js` e as três telas de configuração, progresso e conclusão vieram da entrega da Emilly. As telas oficiais de seleção e organização foram reaproveitadas, incluindo remoção, reordenação e limite de 20 imagens.
- O gerador dimensiona a imagem proporcionalmente, converte para JPEG e incorpora uma imagem por página no PDF. Usa A4, Letter ou Legal, retrato ou paisagem e margens de 0 a 50 mm. Higieniza o nome e grava em `Paths.document/PDFs`. A conclusão depende da gravação e da conferência do tamanho do arquivo. O fluxo libera os objetos de imagem e limpa os JPEGs intermediários e as gravações incompletas.
- A conclusão usa o mesmo PDF para visualização, exportação para pasta escolhida e compartilhamento. Exportar cria uma cópia e preserva arquivos existentes na pasta de destino. O PDF fica no armazenamento do aplicativo ou na pasta escolhida pelo usuário. Os registros de download continuam na biblioteca da GOAL 06.
- `tests/pdf-pure.test.cjs` preserva os testes da Emilly. `tests/pdf-interface.test.cjs` incorpora a passagem para configuração e mantém as verificações de seleção, organização e isolamento da biblioteca. `tests/pdf-integration.test.cjs` e `tests/fixtures/pdf-page.jpg` verificam bytes, dimensões, gravação, falhas, navegação e chamadas nativas simuladas. A matriz manual está em [PDF_TEST_MATRIX.md](PDF_TEST_MATRIX.md).

## 4. Escolha de formato do Paulo

- Foram incorporados `src/screens/FormatChoiceScreen.js`, os PNG e SVG `play-icon` e `arrow-right-white` e os testes de `tests/format-choice.test.cjs`.
- A tela anterior usa o Image Picker já instalado para selecionar um vídeo. O botão **Continuar** abre a rota `FormatChoice` com o nome, a duração e o tamanho que a galeria disponibilizar. Cancelar preserva a seleção anterior. A tela mantém as opções de 128, 192 e 320 kbps e usa os tokens oficiais de cor e tipografia.
- O botão **Converter para áudio** informa a qualidade escolhida e o estado pendente do processamento e da exportação de áudio. A tela exibe dados do arquivo selecionado e preserva o retorno pela pilha nativa.

## 5. Downloads, Histórico e componentes

Os arquivos de John conferidos byte a byte incluem `src/screens/DownloadsScreen.js`, `src/screens/HistoryScreen.js`, `src/screens/fileScreenUtils.js`, `src/hooks/useMediaLibrary.js` e todos os módulos em `src/media/`. Os nove componentes `Button`, `Input`, `Header`, `BottomNavigation`, `Card`, `LoadingIndicator`, `ProgressBar`, `ErrorMessage` e `ConfirmationDialog` mantêm suas implementações e propriedades públicas. `src/styles/`, os assets da base, `App.js`, `index.js`, `app.json` e as prévias também coincidem com a base.

## 6. Consolidação da navegação

O `AppNavigator.js` oficial continua dono da biblioteca compartilhada e da única barra inferior. A pilha React Navigation registra `ConvertGalleryVideo` e `FormatChoice`, além da entrada e das prévias existentes. As cinco abas mantêm os IDs `home`, `downloads`, `pdf`, `history` e `profile`.

O fluxo de PDF segue seleção → organização → configuração → progresso → conclusão. No Android, Voltar recua entre os passos e, durante a gravação, a etapa atual se mantém. Uma falha permite repetir a geração ou voltar às configurações. As imagens e o resultado mantêm seu estado na sessão ao trocar de aba. No fluxo de vídeo e nas prévias, o retorno pertence à pilha nativa.

## 7. Dependências

O Expo Doctor primeiro apresentou 19 de 20 verificações concluídas. A única divergência era de versões de correção dentro do SDK 58. O comando `npx expo install` atualizou os três pacotes indicados e seus encadeamentos no lockfile.

| Dependência | Base oficial | Integração |
| --- | ---: | ---: |
| `expo` | 58.0.23 | 58.0.26 |
| `expo-file-system` | 58.0.13 | 58.0.14 |
| `expo-status-bar` | 58.0.4 | 58.0.5 |
| `expo-image-picker` | 58.0.10 | 58.0.10 |
| `expo-image-manipulator` | 58.0.16 | 58.0.16 |
| `expo-sharing` | 58.0.23 | 58.0.23 |
| `pdf-lib` | 1.17.1 | 1.17.1 |
| React / React Native | 19.3.0 / 0.88.1 | 19.3.0 / 0.88.1 |
| React Navigation / Native Stack | 7.5.1 / 7.21.0 | 7.5.1 / 7.21.0 |

A configuração oficial do Expo atende ao alvo mobile. As dependências web da entrega de Paulo e a configuração adicional do plugin de barra de status da Emilly ficaram fora deste escopo. Foram conferidos os contratos de seleção, transformação, arquivos e compartilhamento na documentação do SDK usado. [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) · [FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/) · [Image Picker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/) · [Image Manipulator](https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/) · [Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/)

## 8. Resultados das verificações

Windows, Node.js 24.21.0 e npm 11.19.0. Os comandos foram executados em uma cópia isolada.

| Verificação | Resultado |
| --- | --- |
| `npm ci` | Código 0. Instalou 484 pacotes e auditou 485 em 34 segundos. |
| `node --test tests/*.test.cjs` | Código 0. 132 aprovados, 0 falhas, 0 cancelados e 0 ignorados. |
| `npx expo-doctor` | Código 0. 20 de 20 verificações aprovadas. |
| `npx expo export --platform android --output-dir ../EduDownloader-Mobile-Bundle-Validacao --max-workers 2` | Código 0. Metro compilou `index.js` com 1.184 módulos e 110 assets. Gerou o bytecode Hermes `index-276d5704ec39282fd9048b77bec6e365.hbc` e `metadata.json`. O aviso de cores do terminal foi a única mensagem de advertência da exportação. |
| `npx expo lint` | O Expo solicitou instalar e configurar ESLint. A configuração ficou pendente. |
| `npx --no-install tsc --noEmit` | TypeScript e `tsconfig.json` ausentes no projeto JavaScript. A verificação de tipos ficou indisponível. A suíte e o Metro verificaram sintaxe e imports. |
| `npm audit --omit=dev` | Código 1. Três alertas moderados na cadeia `expo → @expo/fingerprint → minimatch`, ligados a um único aviso. A base já travava `minimatch` em 10.2.6 e a correção indicada está na versão principal 11. [Aviso GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) |

O bytecode Hermes tem 3.022.174 bytes e SHA-256 `5b738786d954eb48913e2ab40c9aa256fe584f0ad5cadc03529adac3fc6c9e1e`. Foram conferidas a presença dos textos de PDF e escolha de formato no bundle e a existência dos 110 assets referenciados nos metadados.

## 9. Comportamentos comprovados em testes

- Downloads por HTTP local transferiram bytes MP4 e MP3, validaram o conteúdo, registraram arquivos completos, limparam parciais e recuperaram-se após falhas. Os testes verificaram cancelamento, persistência, contratos de abertura e regressões de busca, agrupamento, filtros e exclusão no Histórico.
- O gerador produziu bytes lidos por `PDFDocument.load`. O documento de teste continha duas páginas Legal em paisagem com uma imagem por página. Foram exercitados os contratos de ordenação, falha de leitura e gravação, progresso final, repetição, exportação, visualização e compartilhamento. As operações nativas foram simuladas nesses testes.
- A navegação registrou as rotas, trocou as cinco abas com um único menu, preservou a biblioteca durante o fluxo PDF e exercitou o tratamento do botão Voltar do Android. A rota de formato recebeu os metadados do seletor simulado e preservou a escolha de qualidade. Os testes também leram os PNGs e validaram imports e referências aos assets.

## 10. Pendências para validação no aparelho

Galeria, permissões, fontes e dimensões da interface, gesto e botão Voltar, manipulação de JPG/PNG/HEIC, fechamento do app e persistência do PDF, visualizador, seletor de pasta, compartilhamento, transferência e abertura de download precisam de execução real no Android e no iOS. O bundle exportado é o artefato JavaScript de validação. A conversão e a exportação de áudio continuam pendentes.

## 11. Execução e roteiro no celular

```powershell
Set-Location -LiteralPath 'C:\Users\Usuario\Desktop\EduDownloader_Mobile_Integrado'
npm ci
npx expo start --lan
```

Use um Expo Go compatível com o SDK 58. Conecte computador e celular à mesma rede e leia o QR Code desse terminal. Teste os seguintes fluxos com arquivos que você possa selecionar e remover.

1. Abra **PDF**. Selecione duas imagens diferentes, mude a ordem, remova e adicione uma imagem. Configure nome, tamanho, orientação e margem. Gere o PDF, confira a ordem das páginas, abra, exporte para uma pasta e compartilhe. Confira a cópia no gerenciador de arquivos e experimente cancelar o seletor de pastas. Execute também os cenários da [matriz de PDF](PDF_TEST_MATRIX.md).
2. Na **Home**, abra **Converter vídeo** e selecione um vídeo. Confira os metadados, alterne as três opções de qualidade, toque em **Converter para áudio** e confira a mensagem sobre o processamento pendente. Volte pelo cabeçalho e pelo botão do aparelho.
3. Em **Downloads**, use uma URL direta de vídeo ou áudio sob seu controle. Confira progresso, cancelamento, nova tentativa e abertura. Em **Histórico**, confira a persistência após reiniciar, a busca ou filtragem disponível e a exclusão com confirmação.
