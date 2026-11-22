# Download lento de MP3 do YouTube

## O que foi possível confirmar

O registro anterior do backend contém `TASK_TIMEOUT`, sem fase, tempo ou bytes transferidos. O relato situa a falha em **Baixando no servidor**. Nesse estado, o Mobile ainda está no `yt-dlp`. A inspeção da entrada e o FFmpeg começam depois que todos os arquivos de entrada foram recebidos e tiveram seu tamanho validado. A reprodução com áudio lento atingiu o mesmo código de erro e confirmou, pelo registro dos processos iniciados, que nem FFprobe nem FFmpeg haviam iniciado. O link e o identificador da tarefa de homologação não estavam disponíveis.

O MP3 de 192 kbps é a **saída** do FFmpeg (`libmp3lame -b:a 192k`). Antes da correção, o Mobile escolhia a maior taxa de bits de entrada entre as faixas exclusivamente de áudio, independentemente da quantidade de canais. Nas duas amostras, isso selecionou a faixa AAC `258` de seis canais, com cerca de 388 kbps. O MP3 carrega até dois canais. A etapa de conversão reduzia os canais depois de o servidor já ter baixado todos os dados adicionais.

O Mobile agora prefere uma faixa mono ou estéreo entre as faixas elegíveis do YouTube. Dentro desse conjunto, continua escolhendo pela taxa de bits informada. Se os metadados não confirmarem nenhuma faixa de até dois canais, mantém a seleção anterior. Os perfis de saída, os planos MP4 e a seleção para origens diretas continuam com os mesmos critérios.

## Comparação da transferência

| Parâmetro | Mobile | Desktop local |
| --- | --- | --- |
| Motor testado | yt-dlp 2026.10.26, pacote Python | yt-dlp 2026.08.19, executável |
| Seleção para MP3 | Análise separada e plano validado pelo backend | `bestaudio/best`, com `--extract-audio --audio-format mp3 --audio-quality 192K` |
| Transferência | `--downloader native --socket-timeout 8 --retries 1 --extractor-retries 0`. Sem limite explícito de taxa | Sem argumentos explícitos de timeout de socket, retries, taxa, paralelismo de fragmentos ou tamanho de bloco no comando Desktop |
| Conexão | Proxy restrito à origem e aos destinos permitidos. Até oito sessões simultâneas por operação, com limite de bytes | Comando local sem proxy do Mobile. A comparação de bancada usou o mesmo proxy restrito para os dois motores |
| Prazo de trabalho | `EDU_JOB_SECONDS`, padrão 600 s, configurável de 1 a 1.800 s. Conta desde a criação, incluindo espera em fila, download, processamento e verificação | Sem prazo total equivalente no comando de download local |

