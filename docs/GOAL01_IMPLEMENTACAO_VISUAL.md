# GOAL 01 — Downloads, Histórico e download por link

## Alvo e referências

A implementação foi aplicada à cópia versionada em `C:\Users\Usuario\Desktop\EduDownloader_DesenvolvimentoMobile`. Os 151 arquivos da entrega em `EduDownloader_Mobile_Integrado`, incluindo o relatório, o gerador de PDF e a escolha de áudio, já estavam presentes na árvore de trabalho do clone e coincidiam byte a byte antes da aplicação. A pasta integrada foi preservada como referência. O HEAD local continuou em `f65cf5ed6379a9da3f340105d6614bbbabb6c2b0`. A revisão manteve os manifestos npm, a configuração do Expo SDK 58, JavaScript, React Native e React Navigation.

O Figma 2.0 forneceu contexto, dimensões, camadas, capturas e assets. A tabela de comparação de cada frame está na [auditoria do GOAL 1.5](GOAL01_5_AUDITORIA.md). [Arquivo Figma Mobile](https://www.figma.com/design/IS2PX0pWbk5YJnMJZITZFm)

## Downloads e Histórico

- **Downloads, `7:468`.** A aba é a biblioteca. O cabeçalho usa o logotipo e as mesmas margens do conteúdo. A busca e os quatro filtros operam sobre os registros fornecidos pela biblioteca. Os cartões mostram categoria, formato, tamanho ou páginas e data quando essas informações existem. Progresso, tentativa, abertura, atualização e estados vazios continuam ligados às propriedades e callbacks existentes.
- **Histórico, `7:598`.** Os filtros e o agrupamento continuam usando os registros da biblioteca. Os cartões usam ícone, horário e estado do registro. Abrir e excluir são ações irmãs na hierarquia de acessibilidade. A exclusão exige confirmação e remove somente o registro do histórico.
- **Navegação inferior.** A variante visual das telas de arquivos mantém as cinco abas e realça a seleção com ícone verde e texto azul. A tela principal continua dona de uma única barra. As outras telas mantêm a variante que já usavam.

## Download por link

O cartão **Download de mídia** da Home abre a rota `MediaDownload`. `MediaDownloadForm.js` é o conteúdo da rota e recebe o estado compartilhado de `useMediaLibrary`. A aba Downloads recebe os registros e ações da biblioteca. A identificação e a transferência continuam sob a mesma instância dos serviços da integração.

| Etapa | Frame | Vinculação funcional |
| --- | --- | --- |
| Colar link | `7:433` | Campo controlado e botão Colar usam a biblioteca e a área de transferência. Continuar valida e analisa o endereço. |
| Formato | `7:394` | Exibe os formatos confirmados pela origem. A seleção preserva o formato e a variante enquanto a pessoa navega entre etapas. |
| Qualidade | `7:354` | Aceita as opções devolvidas pelo serviço. A identificação direta atual mantém o arquivo original quando a origem desconhece a qualidade. O botão usa a disponibilidade do serviço e do armazenamento. |
| Progresso | `7:336` | Exibe o percentual recebido quando o tamanho é conhecido. Para progresso indeterminado, exibe atividade e uma mensagem do estado. Cancelar depende da capacidade informada pelo serviço. |
| Conclusão | `7:315` | Depende de um registro concluído com URI local e tamanho positivo. O serviço já verifica o arquivo antes de publicar esse estado. O botão Abrir usa o arquivo registrado e informa falhas. |

O cabeçalho e o retorno do sistema recuam de Qualidade para Formato e de Formato para Colar link, conservando o endereço. Sair da rota durante uma transferência mantém a operação na biblioteca. Retornar pela Home exibe o estado corrente. As etapas usam rolagem, margens adaptáveis, áreas seguras e tratamento do teclado.

## Reuso e preservação

As telas reutilizam Button, Input, Header, BottomNavigation, Card, LoadingIndicator, ProgressBar, ErrorMessage e ConfirmationDialog. As extensões de estilo e semântica são opcionais e mantêm os usos anteriores. O Design System `3:2` orientou paleta, Inter e estados. O contraste do ícone de abertura da biblioteca foi preservado usando azul oficial sobre a superfície clara.

O código de identificação, transferência, cancelamento, persistência, PDF e conversão por galeria foi preservado. Os novos PNGs são locais. A biblioteca continua usando os registros do serviço e a conversão de vídeo em áudio continua na etapa de interface. A ligação de conversões e PDFs ao histórico continua reservada à integração funcional de cada recurso.
