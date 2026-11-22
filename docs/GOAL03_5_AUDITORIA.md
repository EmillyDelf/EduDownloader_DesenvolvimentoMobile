# GOAL 3.5 — Auditoria de ponta a ponta

**20 de novembro de 2026.** Validação na pasta principal em Windows x64. O HEAD local era `f65cf5ed6379a9da3f340105d6614bbbabb6c2b0`. Os Goals anteriores já estavam presentes na árvore de trabalho. A integração do cliente foi feita sobre esses arquivos locais.

## Resultado funcional

O teste novo inicia Uvicorn e a aplicação FastAPI real em loopback. Usa FFmpeg, FFprobe e os motores do GOAL 02. A política de teste mapeia somente o hostname da fixture local para a porta transitória. O caso opcional do MDN usa validação de origem e DNS do backend de produção. O cliente, o acompanhamento, a escrita, a verificação e o catálogo executam os módulos do app com disco real via adaptador Node. A abertura verifica a chamada ao visualizador através de um contrato Android simulado.

Foram selecionados MP4 e MP3 originais, MP4 de 360p com combinação de faixas e MP3 de 192 kbps com conversão. A análise DASH também retornou 180p. Cada execução conferiu MIME, tamanho publicado, assinatura binária e SHA-256 por uma implementação independente, além do registro no Histórico. Foram verificados clique duplo, reaproveitamento da chave de idempotência, autorização, cancelamento remoto e limpeza. O MP4 maior exigiu três respostas autenticadas com `Range`.

| Mídia | Resultado | MIME | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `combined.mp4` | MP4 original | `video/mp4` | 39.622 | `7c53c5486819a5881d94dd9049342f953d266ae16792062e95327815eef84f6d` |
| `original.mp3` | MP3 original | `audio/mpeg` | 13.835 | `b5a0766ded8b8514229061192c57720df6737fb266f399c2368736946fed398e` |
| `sources.mpd` | MP4 combinado, 360p | `video/mp4` | 190.356 | `724a09ddf2097ee3bab899ce8e2d99341105fbc1307f96b328bf8bce4434bb59` |
| `sources.mpd` | MP3 convertido, 192 kbps | `audio/mpeg` | 58.975 | `c1ccc1a937b095afeaf0c3f1316f87eee0a5b7c56921316662b1ba002f5cf767` |
| `longer.mp4` | MP4 original, 720p | `video/mp4` | 11.567.966 | `4889f5945b5a7adeb44655c17e8f09e4761343cfe6e82209c4b51a529c35c755` |
| `flower.mp4`, MDN | MP4 original | `video/mp4` | 1.128.375 | `0cd83d944a6ca7822b4a8306cecc60a36e859b041f6702c6a1ad9ead78924451` |