O timeout de socket de 8 s cobre uma operação de rede sem resposta. A chegada contínua de poucos bytes pode manter a transferência ativa até o prazo total. A análise tem orçamento separado de 35 s por padrão. No aplicativo, o timeout de 30 s é por requisição de consulta ao servidor. A auditoria anterior de MP4 usou um prazo explícito de 180 s. O registro histórico do erro de MP3 não guardou o valor efetivo, e a instância de regressão confirmou o orçamento padrão de 600 s e o vencimento com 2 s quando configurado. O teto de CPU também é separado do tempo de rede. [Comandos e opções do yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Medições no Windows

Usei o trailer de 33 s e o filme de 597 s de *Big Buck Bunny*, da Blender Foundation. As médias incluem a inicialização do subprocesso de transferência e usam kB de 1.000 bytes. O Desktop informa o tempo total de análise, download e conversão. As medições foram feitas com conteúdo público autorizado e a mesma política de saída da API. [Licença da Blender Foundation](https://peach.blender.org/about/)

| Cenário | Stream e bytes | Tempo e resultado |
| --- | --- | --- |
| Trailer, Mobile anterior | `258`, AAC, 6 canais, 1.603.919 bytes | 18,38 s de transferência, 87,3 kB/s |
| Trailer, Mobile corrigido | `140`, AAC, 2 canais, 535.702 bytes | 17,35 s de transferência, 30,9 kB/s. API concluiu em cerca de 19,35 s a partir da criação e entregou MP3 de 192 kbps com SHA-256 conferido |
| Trailer, Desktop | `140`, AAC, 2 canais, 535.702 bytes | 3,99 s no comando completo, MP3 gerado |
| Filme, Mobile anterior | `258`, AAC, 6 canais. 3.269.886 de 28.921.366 bytes reportados | 35,02 s, cerca de 93 kB/s. A amostra terminou no limite do ensaio, antes da conversão |
| Filme, Mobile corrigido | `251-drc`, Opus, 2 canais, 9.802.222 bytes | 299,37 s de transferência, 32,7 kB/s. API concluiu em 308,02 s a partir da criação e entregou MP3 de 192 kbps com SHA-256 conferido |
| Filme, Desktop | `251`, Opus, 2 canais, 9.730.538 bytes | 13,95 s no comando completo, MP3 gerado |
| Trailer, controle MP4 360p no Mobile | `18`, vídeo e áudio juntos, 2.306.174 bytes | 2,32 s, cerca de 994 kB/s pelo mesmo proxy |

A correção reduziu o volume de entrada do MP3 em cerca de 66% nas duas amostras. No ensaio completo do filme, a conversão já registrava progresso do FFmpeg aos 300 s. A verificação apareceu aos 307 s. Os ensaios instrumentados da faixa `258` abriram uma única conexão de cada vez e ficaram abaixo do teto de oito sessões do proxy. Em um controle com GET HTTPS comum pelo mesmo proxy, o áudio `140` recebeu HTTP 200, começou a chegar em 0,38 s e levou 16,46 s (32,6 kB/s). Isso reproduziu a transferência lenta com outro cliente HTTP, sem FFmpeg. O MP4 `18` levou 0,17 s nesse controle. A diferença indica que o proxy consegue transportar dados mais rápido e que a resposta varia por faixa. Os ensaios não identificam qual política ou condição da CDN produz essa variação.

O Mobile transmite um registro mínimo de stream ao yt-dlp e descarta opções internas do extrator. Em um ensaio controlado com a mesma faixa `258`, usar o comportamento padrão de requisições parciais do extrator concluiu o trailer em 0,98 s, mas recebeu HTTP 403 para o filme. A mudança de seleção preserva a forma de transferência existente e trata o excesso comprovado de dados de entrada. Esses resultados não permitem atribuir a lentidão a um limite específico da origem nem garantir a mesma velocidade do Desktop.

## Prazo, segurança e regressão

O prazo padrão de 600 s e o máximo de 1.800 s foram mantidos. Como referência, a 31 kB/s, uma faixa de 9,8 MB leva cerca de 316 s para transferir. A 12,5 kB/s, taxa observada para uma faixa de vídeo em um ensaio anterior, o mesmo volume levaria cerca de 784 s antes de converter. Aumentar o prazo alongaria a ocupação de workers sem melhorar a transferência. [Auditoria anterior](GOAL02_5_AUDITORIA.md)

O log `stream_transfer` registra formato, contagem de bytes, duração e taxa média por faixa. O log `job_failed` registra código, fase e orçamento em segundos. Os registros usam o identificador da tarefa para correlação e omitem títulos, URLs, cabeçalhos, caminhos e credenciais. A seleção das faixas continua sujeita à validação de origem, e a transferência continua usando o mesmo proxy e os mesmos limites de recursos.

As regressões cobrem a preferência por áudio sem redução de canais, o fallback quando faltam metadados, a exclusão de um destino fora da política e um download interrompido pelo prazo antes do FFmpeg, com limpeza de temporários. As suítes passaram com 57 testes Python e 157 JavaScript. O Expo Doctor passou em 20/20 verificações e o bundle Android foi exportado. O lint requer configuração e dependências ausentes no projeto. A checagem TypeScript não teve um compilador local disponível. A validação externa usou uma instância temporária autenticada. O serviço do celular continuou em execução no processo anterior para evitar interromper as tarefas da sessão.
