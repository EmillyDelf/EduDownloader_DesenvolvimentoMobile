# GOAL 02 — Motores de mídia e API

Implementado na árvore de trabalho existente em `C:\Users\Usuario\Desktop\EduDownloader_DesenvolvimentoMobile`. A integração com React Native permanece para o GOAL 03. A aplicação móvel continua com o identificador e o download direto já existentes.

## Arquitetura

| Área | Implementação |
| --- | --- |
| API | FastAPI com respostas tipadas, OpenAPI, token individual por cliente e rotas sob `/api/v1`. |
| Identificação | HEAD para MP4 e MP3 em hosts autorizados. yt-dlp para YouTube público e descoberta de streams em manifestos DASH permitidos. Deno executa o resolvedor JavaScript do pacote EJS local quando requerido. |
| Seleção | Planos guardados no servidor com IDs de opção e expiração. MP4 usa a altura reportada. MP3 tem modos de 128, 192 e 320 kbps quando há áudio confirmado e encoder para produzi-los. |
| Transferência | yt-dlp baixa cada stream selecionada via proxy local restrito. Playlists, continuidade de sessão e perfis de cookies ficam fora do fluxo. |
| Processamento | FFmpeg copia os codecs compatíveis ao combinar streams, remuxa quando necessário e recodifica áudio/vídeo somente quando o plano ou o codec exige. MP3 usa `libmp3lame`. |
| Verificação | FFprobe valida container, duração, streams, codecs e resolução. A saída passa por tamanho, assinatura, conferência da seleção, decodificação de amostras e SHA-256 antes de ficar disponível. |
| Tarefas | Fila e transições explícitas, idempotência por cliente, cancelamento, limite de concorrência, expiração e diretórios próprios. |
| Isolamento | Proxy HTTP(S) autorizado por operação, restrição de IP após resolução DNS, argumentos sem shell, limites nativos de processos e limpeza após falha. |

O trabalho estudou a organização do Desktop e adotou conceitos de lista de argumentos, progresso estruturado e encerramento de árvores no Windows. A API, a fila, o armazenamento e as regras de saída são implementações próprias. [Arquitetura Desktop](https://github.com/John-Harrison291/EduDownloader/blob/main/ARQUITETURA.md) · [Decisões Desktop](https://github.com/John-Harrison291/EduDownloader/blob/main/DECISOES_TECNICAS.md)

## Versões verificadas

| Componente | Versão |
| --- | --- |
| Python | 3.14.6 |
| FastAPI / Uvicorn | 0.165.0 / 0.54.0 |
| yt-dlp / EJS | 2026.10.26 / 0.8.0 |
| Deno | 2.9.8 |
| FFmpeg / FFprobe | 9.0.2 Essentials, compilação Gyan para Windows x64 |
| pytest | 9.2.0 |

O ambiente virtual e os motores instalados ficam em caminhos locais ignorados pelo Git. A instalação reproduzível, os hashes de origem, as variáveis e os exemplos da API estão no [README do backend](../backend/README.md). [yt-dlp e EJS](https://github.com/yt-dlp/yt-dlp/wiki/EJS) · [FFprobe](https://ffmpeg.org/ffprobe.html)

## Tarefas, temporários e limites

`queued → analyzing → downloading → processing → verifying → completed` é o percurso integral. A etapa de processamento é pulada quando o arquivo original já atende. `analyzing` na tarefa confirma o plano e reserva o espaço. Falhas e cancelamento encerram o percurso com limpeza. Um resultado concluído mantém seu estado em cancelamentos repetidos.

A transferência publica bytes, total, velocidade e ETA quando o motor os observa. O total estimado usa campo próprio. Para duas streams, os bytes e o percentual são por faixa, com índices em `track` e `trackCount`. O processamento publica segundos calculados pelo FFmpeg. A fase `verifying` dura até a validação e publicação. A API reserva o estado final para um arquivo verificado. A transferência do servidor ao dispositivo começa depois e terá sua própria medição no GOAL 03.

A pasta de dados usa uma trava de processo e subpastas por UUID. A reserva de disco protege entradas, saídas e temporários. A API limita fila, retenção, requisições e tamanho, e o supervisor controla tempo de CPU e memória dos motores. Tarefas e análises ficam em memória. Encerrar e reiniciar interrompe a fila e a nova instância elimina temporários antigos; a recuperação persistente fica para uma implantação futura.

## Contrato para o GOAL 03

1. Use uma base configurável para a API. O empacotamento móvel pode expor a base HTTP como configuração pública, com credenciais obtidas em sessão e guardadas separadamente. Em dispositivo, use um endereço alcançável, atendido por HTTPS com autenticação.
2. Mantenha a estratégia direta atual. Para a estratégia remota, valide `analysisId`, `optionId`, MIME, expiração e as opções retornadas em um contrato próprio. `normalizeMediaMetadata` hoje exige `url` em cada opção direta, e o catálogo remoto contém IDs opacos. Preserve essa diferença na adaptação dos serviços.
3. Enfileire usando uma chave de idempotência por intenção, consulte por ID e mantenha fases distintas para execução no servidor e transferência ao celular. Atribua mensagens aos códigos estáveis da API. Confirme cancelamento com o estado terminal.
4. Depois de `completed`, baixe somente a partir de `downloadPath` resolvido na base configurada. Envie o token no cabeçalho, siga a política de origem, confira MIME, bytes e SHA-256, e publique o arquivo local após a confirmação. Use o registro verificado na biblioteca e no Histórico.

A [auditoria GOAL 2.5](GOAL02_5_AUDITORIA.md) registra os resultados efetivamente observados e as limitações.
