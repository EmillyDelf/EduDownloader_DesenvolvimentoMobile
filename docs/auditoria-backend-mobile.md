# Auditoria técnica do backend do EduDownloader Mobile

**22 de novembro de 2026 · Encerramento da homologação Android**

## 1. Resumo executivo

O backend local passou novamente pelos testes de autenticação, isolamento entre clientes, seleção de mídia, cancelamento, timeout, entrega parcial e integridade. A máquina de desenvolvimento reconheceu os quatro motores. A ressalva de desempenho permanece no MP3 do YouTube. A correção já aplicada reduziu de 28,9 MB para 9,8 MB a entrada de uma amostra. A transferência ainda levou 299 s e ocupou quase todo o tempo da tarefa de 308 s. O Desktop concluiu a mesma amostra em aproximadamente 14 s, em um ensaio que diferia na versão do `yt-dlp`, no formato selecionado e na forma de transferir a mídia.

A auditoria também reproduziu um problema de retomada no cliente. Quando o backend encerra uma tarefa com `INCOMPLETE_DOWNLOAD`, o cliente pode oferecer nova tentativa, mas consulta repetidamente a mesma tarefa já encerrada. A correção deste caso e a adoção de um critério de aceitação para MP3 no Android são as prioridades antes de declarar a homologação concluída.

## 2. Encerramento da sessão de testes

A checagem autenticada retornou quatro motores prontos e um único resultado em disco, já em estado `completed`. O MP4 de **80.889.084 bytes** conferiu com o SHA-256 registrado pela API. Imediatamente antes de encerrar, a checagem encontrou zero conexões de dados na porta da API, zero diretórios de análise ou download parcial e zero subprocessos de motor do serviço. A API consulta tarefas por identificador, por isso a ausência de operação pendente foi avaliada com esses sinais em conjunto, além da consulta do resultado retido.

| Recurso | Resultado |
| --- | --- |
| FastAPI/Uvicorn, porta 8765 | Encerramento normal por sinal no console dedicado. O log registrou `Application shutdown complete`. Os processos 18352 e 18492 saíram. |
| Expo/Metro, porta 8081 | Encerramento do console dedicado, incluindo 3640, 15880 e 14372. O auxiliar ocioso 9076 foi fechado depois de restar apenas seu console. |
| Relay Android e redirecionamento ADB | Relay da sessão (PID 12714) encerrado. Removido apenas o redirecionamento `localabstract:edudownloader-api` para `tcp:8765`. As consultas posteriores mostraram zero instâncias desses dois recursos. |
| Servidor ADB, PID 2124 | Permaneceu disponível, assim como as ferramentas instaladas. |
| Resultados e logs | O MP4 continuou no disco com o mesmo tamanho após o encerramento. Os quatro arquivos existentes de log do backend e do Metro ficaram no diretório restrito da sessão. O relatório registra apenas eventos, estados, contagens e medições. |

As portas 8081, 8082 e 8765 ficaram sem processos em escuta. O log da instância encerrada continha uma ocorrência de `TASK_TIMEOUT`, sem fase, contador de bytes ou orçamento daquela tarefa. Os diagnósticos anteriores complementam essa evidência. [Timeout do YouTube](diagnostico-youtube-timeout.md) · [Armazenamento e abertura no Android](diagnostico-android-2026-11-22.md)

## 3. Estrutura e responsabilidades

| Área | Arquivos e responsabilidades |
| --- | --- |
| API, contratos e configuração | [`main.py`](../backend/app/main.py) reúne ciclo de vida, autenticação, limites de requisição e rotas. [`models.py`](../backend/app/models.py) define os contratos em camelCase. [`config.py`](../backend/app/config.py) valida os limites e as credenciais. [`errors.py`](../backend/app/errors.py) define o erro público e a sinalização de cancelamento. |
| Análise, seleção e transferência | [`engine.py`](../backend/app/engine.py) detecta motores, consulta metadados, interpreta erros de origem, executa a transferência e coordena as fases. [`plans.py`](../backend/app/plans.py) transforma formatos permitidos em opções MP4 e MP3. |
| Conversão e verificação | [`processor.py`](../backend/app/processor.py) inspeciona entradas, converte com FFmpeg e valida a saída antes de publicar. |
| Rede e subprocessos | [`security.py`](../backend/app/security.py) valida origens e destinos. [`egress.py`](../backend/app/egress.py) aplica a política no proxy local. [`processes.py`](../backend/app/processes.py) e [`engine_gate.py`](../backend/app/engine_gate.py) supervisionam, limitam e encerram os processos dos motores. |
| Fila e arquivos | [`jobs.py`](../backend/app/jobs.py) controla fila, idempotência, mudanças de estado, cancelamento e retenção. [`storage.py`](../backend/app/storage.py) controla a trava, reservas, diretórios de trabalho e limpeza. |

