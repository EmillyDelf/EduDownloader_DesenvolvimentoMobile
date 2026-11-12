> **Atualização GOAL 06 (12/11/2026):** o fluxo principal agora possui solicitação por link, download direto real quando suportado, biblioteca compartilhada e gerenciamento/persistência local do histórico. Consulte [GOAL06_DOWNLOADS_HISTORICO.md](GOAL06_DOWNLOADS_HISTORICO.md) para contratos, resultados e limitações atuais. O conteúdo abaixo registra a etapa anterior e foi preservado como histórico; suas pendências e localização inicial de App.js não representam integralmente o estado atual. Teste visual/nativo no Expo Go continua pendente de confirmação do usuário.

# Downloads e Histórico — telas independentes

Implementação local em 12 de novembro de 2026. As telas não foram conectadas à navegação principal. A demonstração aprovada dos nove componentes em `App.js` permanece intacta.

## Análise e referência

Foram inspecionados os nove componentes, os estilos compartilhados, a documentação, as dependências e os arquivos do projeto. Não existe serviço de download, persistência de histórico ou contrato de backend nessa versão. As telas recebem dados por propriedades e não iniciam downloads, acessam arquivos nem salvam registros por conta própria.

O [Figma Mobile atualizado](https://www.figma.com/design/IS2PX0pWbk5YJnMJZITZFm) foi acessado, incluindo contexto de design e screenshots:

- [Downloads — `7:468`](https://www.figma.com/design/IS2PX0pWbk5YJnMJZITZFm?node-id=7-468): hero azul, busca, filtros por tipo e cartões de arquivos recentes.
- [Histórico — `7:598`](https://www.figma.com/design/IS2PX0pWbk5YJnMJZITZFm?node-id=7-598): hero azul, filtros por atividade, agrupamento por data e indicadores de conclusão.

O layout foi adaptado ao fluxo responsivo e aos componentes da GOAL 05. Campos, chips e navegação mantêm os padrões oficiais de contraste e área de toque. Os cartões de Downloads receberam status, progresso e falhas para cobrir os requisitos que não aparecem no estado estático do Figma. Não se afirma igualdade pixel a pixel em todas as resoluções.

## Arquivos criados

| Arquivo | Finalidade |
| --- | --- |
| `src/screens/DownloadsScreen.js` | Tela de Downloads, com `FlatList` |
| `src/screens/HistoryScreen.js` | Tela de Histórico, com `SectionList` |
| `src/screens/fileScreenStyles.js` | Estilos específicos, consumindo os tokens oficiais |
| `src/screens/fileScreenUtils.js` | Formatação, busca, filtros e agrupamento; sem I/O |
| `src/screens/FileScreenParts.js` | Composição local de filtros, ícones e status, sem duplicar os nove componentes |
| `src/dev/DownloadsHistoryPreview.js` | Prévia isolada e explicitamente simulada |
| `src/dev/downloadHistoryFixtures.js` | Dados fictícios exclusivos da prévia |
| `scripts/start-screens-preview.cjs` | Gera a entrada isolada e inicia o Metro sem alterar `App.js` |
| `tests/screens.test.cjs` | Testes das telas, propriedades, callbacks, estados e assets |
| `assets/files/*.png` | Nove elementos originais do Figma em 1x/2x/3x |
| `assets/files/README.md` | Procedência, dimensões e IDs dos assets |
| `docs/downloads-historico.md` | Contrato de apresentação e roteiro de validação |

Nenhum componente, estilo compartilhado, teste anterior, dependência, configuração principal ou tela de outro integrante precisou ser modificado. Os arquivos gerados da prévia ficam em `.expo/downloads-history-preview`, ignorados pelo Git.

## Propriedades das telas

As duas telas são exportações `default` independentes. Elas reutilizam `Header`, `Card`, `Button`, `LoadingIndicator`, `ErrorMessage` e, opcionalmente, `BottomNavigation`; Downloads também reutiliza `Input` e `ProgressBar`.

| Propriedade comum | Contrato |
| --- | --- |
| `items` | Array de registros, padrão `[]`; a tela não altera esses objetos |
| `isLoading` | Booleano, padrão `false`; mostra carregamento inicial |
| `error` | Mensagem textual, padrão `''`; mostra erro global |
| `onRetry()` | Callback opcional da nova tentativa global |
| `onRetryItem(item)` | Callback opcional da nova tentativa de um item com falha |
| `onOpenItem(item)` | Callback opcional para abrir um item concluído |
| `onRefresh()` | Callback opcional para gesto de atualizar a lista |
| `refreshing` | Booleano controlado por quem fornece os dados |
| `onBack()` | Ação opcional do cabeçalho; nenhuma rota é criada |
| `onTabPress(id)` | Quando fornecido, exibe o `BottomNavigation` existente e encaminha o ID |
| `safeAreaEdges` | Opcional; permite ao contêiner externo gerenciar as áreas seguras |

`HistoryScreen` também aceita `referenceDate`, opcional, usado para testar o agrupamento relativo. Sem ele, Hoje/Ontem usam o relógio e o fuso local do aparelho no momento da renderização.

O consumidor deve fornecer `SafeAreaProvider` e carregar as fontes Inter/Montserrat, como já faz a demonstração principal. As telas não duplicam carregadores de fonte nem exigem gerenciador de navegação.

## Registros de apresentação

Este é um contrato de frontend para conexão futura, não um modelo de backend já implementado:

```js
const item = {
  id: 'identificador-unico-estavel',
  name: 'Aula de Matemática.mp4',
  format: 'MP4',
  kind: 'video',
  sizeBytes: 1048576,
  status: 'downloading',
  progress: 42,
  error: '',
};
```

- `id` e `name` são obrigatórios. IDs devem ser únicos e estáveis; nomes repetidos não substituem o identificador.
- `format` é opcional; não se inventa uma extensão ausente.
- `kind` é opcional: `video`, `audio`, `pdf` ou `other`. Sem ele, formatos conhecidos determinam o filtro/ícone; arquivos desconhecidos recebem a indicação genérica `ARQ`.
- `sizeBytes` é opcional, finito e não negativo. Tamanhos disponíveis usam base 1024 e apresentação em português. Um tamanho ausente não é apresentado como zero.
- `status`: `queued`, `downloading`, `paused`, `completed`, `failed`, `cancelled`. Um status desconhecido é mostrado como “Status não informado”. Pausar, retomar e cancelar não são ações implementadas nesta etapa.
- `progress` é um número opcional entre 0 e 100; o `ProgressBar` oficial trata limites e valores inválidos. Itens concluídos apresentam 100%. Um download ativo sem percentual conhecido informa que aguarda progresso, sem inventar 0%.
- `error` é a descrição opcional de falha daquele registro.

Para o Histórico, acrescente:

```js
const record = {
  id: 'registro-unico',
  name: 'Material_da_aula.pdf',
  format: 'PDF',
  kind: 'pdf',
  activityType: 'pdf',
  completedAt: '2026-11-12T12:32:00-03:00',
  status: 'completed',
};
```

`activityType` pode ser `download`, `conversion` ou `pdf`. Isso permite exibir registros recebidos dessas atividades, sem implementar os outros módulos. `completedAt` indica o fim da atividade, inclusive uma tentativa com falha; aceita data ISO com fuso, timestamp numérico ou `Date`. Datas ausentes/inválidas ficam no grupo “Data não informada”, sem horário inventado. Os grupos são ordenados do mais recente para o mais antigo, preservando os objetos recebidos.

## Comportamentos implementados

- Downloads: busca local por nome/formato, sem diferenciar acentos ou maiúsculas; filtros Todos/Vídeos/Áudios/PDF; status, progresso e nova tentativa quando o callback existe.
- Histórico: filtros Tudo/Downloads/Conversões/PDF; grupos Hoje/Ontem/data completa; hora local quando disponível; conclusão e falha.
- Estados iniciais de carregamento, vazio, erro global e filtro sem resultados. Carregamento/erro global ocultam os itens para não apresentar simultaneamente uma lista vazia enganosa. O botão de limpar filtros aparece quando aplicável.
- Abrir só é disponibilizado para itens concluídos e com callback válido. A nova tentativa só aparece com callback válido. Renderizar a tela não chama nenhum callback automaticamente.
- Atualização por gesto é opcional e controlada pelo consumidor. Busca e filtros são estados visuais locais.
- As cinco abas mantêm `home`, `downloads`, `pdf`, `history`, `profile`. As telas apenas encaminham o toque; não conhecem nem dependem uma da outra.

Não há ações fictícias de pausar, retomar, cancelar, compartilhar ou excluir. O Figma dessas duas telas não exige essas ações; sua inclusão futura depende de serviços e decisões de produto. Abrir e repetir na prévia são callbacks simulados com mensagens explícitas, não operações reais.

## Prévia no Expo Go

Na raiz do projeto:

```text
node scripts/start-screens-preview.cjs --clear
```

O script usa as dependências instaladas do projeto principal e gera somente arquivos próprios em `.expo/downloads-history-preview`. A porta padrão é 8082. Para outra porta, passe `--port 8083`; para iniciar sem consultas de rede do CLI, acrescente `--offline`. Não é necessário editar `App.js`, `index.js` ou `package.json`.

Abra o endereço ou QR code informado pelo Metro no Expo Go, na mesma rede do computador. A prévia validada nesta sessão usou `exp://192.168.0.6:8082`; o IP pode mudar. A identificação no topo é **PRÉVIA · DADOS FICTÍCIOS DE TESTE**.

Use as abas Downloads e Histórico para alternar entre as duas telas. As outras três abas apenas informam que não fazem parte desta prévia. Os controles superiores oferecem Preenchido, Vazio, Carregando e Erro. As datas da prévia são fictícias e usam 12/11/2026 como referência, garantindo exemplos de Hoje/Ontem independentemente do relógio.

Roteiro visual:

1. Confira um download em 42%, um concluído em 100% e um com falha.
2. Pesquise `audio`, selecione filtros e limpe um resultado vazio.
3. Acione nova tentativa do item com falha: somente os dados fictícios da prévia mudam para concluído.
4. Abra um concluído: aparece o aviso de arquivo fictício, sem abrir arquivos reais.
5. Confira o Histórico preenchido, suas categorias, datas, nomes, formatos e status.
6. Em ambas as telas, teste Vazio, Carregando, Erro e a recuperação global.
7. Role as listas e confira legibilidade em tela compacta e, se disponível, tablet e fonte ampliada.

`App.js` permanece com a demonstração dos nove componentes. Nada precisa ser restaurado ao terminar essa prévia separada.

## Validação

```text
node --test tests/components.test.cjs tests/screens.test.cjs
```

- **Automatizada:** 47 testes passaram: 34 anteriores intactos e 13 novos. Incluem propriedades, callbacks, busca/filtros, estados vazios/carregamento/erro, progresso, agrupamento, metadados ausentes, IDs estáveis, responsividade e geometria dos assets.
- **Compilação:** o Metro da prévia compilou `index.js` para Android, com 843 módulos. O bundle contém as duas telas e a identificação de dados fictícios. Isso é compilação JavaScript para Android, não geração de APK.
- **Assets:** os 27 PNGs foram requisitados ao Metro e comparados byte a byte com os arquivos locais, incluindo caminhos externos à pasta da prévia.
- **Preservação:** os arquivos anteriores, inclusive `App.js`, componentes, testes, dependências e configurações, são conferidos por SHA-256 contra o backup externo anterior à implementação.
- **Ferramentas existentes:** lint não foi concluído porque ESLint/configuração estão ausentes; TypeScript também não está instalado. Não foram instaladas ferramentas apenas para contornar essas limitações.
- **Visual:** pendente. John informou indisponibilidade de internet e solicitou um ZIP atualizado antes de realizar o roteiro no Expo Go. Os testes automatizados e a compilação não foram tratados como aprovação visual.

## Entrega em ZIP limpo

O ZIP inclui as duas telas, seus estilos e helpers, assets, testes, `src/dev/DownloadsHistoryPreview.js`, os dados fictícios e `scripts/start-screens-preview.cjs`. As pastas `.git`, `node_modules`, `.expo`, backups, temporários e configurações locais de ferramentas ficam de fora. O inicializador recria os quatro arquivos de configuração/entrada da prévia em `.expo` ao ser executado; eles não precisam estar no ZIP. A demonstração dos nove componentes continua sendo a entrada padrão do projeto extraído.

Não houve instalação de dependências, nova branch, staging, commit, push, pull, fetch, merge, rebase ou sincronização remota. O Figma foi consultado e teve assets exportados em modo de leitura, sem edição.
