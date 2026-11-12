> **Atualização GOAL 06 (12/11/2026):** o fluxo principal agora possui solicitação por link, download direto real quando suportado, biblioteca compartilhada e gerenciamento/persistência local do histórico. Consulte [GOAL06_DOWNLOADS_HISTORICO.md](GOAL06_DOWNLOADS_HISTORICO.md) para contratos, resultados e limitações atuais. O conteúdo abaixo registra a etapa anterior e foi preservado como histórico; suas pendências e localização inicial de App.js não representam integralmente o estado atual. Teste visual/nativo no Expo Go continua pendente de confirmação do usuário.

> **Integração das interfaces da Emilly (12/11/2026):** a aba PDF agora abre Seleção de imagens e Organização de imagens, preservando a GOAL 06 e sem gerar arquivos ou registros de PDF. Consulte [INTEGRACAO_EMILLY_PDF.md](INTEGRACAO_EMILLY_PDF.md). O navegador atual e as demonstrações foram mantidos; a validação visual permanece pendente.

# Integração EduDownloader Mobile — John + Paulo

Entrega local para Emilly em **12/11/2026**. A integração das interfaces está concluída e passou nos testes de contratos e na geração do bundle Android. A validação visual em Expo Go/dispositivo continua pendente; esta entrega não representa aprovação integral em um aparelho.

## Telas e autoria

| Tela | Autoria | Arquivo | Situação |
|---|---|---|---|
| Inicial / Home | Paulo | `src/screens/HomeScreen.js` | Primeira tela; layout, cartões e medidas responsivas preservados; ações conectadas à integração. |
| Conversão de vídeo da galeria | Paulo | `src/screens/ConvertGalleryVideoScreen.js` | Interface integrada, com avisos de funcionalidades pendentes; botão Continuar desativado. |
| Downloads | John | `src/screens/DownloadsScreen.js` | Arquivo original preservado integralmente: busca, filtros, cartões, status, progresso, estados e callbacks. |
| Histórico | John | `src/screens/HistoryScreen.js` | Arquivo original preservado integralmente: filtros por atividade, agrupamento por data, metadados, estados e callbacks. |
| PDF e Perfil | Entregas futuras da equipe / integração pela Emilly | `PendingScreen` em `src/navigation/AppNavigator.js` | Estados provisórios identificados, sem operações fictícias. |

O Histórico recebido não possui busca textual; possui filtros por atividade. Essa limitação preexistente foi preservada. Não foi adicionada uma nova busca durante a integração.

## Executar após extrair o ZIP

Entre na pasta `EduDownloader_Mobile_Integrado` extraída e execute:

```powershell
npm ci
npm start
```

Abra no Expo Go compatível com o SDK 58 usando o QR code apresentado pelo Expo. O computador e o celular precisam conseguir acessar o servidor de desenvolvimento. O projeto permanece com Expo 58.0.23, React 19.3.0 e React Native 0.88.1. Foram usados Node 24.21.0 e npm 11.19.0 nas verificações locais.

Não há backend para iniciar nem credenciais necessárias para demonstrar as interfaces. `node_modules` será criado pelo `npm ci`; não faz parte do ZIP.

## Navegação

`App.js` carrega Inter/Montserrat e abre `src/navigation/AppNavigator.js`. Foi reutilizado o React Navigation/native-stack já instalado, sem acrescentar dependências ou alterar a configuração do Expo. A orientação genérica do AGENTS.md sobre Expo Router não foi aplicada porque o pedido desta integração determina aproveitar a navegação disponível sem novos sistemas.

| Origem | Ação | Destino |
|---|---|---|
| Menu inferior | `home` / Início | Home |
| Menu inferior | `downloads` / Downloads | Downloads |
| Menu inferior | `pdf` / PDF | Estado provisório de PDF |
| Menu inferior | `history` / Histórico | Histórico |
| Menu inferior | `profile` / Perfil | Estado provisório de Perfil |
| Home | Download de mídia | Downloads; serviço de downloads ainda pendente |
| Home | Converter vídeo | Conversão de vídeo da galeria, rota `ConvertGalleryVideo` |
| Home | Ferramentas de PDF | Estado provisório de PDF |
| Home | Demonstração dos componentes | Rota `ComponentsPreview` |
| Home | Prévia de Downloads e Histórico (dados fictícios) | Rota `FilesPreview` |

Conversão é uma rota própria e não é a aba PDF. Um único menu inferior pertence a `MainTabs`; as telas de arquivos recebem `onTabPress` indefinido para não renderizar menus adicionais. As abas visitadas permanecem montadas com chaves estáveis, preservando seu estado durante as trocas e o retorno das rotas. As abas ocultas são removidas da navegação por acessibilidade.

O Voltar do Android nas abas secundárias retorna à Home. Na Home, a ação normal do sistema é mantida. O listener das abas é removido quando a rota principal perde foco. Conversão e demonstrações retornam pela pilha nativa e também oferecem Voltar no cabeçalho. As áreas seguras e as barras de status foram configuradas para os fundos de cada tela. Esses contratos foram testados com elementos nativos simulados; o comportamento físico ainda precisa ser conferido em Android.

