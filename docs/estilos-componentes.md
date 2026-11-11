# Estilos e componentes — GOAL 05

A referência funcional são os nove componentes oficiais da GOAL 04. A referência visual e estrutural foi a pasta local de Paulo, adaptada à paleta oficial. O projeto continua em JavaScript, com componentes funcionais e `StyleSheet.create`.

## Arquivos desta integração

| Situação | Arquivos |
| --- | --- |
| Modificados: demonstração e fontes | `App.js`, `app.json`, `package.json`, `package-lock.json` |
| Modificados: componentes | `src/components/Button.js`, `Input.js`, `Header.js`, `BottomNavigation.js`, `Card.js`, `LoadingIndicator.js`, `ProgressBar.js`, `ErrorMessage.js`, `ConfirmationDialog.js` |
| Modificado: compatibilidade | `src/components/colors.js` |
| Modificados: testes e registro | `tests/components.test.cjs`, `docs/componentes.md` |
| Criados: estilos | `src/styles/colors.js`, `typography.js`, `responsive.js`, `spacing.js`, `globalStyles.js`, `buttons.js`, `inputs.js`, `headers.js`, `cards.js`, `index.js` |
| Criado: documentação | `docs/estilos-componentes.md` |

Os assets, `index.js`, as configurações de navegação e os arquivos fora dessa lista foram preservados. A pasta de Paulo é somente referência e não foi modificada.

## Sistema de estilos

| Módulo em `src/styles/` | Responsabilidade |
| --- | --- |
| `colors.js` | Fonte única dos tokens de cor e aliases de compatibilidade |
| `typography.js` | Famílias Inter/Montserrat, tamanhos, pesos e estilos de texto |
| `responsive.js` | Métricas de tela, limites de escala e hook reativo `useResponsive` |
| `spacing.js` | Espaçamentos, raios, dimensões e limites de toque |
| `globalStyles.js` | Contêineres, seções, linhas e `getResponsiveContentStyle` |
| `buttons.js` | Variantes, tamanhos, chips e estados de botões |
| `inputs.js` | Campos padrão/busca/destaque, ações e estados |
| `headers.js` | Cabeçalho compacto/hero e navegação inferior |
| `cards.js` | Variantes de cartões, carregamento, progresso, erro e diálogo |
| `index.js` | Exportações nomeadas e agrupadas |

Exemplo de consumo:

```js
import { colors, typography, globalStyles } from './src/styles';
```

O caminho relativo deve ser ajustado à pasta de quem importa. A importação antiga de `src/components/colors` continua válida e retorna o mesmo objeto de `src/styles/colors`; não há duas paletas.

## Identidade visual e acessibilidade

- Azul `#0131CD`: ações principais, títulos, textos e estados de erro.
- Branco `#FFFFFF`: superfícies e texto sobre azul.
- Verde-limão `#B9FC01`: seleção das abas/chips, progresso e destaques. Texto sobre verde-limão usa azul; texto verde-limão usa fundo azul.
- Superfícies, bordas, sobreposição e estados desativados usam transparências do azul ou verde-limão, sem novas cores sólidas.
- Erros continuam identificados por texto “Erro:”, borda mais espessa e semântica de alerta; a identificação não depende de vermelho.
- `primaryDark`, `navy`, `accentBlue` e `black` são aliases de compatibilidade adaptados ao azul oficial; `successDark` é azul para manter a leitura sobre verde-limão.
- Os testes exigem contraste de pelo menos 4,5:1 para os pares de texto verificados e 3:1 para bordas de controles, considerando transparências e os estados pressionados.
- Chips, ações auxiliares e botões pequenos têm dimensão mínima de toque de 48 pontos. Não são usadas alturas fixas em chips para limitar a expansão do texto.
- O tamanho de fonte do sistema permanece ativo. A escala do sistema é aplicada pelo próprio React Native, sem multiplicação duplicada nos helpers.

## Componentes e propriedades

| Componente | Propriedades preservadas | Extensões incorporadas |
| --- | --- | --- |
| `Button` | `title`, `onPress`, `disabled` | `variant`, `size`, `fullWidth`, `leftIcon`, `rightIcon`, `style`, `textStyle`, `accessibilityLabel` |
| `Input` | `value`, `onChangeText`, `placeholder`, `editable`, `keyboardType`, `autoCapitalize`, `autoCorrect`, `label`, `error` | `variant`, `leftIcon`, `rightActionLabel`, `onRightAction`, `containerStyle`, `inputStyle` |
| `Header` | `title`, `onBack`, `rightActionLabel`, `onRightAction` | `variant`, `subtitle`, `logo`, `showAccentBar`, `contentStyle`, `style` |
| `BottomNavigation` | `activeTab`, `onTabPress` | Tipografia compartilhada e seleção azul/verde-limão |
| `Card` | `children`, `onPress`, `disabled`, `accessibilityLabel` | `variant`, `selected`, `style` |
| `LoadingIndicator` | `size`, `message` | `style` |
| `ProgressBar` | `progress`, `showPercentage`, `accessibilityLabel` | `style` |
| `ErrorMessage` | `message`, `onRetry`, `retryLabel` | `style` |
| `ConfirmationDialog` | `visible`, `title`, `description`, `onConfirm`, `onCancel`, `confirmLabel`, `cancelLabel` | Estilos compartilhados e largura adaptada para tablet |