O MDN foi exercitado pelo caminho remoto no teste para validar a mesma transferência e verificação com uma fonte pública. No uso normal, uma URL como essa continua elegível ao downloader direto. [Vídeo de teste do MDN](https://developer.mozilla.org/shared-assets/videos/flower.mp4)

## Falhas, recuperação e segurança

- Testes de contrato recusam origens HTTP de LAN, credenciais na URL, bases com caminho, opções inválidas e caminhos de download modificados. Um redirecionamento HTTP real foi bloqueado antes de chegar à segunda rota. A fonte do Expo SDK 58 foi conferida para `redirect: 'error'` no Android e iOS. A execução nativa desse cenário está reservada à validação no aparelho.
- A validação real verificou Bearer inválido, arquivo sem autenticação e invisibilidade de uma tarefa para outra credencial. A suíte anterior continua cobrindo acesso a arquivos de outro cliente, DNS e SSRF. O aplicativo transmite a URL ao backend apenas para a política explícita de origens descrita na [implementação](GOAL03_DOWNLOADS_REAIS.md).
- A interrupção durante transferência fecha a resposta e remove o parcial. Resposta parcial inesperada, fechamento antecipado, MIME incorreto, assinatura inválida, hash divergente, falta de espaço e falha de escrita foram exercitados separadamente. Nenhum deles publicou um resultado concluído.
- A resposta de criação perdida, quedas durante consultas, suspensão e retomada foram exercitadas com falhas controladas. A retomada consulta o ID conhecido ou reenvia a chave anterior. O reinício real do backend limpou os cinco resultados retidos do teste local, e a consulta do ID antigo devolveu 404. Cancelamento terminal e Histórico foram verificados sem duplicação.
- O teste integrado detectou um problema de codificação da saída no Windows. O executor passou a emitir TAP, e a nova execução registrou os hashes corretamente. A inspeção do `expo/fetch` mostrou que a camada nativa pode enfileirar dados mais rápido que a gravação. A transferência passou a limitar as respostas a 4 MiB, e o caso de 11.567.966 bytes confirmou o percurso com três intervalos.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Linha de base | 133 testes JavaScript e 53 Python aprovados antes das alterações. |
| `npm ci` | 485 pacotes instalados. npm apontou três alertas moderados também presentes na linha de base. |
| `node --test tests/*.test.cjs` | 143 aprovados, 0 falhas, 0 ignorados. |
| `python -m pytest -q` | 54 aprovados, 0 falhas, 0 ignorados. Um aviso existente de depreciação do TestClient do Starlette. |
| `EDU_TEST_EXTERNAL_MOBILE=1` com o teste de integração | 1 aprovado, com cinco arquivos de fixture e o MP4 público do MDN. |
| `python -m pip check` e `python -m compileall -q app tests` | Sem dependências quebradas e sem falhas de compilação Python. |
| `npx expo-doctor` | 20 de 20 verificações aprovadas. |
| `npx expo lint` | O projeto não tem configuração ESLint. A inicialização de uma configuração nova foi dispensada. |
| `npx --offline --no-install tsc --noEmit` | O projeto JavaScript não fornece TypeScript nem configuração de tipos. A suíte e o Metro conferiram a compilação do JavaScript. |
| `npx expo export --platform android --output-dir ../EduDownloader-Goal03-Android-Validacao --max-workers 2` | 1.200 módulos, 151 assets e nenhum asset referenciado ausente. O bundle inclui as rotinas de API e de verificação. Os hosts e a credencial dos testes estão ausentes. |

O bytecode `index-5aa057c5ecad55b2d7e4ec22cea86796.hbc` tem 3.132.055 bytes e SHA-256 `e180d4dbf31d82fb90bd1d4be9ed43a003ec2d20fd5618df2861f3729060ed91`.

O teste real pode ser repetido a partir da pasta `backend` depois de instalar as dependências dos dois projetos e preparar os motores:

```powershell
& .venv/Scripts/python.exe -m pytest -q -s tests/test_mobile_roundtrip.py
```

Para incluir a mídia pública, defina `$env:EDU_TEST_EXTERNAL_MOBILE = '1'` no terminal de teste. As credenciais são geradas para cada execução e não aparecem na saída. Os resultados locais em mídia ficam em temporários do teste.

## Auditoria visual

A prévia Web isolada importou o formulário do aplicativo atual e reutilizou as dependências de auditoria do GOAL 01. O Edge com Playwright verificou 12 estados em 390 × 844, sem transbordamento horizontal, erros JavaScript ou respostas de erro em fontes, scripts e imagens. A execução verificou o campo mascarado, a transição de formato para qualidade, o texto da faixa, a ausência de porcentagem em estados indeterminados e a ação de cancelar no cenário visual. Os estados dessa inspeção foram fornecidos por fixtures. O teste de transferência real foi executado separadamente.

- Entrada e seleção. [Credencial da sessão](evidencias/goal03/link.png) · [Análise](evidencias/goal03/analyzing.png) · [Formato](evidencias/goal03/format.png) · [Qualidade](evidencias/goal03/quality.png)
- Processamento e arquivo local. [Faixas no servidor](evidencias/goal03/downloading.png) · [Processamento indeterminado](evidencias/goal03/processing.png) · [Transferência local](evidencias/goal03/local.png) · [Verificação local](evidencias/goal03/verifyingLocal.png)
- Retomada e resultado. [Pausado](evidencias/goal03/paused.png) · [Erro](evidencias/goal03/failure.png) · [Cancelado](evidencias/goal03/cancelled.png) · [Concluído](evidencias/goal03/complete.png)

## Limites e próximos Goals

A validação de arquivos, cancelamento, catálogo e histórico usou o disco do PC pelo adaptador de testes. O bundle Android verifica JS, imports e assets. A execução Android e iOS, inclusive armazenamento nativo, abertura, comportamento em segundo plano e estabilidade do transporte, fica para a homologação do GOAL 5.5. A auditoria exercitou até 11.567.966 bytes no cliente e não mediu limites térmicos, consumo de bateria ou tempos para vídeos longos no celular. Arquivos mais longos permanecem sujeitos aos limites de tamanho, CPU e tempo já configurados no servidor e à sua retenção.

O GOAL 04 de conversão na galeria ainda precisa de uma estratégia para fornecer o arquivo de entrada ao motor, validar tamanho e permissões, controlar progresso e cancelamento e publicar a saída na mesma biblioteca. A seleção de vídeo e formato existente permanece disponível. A gestão de PDFs no Histórico fica para a etapa funcional prevista.
