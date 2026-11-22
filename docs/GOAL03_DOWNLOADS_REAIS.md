# GOAL 03 — Downloads por link com processamento real

O fluxo existente **Baixar mídia por link** usa o downloader direto ou o backend do GOAL 02 conforme a origem. Ambos publicam na mesma biblioteca de **Downloads** e no **Histórico**. As rotas existentes, PDF e a seleção de formatos de vídeo da galeria foram preservados.

## Seleção da estratégia

- Links dos hosts oficiais do YouTube seguem para o backend configurado. Se o serviço estiver desconfigurado ou a sessão não estiver autenticada, a tela informa a causa antes de enviar uma requisição.
- Outros hosts passam primeiro pelo identificador direto. A API recebe o link somente quando o host exato consta em `EXPO_PUBLIC_EDU_BACKEND_SOURCE_HOSTS` e a origem não confirma o tipo de mídia ou não permite `HEAD`.
- Erro de conexão, resposta HTTP de acesso negado e host desconhecido não disparam fallback. O backend ainda aplica sua política independente de origens e SSRF.
- Opções diretas mantêm a URL confirmada. Opções remotas carregam `analysisId`, validade, `optionId`, formato, MIME, operação, qualidade e tamanho, quando conhecidos. Uma estimativa aparece como estimativa. MP4 e MP3 só aparecem se confirmados. A taxa de MP3 é o perfil de saída.

## Cliente e ciclo de vida

| Operação | Contrato |
| --- | --- |
| Disponibilidade | `GET /api/v1/health` com Bearer. Útil para diagnóstico. |
| Colar e analisar | `POST /api/v1/media/analyze` recebe a URL da mídia e devolve análise e opções com validade. A análise pode ser interrompida ao sair da tela ou editar o endereço. |
| Iniciar | `POST /api/v1/jobs` recebe a análise e a opção. A intenção de download é gravada com uma `Idempotency-Key` antes do envio. |
| Acompanhar | `GET /api/v1/jobs/{id}` consulta um trabalho por vez a cada 1,5 segundo no primeiro plano. A consulta tem tempo limite e até três novas tentativas após falhas transitórias, respeitando `Retry-After` até 60 s. |
| Cancelar | `POST /api/v1/jobs/{id}/cancel` solicita interrupção. O app aguarda o estado terminal `cancelled`. Na transferência local, a resposta é abortada e o parcial removido. A verificação final desabilita cancelamento. |
| Transferir | `GET /api/v1/jobs/{id}/file` com Bearer, sem redirecionamento. Arquivos maiores que 4 MiB são solicitados em intervalos HTTP de até 4 MiB. Cada intervalo precisa ter `206` e `Content-Range` exatamente correspondente. Arquivos menores usam `200` e uma resposta integral. |

O fluxo indica fila, análise, download da origem, processamento e verificação do servidor. O progresso de cada etapa usa os dados retornados pela API, com faixa atual quando aplicável. A etapa local indica bytes transferidos e a verificação local tem indicador indeterminado. A conclusão exige MIME, status HTTP, tamanho, assinatura de formato e SHA-256. O hash é calculado sobre o arquivo gravado em leituras de 64 KiB. A saída verificada é movida sem sobrescrita para `edudownloader/downloads/`. A transação no catálogo atual atualiza Downloads e Histórico. A abertura chama o visualizador Android ou o compartilhamento iOS existente.

Falhas transitórias preservam o checkpoint **Pausado** em Downloads. **Retomar acompanhamento** consulta a mesma tarefa se seu identificador foi salvo. Se apenas a resposta de criação se perdeu, a retomada reenvia a mesma chave e opção enquanto a análise estiver válida. O servidor mantém idempotência durante a retenção da tarefa. Um ID expirado, removido ou desconhecido após reinício encerra a tentativa e requer nova análise explícita. A biblioteca grava falha ou cancelamento terminal uma vez. Os códigos da API são convertidos em mensagens para mídia incompatível, sessão recusada, fila, limite, motor, espaço, timeout e resultado indisponível. Erros locais de conteúdo, tamanho, hash, gravação e abertura têm mensagens próprias.

Trocar de tela preserva a operação na biblioteca. Colocar o app em segundo plano suspende novas consultas de estado e novas fases de transferência até voltar. O sistema pode suspender uma transferência em curso. Se o app for encerrado, o trabalho no servidor pode continuar e a transferência local pode precisar recomeçar do primeiro byte. Na próxima abertura o app limpa o parcial e oferece a retomada usando a credencial novamente informada. Se a promoção do arquivo já aconteceu, a retomada confere os bytes locais contra o resultado da tarefa autenticada antes de registrar. O backend usa fila volátil e retenção finita. A abertura não é tratada como garantia de que o arquivo ainda esteja presente.

