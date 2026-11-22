# Diagnóstico da homologação Android

## Estado preservado antes do reparo

Coleta de 22/11/2026, na pasta principal, com HEAD local `f65cf5ed6379a9da3f340105d6614bbbabb6c2b0` e alterações de Goals anteriores na árvore. Expo SDK 58.0.26 e Expo Go para Android 58.0.5. O aparelho estava conectado por ADB. Metro na LAN e FastAPI em loopback estavam ativos. A linha de base JavaScript passou com 152 testes. A versão instalada do Expo Go recusou `run-as` por ser uma versão sem depuração nativa. Isso impediu extrair diretamente o diário e os arquivos privados por ADB. Não foram registrados tokens, URLs de mídia, nomes de arquivos do usuário, logs brutos ou identificadores de tarefas.

O resultado MP4 retido pelo servidor tinha 80.889.084 bytes (aproximadamente 77,1 MiB), SHA-256 `2e2fdd0026a396d7a59b5c48b9910b2e8890a9b45b6f5b3e4916a20387d8f3fd`, vídeo H.264 Main nível 3.0, 640 × 360, `yuv420p`, e áudio AAC-LC. O FFmpeg decodificou as duas faixas até o fim, sem erro. Trata-se da cópia retida pelo servidor, associada ao relato pelo tamanho e formato. Esta coleta não leu os bytes da cópia no celular. O provedor de arquivos do Expo Go está registrado. Na amostra disponível de logs, nenhum erro de atividade, permissão ou codec pôde ser atribuído ao arquivo relatado.

O manifesto do Metro informou uma chave de experiência com uma barra. O SDK usa diretórios privados por experiência. No código pré-reparo, o mesmo validador estrito de URI era chamado tanto pelo diário quanto pela abertura. O download validava os bytes no destino e marcava a conclusão antes de gravar o diário. Se essa gravação falhasse, o erro bloqueava os próximos downloads, e a tela de sucesso ainda tentava abrir o registro não persistido. Esse caminho é compatível com os três sintomas e será confrontado com um teste que reproduz a URI do Expo Go. [Isolamento de arquivos no Expo Go Android](https://github.com/expo/expo/pull/45977) · [Expo FileSystem SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/)

## Causa comum e correções

O Expo Go codifica a chave da experiência no nome físico da pasta sob `ExperienceData`. Na URI, a barra do identificador aparece como `%252F`, pois o nome em disco contém os caracteres literais `%2F`. O manifesto real correspondeu ao padrão testado. O validador rejeitava esse nome legítimo como se fosse um separador de caminho codificado. Três testes reproduziram, antes da correção, a rejeição da URI, a indisponibilidade para abertura e a falha de persistência após concluir o MP4.

- A exceção de codificação fica limitada ao segmento de escopo esperado do Expo Go Android. O aplicativo preserva a codificação e continua rejeitando separadores codificados em outros segmentos, travessia e arquivos de outra experiência.
- A abertura no Android usa `File.preview` do SDK 58 com o MIME do arquivo. O SDK resolve o visualizador, cria a referência do provedor de arquivos e concede permissão de leitura. A verificação local de URI, propriedade e existência continua antes da chamada nativa. [Visualização de arquivos no Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/#previewing-files)
- A confirmação de download aguarda a publicação no diário. Se o arquivo já foi salvo e o diário falha, o app distingue os dois estados e oferece nova tentativa de registro. Um aviso de gravação pendente deixa de, por si só, desativar o próximo download. Se o catálogo não puder ser lido, o início continua bloqueado para proteger os dados.
- Após reiniciar, um download interrompido no diário pode ser recuperado quando o arquivo já existe no destino final esperado, tem tamanho positivo e assinatura compatível. O fluxo normal promove o arquivo para o destino final depois da verificação. A recuperação de um registro antigo não recalcula o SHA-256 contra o servidor quando o checkpoint não contém a soma esperada. Os testes conferem que um arquivo de assinatura incorreta não vira uma conclusão, que a atividade recuperada aparece uma vez e que uma geração do diário com registro inválido permanece íntegra.

## Validação

| Verificação | Resultado |
| --- | --- |
| JavaScript | 157 testes aprovados. A cobertura inclui MP4 seguido de MP3, abertura com MIME, reinício, recuperação de registro, espera pela gravação e distinção visual de registro pendente. |
| Python | 54 testes aprovados antes e depois da correção, incluindo a integração real com o cliente JavaScript. Um aviso preexistente de depreciação do TestClient. |
| Expo Doctor | 20 de 20 verificações aprovadas. |
| Bundle Android | 1.201 módulos e 151 assets presentes. Hermes `index-8e449207fa4ae3a26f3707f05233e3fd.hbc`, 3.186.911 bytes, SHA-256 `7ad68943a40c487aa3b24c394a78aee3a30fe355945a1d1747315bfdb0c4e4b7`. |
| Lint e TypeScript | O projeto permaneceu sem configuração ESLint, compilador TypeScript local ou `tsconfig.json`. A suíte JavaScript e o Metro verificaram sintaxe e imports. |

No aparelho, o usuário confirmou, após recarregar o Expo Go sem limpar os dados, que o MP4 anterior apareceu em Downloads, reproduziu áudio e vídeo e que a opção de download MP3 voltou a ficar habilitada. A conclusão de um novo download MP3 e sua reabertura depois de reiniciar o Expo Go ainda precisam ser confirmadas no aparelho. A persistência em Histórico e a ausência de duplicação foram verificadas nos testes automatizados.
