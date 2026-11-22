# Backend do EduDownloader Mobile

API local, independente do Expo, para analisar mídias autorizadas, enfileirar downloads e entregar arquivos verificados. O alvo validado é Windows x64 com Python 3.14.

## Instalação local

No PowerShell, abra a pasta `backend`.

```powershell
python -m venv .venv
$python = Join-Path $PWD '.venv/Scripts/python.exe'
& $python -m pip install -r requirements.txt
& $python -m pip check
```

Use os executáveis já instalados ou obtenha Deno 2.9.8 e FFmpeg/FFprobe 9.0.2 para Windows x64. Os binários utilizados na validação vieram dos publicadores abaixo. A distribuição Gyan é uma compilação para Windows indicada pelo projeto FFmpeg. [Deno v2.9.8](https://github.com/denoland/deno/releases/tag/v2.9.8) · [Builds FFmpeg para Windows](https://ffmpeg.org/download.html#build-windows) · [Gyan](https://www.gyan.dev/ffmpeg/builds/)

| ZIP usado | SHA-256 |
| --- | --- |
| `deno-x86_64-pc-windows-msvc.zip` | `cba84b26e0df5ae7f74fc66b86a95b866872a86292ebd84fa1e959927edd93bf` |
| `ffmpeg-release-essentials.zip`, release 9.0.2 | `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba` |

Confira cada ZIP com `Get-FileHash -Algorithm SHA256` antes de extrair. Aponte as variáveis para os arquivos do seu ambiente. Na pasta de validação, os binários estão em `.tools/deno` e `.tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin`. Alternativamente, disponibilize `deno`, `ffmpeg` e `ffprobe` no PATH. A API verifica versões no início e informa motores ausentes em `/api/v1/health`.

## Executar no Windows

```powershell
$python = Join-Path $PWD '.venv/Scripts/python.exe'
$env:EDU_DENO = (Resolve-Path '.tools/deno/deno.exe').Path
$env:EDU_FFMPEG = (Resolve-Path '.tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe').Path
$env:EDU_FFPROBE = (Resolve-Path '.tools/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffprobe.exe').Path
$developmentToken = & $python -c "import secrets; print(secrets.token_urlsafe(32))"
$env:EDU_CLIENT_TOKENS = @{ dev = $developmentToken } | ConvertTo-Json -Compress
$env:EDU_DATA_DIR = Join-Path $PWD 'runtime'
& $python -m app.main
```

O serviço inicia em `127.0.0.1:8765`. Mantenha o token no ambiente de desenvolvimento ou em um cofre. Use a mesma credencial nas requisições da sessão. Para outro terminal, copie a chave por um canal privado. O servidor e o aplicativo mantêm instalações separadas.

Para usar o aplicativo, configure a origem da API em `EXPO_PUBLIC_EDU_API_BASE_URL` e informe a credencial em **Baixar mídia por link**. O token é exclusivo da sessão e fica fora das variáveis públicas do Expo. O emulador pode usar o loopback por `adb reverse tcp:8765 tcp:8765`. Para aparelhos na rede, use um proxy HTTPS com certificado aceito pelo aparelho e encaminhe apenas `/api/v1/*` ao backend local. Veja a [configuração e os limites do cliente](../docs/GOAL03_DOWNLOADS_REAIS.md#configuração-de-sessão-e-acesso).

## Configuração

| Variável | Valor inicial | Função |
| --- | --- | --- |
| `EDU_CLIENT_TOKENS` | Obrigatória | JSON com até 32 IDs de cliente e tokens distintos de 32 a 128 caracteres URL-safe. |
| `EDU_DIRECT_HOSTS` | Vazia | Nomes DNS exatos, separados por vírgula, de origens de MP4, MP3 ou DASH autorizadas. YouTube usa uma política própria. |
| `EDU_DATA_DIR` | Temporários do sistema | Diretório pai local. O serviço controla apenas a subpasta `edudownloader-jobs-v1`. |
| `EDU_PORT` | 8765 | Porta local do comando `python -m app.main`. |
| `EDU_DENO`, `EDU_FFMPEG`, `EDU_FFPROBE` | Executável no PATH | Caminhos de ferramentas confiáveis. |
| `EDU_WORKERS`, `EDU_MAX_QUEUE` | 2, 8 | Concorrência de trabalho e vagas de espera. A análise tem limite simultâneo igual ao número de workers. |
| `EDU_MAX_ANALYSES`, `EDU_MAX_HISTORY` | 16, 128 | Limites de análises em memória e registros de tarefas. |
| `EDU_ANALYSIS_SECONDS`, `EDU_JOB_SECONDS` | 35, 600 | Prazos de análise e tarefa. A espera em fila conta para a tarefa. |
| `EDU_ANALYSIS_TTL`, `EDU_RETAIN_SECONDS` | 900, 3.600 | Validade de análise e retenção dos resultados em segundos. |
| `EDU_MAX_FILE_MIB`, `EDU_DISK_BUDGET_MIB`, `EDU_MIN_FREE_MIB` | 250, 3.072, 256 | Teto por arquivo, orçamento de temporários e margem de espaço livre. |
| `EDU_MEMORY_MIB`, `EDU_CPU_SECONDS` | 768, 240 | Memória comprometida por grupo de processos no Windows e tempo de CPU por processo. |
| `EDU_MAX_DURATION`, `EDU_MAX_RESOLUTION` | 3.600, 1.080 | Duração máxima em segundos e altura máxima do vídeo. |
| `EDU_RATE_LIMIT`, `EDU_ANALYSIS_RATE_LIMIT` | 120, 10 | Requisições e análises por cliente por minuto. |

## API e exemplos

O Swagger está em `/docs` e o esquema em `/openapi.json`. Os endpoints da versão 1 exigem `Authorization: Bearer <token>`.

| Método | Caminho | Resposta |
| --- | --- | --- |
| GET | `/api/v1/health` | Motores, versões e `ready`. |
| POST | `/api/v1/media/analyze` | `analysisId`, título, origem, duração quando conhecida, opções e expiração. |
| POST | `/api/v1/jobs` | HTTP 202, tarefa enfileirada. `Idempotency-Key` é opcional. |
| GET | `/api/v1/jobs/{id}` | Estado, progresso e detalhes do arquivo após conclusão. |
| POST | `/api/v1/jobs/{id}/cancel` | Solicitação de cancelamento. Considere interrompido quando a consulta retornar `cancelled`. |
| GET | `/api/v1/jobs/{id}/file` | Arquivo do próprio cliente com MIME, nome, `Range` e `X-Content-SHA256`. |

Exemplo de cliente PowerShell. Configure `EDU_DIRECT_HOSTS` no servidor antes de usar um arquivo de uma origem sua. Defina `$developmentToken` no contexto de teste e use um link cuja transferência você tenha autorização para fazer.

```powershell
$base = 'http://127.0.0.1:8765'
$headers = @{ Authorization = "Bearer $developmentToken" }
Invoke-RestMethod "$base/api/v1/health" -Headers $headers
$ownedUrl = 'https://midias.example.org/aula.mp4'
$analysis = Invoke-RestMethod "$base/api/v1/media/analyze" -Headers $headers `
  -Method Post -ContentType 'application/json' -Body (@{ url = $ownedUrl } | ConvertTo-Json)
$requestHeaders = $headers.Clone()
$requestHeaders['Idempotency-Key'] = [guid]::NewGuid().ToString()
$job = Invoke-RestMethod "$base/api/v1/jobs" -Headers $requestHeaders `
  -Method Post -ContentType 'application/json' -Body (@{
    analysisId = $analysis.analysisId
    optionId = $analysis.options[0].id
  } | ConvertTo-Json)
$state = Invoke-RestMethod "$base/api/v1/jobs/$($job.id)" -Headers $headers
$state.status
```

Consulte a tarefa periodicamente. Quando `status` for `completed`, faça GET em `$base$($state.file.downloadPath)` com o mesmo cabeçalho. Verifique bytes e SHA-256 antes de publicar o arquivo local. Para cancelar, faça POST em `$base/api/v1/jobs/$($job.id)/cancel`. Uma chave repetida com a mesma solicitação devolve a mesma tarefa. Outra seleção com a mesma chave retorna 409.

Os erros usam `{"error":{"code":"...","message":"..."}}`. Entre os códigos estão `INVALID_URL`, `DESTINATION_BLOCKED`, `NO_SUPPORTED_FORMAT`, `QUEUE_FULL`, `TASK_TIMEOUT`, `NO_SPACE`, `UNVERIFIED_FILE` e `ENGINE_UNAVAILABLE`. A API devolve caminho HTTP relativo e metadados, sem expor a localização no disco ou as URLs internas das streams. Campos desconhecidos chegam como `null`.

## Operação e limites

Para a homologação de MP3, correlacione os eventos pelo identificador do job. O comando `python -m app.main` registra `stream_transfer` com formato de origem, codec, canais, bytes observados, duração e taxa média, `ffmpeg_conversion` com formato, bitrate de saída e duração do processo do FFmpeg, e `job_verification` com o tempo da verificação. Em caso de erro, `job_failed` informa código, fase e orçamento. Os eventos omitem URLs, caminhos e credenciais. A limpeza que precisa ser repetida é registrada em `job_cleanup_deferred`.

O serviço aceita links públicos do YouTube dentro da política de origens e arquivos MP4/MP3 ou manifestos DASH em hosts explicitamente permitidos. No DASH, o processamento atual seleciona representações HTTP(S) com arquivo completo por stream. Resoluções e modos de saída dependem da origem e dos encoders encontrados. Playlists, transmissões ao vivo, controle de acesso e DRM ficam fora da política.

A fila e os metadados são voláteis. A instância mantém uma trava exclusiva na pasta de dados. Ao iniciar, remove espaços de trabalho antigos identificados pelo prefixo próprio. O encerramento regular cancela operações ativas. O resultado fica disponível até o fim da retenção ou um novo início do serviço. A implantação com várias instâncias exige fila e metadados persistentes, armazenamento autorizado e autenticação com credenciais temporárias por cliente. Exponha o serviço remoto atrás de HTTPS com limite de conexões, egress de rede isolado e segredos administrados.

## Testes

```powershell
& './.venv/Scripts/python.exe' -m pytest -q
```

A suíte gera áudio e vídeo autorais pequenos com FFmpeg e os serve por HTTP local. O acesso a esse servidor é injetado apenas dentro dos testes. Os resultados e a auditoria estão nos [relatórios do GOAL 02](../docs/GOAL02_MOTORES_BACKEND.md) e [GOAL 2.5](../docs/GOAL02_5_AUDITORIA.md).