## Configuração de sessão e acesso

1. Prepare os motores e as variáveis de servidor conforme o [README do backend](../backend/README.md). A API local ouve em `127.0.0.1:8765`. Mantenha `EDU_CLIENT_TOKENS` apenas no ambiente do backend ou em um cofre de segredos.
2. Defina `EXPO_PUBLIC_EDU_API_BASE_URL` com a **origem** escolhida na tabela. O endereço pode ter porta, mas deve estar sem caminho, credenciais, parâmetros ou fragmento. Para DASH de uma origem sob seu controle, defina também `EXPO_PUBLIC_EDU_BACKEND_SOURCE_HOSTS` e autorize o mesmo DNS em `EDU_DIRECT_HOSTS` no backend. As duas variáveis `EXPO_PUBLIC_*` contêm apenas configuração pública. Reinicie o Metro depois de mudá-las.
3. Na Home, abra **Baixar mídia por link** → **Informar credencial da sessão**. Digite por um canal privado o token válido do backend e selecione **Usar nesta sessão**. O campo é mascarado. O token fica em memória e pode ser trocado ou removido ali. O app não inclui o token ou o link remoto no checkpoint. Para retomar após relançar, informe novamente a credencial e use a ação em **Downloads**.

| Ambiente | Endereço e conexão |
| --- | --- |
| Emulador Android no PC | Execute `adb reverse tcp:8765 tcp:8765` para o emulador e use `http://127.0.0.1:8765` com Metro em desenvolvimento. Verifique a disponibilidade de HTTP de loopback no cliente Android. |
| Aparelho físico | Use uma origem HTTPS operada pela equipe com cadeia de certificado aceita pelo sistema do aparelho. Um proxy HTTPS autorizado pode encaminhar somente `/api/v1/*` para `127.0.0.1:8765`. Restrinja o acesso à rede de testes e mantenha as proteções do servidor e a autenticação. A LAN do Expo e a origem da API são configurações independentes. |
| Web no próprio PC | Para uma execução Web experimental, sirva Metro Web e `/api/v1/*` pela mesma origem de um proxy de desenvolvimento em loopback, encaminhando a API para `127.0.0.1:8765`. Configure essa origem na variável pública. Browser e Expo Web podem analisar a API nessa montagem. O armazenamento, transferência até a biblioteca e abertura atuais dependem de Android ou iOS. O app principal não ganhou dependências Web. |
| Remoto | Use a origem HTTPS confiável definida pela equipe. O backend continua restrito à interface local atrás do proxy. Desabilite logging de `Authorization` no proxy e nos relatórios. |

Exemplo de configuração **de desenvolvimento** para o emulador, no terminal do app:

```powershell
adb reverse tcp:8765 tcp:8765
$env:EXPO_PUBLIC_EDU_API_BASE_URL = 'http://127.0.0.1:8765'
npx expo start --clear
```

Para HTTPS, o proxy deve repassar `Authorization`, `Range` e os cabeçalhos de resposta de tamanho, conteúdo, intervalo e verificação. Mantenha a origem protegida por certificado válido e controle de acesso. Neste Goal não houve implantação pública.

## Arquivos da integração

- `src/media/backendClient.js` valida a origem, implementa contratos da API e seleciona a estratégia.
- `src/media/remoteJobs.js` acompanha a tarefa e controla cancelamento, espera e retomada.
- `src/media/remoteTransfer.js` recebe porções limitadas, valida e publica o resultado.
- `src/media/expoRuntime.js`, `expoAdapters.js`, `mediaLibrary.js`, `mediaContracts.js` e `mediaRepository.js` ligam as duas estratégias ao armazenamento e ao catálogo atuais.
- `src/hooks/useMediaLibrary.js`, `src/navigation/AppNavigator.js`, `src/screens/MediaDownloadForm.js`, `DownloadsScreen.js` e `src/components/Input.js` conectam estados, credencial e controles aos layouts existentes.
- `package.json` e `package-lock.json` acrescentam `@noble/hashes` para SHA-256 incremental. A transferência usa `expo/fetch` e o sistema de arquivos já instalado no Expo SDK 58. [Expo fetch](https://docs.expo.dev/versions/v58.0.0/sdk/expo/#expofetch-api) · [Expo FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/) · [Noble Hashes](https://github.com/paulmillr/noble-hashes)
- `tests/backend-downloads.test.cjs`, `tests/helpers/mobileBackendRoundtrip.cjs`, os adaptadores em `tests/helpers/` e `backend/tests/test_mobile_roundtrip.py` validam falhas, transferência real, autenticação e persistência. Veja os resultados na [auditoria do GOAL 3.5](GOAL03_5_AUDITORIA.md).