## Demonstrações preservadas

A demonstração completa do antigo `App.js` agora está em `src/dev/ComponentsPreview.js`. Abra pela opção **Demonstração dos componentes**, abaixo dos cartões da Home. Ela preserva os nove componentes oficiais e suas interações:

1. Button: variantes, pressão, ação e desativado.
2. Input: texto controlado, busca de exemplo, ação, foco, erro e edição.
3. Header: variantes e ações.
4. BottomNavigation: os cinco IDs oficiais, seleção e ícones.
5. Card: toques, desativado, seleção de qualidade e variantes.
6. LoadingIndicator: tamanhos e mensagem.
7. ProgressBar: percentuais e opção de ocultá-los.
8. ErrorMessage: erro e recuperação simulada.
9. ConfirmationDialog: confirmar, cancelar e fechamento pelo sistema.

As abas dessa demonstração testam o componente, sem trocar de tela. Use Voltar no cabeçalho ou o Voltar do Android para retornar à Home.

A prévia de Downloads/Histórico permanece em `src/dev/DownloadsHistoryPreview.js`, com os cenários preenchido, vazio, carregando e erro e seus callbacks simulados. Ela tem uma entrada separada na Home e identifica **DADOS FICTÍCIOS DE TESTE**. O script original `node scripts/start-screens-preview.cjs` também foi preservado para a prévia isolada.

## Componentes, estilos e conflitos resolvidos

- Os nove componentes oficiais e os estilos da GOAL 05 do principal foram preservados. Apenas `Header` ganhou a propriedade opcional `backIcon` para a tela do Paulo; o texto Voltar continua sendo o padrão e o rótulo acessível permanece disponível.
- `src/styles/colors.js` continua sendo a fonte de cores. Foram acrescentados somente os oito tokens usados pelas novas telas, derivados do azul `#0131CD`. Branco `#FFFFFF` e verde-limão `#B9FC01` permanecem oficiais.
- Foram mantidos Inter no corpo, Montserrat nos títulos, escala nativa de fonte e responsividade do principal. Não foram importadas as alterações globais do Paulo que trocavam a tipografia para somente Inter, redefiniam menu, contraste, campos, barras e cartões de todas as telas.
- Layout, cartões, dimensões, conteúdo visual e cinco assets das telas do Paulo foram incorporados. A cópia integrada de `logo-converter.png` foi normalizada: o arquivo original continha JPEG com extensão PNG. Os pixels decodificados foram preservados sem redimensionamento; a referência do Paulo permanece intacta.
- `package.json`, `package-lock.json`, `app.json` e `index.js` do principal permanecem byte a byte iguais. Os JSONs das duas versões eram semanticamente iguais, apesar de diferenças de formatação em alguns arquivos.
- Os testes do Paulo foram analisados. A verificação de registro de rotas e as verificações úteis de responsividade/estilos foram adaptadas em `tests/navigation.test.cjs`. Expectativas de somente duas telas ou de substituir Montserrat não foram copiadas, pois conflitam com esta integração. Nenhuma asserção original foi removida ou enfraquecida.

## Dados e contratos para serviços futuros

Downloads e Histórico continuam recebendo dados e callbacks por propriedades. `App` e `AppNavigator` aceitam `downloadProps` e `historyProps` para encaminhar os contratos às telas. Sem dados fornecidos, as telas mostram seus estados vazios reais, sem carregar fixtures.

| Propriedade | Uso |
|---|---|
| `items` | Registros fornecidos pelo aplicativo. |
| `isLoading`, `error`, `onRetry` | Estado de carregamento, erro global e nova tentativa. |
| `onOpenItem`, `onRetryItem` | Ações reais sobre o registro recebido, quando houver serviço. |
| `onRefresh`, `refreshing` | Atualização controlada externamente. |
| `referenceDate` (Histórico) | Referência de data opcional, já existente para testes. |

Os campos e detalhes de dados permanecem documentados em `docs/downloads-historico.md`. A navegação gerencia `onBack`, `onTabPress` e `safeAreaEdges`; os demais callbacks são repassados sem simular sucesso.

Ainda dependem de implementação: downloads reais, seleção de vídeo da galeria, conversão, abertura real de arquivos, recuperação real de erros e persistência de histórico. O botão Abrir galeria apenas explica a pendência; Continuar está desativado. Os formatos apresentados são identificados como previstos. Não foi criado backend, armazenamento ou progresso ficticiamente real.

## Arquivos desta integração

Criados:

- `src/screens/HomeScreen.js`
- `src/screens/ConvertGalleryVideoScreen.js`
- `src/navigation/AppNavigator.js`
- `src/dev/ComponentsPreview.js` (demonstração original transferida)
- `assets/screens/back-icon.png`, `check-icon.png`, `logo-converter.png`, `logo-home.png`, `upload-icon.png`
- `tests/navigation.test.cjs`
- `tests/helpers/mobileHarness.cjs`
- `docs/INTEGRACAO_EQUIPE.md`