A divisão entre seleção, execução e verificação é clara. Os pontos com maior custo de manutenção são `Engine`, que concentra descoberta de ferramentas, metadados HTTP e parsing de progresso, e `JobManager.run`, que combina agendamento, prazo e publicação ou limpeza. Vale separar responsabilidades quando houver uma alteração funcional sustentada por testes. A auditoria encontrou motivos específicos para melhorar o tratamento de falha na limpeza e a distinção entre erro remoto e local, que constam abaixo. A separação de dependências de teste e produção é uma melhoria opcional. Hoje [`requirements.txt`](../backend/requirements.txt) fixa tanto FastAPI, Pydantic e Uvicorn quanto `pytest`, `yt-dlp` e `yt-dlp-ejs`.

Ambiente verificado em Windows, Python 3.14.6, yt-dlp 2026.10.26, Deno 2.9.8 e FFmpeg/FFprobe 9.0.2. O serviço usa o resolvedor JavaScript local do yt-dlp via Deno, com componentes remotos, configurações externas, plugins e cookies desabilitados no comando. O código converte erros previstos para `{error:{code,message}}`. A tradução de alguns erros de origem lê mensagens do motor, por isso pode precisar de uma regressão ao trocar sua versão. [Argumentos e mapeamento de erros](../backend/app/engine.py#L80)

## 4. Funcionalidades verificadas

- **Formatos e qualidade.** Os planos selecionam representações HTTP(S) autorizadas, filtram DRM, playlists e transmissões ao vivo e limitam duração, resolução e tamanho conhecido. MP4 prioriza H.264/AAC e preserva o arquivo original elegível. Quando necessário, combina faixas, troca o contêiner ou recodifica. Para o MP3 do YouTube, a seleção prefere áudio mono ou estéreo quando essa informação está disponível, com fallback para a seleção anterior quando necessário. 128, 192 e 320 kbps são perfis de **saída**, sujeitos ao encoder disponível. [`streams_from` e `make_media`](../backend/app/plans.py#L81)
- **Validação de mídia.** FFmpeg e FFprobe recebem caminhos locais e uma lista de protocolos e demuxers permitidos. A verificação confere tamanho, duração, contêiner, propriedades de áudio e vídeo, e taxa do MP3 reencodado. Ela decodifica amostras do início e do final, calcula SHA-256 em blocos e só então publica a saída no servidor. Isso verifica amostras de decodificação e a integridade dos bytes. A compatibilidade com todos os decodificadores Android exige validação em aparelhos. [`MediaProcessor.verify`](../backend/app/processor.py#L103)
- **Fila e estados.** A criação devolve HTTP 202, com opção e identificador opacos. O servidor confirma o cancelamento no estado final. As tarefas passam por download, processamento quando necessário e verificação. O progresso distingue bytes por faixa e tempo de mídia convertido. Uma tarefa com falha transmite um código de domínio na resposta de consulta e libera seu espaço de trabalho quando a limpeza termina. [Transições de jobs](../backend/app/jobs.py#L18) · [Testes de cancelamento e prazo](../backend/tests/test_jobs.py)
- **Entrega e integridade.** A API exige credencial e titularidade também na rota de arquivo. O servidor entrega `206` para intervalos e inclui o SHA-256 nos cabeçalhos. O Mobile limita cada resposta a 4 MiB, confere intervalo, tamanho, MIME e hash, calcula SHA-256 local e promove o arquivo depois da verificação. O checkpoint retoma a tarefa remota ou revalida um arquivo já promovido. Se houver apenas um parcial local, a transferência recomeça do byte zero. [Rota de arquivo](../backend/app/main.py#L192) · [Transferência do cliente](../src/media/remoteTransfer.js#L37) · [Starlette FileResponse](https://starlette.dev/responses/#fileresponse)

## 5. Achados confirmados

| Prioridade | Achado e evidência |
| --- | --- |
| Alta | **Transferência de áudio pode ocupar um worker por vários minutos.** Na amostra longa corrigida, a entrada Opus estéreo de 9,8 MB levou 299,37 s, a 32,7 kB/s. Conversão e verificação completaram a tarefa em 308,02 s. Os dados demonstram lentidão na etapa de transferência. O motivo específico da diferença entre origens ou parâmetros permanece indeterminado. [Medições anteriores](diagnostico-youtube-timeout.md) |
| Média | **A retomada pode repetir uma falha terminal indefinidamente.** `createRemoteJobs` devolve a falha remota e `canResumeRemote` considera `INCOMPLETE_DOWNLOAD` recuperável. `retryItem` relança o registro pausado com o mesmo `jobId`. Um ensaio JavaScript em memória, com uma tarefa terminal simulada, retornou `INCOMPLETE_DOWNLOAD` nas duas tentativas e fez apenas `GET, GET`. A retomada de um arquivo local cujo job remoto está concluído continua sendo um caso válido, que precisa ser distinguido. [Estado terminal](../src/media/remoteJobs.js#L106) · [Registro pausado](../src/media/mediaLibrary.js#L248) · [Nova tentativa](../src/media/mediaLibrary.js#L426) |
| Baixa | **Falta uma visão operacional da fila.** `health` informa motores e prontidão. A fila, os jobs em execução e os leitores ativos só estão disponíveis internamente. O registro mais novo informa fase, bytes, tempo e orçamento de tarefas, mas a checagem de inatividade ainda requer conciliar processos, rede, armazenamento e consultas individuais. [Rota de saúde](../backend/app/main.py#L160) · [Registros de transferência](../backend/app/engine.py#L249) · [Registros de falha](../backend/app/jobs.py#L200) |

Nenhum defeito crítico foi demonstrado neste escopo. Os limites de cópia e retomada descritos na seção anterior são comportamentos de projeto. A expiração e a perda de estado de fila ao reiniciar também estão documentadas.

## 6. Desempenho, limites e comparação com o Desktop

- **Transferência.** O Mobile separa análise e download: usa o downloader nativo, timeout *de socket* de 8 s, uma nova tentativa de download e zero novas tentativas do extrator. Tem proxy obrigatório por operação e recria um registro mínimo da faixa. O Desktop testado usou yt-dlp 2026.08.19 com `bestaudio/best`, conversão no próprio fluxo do motor e os padrões da ferramenta para socket e retries. A bancada usou o mesmo proxy nos dois ensaios. O Desktop selecionou Opus estéreo `251` e concluiu o fluxo em 13,95 s. O Mobile corrigido selecionou `251-drc`, também Opus estéreo. Diferenças de versão, faixa e metadados impedem atribuir causalidade a uma variável isolada. [Medições e parâmetros](diagnostico-youtube-timeout.md#comparação-da-transferência) · [Opções do yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Controle de rede.** No trailer, um GET HTTPS comum pelo mesmo proxy recebeu o áudio a 32,6 kB/s. O MP4 de controle atravessou esse proxy muito mais rápido. Os ensaios instrumentados da faixa `258` usaram uma sessão de cada vez, abaixo do teto de oito. Em uma comparação com a mesma faixa, o comportamento de requisições parciais padrão do extrator acelerou o trailer e recebeu HTTP 403 no filme. Esses ensaios mostram variação na resposta às requisições, com a transferência lenta reproduzida também fora do `yt-dlp`. A auditoria não repetiu downloads externos longos. [Evidência anterior](diagnostico-youtube-timeout.md#medições-no-windows)
- **Prazos.** O padrão é 600 s desde o enfileiramento até a verificação. A análise tem orçamento próprio de 35 s. O servidor aceita configuração de 1 a 1.800 s e conserva limites internos por processo. Uma transferência contínua e lenta pode superar o prazo total mesmo sem exceder o timeout de socket. A amostra longa coube com cerca de 292 s de margem antes mesmo de qualquer ajuste. Elevar o prazo por padrão ampliaria o tempo de retenção de workers e de arquivos parciais. [Configuração](../backend/app/config.py#L26) · [Prazo do worker](../backend/app/jobs.py#L221)
- **CPU, memória e disco.** Por padrão, são dois workers e até duas análises concorrentes. O Job Object do Windows limita a memória dos processos de cada invocação a 768 MiB, CPU de usuário por processo a 240 s e a árvore a oito processos. Os quatro grupos podem coexistir, com teto teórico combinado de 3 GiB para os grupos, além da API. Disco tem limite de 250 MiB por arquivo, orçamento de 3 GiB, margem de 256 MiB e reserva de duas vezes o limite do arquivo mais 4 MiB por tarefa. O proxy também conta os bytes recebidos. A comparação anterior mediu tempo, progresso e vazão. Picos de CPU, memória e I/O sob concorrência continuam sem medição. [Supervisão](../backend/app/processes.py#L31) · [Reserva e verificação de disco](../backend/app/storage.py#L69) · [Limites de Job Objects no Windows](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_limit_information)

## 7. Segurança e riscos para validar

**Controles verificados.** A API local escuta em loopback, limita a concorrência HTTP e restringe POST a 12 KiB. Valida o Bearer com comparação de tempo constante, aplica limite por credencial e verifica titularidade da análise, do job e do arquivo. O proxy usa credencial efêmera por processo e destino autorizado. Valida a resposta DNS inteira, rejeita redes não públicas e conecta por IP numérico aprovado. A política cobre destinos de redirecionamentos encaminhados pelo proxy. A suíte inclui redirecionamento recusado, autenticação, isolamento entre clientes e logs sem credenciais. Dentro do Android, o token é de sessão em memória no cliente. A API usa saída sem log de acesso, captura limitada de mensagens dos motores e códigos públicos sanitizados. [Autenticação e limites](../backend/app/main.py#L97) · [Política de origem](../backend/app/security.py#L63) · [Testes de segurança](../backend/tests/test_security.py)

| Risco ou limitação | Evidência e próxima verificação |
| --- | --- |
| Worker pode escapar do tratamento de falha durante a limpeza | `Storage.assert_workspace` usa `RuntimeError` ao rejeitar um diretório fora das garantias esperadas. O cleanup em `JobManager.run` trata apenas `OSError` antes da transição final. Isso deixa uma possibilidade de o worker sair sem concluir o estado. A condição foi identificada por leitura de código e não foi observada na homologação. Testar falha injetada de armazenamento, recuperação do worker e invariantes de caminho antes de corrigir. [Cleanup de jobs](../backend/app/jobs.py#L245) · [Validação do workspace](../backend/app/storage.py#L59) |
| Disco pode atrasar o loop assíncrono sob carga | O supervisor consulta o disco e percorre o workspace aproximadamente a cada 50 ms durante a execução. A verificação também lê e calcula hash em blocos síncronos, cedendo o loop entre blocos. Medir latência de consulta e I/O com múltiplas tarefas e disco lento antes de mover ou reduzir o trabalho. [Supervisor](../backend/app/processes.py#L141) · [SHA-256 em blocos](../backend/app/processor.py#L142) |
| Reinício, expiração e retomada tardia | A fila e a idempotência ficam em memória. A coleta respeita leitores ativos, mas um novo pedido Range pode encontrar o resultado expirado. Uma reinicialização limpa os diretórios reconhecidos depois de obter a trava. Validar a experiência do cliente perto da expiração e após perda da instância. [Retenção](../backend/app/jobs.py#L111) · [Inicialização do armazenamento](../backend/app/storage.py#L24) |
| Implantação compartilhada exige controles adicionais | As chaves atuais ficam na configuração da instância e a política de saída opera por proxy e parâmetros dos motores. Antes de expor um serviço compartilhado, definir credenciais rotacionáveis com prazo de validade, TLS, isolamento de rede do processo, limites e monitoramento no ambiente de implantação. Os testes atuais validam a aplicação local. [Operação e limites](../backend/README.md#operação-e-limites) |

## 8. Integração com Android

A falha anterior de abrir MP4 e os sintomas do Histórico foram atribuídos ao tratamento da URI do Expo Go e à ordem de publicação no diário local. O MP4 correspondente retido no servidor foi identificado como H.264/AAC e decodificado até o fim no diagnóstico anterior. O usuário confirmou reprodução com áudio e vídeo após a correção do cliente, além de a opção de MP3 voltar a ficar disponível. A auditoria atual reconfirmou a integridade da cópia no servidor. O caso separado de retomada de tarefa remota terminal, demonstrado acima, exige um teste próprio. [Diagnóstico do Android](diagnostico-android-2026-11-22.md) · [Abertura nativa](../src/media/libraryFiles.js#L171)

Pendências no dispositivo com a versão corrigida do backend:

1. Concluir o MP3 de 192 kbps do cenário original, conferir as fases, abrir o arquivo, recarregar o Expo Go e confirmar abertura e presença única no Histórico.
2. Retomar após perda de rede e alternância para segundo plano. Conferir separadamente o caso de resultado remoto válido, falha terminal remota e resultado expirado.
3. Conferir cancelamento em download no servidor, conversão e transferência para o dispositivo, além do comportamento de MP4 em outro visualizador ou versão Android.

## 9. Verificações desta auditoria

| Verificação | Resultado |
| --- | --- |
| Python | **57 aprovados**, igual à referência. Inclui seleção de áudio e fallback, cancelamento nos motores reais, timeout anterior ao FFmpeg, autenticação e autorização entre clientes, Range, SHA-256 e integração HTTP com o cliente JavaScript. Um aviso preexistente do `TestClient` sobre uso de `httpx`. |
| JavaScript | **157 aprovados**, igual à referência. Inclui contrato e sessão, cancelamento, perda de conexão, verificação local, diário e regressões do Android. |
| Ensaio adicional | Simulação em memória confirmou duas consultas à mesma tarefa terminal com `INCOMPLETE_DOWNLOAD`. |
| Expo Doctor e Metro | **20/20** e exportação Android com **1.201 módulos**, iguais à referência. Bundle em diretório temporário, fora do projeto. |
| Dependências, lint e tipos | `pip check` passou. O Expo CLI solicitou instalar e configurar ESLint. A instalação foi recusada para preservar a configuração. TypeScript ficou indisponível com os pacotes locais. |

Lacunas a cobrir incluem a retomada após falha terminal, erro de limpeza que escapa do worker, transferência concorrente durante expiração, variação de formatos em origens reais e coleta de CPU, memória e latência sob carga. Os testes de armazenamento com adaptador simulado complementam os testes em aparelho.

## 10. Plano recomendado e parecer de publicação

| Ordem | Correção proposta | Impacto esperado |
| --- | --- | --- |
| 1 | Distinguir falha terminal do servidor de interrupção local. Oferecer nova análise ou nova tarefa somente quando a anterior terminou, preservando idempotência e retomada de resultado válido. Adicionar regressão à integração. | Médio no cliente. Evita a repetição de uma tentativa sem progresso. |
| 2 | Validar MP3 no Android com a versão corrigida e registrar fases, bytes, tempo até os primeiros bytes e tempo total por faixa. Controlar versão do motor, faixa e proxy em comparações futuras. Manter o orçamento de 600 s até ter uma distribuição de tempos que justifique ajuste. | Baixo no código de instrumentação. Dá evidência para decidir sobre limites sem ampliar indiscriminadamente a ocupação. |
| 3 | Testar falhas de filesystem durante limpeza e validar a continuidade do worker. Medir I/O e latência sob carga antes de alterar a frequência ou execução da guarda de disco. | Médio no backend. Melhora previsibilidade de falhas e preserva os limites atuais. |
| 4 | Se houver implantação compartilhada, completar a operação com expiração e rotação da credencial, isolamento de saída e política clara de retenção e reinício. | Médio a alto na implantação. Prioridade para exposição do serviço. |

**Parecer:** a cópia local apresenta evidência suficiente para revisão de código pela equipe, após conferir a lista de arquivos a publicar. Eu adiaria o envio como entrega final homologada até resolver a retomada terminal e confirmar o MP3 no aparelho. Nesta inspeção, `backend/` ainda aparecia como não rastreado. Os filtros locais excluem `.venv`, `.tools`, `runtime` e configurações privadas do backend. Convém revisar o conjunto completo de mudanças locais e incluir apenas código, dependências declaradas, testes e documentação pertinentes. O relatório foi a única adição ao projeto.
