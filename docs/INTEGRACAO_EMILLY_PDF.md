# Integração das interfaces da Emilly — EduDownloader Mobile

Entrega local em **12/11/2026** no projeto `EduDownloader_DesenvolvimentoMobile`. A pasta `EduDownloader_Emilly_20261112` foi utilizada somente como referência. O projeto EduDownloader Desktop não foi acessado nem modificado.

## Ponto de partida preservado

A versão principal já possuía Home e Conversão, navegação React Navigation, os nove componentes oficiais e suas demonstrações. Também continha a GOAL 06: download de mídia, biblioteca compartilhada e melhorias de Downloads/Histórico, com 103 testes passando antes desta integração.

As alterações locais preexistentes foram preservadas. Antes de editar, foi criado um backup externo dos 131 arquivos de trabalho, incluindo os arquivos ainda não rastreados pelo Git, com manifesto SHA-256 e cópia do estado local. A referência da Emilly recebeu um manifesto separado de 103 arquivos para comprovar que permaneceu intacta. Nenhuma pasta `.git`, `node_modules` ou `.expo` da referência foi copiada.

## Interfaces da Emilly incorporadas

| Tela | Arquivo | Elementos preservados |
|---|---|---|
| Seleção de imagens | `src/screens/SelectImagesScreen.js` | Cabeçalho, instruções, área tracejada de seleção, miniaturas em grade, número das páginas, contador, remoção e Continuar. |
| Organização de imagens | `src/screens/OrganizeImagesScreen.js` | Cabeçalho, lista de miniaturas, ordem das páginas, mover para cima/baixo, remover, adicionar imagens e Continuar. |

As duas implementações foram reaproveitadas da Emilly, sem reconstrução do projeto inteiro. Os estilos locais permanecem organizados com `StyleSheet.create` e tokens do principal. A adaptação usa Inter/Montserrat, conteúdo responsivo com largura limitada e as áreas seguras existentes. Os botões Continuar reutilizam o `Button` oficial; a seleção desativada mantém feedback visual. Os controles de ordem têm área mínima de 48 pontos e os rótulos de acessibilidade identificam a página.

## Navegação

O `AppNavigator.js` do principal foi adaptado pontualmente. Não foi substituído pelo da referência, pois esse arquivo não contém o gerenciamento de mídia já existente na GOAL 06.

```text
Home / Ferramentas de PDF ou aba PDF
  → Seleção de imagens
  → Continuar, com pelo menos uma imagem
  → Organização de imagens
  → Continuar: aviso de geração futura, sem criar arquivo
```

- A aba PDF sempre entra pela seleção. A lista de imagens da sessão é mantida em `MainTabs`, separada da biblioteca de mídia.
- Selecionar, remover ou reorganizar atualiza a lista compartilhada. Ao voltar da organização ou tocar Adicionar imagens, a seleção reaparece com as imagens e a ordem atuais.
- O Voltar do Android retorna da organização para a seleção; da seleção, retorna à Home. Na Home, mantém a ação normal do sistema.
- Trocar de aba preserva as imagens da sessão. Ao reabrir PDF, a entrada é a seleção, com os dados preservados.
- O único `BottomNavigation` continua pertencendo a `MainTabs`. As telas da Emilly não renderizam outro menu.
- Os IDs continuam `home`, `downloads`, `pdf`, `history`, `profile`.
- As rotas nativas Main, ConvertGalleryVideo, ComponentsPreview e FilesPreview permaneceram registradas. Não houve migração de navegação nem criação de telas definitivas de outros módulos.

## Correções aplicadas

### Alert

`AppNavigator.js` importa explicitamente `Alert` de `react-native` para o aviso final. As duas telas também importam `Alert` corretamente. A verificação de escopo das chamadas `Alert.alert()` foi executada nos módulos do aplicativo.

### Limite total de 20 imagens

O limite não se aplica apenas a uma abertura da galeria:

- `src/pdf/imageSelection.js` centraliza o limite 20 e a normalização das listas.
- O seletor nativo recebe o número de vagas restantes, nunca zero, pois zero significaria seleção sem limite no picker.
- Ao receber o resultado, o total é validado novamente em JavaScript, mesmo se uma plataforma retornar mais imagens que o solicitado.
- URIs vazias/inválidas e repetidas são descartadas; os objetos de imagem e seus metadados são preservados sem mutação.
- Uma seleção cheia não reabre a galeria; o usuário recebe o aviso de limite. Remover uma imagem libera uma vaga.
- Toques repetidos não abrem seletores concorrentes. Continuar fica desativado enquanto a seleção está em andamento.
- Negação de permissão, cancelamento e falha do picker não apagam a seleção anterior. Resultados após desmontagem da tela são ignorados.
- A mesma normalização protege os dados iniciais e a entrada da organização.

## Estado e propriedades