Alterados:

- `App.js`: entrada integrada e carregamento das fontes.
- `src/components/Header.js`: `backIcon` opcional.
- `src/styles/colors.js`: tokens necessários às telas do Paulo.
- `src/dev/DownloadsHistoryPreview.js`: retorno à Home e barra de status.
- `tests/components.test.cjs`: caminhos da demonstração transferida e mock da barra de status, preservando asserções.

Downloads, Histórico, seus utilitários, fixtures, testes originais de telas, assets existentes, scripts e demais arquivos anteriores foram preservados por comparação de SHA-256. As fontes de entrada do Paulo não foram alteradas.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| Suíte original antes da integração: `node --test tests/*.test.cjs` | 47 aprovados, zero falhas e zero skips. |
| Suíte integrada: mesmo comando | 60 aprovados, zero falhas e zero skips. |
| Instalação limpa, em cópia isolada: `npm ci --offline --no-audit --no-fund` | Sucesso; 478 pacotes instalados pelo lockfile. O ambiente do principal foi preservado. |
| Suíte na instalação limpa | 60 aprovados, zero falhas e zero skips. |
| Metro no principal e na instalação limpa | Bundle Android/Hermes gerado com sucesso; 962 módulos, 100 entradas no mapa de assets. |
| Sintaxe/importações | Todos os módulos do aplicativo analisados com Babel; imports estáticos, arquivos e assets de configuração resolvidos. |
| Componentes/ícones/fontes | Contratos dos nove componentes, callbacks, estados, contraste, fontes, responsividade e PNGs verificados na suíte. |
| `npm run lint` e `npm run typecheck` | Não disponíveis: scripts e ferramentas não estão configurados no projeto recebido. Não foram declarados aprovados nem adicionadas dependências para isso. |
| Inspeção visual em Expo Go / aparelho Android | Pendente; não houve dispositivo controlável, emulador ou SDK Android disponível no ambiente. |

Para repetir a compilação via Metro:

```powershell
npx expo export --platform android --output-dir ../EduDownloader-Mobile-Android-Bundle --dump-assetmap --max-workers 2
```

Esse comando produz bundle JavaScript/Hermes e assets Android. Não foi gerado APK/AAB, executado Gradle, EAS ou publicado qualquer artefato. Os testes usam controles nativos simulados e não comprovam aparência, animações, ausência de piscadas, foco/teclado, insets ou Voltar em um dispositivo real.

## Próximos passos da Emilly

1. Executar no Expo Go e conferir Home, Downloads, Histórico e a ação Converter vídeo.
2. Conferir retorno pelo cabeçalho e Voltar do Android, áreas seguras, barra de status, teclado, fontes ampliadas, celular compacto e tablet.
3. Abrir a demonstração dos componentes e testar os nove componentes, incluindo confirmar/cancelar no diálogo.
4. Abrir a prévia de dados fictícios e testar os quatro cenários de Downloads/Histórico, preservação de filtros e rolagem.
5. Integrar as telas reais de PDF e Perfil, mantendo os IDs `pdf` e `profile`. Demais telas futuras de download/configuração precisam ser conectadas quando forem entregues.
6. Conectar os serviços reais pelos contratos existentes; manter fixtures restritas às demonstrações/testes.

## Estado local e pacote

O projeto principal permanece na branch local `main`, commit `9399ce2da5112faba5c33ce28c99d974e0801ed5`. Antes do trabalho já havia arquivos de Downloads/Histórico, assets, documentação, prévia e testes não rastreados. Eles foram preservados. A integração acrescenta alterações locais, sem stage, commit, branch nova ou qualquer operação de sincronização Git. A referência do Paulo permanece em seu estado anterior. O repositório desktop em `dev/v3.0` também permanece intacto.

Foi preservado um backup completo dos arquivos anteriores do principal, com manifesto de hashes e estado Git, fora da pasta do projeto e fora do ZIP de entrega.

O ZIP `EduDownloader_Mobile_Integrado_John_Paulo_2026-11-12.zip` contém uma pasta raiz única, `EduDownloader_Mobile_Integrado`, com entradas, manifestos, lockfile, código, assets, testes, documentação, scripts, licença e `.gitignore`. Não contém `.git`, `node_modules`, `.expo`, `.cache`, configurações pessoais de assistentes, backups, logs, arquivos temporários, arquivos compactados antigos ou resultados de compilação. A verificação do pacote inclui CRC, nomes/estrutura, arquivos obrigatórios e comparação dos bytes com o projeto integrado.

Referências técnicas consultadas: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [React Navigation native-stack](https://reactnavigation.org/docs/native-stack-navigator/), [useFocusEffect](https://reactnavigation.org/docs/use-focus-effect/) e [Voltar do Android](https://reactnavigation.org/docs/custom-android-back-button-handling/). Os documentos anteriores em `docs/` foram preservados e podem descrever a antiga demonstração como `App.js`; a localização atual é `src/dev/ComponentsPreview.js`.
