# GOAL 4.5 — Auditoria da biblioteca e do Histórico

Validação em 20 de novembro de 2026, no Windows x64, na pasta principal do EduDownloader Mobile. O trabalho usou a árvore local existente, com base em `f65cf5ed6379a9da3f340105d6614bbbabb6c2b0`.

## PDF real e operações de disco

O cenário principal chamou o gerador da Emilly com duas páginas e o JPEG de teste existente `tests/fixtures/pdf-page.jpg`. O adaptador devolveu o JPEG conhecido no lugar da manipulação de imagens nativa, e implementou os contratos de filesystem sobre disco real. O gerador e a leitura do PDF usaram `pdf-lib`. O arquivo foi recuperado do diretório persistente, analisado novamente, encontrado pelo filtro PDF, aberto pelo contrato do visualizador e compartilhado pelo contrato nativo simulado. A exportação produziu uma cópia idêntica em bytes. Uma segunda tentativa de exportação para o mesmo destino preservou a primeira cópia.

| Evidência | Resultado |
| --- | --- |
| JPEG de entrada | SHA-256 `bc4bd733d7c6fc317ee06125e5c3af3d62815a8ddc250588bcf3719012e083c3` |
| PDF original do gerador | 2.633 bytes, MIME `application/pdf`, duas páginas Legal em paisagem, 1.008 × 612 pt. |
| SHA-256 do PDF na execução documentada | `69cabd897bd7f7bcc0f29ecf49a7208c2e10e21555b7bf0ceb904b6fe8694208`. As datas do documento podem mudar o hash em outra geração. |
| URI e identidade | Uma única saída do gerador, registrada em `PDFs/Relatorio_de_aula_<timestamp>.pdf`, com a mesma URI em Downloads e Histórico. |
| PDF maior | 26.215.274 bytes, gerado para teste estrutural com uma página e referência cruzada válida. O catálogo confirmou a página após ler o PDF. |

O reinício da biblioteca preservou o documento e o evento. A remoção do evento no Histórico persistiu após reiniciar e deixou intactos os bytes originais. O callback repetido para essa URI não recriou o evento. Os arquivos do teste ficaram em diretórios temporários.

## Auditoria de falhas e regressões

