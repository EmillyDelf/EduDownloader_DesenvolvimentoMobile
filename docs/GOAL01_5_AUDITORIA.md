# GOAL 1.5 — Auditoria visual, estrutural e funcional

19 de novembro de 2026 · Revisão após a implementação do GOAL 01

## Ambiente e evidências

A comparação abriu os oito frames no Figma, leu as propriedades dos componentes e salvou as imagens de referência. O Playwright capturou a versão anterior e a versão revisada no Edge com Expo Web. As sete telas foram avaliadas em 440 × 956, 320 × 740 e 800 × 1.000. A rodada incluiu Histórico com zoom de 125%, estados vazio, carregando, erro, progresso indeterminado e uma lista de 80 arquivos com nome longo sem espaços. A lista chegou ao último registro a 320 px, e a barra inferior manteve a posição durante a rolagem. As 35 capturas Web passaram na verificação de largura de página. [Medições da captura](evidencias/goal01/medidas.json)

A primeira tentativa de export Web identificou a ausência de `react-dom` e `react-native-web`. A prévia usou esses pacotes e `@expo/metro-runtime` apenas em uma cópia isolada. A prévia contém seus próprios registros de teste e um arquivo MP4 servido por HTTP local. A cópia de produção usa os manifestos e dados originais. [Configuração Web do Expo](https://docs.expo.dev/workflow/web/)

## Comparação dos frames

| Tela | Referência e captura Web a 440 px | Comparação |
| --- | --- | --- |
| Downloads | [Figma 7:468](evidencias/goal01/figma/downloads.png) · [Antes](evidencias/goal01/web/antes-downloads-440.png) · [Depois](evidencias/goal01/web/depois-downloads-440.png) | Cabeçalho azul de 200 px, conteúdo de 340 px a partir de x=50, busca no topo e barra inferior a partir de y=886. O campo subiu de y=643 para y=225 após a retirada do formulário. A abertura usa ícone azul para contraste. O cartão mostra os metadados existentes e reserva a barra de progresso para um download em andamento. |
| Histórico | [Figma 7:598](evidencias/goal01/figma/historico.png) · [Antes](evidencias/goal01/web/antes-history-440.png) · [Depois](evidencias/goal01/web/depois-history-440.png) | O cabeçalho de 200 px, os filtros, o primeiro grupo e os cartões estão alinhados com a referência. O cartão com exclusão mede cerca de 99 px frente aos 88 px do protótipo. A diferença dá espaço para a ação de exclusão com alvo de 44 px. Em 320 px, PDF passa para a linha seguinte. |
| Colar link | [Figma 7:433](evidencias/goal01/figma/link.png) · [Antes](evidencias/goal01/web/antes-link-440.png) · [Depois](evidencias/goal01/web/depois-link-440.png) | Cabeçalho com 74 px, coluna de 354 px em x=43 e logotipo de 84 px em y=128. O campo, o cartão e Continuar usam a ordem e o espaçamento do frame. O cartão informa que os formatos dependem da origem. |
| Formato | [Figma 7:394](evidencias/goal01/figma/formato.png) · [Antes](evidencias/goal01/web/antes-format-440.png) · [Depois](evidencias/goal01/web/depois-format-440.png) | Cabeçalho, prévia decorativa de 132 px, bloco de metadados e grupo de seleção seguem a estrutura do frame. Uma origem com um único formato preenche o grupo com um único cartão e exibe a limitação. |
| Qualidade | [Figma 7:354](evidencias/goal01/figma/qualidade.png) · [Depois](evidencias/goal01/web/depois-quality-440.png) | Cabeçalho, resumo de mídia, área de qualidade, tamanho e botão seguem a hierarquia do frame. A quantidade de opções é determinada pela origem. A captura com origem direta mostra o aviso de qualidade desconhecida. Na versão anterior, a qualidade fazia parte do mesmo bloco de [formato](evidencias/goal01/web/antes-format-440.png). |
| Progresso | [Figma 7:336](evidencias/goal01/figma/progresso.png) · [Antes](evidencias/goal01/web/antes-progress-440.png) · [Depois](evidencias/goal01/web/depois-progress-440.png) | Indicador circular, estado, barra e Cancelar centralizados. O grupo começa em y=353, próximo ao círculo em y=351 do frame. A prévia de 42% é um cenário de teste. O app real usa o percentual da transferência ou [progresso indeterminado](evidencias/goal01/web/depois-unknown-440.png). Foi mantida uma ação de retorno no topo. |
| Conclusão | [Figma 7:315](evidencias/goal01/figma/conclusao.png) · [Antes](evidencias/goal01/web/antes-complete-440.png) · [Depois](evidencias/goal01/web/depois-complete-440.png) | Selo de 96 px, título, arquivo, abertura e ação para outro link mantêm a ordem. O nome e os metadados podem ocupar mais linhas conforme o arquivo. O conjunto começa em y=224 na captura e em y=231 no frame. |
| Design System | [Figma 3:2](evidencias/goal01/figma/design-system.png) | As áreas de marca usam `#0131CD`, `#B9FC01` e branco. Os títulos revisados reutilizam Inter. Os fundos e os estados usam os tokens existentes. As duas bibliotecas passam de azul para branco em y=200. A faixa inferior é `#F5F7FD` na captura e `#F6F8FD` na referência. |

A [pasta de evidências](evidencias/goal01/) reúne as larguras adicionais, os estados e a posição dos elementos. A comparação usou inspeção lado a lado, coordenadas do layout Web e amostras de cor. Os elementos de exemplo do protótipo ficaram restritos à evidência e à prévia de desenvolvimento.

## Auditoria estrutural e correções

- Os ícones do fluxo tinham fundo branco em telas coloridas. Os SVGs dos nós oficiais foram reexportados localmente nas densidades 1×, 2× e 3×. Os testes decodificam os PNGs, conferem dimensões e exigem pixels transparentes.
- O filtro ativo usava texto verde sobre fundo claro e o filtro de PDF quebrava de linha a 440 px. Os estilos locais ajustados preservam contraste e mantêm os quatro filtros na linha de referência. Os cartões de Histórico passaram a ter ações irmãs, com o status na linha de exclusão.
- O retorno entre etapas preserva endereço e escolha. Uma nova etapa começa no topo de sua própria área rolável. Durante a transferência, a biblioteca mantém a mesma operação se houver retorno à Home.
- A interface exige o estado concluído, URI de arquivo local e tamanho positivo para mostrar sucesso. A transferência continua sob o serviço verificado. Falhas de abertura ficam vinculadas ao arquivo, e toques repetidos não invocam a abertura duas vezes.
- Foram inspecionados imports, callbacks, chaves de lista, estados assíncronos, remoção de listeners, saída com transferência ativa e uso de fixtures. As rotas de PDF e Conversão e os módulos de mídia e persistência mantiveram os mesmos bytes. Os testes de sintaxe e resolução também percorrem os novos imports e assets.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `npm ci` | Código 0. Instalou 484 pacotes pelo lockfile original. O npm manteve três alertas moderados da mesma cadeia indireta já registrada na integração. |
| `node --test tests/*.test.cjs` | **133 aprovados**, zero falhas, cancelamentos e saltos. Os 132 casos de referência foram conservados ou adaptados aos novos contratos de tela, e um novo caso cobre início e nova tentativa pelas etapas. |
| `npx expo-doctor` | **20 de 20** verificações aprovadas. |
| `npx expo export --platform android --output-dir ../EduDownloader-Goal01-Android-Validacao --max-workers 2` | Código 0. Metro compilou 1.193 módulos e 151 assets. O arquivo Hermes `index-8a348c9e3e846c75508717ee7f899dbe.hbc` tem 3.040.139 bytes e SHA-256 `6348611467e81d6e9322f34754a18f490cbe77be94f5a4d4dfa6b384e125eea8`. Os 151 assets referenciados existem, e o bytecode contém as telas de link, qualidade, conclusão, PDF e escolha de áudio. |
| Playwright e Expo Web | Passaram navegação real Home → Link, erro de URL, clipboard com permissão, identificação por HTTP local, retorno com URL preservada e biblioteca separada. Passaram também busca, filtros, exclusão com confirmação e cancelamento com dados de prévia. Nenhum erro JavaScript ou asset visual ausente na rodada final. |
| ESLint e TypeScript | A base JavaScript está sem configuração de ESLint e `tsconfig.json`. A CLI solicitou configurar o lint. O comando de tipos encontrou o compilador ausente. Os manifestos entregues coincidem por SHA-256 com os da base. |

Os testes de serviço exercitaram transferência HTTP real de MP4/MP3 em loopback, progresso, interrupção, persistência, falha e verificação do arquivo. A execução dos módulos nativos e a renderização do teclado e da área segura em Android/iOS ficam para a homologação. O ambiente não apresentou ADB nem emulador Android disponível. As capturas são do navegador.

## Limites para os próximos Goals

O download funciona para arquivos diretos que a origem confirma como MP4 ou MP3. Escolhas de resolução e taxa dependem de opções reais da origem. Extração de links de plataforma, conversão real de vídeo em áudio e registros automáticos de conversão e PDF seguem pendentes para as etapas funcionais previstas.
