# Componentes reutilizáveis do EduDownloader Mobile

Implementação local na branch `feature/john-componentes`, em JavaScript, sem dependências novas e sem mudanças de navegação ou configuração.

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
| `ConfirmationDialog` | `visible`, padrão `false`; `title`, padrão `'Confirmar operação'`; `description` opcional; `onConfirm`, `onCancel`; `confirmLabel`, padrão `'Confirmar'`; `cancelLabel`, padrão `'Cancelar'`. O chamador controla a visibilidade e deve fechá-lo nas ações. Voltar do Android e escape de acessibilidade chamam `onCancel`. Nenhuma ação é executada ao renderizar. |

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