Variantes disponíveis:

- `Button`: `primary` (padrão), `secondary`, `outline`, `link`; tamanhos `lg` (padrão), `md`, `sm`. Variantes desconhecidas usam a aparência principal. Chips são estilos exportados em `buttonStyles`, usados por `Pressable` na demonstração.
- `Input`: `default` (padrão), `search`, `accent`. A ação auxiliar é desativada quando `editable` é falso ou quando não há callback válido.
- `Header`: `compact` (padrão) e `hero`. `showAccentBar` acrescenta uma faixa azul/verde-limão ao cabeçalho compacto. O logo aceita elemento React ou fonte de imagem.
- `Card`: `default`, `soft`, `selectable`, `formatOption`, `summary`, `dashed`, `listAlt`, `historyItem`, `profileHighlight`, `infoBanner`, `mediaPreview`. Sem `onPress`, permanece um contêiner passivo; `selected` pode acrescentar destaque visual.

As abas continuam `home`, `downloads`, `pdf`, `history`, `profile`. `onTabPress` recebe o identificador; o componente não altera sozinho a seleção nem cria rotas.

`ProgressBar` continua limitando números a 0–100 e tratando valores inválidos como zero. O valor acessível permanece presente mesmo com o percentual oculto.

Quando `ConfirmationDialog.visible` é verdadeiro, `onCancel` e `onConfirm` são obrigatoriamente funções. Cancelar, voltar do Android e escape de acessibilidade chamam `onCancel` sem encaminhar eventos; confirmar chama somente `onConfirm`. Os callbacks continuam responsáveis por alterar o estado `visible`.

## Responsividade e fontes

Os helpers consideram telas compactas até 359 pontos e tablets a partir de 768. O conteúdo usa paddings de 16/20/24 pontos e largura máxima de 560. Botões, hero, cartões tonais e rótulos das abas consultam as dimensões atuais; o contêiner da demonstração também acompanha mudanças de largura.

As fontes Inter (400, 500, 600, 700) e Montserrat (400, 600, 700) são carregadas por `useFonts` no `App.js`. Corpo e controles usam Inter; títulos de seção e cabeçalho compacto usam Montserrat. Enquanto carregam, a tela informa o estado. Se houver erro, a demonstração permanece disponível e apresenta uma mensagem indicando a alternativa de fonte.

Dependências adicionadas:

| Dependência | Declaração | Resolvida no lockfile |
| --- | --- | --- |
| `expo-font` | `~58.0.11` | `58.0.12` |
| `@expo-google-fonts/inter` | `0.4.2` | `0.4.2` |
| `@expo-google-fonts/montserrat` | `0.4.2` | `0.4.2` |

Foi usado o instalador local do Expo SDK 58. O plugin `expo-font` foi acrescentado automaticamente em `app.json`. As versões anteriores de Expo, React, React Native, navegação e safe area não foram alteradas.

## Demonstração e validação

`package.json` continua apontando para `index.js`, que registra o `App.js`. A primeira tela segue sendo a demonstração integrada, com rolagem, nove componentes e todas as interações anteriores. Ela inclui exemplos adicionais de variantes, sem implementar funcionalidades definitivas de download, PDF, histórico ou perfil.

Inicie com `npx expo start` na raiz. Acesse o endereço exibido no Expo Go, com celular e computador na mesma rede. Confira o cabeçalho **Componentes**, o status **Demonstração integrada: nove componentes, nova paleta.** e a mensagem **Tipografia: Inter e Montserrat carregadas.** A demonstração permanece no aplicativo após o teste.

Em 11 de novembro de 2026:

- `node --test tests/components.test.cjs`: **34 testes passaram**, incluindo os 24 anteriores e 10 novos. Foram aproveitados os cenários úteis da referência de Paulo para variantes, fontes, responsividade e exportações, adaptando as expectativas à paleta oficial e preservando os testes funcionais.
- Metro: compilação JavaScript Android de `index.js`, **830 módulos**, com os nove componentes e sem a mensagem antiga.
- Sete arquivos de fonte servidos pelo Metro com conteúdo idêntico aos arquivos instalados.
- Quinze ícones PNG transparentes conferidos em 1x, 2x e 3x; assets preservados byte a byte.
- Lint não executado até o fim: ESLint/configuração ausentes. A configuração automática oferecida pelo CLI foi recusada para evitar dependências e mudanças fora do escopo.
- Typecheck indisponível: TypeScript não instalado. Não houve migração para TypeScript.
- Teste visual aprovado por John: **“Todos passaram; aprovo a integração”**, após o roteiro de fontes, rolagem, controles, cartões, abas, progresso, recuperação e confirmação no Expo Go. Não se presume validação visual em outras plataformas ou tamanhos de tela.

O backup anterior às alterações ficou fora do projeto, com SHA-256. O projeto de referência permaneceu intacto. A integração ficou somente nos arquivos locais; não houve staging, commit ou sincronização com o GitHub.