- **Registro falhou após geração.** O teste interrompeu a escrita antes da renomeação do diário. O arquivo permaneceu válido. A nova tentativa e o reinício recuperaram o registro sem repetir a geração. A integração do navegador exibe a opção de registrar novamente e mantém as ações de PDF existentes.
- **Geração de diário incompleta.** O carregamento recuperou uma geração anterior válida quando a mais recente trazia dados inválidos. As verificações anteriores de versão futura, corrupção e escrita concorrente foram preservadas. Registro de PDF, remoção de Histórico e atualização foram executados simultaneamente sem duplicação.
- **Exclusão física.** O diálogo foi exercitado com confirmação e cancelamento. Foram verificados caminho adulterado, método chamado com registro inexistente, outra referência à URI, falha de permissão, toques repetidos e encerramento após remover o arquivo. A recuperação reconcilia o estado sem repetir a exclusão. A entrada do Histórico permanece com indicação de indisponibilidade.
- **Arquivo externo e legado.** Registros MP4 e MP3 sem os campos novos continuaram legíveis. O arquivo externo pôde ser compartilhado, com exclusão física recusada. Ao mover um arquivo de lugar, a abertura foi recusada e ambas as listas passaram a indicar ausência. Ao devolver o arquivo, atualizar restaurou o acesso.
- **Downloads diretos e remotos.** A suíte JavaScript preservou os casos HTTP diretos e o protocolo de jobs. A suíte Python executou novamente a integração com o cliente JavaScript real, incluindo MP4, MP3, DASH, SHA-256 em disco, idempotência, cancelamento, abertura pelo contrato e persistência no Histórico.
- **Emilly e Paulo.** Seleção, reordenação, configurações, geração, conclusão e os comandos originais de PDF continuam cobertos. A navegação e a escolha de formato da galeria passaram na regressão. O motor de conversão da galeria continua pendente.
- **Fidelidade visual.** A primeira versão do controle de ações aumentava demais a altura dos cartões. O controle foi movido para junto de Abrir no cartão existente e mantém os detalhes recolhidos. [Downloads no Figma](https://www.figma.com/design/IS2PX0pWbk5YJnMJZITZFm?node-id=7-468) · [Histórico no Figma](https://www.figma.com/design/IS2PX0pWbk5YJnMJZITZFm?node-id=7-598)

## Resultados dos comandos

| Verificação | Resultado |
| --- | --- |
| `npm ci` | 485 pacotes instalados conforme o lockfile. Três alertas moderados preexistentes no npm. |
| Linha de base | 143 testes JavaScript e 54 Python aprovados antes das alterações. |
| `node --test tests/*.test.cjs` | 152 testes aprovados, zero falhas e zero ignorados. |
| `python -m pytest -q`, usando `backend/.venv` | 54 testes aprovados. Um aviso preexistente de depreciação no TestClient do Starlette. |
| `npx expo-doctor` | 20/20 verificações aprovadas. |
| `npx expo export --platform android --output-dir ../EduDownloader-Goal04-Android-Validacao --max-workers 2` | 1.201 módulos, 151 assets referenciados, zero assets ausentes. Foram conferidas as rotinas de registro, exclusão, exportação e verificação de downloads no bundle Hermes. |
| `npx expo lint` | ESLint sem configuração no projeto. O assistente de configuração foi dispensado. |
| `npx --offline --no-install tsc --noEmit` | O projeto JavaScript está sem TypeScript e sem `tsconfig.json`. A suíte JavaScript e o Metro verificaram sintaxe e imports, e a checagem estática de tipos ficou indisponível. |

Bundle validado `index-de2ee571ca87abb64cd7c043f74a9ef5.hbc`, 3.182.491 bytes, SHA-256 `dc53946ca7c66097bfb5d573555217e2cfb29878dc1fa4d1423a6b483a5a5725`.

## Inspeção visual no Edge

O Playwright importou as duas telas vigentes pelo Metro da prévia isolada reaproveitando dependências Web do GOAL 01. A execução usou fixtures de exibição em janelas de 320, 440 e 900 px. Os dez cenários passaram sem transbordamento horizontal nem erro de fonte, imagem ou JavaScript. A inspeção Web exercitou a tela e seus callbacks de teste. O armazenamento, o visualizador, o seletor e o compartilhamento nativos foram exercitados separadamente pelo adaptador.

- [Biblioteca com três formatos](evidencias/goal04/biblioteca.png) · [Filtro PDF e arquivo movido](evidencias/goal04/filtro-pdf-ausente.png) · [Ações no cartão](evidencias/goal04/acoes.png)
- [Confirmação da exclusão física](evidencias/goal04/confirmar-exclusao-fisica.png) · [Arquivo excluído](evidencias/goal04/arquivo-excluido.png) · [Histórico de PDF](evidencias/goal04/historico-pdf.png) · [Confirmação da remoção de atividade](evidencias/goal04/confirmar-remocao-historico.png)
- [Lista vazia](evidencias/goal04/lista-vazia.png) · [Nome longo em tela compacta](evidencias/goal04/nome-longo-compacta.png) · [Histórico em tela larga](evidencias/goal04/historico-larga.png)

## Pendências para GOAL 05 e 5.5

O app exportou para Android. O PC não tinha emulador Android ou ADB disponíveis, e a homologação física está reservada ao GOAL 5.5. No aparelho, falta conferir a visualização por MIME, o seletor SAF, exportação com colisão, o nome de saída no Android, permissões, compartilhamento, Voltar nos diálogos, acesso ao PDF após reiniciar e uso de memória com PDFs grandes. Os casos iOS também dependem de aparelho ou simulador compatível. A integração futura da conversão do Paulo pode ligar seu produtor real ao contrato documentado para arquivos concluídos. A consolidação seguinte pode usar o diário e a biblioteca como base para a revisão final do aplicativo.
