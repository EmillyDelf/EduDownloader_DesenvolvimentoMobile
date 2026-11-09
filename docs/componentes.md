# Componentes reutilizáveis do EduDownloader Mobile

Implementação local na branch `feature/john-componentes`, em JavaScript, sem dependências novas e sem mudanças de navegação ou configuração.

As seções iniciais registram a entrega e a aprovação da GOAL 01. A seção GOAL 02, ao final, registra a implementação e o estado atual do menu inferior.

## Arquivos

- Preservado sem alterações: `src/components/Button.js`.
- Criados em `src/components/`: `Input.js`, `Header.js`, `Card.js`, `LoadingIndicator.js`, `ProgressBar.js`, `ErrorMessage.js` e `ConfirmationDialog.js`.
- Criado: `tests/components.test.cjs`, com verificações isoladas usando Node e Babel já disponível nas dependências do Expo.
- Criado: este relatório, `docs/componentes.md`.
- Restaurado ao conteúdo original após o teste: `App.js`, que recebeu temporariamente a demonstração integrada.
- Cópia original e registro de integridade, ignorados pelo Git: `.expo/component-library-test/`.

## Propriedades

| Componente | Propriedades e comportamento |
| --- | --- |
| `Button` | `title`: texto; `onPress`: ação; `disabled`: desativa o controle, padrão `false`. Componente já testado anteriormente por John e mantido intacto. |
| `Input` | `value`, `onChangeText`, `placeholder`; `editable` (padrão `true`); `keyboardType` (padrão `'default'`); `autoCapitalize` (padrão `'sentences'`); `autoCorrect` (padrão `true`); `label` e `error` opcionais, ambos textos. O erro tem prioridade visual sobre o foco. |
| `Header` | `title`; `onBack` opcional exibe a ação Voltar; `rightActionLabel` e `onRightAction` juntos exibem a ação da direita. Somente chama as funções recebidas. |
| `Card` | `children`; `onPress` opcional transforma o cartão em botão; `disabled` (padrão `false`) e `accessibilityLabel` para o cartão acionável. Sem `onPress`, o conteúdo é estático. |
| `LoadingIndicator` | `size`, padrão `'large'`; use `'small'` ou `'large'` em ambas as plataformas. `message`, padrão `'Carregando...'`; uma string vazia oculta a mensagem visual e mantém o nome acessível. O componente representa um carregamento em andamento. |
| `ProgressBar` | `progress`, número de 0 a 100, padrão `0`; `showPercentage`, padrão `true`; `accessibilityLabel`, padrão `'Progresso'`. Valores finitos são limitados ao intervalo; outros valores, inclusive strings numéricas, viram zero. A largura preserva casas decimais e o texto arredonda para o inteiro mais próximo. |
| `ErrorMessage` | `message`; `onRetry` opcional; `retryLabel`, padrão `'Tentar novamente'`. Sem mensagem, não renderiza conteúdo. O texto identifica o erro e tem papel acessível de alerta; a ação reutiliza `Button`. |
| `ConfirmationDialog` | `visible`, padrão `false`; `title`, padrão `'Confirmar operação'`; `description` opcional; `onConfirm()` e `onCancel()` obrigatórios quando visível; `confirmLabel`, padrão `'Confirmar'`; `cancelLabel`, padrão `'Cancelar'`. O chamador controla a visibilidade e deve fechá-lo nas ações. Voltar do Android e escape de acessibilidade chamam `onCancel`. Callbacks inválidos geram `TypeError` antes de abrir. Nenhuma ação é executada ao renderizar. |
| `BottomNavigation` | `activeTab`, padrão `'home'`, identifica a seleção; `onTabPress(tabId)` comunica o identificador pressionado. O componente não muda a seleção nem configura rotas. Detalhes da GOAL 02 abaixo. |

Exemplo de uso em uma tela em `src/screens/`:

```jsx
import React, { useState } from 'react';
import Input from '../components/Input';

export default function DownloadScreen() {
  const [link, setLink] = useState('');

  return (
    <Input
      label='Link do conteúdo'
      value={link}
      onChangeText={setLink}
      placeholder='https://exemplo.com/aula'
      keyboardType='url'
      autoCapitalize='none'
      autoCorrect={false}
    />
  );
}
```

O exemplo é apenas documentação; nenhuma tela de Download ou rota foi criada.

## Referência visual

O [Figma do EduDownloader](https://www.figma.com/design/l5s1RtzMAvzcGNGeOwAqWJ/EduDownloader) foi consultado, incluindo código de referência e imagens dos elementos:

- `66:148`: campo com fundo branco, borda `#E5EAF0`, raio 12, texto 14 e altura mínima 58.
- `63:8`: título do cabeçalho, tamanho 18 e cor `#111827`.
- `68:191`: cartão claro `#F8FAFC`, com raio 14.
- `86:46`: barra azul `#0F519D`, trilho `#F5F5F5` e altura 6.
- `10:21`: amostras de cores e fontes Inter/Montserrat.

O botão verde `#1E5D3B` e as fontes nativas existentes foram preservados. Não foram instaladas fontes nem criados estilos globais. As referências consultadas para estes elementos não contêm imagens ou SVGs necessários aos componentes genéricos.

Paulo ainda deve validar o uso das fontes nativas em lugar de Inter/Montserrat, a combinação do botão verde existente com o azul do Figma, as cores dos estados de erro e desativado e a aparência da confirmação, para a qual não foi identificado um modelo específico nas referências consultadas. Não se trata de um sistema visual definitivo.

## Validações locais

Comando para repetir os testes isolados:

```powershell
node --test tests/components.test.cjs
```

Resultado: **10 testes passaram**, cobrindo propriedades do botão, campo controlado e configuração para links, foco/desfoque, prioridade do erro, controles desativados, ações opcionais do cabeçalho e cartão, mensagem de carregamento, normalização do progresso, percentual opcional, erro vazio, tentativa de recuperação e confirmação/cancelamento sem execução automática.

Os testes simulam elementos nativos e o estado local do campo. Eles verificam contratos e callbacks, sem renderizar a interface nativa. John também testou a demonstração no Expo Go e informou que todos os testes passaram. Não houve confirmação específica de teste com leitores de tela nem identificação da plataforma do aparelho.

- Sintaxe JSX e resolução dos imports dos oito componentes e de `App.js`: passaram.
- Compilação de cada novo componente no Metro para Android: HTTP 200.
- Compilação da demonstração completa para Android e iOS: HTTP 200 em ambas.
- Após a aprovação de John e a restauração: dez testes isolados passaram novamente; o `App.js` original compilou no Metro para Android com HTTP 200. Os hashes de todos os arquivos previamente versionados coincidem com o registro anterior à demonstração.
- `git diff --check`: passou.
- `npx --offline --no-install expo lint`: não executou o lint porque o launcher do npm não encontrou o `node`. ESLint e sua configuração também não existem no projeto.
- `npx --offline --no-install --package typescript tsc --noEmit`: indisponível por ausência de TypeScript instalado/em cache (`ENOTCACHED`). O projeto segue em JavaScript, sem configuração de TypeScript.

Nenhuma ferramenta adicional foi instalada para contornar essas limitações. Nenhum `npm audit fix` foi executado.

## Teste integrado no Expo Go

A demonstração temporária utilizou a biblioteca de área segura já instalada, rolagem e ajuste para teclado, com dados e ações fictícios. John confirmou que todos os testes passaram e autorizou a restauração. O `App.js` já está novamente no estado original; os comandos abaixo agora abrem a tela inicial original, sem a demonstração.

O Metro estava ativo em `exp://192.168.0.7:8081` na verificação local. Se precisar iniciá-lo novamente na pasta do projeto:

```powershell
npx expo start
```

Se ocorrer a falha já identificada no launcher do npm, use diretamente o mesmo CLI local:

```powershell
node node_modules/expo/bin/cli start
```

Conecte o computador e o celular à mesma rede Wi-Fi. Abra o endereço mostrado pelo Metro no Expo Go compatível com SDK 58, ou escaneie o QR code. Use o endereço atual do terminal caso o IP tenha mudado. Para iPhone físico, a documentação atual do Expo exige a mesma conta no CLI e no Expo Go. Consulte as [instruções oficiais de execução](https://docs.expo.dev/get-started/start-developing/).

Roteiro utilizado para a rodada de testes da demonstração:

1. No cabeçalho, pressione Voltar e confira a mensagem de resultado sem mudança de tela; pressione Ajuda e confira o alerta.
2. Em Botões, pressione Testar botão: deve mudar a opacidade e abrir o alerta. O botão desativado deve ter aparência diferente e não executar a ação.
3. No campo, digite um link e confira o texto repetido abaixo. Observe foco e desfoque; mostre/limpe o erro e desative/ative a edição. Digitar novamente também limpa o erro de demonstração.
4. No cartão da aula, toque e confira o contador. O cartão informativo não tem ação. O cartão desativado não deve incrementar o contador.
5. Confira o indicador de carregamento e alterne entre os tamanhos pequeno e grande.
6. Selecione 0%, 25%, 50%, 75% e 100%; confira o preenchimento, a seleção e o percentual. Oculte e mostre o percentual.
7. Na mensagem de erro, pressione Tentar novamente: o erro deve desaparecer e surgir o resultado da recuperação simulada. Simular erro novamente permite repetir o teste.
8. Abra a confirmação e cancele; abra novamente e confirme. Confira cada resultado abaixo do botão. No Android, verifique também o voltar do sistema com o diálogo aberto.
9. Se possível, confira a identificação dos controles com TalkBack/VoiceOver e fontes ampliadas. A confirmação deve manter suas ações alcançáveis por rolagem.

**Validação no Expo Go aprovada por John em 8 de novembro de 2026:** “Todos passaram; pode restaurar App.js”. A aprovação se refere ao aparelho utilizado por John; a plataforma não foi informada. A compilação Android/iOS não comprova teste visual em ambas as plataformas.

## Integridade e restauração concluída

Cópia exata do original: `.expo/component-library-test/App.js.original`.

SHA-256 original de `App.js`:

```text
23e440ce44246cc6a15a4010211a9bdcf3618ec8f6abd3bf5d0c5116d6906e28
```

SHA-256 do `Button.js` preservado:

```text
6773367fd5d6b6ed72e7e30034b2046423d1ba5b660e8e331e19543e2156071e
```

O original e os hashes foram conferidos antes da demonstração. A pasta de apoio também guarda os hashes dos arquivos que já estavam versionados. Antes de restaurar, foi confirmado que `App.js` ainda correspondia à demonstração, sem edições posteriores.

Após a confirmação explícita de John, os bytes da cópia original foram restaurados e a igualdade byte a byte e o SHA-256 foram verificados. Os oito componentes permaneceram intactos durante a restauração.

## Situação do Git nesta entrega

Não há alterações nos arquivos previamente versionados: `App.js` foi restaurado. Permanecem novos os sete componentes, o arquivo de testes e este relatório. `Button.js`, dependências, lockfile, configurações e navegação continuam intactos. O backup está ignorado em `.expo/`.

Nenhum commit, push, merge, rebase, Pull Request ou publicação foi realizado. Os arquivos novos estão disponíveis para revisão e commit manual pelo GitHub Desktop.

## GOAL 02 — Menu inferior

### Componente e propriedades

`src/components/BottomNavigation.js` apresenta cinco abas igualmente distribuídas. A seleção é controlada pela tela através de `activeTab`; cada toque chama `onTabPress` com o identificador correspondente. Pressionar a aba já ativa também comunica o toque. O componente não executa navegação e não depende de Expo Router ou React Navigation.

| Aba | Identificador | Ícone local | Nó de origem do ícone |
| --- | --- | --- | --- |
| Início | `home` | `assets/navigation/home.png` | `68:78` |
| Downloads | `downloads` | `assets/navigation/downloads.png` | `68:154` |
| PDF | `pdf` | `assets/navigation/pdf.png` | `68:87` |
| Histórico | `history` | `assets/navigation/history.png` | `68:93` |
| Perfil | `profile` | `assets/navigation/profile.png` | `68:98` |

`activeTab` assume `'home'` quando omitido. Um identificador desconhecido não seleciona nenhuma aba. `onTabPress` é usado para integrar o controle à tela; sua ausência não provoca erro de toque, mas não produz mudança alguma.

As abas têm papel acessível `tab`, nome e estado `selected`; o agrupamento tem papel `tablist`. Os ícones são decorativos para leitores de tela. O feedback de pressão reduz a opacidade. Cada área ocupa um quinto da largura útil, com altura mínima de 70 e crescimento conforme o texto. Os rótulos permitem quebra de linha e ampliação de fonte.

O componente usa `SafeAreaView` da dependência já instalada para proteger as bordas inferior e laterais. A aplicação deve oferecer um único `SafeAreaProvider` na raiz. Evite aplicar novamente a proteção inferior no contêiner que envolve o menu, para não duplicar o espaço. A [documentação do SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/) orienta essa composição sem Expo Router.

Exemplo mínimo, sem navegação real:

```jsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from './src/components/BottomNavigation';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <SafeAreaProvider>
      <View style={styles.screen}>
        <SafeAreaView edges={['top', 'left', 'right']} style={styles.content}>
          <Text>{activeTab}</Text>
        </SafeAreaView>
        <BottomNavigation activeTab={activeTab} onTabPress={setActiveTab} />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
});
```

### Figma e limites visuais

Foram consultados contexto de design e imagens de referência de todos os nós solicitados:

- `68:76`: Downloads selecionado.
- `68:148`: PDF selecionado.
- `68:233`: Histórico selecionado.
- `68:314`: Perfil selecionado.
- `20:2`: tela inicial, com Início selecionado; somente seu menu foi considerado no escopo.

O layout adota o padrão comum às quatro primeiras barras: fundo `#F8FAFC`, texto e ícones inativos `#64748B`, seleção `#24AF42`, rótulos de tamanho 12 com peso normal/600, ícones de 22 × 22, espaço de 7 entre ícone e rótulo e altura mínima de 70, antes da área segura. Os posicionamentos absolutos de largura 440 do protótipo foram adaptados para cinco áreas flexíveis iguais.

As dependências e os assets existentes foram verificados primeiro. Não há `@expo/vector-icons`, `react-native-svg` ou `expo-image` instalados, nem ícones de navegação nos assets anteriores. A primeira exportação em PNG incorporou um fundo opaco, detectado na revisão independente. Os arquivos foram substituídos por exportações diretas do conteúdo vetorial dos mesmos nós, usando `exportAsync` com `contentsOnly: true` e limites originais, sem alterar o Figma ou redesenhar os ícones. Agora o fundo é transparente. O `Image` nativo continua carregando assets locais e aplicando `tintColor` somente ao desenho; não há URLs temporárias em execução.

Diferenças que dependem de validação de Paulo:

- O protótipo usa Inter; o aplicativo continua usando fontes nativas, sem instalação de fontes. As métricas dos rótulos podem variar.
- O menu de `20:2` usa outro fundo, tons de inativo, posicionamentos e imagens. Foi mantido o padrão consistente das outras quatro telas, inclusive para Início.
- Os PNGs agora têm versões 1x (22 × 22), `@2x` (44 × 44) e `@3x` (66 × 66), exportadas dos vetores originais, com transparência real e antialiasing. O Metro seleciona a densidade adequada; o layout permanece em 22 × 22. Nenhuma ampliação artificial do PNG antigo ou biblioteca nova foi utilizada.
- Em larguras menores e fontes ampliadas, o menu pode crescer para acomodar os rótulos. A área segura acrescenta o espaço necessário ao sistema, sem fixar a barra sobre os controles nativos.

### Arquivos desta etapa

- Criado: `src/components/BottomNavigation.js`.
- Criados: os cinco PNGs em `assets/navigation/` listados acima.
- Atualizado: `tests/components.test.cjs`, preservando os dez testes anteriores e acrescentando seis testes do menu.
- Atualizado: este documento, preservando o registro da GOAL 01.
- Restaurado ao conteúdo original após aprovação: `App.js`, que exibiu temporariamente seleção simulada, nome da aba atual e contador de toques.
- Apoio local ignorado pelo Git: `.expo/bottom-navigation-test/`, contendo backup original, hashes de referência e hash da demonstração.

Os oito componentes anteriores, configurações, dependências e lockfile foram preservados. Nenhuma tela funcional ou rota foi criada.

### Resultados locais

`node --test tests/components.test.cjs`: **16 testes passaram**, incluindo os dez anteriores. Os seis novos verificam as cinco opções e assets locais, cada seleção, identificadores dos callbacks e ausência de mudança interna de estado, acessibilidade, feedback de pressão e áreas flexíveis, valores padrão e identificadores desconhecidos.

Os testes leem os PNGs e conferem sua assinatura, dimensões e os slots de 22 × 22. Continuam sendo testes isolados com elementos nativos simulados; não comprovam desenho físico, largura de toque calculada no aparelho ou funcionamento de leitores de tela.

- Sintaxe JSX do menu e da demonstração: passou.
- Compilação individual do menu para Android no Metro: HTTP 200.
- Demonstração completa para Android e iOS no Metro: HTTP 200 em ambas.
- Após aprovação e restauração: os 16 testes passaram novamente; o `App.js` original compilou para Android no Metro com HTTP 200. Os hashes dos arquivos preservados coincidem com o registro anterior à GOAL 02.
- As limitações de lint/typecheck descritas na GOAL 01 continuam presentes. Nenhuma ferramenta adicional foi instalada.

### Demonstração aprovada e restauração concluída

A demonstração temporária começou em Início, exibiu o nome da aba selecionada e contou todos os toques, inclusive toques repetidos na mesma aba. O menu foi posicionado abaixo do conteúdo, sem sobreposição, com proteção da área segura. Nenhuma rota foi alterada. Após a aprovação de John, `App.js` foi restaurado ao original; os comandos abaixo agora abrem a tela inicial original, sem o menu de demonstração.

O Metro continua disponível no endereço mostrado no terminal, inicialmente `exp://192.168.0.7:8081`. Para iniciar novamente, utilize `npx expo start` ou, se persistir a falha do launcher, `node node_modules/expo/bin/cli start`. Conecte computador e celular à mesma rede Wi-Fi e abra o projeto no Expo Go compatível com SDK 58.

Roteiro utilizado no teste no aparelho:

1. Confira Início selecionado inicialmente.
2. Toque Downloads, PDF, Histórico e Perfil, depois retorne a Início.
3. Em cada toque, confira o nome central, o verde/peso do rótulo e ícone selecionados e o contador.
4. Toque repetidamente a mesma aba: ela deve continuar selecionada e o contador deve aumentar.
5. Observe o feedback durante a pressão e confira se toda a área de cada aba responde ao toque.
6. Confira que a barra fica acima dos botões/gestos do Android ou do indicador inferior do iPhone. Se possível, teste também fontes ampliadas e identificação/seleção com TalkBack ou VoiceOver.

**Rodada do menu aprovada por John em 8 de novembro de 2026:** “Todos passaram; pode restaurar App.js”. A confirmação abrange o teste das cinco abas, toques repetidos, destaque de seleção e posição acima da navegação do sistema no aparelho utilizado. A plataforma não foi informada, e não se presume aprovação visual em ambas as plataformas nem teste específico com leitores de tela.

O original foi preservado byte a byte em `.expo/bottom-navigation-test/App.js.original`, com SHA-256:

```text
23e440ce44246cc6a15a4010211a9bdcf3618ec8f6abd3bf5d0c5116d6906e28
```

Após a confirmação explícita de John, foi verificado que `App.js` ainda correspondia ao hash da demonstração, sem edições posteriores. Os bytes do backup foram restaurados, com igualdade byte a byte e SHA-256 original conferidos. Os nove componentes e os cinco ícones permaneceram intactos durante a restauração.

### Git atual da GOAL 02

Branch: `feature/john-componentes`. `App.js` está restaurado e não apresenta alterações no Git. Permanecem modificados `tests/components.test.cjs` e `docs/componentes.md`; arquivos novos: `src/components/BottomNavigation.js` e seus cinco ícones em `assets/navigation/`. Nenhum commit, push, merge, rebase, Pull Request, publicação ou alteração no Trello foi realizado.

## GOAL 02 — Revisão final antes do commit

Esta revisão corrige os ícones e esclarece o cancelamento do diálogo. John aprovou também esta rodada no Expo Go e autorizou a restauração do `App.js`, já concluída.

### Transparência e densidade dos ícones

Os cinco PNGs anteriores tinham todos os 484 pixels opacos, incluindo o fundo `#F8FAFC`. Os testes antigos só conferiam assinatura e dimensões. Isso permitia que `tintColor` colorisse o quadrado inteiro.

Os mesmos nós vetoriais do Figma, listados na tabela das abas, foram exportados sem o contexto de fundo, com `contentsOnly: true`, `useAbsoluteBounds: true` e escalas 1, 2 e 3. As cores, abas, identificadores e callbacks do menu não foram alterados. Foram substituídos os cinco arquivos base e acrescentados dez arquivos `@2x.png`/`@3x.png` em `assets/navigation/`. O `BottomNavigation.js` continua intacto e referencia os arquivos base, permitindo a seleção de densidade pelo Metro.

A verificação usa `PNG.sync.read` de `pngjs`, já disponível nas dependências locais do Expo. Ela decodifica os pixels dos 15 arquivos e exige mais de 25% de pixels totalmente transparentes, desenho visível e quatro cantos transparentes, além das dimensões corretas. Há também um caso negativo que gera um PNG RGBA totalmente opaco e confirma sua rejeição. A existência de um canal alfa, isoladamente, não é aceita como prova de transparência.

Antes de substituir os assets, o teste novo falhou com `Icon background must be transparent`. Após a exportação correta, passou em todas as densidades.

### Contrato seguro de ConfirmationDialog

Quando `visible` for `true`, **`onCancel` e `onConfirm` devem ser funções**. Caso contrário, o componente lança um `TypeError` descritivo antes de criar o modal. Quando oculto, retorna `null` e não exige callbacks ainda. Não há função vazia padrão que possa deixar o modal aberto sem ação de cancelamento.

- Botão Cancelar, `onRequestClose` e escape de acessibilidade usam a mesma função interna, que chama `onCancel()` uma vez por evento.
- Botão Confirmar chama apenas `onConfirm()`.
- Os callbacks são chamados sem argumentos, sem encaminhar eventos nativos.
- O chamador deve definir `visible` como `false` em ambos os callbacks para fechar o diálogo. O componente continua controlado por propriedades e não fecha sozinho.
- Não há execução automática, inclusive ao renderizar novamente.

A [documentação do Modal](https://reactnative.dev/docs/modal#onrequestclose) exige `onRequestClose` no Android para tratar o voltar do sistema. Não foi adicionado `BackHandler`, pois o próprio `Modal` recebe esse evento. Os estilos e a aparência do diálogo foram preservados.

Exemplo dos callbacks:

```jsx
function handleCancel() {
  setDialogVisible(false);
}

function handleConfirm() {
  setDialogVisible(false);
  // Executar somente a ação explicitamente confirmada.
}

<ConfirmationDialog
  visible={dialogVisible}
  onCancel={handleCancel}
  onConfirm={handleConfirm}
/>
```

### Verificações da revisão

`node --test tests/components.test.cjs`: **21 testes passaram**, preservando os 16 anteriores. Os cinco novos testes cobrem transparência nas três densidades, rejeição de PNG opaco e o contrato/caminhos dos callbacks do diálogo. Os testes continuam isolados, com elementos nativos simulados; a aprovação do teste físico foi fornecida por John nesta rodada.

A compilação individual de `BottomNavigation` e `ConfirmationDialog` para Android passou pelo Metro. As imagens agora são reconhecidas nas escalas `[1, 2, 3]`, com dimensões lógicas 22 × 22. Nenhuma dependência, configuração ou outro componente foi alterado.

A demonstração conjunta também compilou para Android e iOS (HTTP 200 em ambas). Isso não substitui a verificação visual no Expo Go. Lint e typecheck seguem com as limitações já registradas; nenhuma ferramenta adicional foi instalada.

### Demonstração da revisão — aprovada e restaurada

A demonstração temporária mostrou o menu corrigido e abriu a confirmação, com contadores separados de cancelamentos e confirmações. Não foram criadas rotas reais nem operações sobre arquivos. O `App.js` já foi restaurado ao original; abrir o aplicativo agora mostra novamente a tela inicial original, sem essa demonstração.

Durante o teste, foi utilizado o endereço do Metro no Expo Go, inicialmente `exp://192.168.0.7:8081`, com celular e computador na mesma rede Wi-Fi. Para iniciar o servidor novamente, use `npx expo start` ou o CLI direto `node node_modules/expo/bin/cli start` caso o launcher continue falhando. O roteiro abaixo registra a demonstração que foi testada e removida após a aprovação.

1. Pressione cada uma das cinco abas e confira que os traços alternam entre cinza e verde, sem quadrados preenchidos de fundo.
2. Abra a confirmação e pressione Cancelar: o modal deve fechar e apenas o contador de cancelamentos deve aumentar.
3. Abra novamente e pressione Confirmar: somente o contador de confirmações deve aumentar.
4. No Android, abra novamente e use o voltar do sistema: o resultado deve ser cancelamento, com fechamento e um único incremento.
5. Se disponível, confira o escape do VoiceOver e a nitidez em uma tela de maior densidade.

Cópia original: `.expo/final-review-test/App.js.original`, preservada byte a byte e conferida por SHA-256:

```text
23e440ce44246cc6a15a4010211a9bdcf3618ec8f6abd3bf5d0c5116d6906e28
```

**Rodada aprovada por John em 8 de novembro de 2026:** “Tudo correto; pode restaurar App.js”. A aprovação se refere aos ícones e às ações da confirmação no aparelho utilizado; não se presume teste específico com VoiceOver ou em ambas as plataformas.

Após essa confirmação, foi verificado que `App.js` ainda correspondia ao hash da demonstração. Os bytes do backup foram restaurados e a igualdade byte a byte e o SHA-256 original foram conferidos. Os nove componentes e os 15 ícones permaneceram intactos durante a restauração. As alterações anteriores do Git foram preservadas; não houve commit, push, merge ou operação no GitHub/Trello.

Após a restauração, os 21 testes passaram novamente, `App.js` não apresentou diferenças no Git e sua compilação original para Android no Metro retornou HTTP 200.


---

## GOAL 03 — Sistema de Estilos, Padronização Visual e Responsividade (7 Entregas — Paulo)

Implementação completa do sistema de estilos globais (`StyleSheet`), padronização de cores e tipografia do Figma (`Inter` e `Montserrat`), estilos reutilizáveis de componentes e adaptação para diferentes tamanhos de tela em `src/styles/`, integrada aos 9 componentes reutilizáveis em `src/components/`.

### Estrutura Modular Criada em `src/styles/`

| Entrega | Arquivo | Descrição |
| --- | --- | --- |
| **1. Estilos Globais** | `src/styles/globalStyles.js` | Containers de tela (`screen`, `safeArea`, `scrollView`, `scrollContent`), layouts dos 3 padrões do Figma (`tabScreenContent`, `flowScreenContent`, `centeredScreenContent`), grids de 2 e 3 colunas (`twoColumnGrid`, `threeColumnGrid`), seções, divisores e sombras. |
| **2. Estilos de Botões** | `src/styles/buttonStyles.js` e `src/components/Button.js` | Variantes `primary` (`#0F519D`), `secondary` (`#EAF3FF`), `outline` (`+ Adicionar mais imagens`), `cancel` (`Cancelar download/PDF`), `link` (sublinhado), `inline` (`Colar`), `chip` (filtros ativos/inativos), `icon` / `iconBlue` e `success` (`#1E5D3B`), nos tamanhos `sm`, `md` e `lg`. |
| **3. Estilos de Campos de Texto** | `src/styles/inputStyles.js` e `src/components/Input.js` | Variantes `default` (formulário `58px`), `url` (borda azul translúcida + suporte a `leftIcon` e ação direita `rightActionLabel="Colar"`) e `search` (`52px`, fundo `#F8FAFC`), além de estados de foco, erro e desabilitado. |
| **4. Estilos de Cabeçalhos e Menus** | `src/styles/headerMenuStyles.js`, `src/components/Header.js` e `src/components/BottomNavigation.js` | Suporte ao Top App Bar de fluxo (`74px`, variante `default` e `subtle` com faixa bicolor `showBrandAccent`), ao Hero Header Banner (`200px`, variante `hero` com `title` e `subtitle` para as 5 abas principais) e aos estilos do `BottomNavigation`. |
| **5. Estilos de Cartões e Componentes** | `src/styles/cardComponentStyles.js` e `src/components/*` | Variantes de `Card` (`default`, `feature`, `featurePrimary`, `selectable` com `selected`, `download`, `history`, `settings`, `profile`, `dropzone`, `preview`), elementos internos (avatares, badges `"MP4"`/`"PDF"`/`"Concluído"`, radio buttons, miniaturas de página) e estilos de `ProgressBar`, `LoadingIndicator`, `ErrorMessage` e `ConfirmationDialog`. |
| **6. Cores e Tipografia** | `src/styles/colors.js` e `src/styles/typography.js` | Paleta completa do Figma (`#0F519D`, `#0A4C95`, `#0D355D`, `#2F9CEF`, `#24AF42`, `#1EA540`, superfícies e bordas) e escala tipográfica completa com fontes `Inter` e `Montserrat` carregadas via `expo-font` em `App.js`. |
| **7. Responsividade Multi-Tela** | `src/styles/responsive.js` | Base calibrada no frame do Figma (`440 × 956`), funções `scale`, `verticalScale`, `moderateScale`, `responsiveFontSize`, `getResponsiveLayout`, `getGridColumnWidth` e hook reativo `useResponsive()` para telas compactas (`< 360px`), regulares (`360–439px`), grandes (`>= 440px`) e tablets (`>= 768px`). |
| **Exportação Unificada** | `src/styles/index.js` | Ponto central de exportação de todos os módulos e helpers de estilo para consumo nas telas. |