`SelectImagesScreen` mantém os callbacks da Emilly: `onBack`, `onContinue(images)` e `initialImages`. Foi acrescentado `onImagesChange(images)` para sincronizar as alterações com o contêiner. O estado inicial é normalizado uma vez ao montar a tela; o fluxo remonta a seleção ao voltar da organização.

`OrganizeImagesScreen` mantém `images`, `onBack`, `onAddImages`, `onContinue(images)` e `onImagesChange(images)`. Reorganização e remoção atualizam somente o estado da interface. Os callbacks recebem a lista atual de imagens, sem eventos nativos ou dados de PDF fictícios.

Os objetos selecionados vêm de `expo-image-picker`, com URI local utilizável pelo `Image` nativo. Não são copiados para um armazenamento próprio de PDF nem persistidos pelo fluxo. A seleção dura a sessão do componente principal; reiniciar o aplicativo pode descartá-la. Não se promete armazenamento permanente ou restauração após encerramento do processo.

## Escopo visual e funcionalidades futuras

A galeria realmente permite selecionar imagens, e os controles de interface permitem remover e ordenar a seleção. O passo final apresenta:

> Geração de PDF em desenvolvimento. A seleção e a organização estão prontas. A geração de um arquivo PDF será implementada futuramente. Nenhum arquivo foi criado.

Não foi implementada geração real de PDF, conversão de imagem, compartilhamento, novo backend, armazenamento específico ou registro de PDF no Histórico. O fluxo não utiliza `pdf-lib` nem os serviços de arquivos. Dependências que já existiam no principal foram preservadas, sem instalação ou remoção.

## Arquivos desta tarefa

Criados:

- `src/screens/SelectImagesScreen.js`
- `src/screens/OrganizeImagesScreen.js`
- `src/pdf/imageSelection.js`
- `tests/pdf-interface.test.cjs`
- `docs/INTEGRACAO_EMILLY_PDF.md`

Modificados em relação ao backup desta tarefa:

- `src/navigation/AppNavigator.js`: conexão do fluxo, estado da sessão, import de Alert e retorno do Android.
- `tests/helpers/mobileHarness.cjs`: opção de injetar o picker nos testes, mantendo os padrões anteriores.
- `tests/navigation.test.cjs`: somente o título do teste do componente genérico PendingScreen foi esclarecido; todas as asserções anteriores foram mantidas.
- `docs/INTEGRACAO_EQUIPE.md`: nota de atualização e link para este documento, preservando o histórico da integração anterior.

`App.js`, `index.js`, `app.json`, `package.json`, `package-lock.json`, componentes oficiais, estilos compartilhados, demonstrações, assets, telas e serviços da GOAL 06 permanecem idênticos ao estado anterior à tarefa. O Git já mostrava modificações anteriores nesses arquivos; elas não foram revertidas nem sobrescritas.

## Validação

```text
node --test tests/*.test.cjs
```

- **117 testes passaram**, sem falhas, cancelamentos ou skips: 103 anteriores mais 14 novos.
- Os novos testes cobrem limite acumulado, deduplicação, múltiplas rodadas, remoção/liberação de vaga, permissão negada, cancelamento, exceção, seleção concorrente, controles de organização, navegação, Voltar do Android, responsividade e ausência de gravações fictícias.
- Os testes anteriores continuam validando os componentes, ícones, importações/exports, assets, telas e os contratos de download/histórico, inclusive transferências HTTP locais com bytes reais e persistência.
- O Metro do **projeto principal Mobile** compilou `index.js` para Android/Hermes com **1101 módulos**. O bundle foi inspecionado para confirmar Home, Conversão, Downloads, Histórico, as duas telas da Emilly e as duas demonstrações.
- Lint não pôde ser concluído: ESLint/configuração não estão disponíveis. A instalação automática oferecida pelo CLI foi recusada. Typecheck também não pôde ser concluído porque TypeScript não está instalado. Nenhuma ferramenta foi adicionada para contornar essas limitações.
- O backup, os arquivos preservados, os assets e a referência da Emilly foram conferidos por SHA-256. As referências Git e o conteúdo previamente preparado no índice foram preservados.
- **Validação visual no Expo Go e uso físico da galeria permanecem pendentes**, conforme instrução de John. Os testes simulam os controles nativos; a compilação não equivale a um teste no aparelho. Não foi solicitada aprovação visual nesta etapa.

## Entrega limpa

Arquivo final: `C:\Users\Usuario\Desktop\EduDownloader_Mobile_Integrado_Final_2026-11-12.zip`, fora da pasta do projeto.

O ZIP inclui o aplicativo integrado, código, assets, testes, documentação, lockfile e scripts necessários. Exclui `.git`, `node_modules`, `.expo`, caches, logs, backups, temporários, arquivos compactados anteriores e builds geradas. Sua lista de arquivos, CRC e conteúdo são verificados contra a cópia atual do Mobile.

Não houve branch nova, staging, commit, push, pull, fetch, merge, rebase ou sincronização com o GitHub. O projeto de referência da Emilly e os backups anteriores não foram modificados. O projeto Desktop não foi acessado.
