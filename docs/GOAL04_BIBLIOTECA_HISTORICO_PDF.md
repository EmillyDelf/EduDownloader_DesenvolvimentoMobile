# GOAL 04 — Biblioteca, Histórico e PDFs

**Downloads** reúne vídeo, áudio e PDF no catálogo usado pelos downloads diretos e remotos. **Histórico** usa o mesmo repositório e mantém os filtros e o agrupamento por data. As abas, o estilo dos cartões, a busca por nome e os filtros por categoria seguem a estrutura existente.

## Registro de um arquivo gerado

`registerGeneratedFile(input)` recebe o resultado real do produtor e retorna uma promessa de confirmação do catálogo. Para PDF, a navegação chama o serviço após `generatePdf` concluir a gravação e passa `fileUri`, `name`, `format: 'PDF'`, `activityType: 'pdf'`, `sizeBytes` e `pageCount`. A conclusão continua oferecendo os comandos já existentes da Emilly. Se o catálogo falhar, a tela mostra **Registrar PDF novamente** para repetir a operação com a mesma URI.

O serviço valida URI local, nome, extensão, tamanho e MIME. Para PDF em `Paths.document/PDFs/`, confere cabeçalho, marcador de fim, referência cruzada e árvore de páginas com `pdf-lib`, além de comparar a contagem informada. O registro preserva a URI original, sem copiar ou gerar o PDF novamente. Geração interrompida e PDF inválido ficam fora do catálogo. O resultado recebe identificador derivado da URI canônica, formato, tipo, MIME, tamanho em bytes, datas, origem da atividade, status, URI e propriedade.

Para um produtor futuro, o mesmo contrato aceita um resultado MP4 ou MP3 de `activityType: 'conversion'` cujo arquivo já exista, com assinatura compatível. As saídas sob `Paths.document/edudownloader/conversions/` seguem as regras de arquivo gerenciado. Uma referência local externa precisa ser declarada com `fileOwnership: 'external'`; sua leitura continua sujeita às permissões do sistema e ela fica fora da exclusão física. O módulo do Paulo permanece na etapa de escolha de formato.

## Operações em Downloads e Histórico

| Ação | Efeito |
| --- | --- |
| Abrir | Confere novamente existência e tamanho. Em PDF, usa a visualização nativa. Em vídeo e áudio, mantém o mecanismo já usado no Android e no iOS. |
| Compartilhar | Verifica disponibilidade e usa a folha do sistema com o MIME e UTI. Cancelar a folha não gera mensagem de erro. |
| Exportar cópia | Usa o seletor de diretório do SDK e a autorização concedida pelo sistema. A cópia preserva a origem e usa `overwrite: false`. Pastas locais recebem o nome do catálogo quando válido. Pastas SAF no Android usam o nome do arquivo físico, que pode ser o identificador do download. |
| Remover registro em Downloads | Solicita confirmação. Retira a entrada de Downloads e preserva o arquivo e o evento de Histórico. |
| Excluir registro no Histórico | Solicita confirmação. Retira somente a atividade do Histórico. |
| Excluir arquivo em Downloads | Solicita confirmação distinta. Só aceita um arquivo gerenciado associado à entrada atual do catálogo. Confere a URI, a pasta, o formato e referências concorrentes. Mantém a atividade com o arquivo sinalizado como excluído. |

As ações adicionais ficam recolhidas no cartão. Arquivo movido, removido, alterado ou sem acesso perde as ações de abertura, exportação e compartilhamento após a verificação. Entrar em Downloads ou Histórico, puxar para atualizar e executar uma ação pertinente conferem disponibilidade. Os eventos ainda mostram a criação ou download original. Nenhuma varredura é feita a partir de uma renderização.

## Persistência e recuperação

- O diário de gerações de `mediaRepository.js` mantém o formato versão 1 e serializa operações. `fileOwnership`, `availability` e `deletionPending` são campos opcionais. Downloads legados usam a pasta, o formato e o nome físico esperado para determinar propriedade. Gerações inválidas podem ser recuperadas da geração válida anterior. Versões desconhecidas ficam preservadas.
- O campo opcional `generatedUris` mantém a identidade dos resultados já registrados. Um novo callback para o mesmo arquivo, inclusive após excluir um registro, preserva a decisão anterior do usuário. Registro em Downloads e Histórico acontece na mesma transação.
- Se a gravação do catálogo falhar, o PDF continua na sua pasta persistente. Uma nova tentativa usa os mesmos dados. Após reiniciar, o serviço procura, uma vez, nomes do padrão do gerador na pasta privada `PDFs/` e valida apenas os ainda desconhecidos. Um PDF recuperado usa a data no nome original. Referências externas devem ser reenviadas pelo produtor quando ele não tiver recebido confirmação.
- A exclusão física primeiro persiste a intenção. Depois confere o resultado da exclusão e atualiza os registros existentes. Ao reiniciar ou atualizar, uma intenção pendente é conferida pela existência do caminho. O aplicativo não repete a exclusão física automaticamente. Se não for possível confirmar o estado do caminho, a ação permanece pendente.
- Downloads por link continuam usando os contratos de mídia, verificação, idempotência e retomada do GOAL 03. A política de arquivos gerados fica fora do identificador de mídia. O backend e os manifestos de dependências permanecem os mesmos.
- A validação estrutural de um novo PDF abre o documento com `pdf-lib` em memória, uma vez por registro. As conferências posteriores usam metadados de filesystem. O desempenho dos maiores documentos possíveis em aparelhos de pouca memória entra na homologação nativa.

## Arquivos da entrega

| Área | Arquivos |
| --- | --- |
| Contrato e filesystem | `src/media/libraryFiles.js`, `src/media/expoAdapters.js`, `src/media/expoRuntime.js` |
| Biblioteca e diário | `src/media/mediaLibrary.js`, `src/media/mediaRepository.js`, `src/hooks/useMediaLibrary.js` |
| Interface | `src/screens/DownloadsScreen.js`, `HistoryScreen.js`, `FileScreenParts.js`, `fileScreenStyles.js`, `fileScreenUtils.js` |
| Integração do PDF | `src/navigation/AppNavigator.js` e feedback opcional em `src/screens/PdfCompleteScreen.js` |
| Validação | `tests/file-library.test.cjs`, `tests/media-ui.test.cjs`, `tests/pdf-integration.test.cjs`, `tests/helpers/nodeFileBridge.cjs` |

As APIs nativas usadas foram conferidas para SDK 58. [Expo FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/) · [Expo Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/)

Os resultados e as capturas estão na [auditoria do GOAL 4.5](GOAL04_5_AUDITORIA.md).
