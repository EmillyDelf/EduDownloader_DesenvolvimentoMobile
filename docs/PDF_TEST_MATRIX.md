# Matriz de validação do módulo PDF

## Testes automatizados locais

```bash
node --test tests/pdf-interface.test.cjs tests/pdf-pure.test.cjs tests/pdf-integration.test.cjs
```

A suíte valida seleção, organização, nome, dimensões, orientação, margens e encaixe sem distorção. O teste de integração abre o PDF produzido com `pdf-lib` e verifica as páginas. A manipulação de imagens e as chamadas às APIs nativas de arquivo usam substitutos em memória.

## Testes necessários em dispositivo Android/iOS

Os testes abaixo dependem das APIs nativas do Expo e precisam ser feitos no aparelho/emulador com o aplicativo executando.

| Cenário | Procedimento | Resultado esperado |
| --- | --- | --- |
| Uma imagem | Gerar PDF com uma foto JPG | PDF com uma página, abre e compartilha |
| Três imagens | Gerar PDF com três fotos de proporções diferentes | Três páginas na ordem escolhida |
| Limite máximo | Selecionar 20 imagens | Geração concluída com 20 páginas |
| Duplicatas | Tentar selecionar a mesma imagem duas vezes | A imagem aparece uma única vez |
| JPG | Selecionar foto JPG | Conversão e incorporação concluídas |
| PNG opaco | Selecionar PNG sem transparência | Conversão e incorporação concluídas |
| PNG transparente | Selecionar PNG com transparência | Conferir visualmente o fundo após a conversão JPEG |
| HEIC | Selecionar HEIC, se o aparelho oferecer esse formato | Conversão concluída ou erro claro e recuperável |
| Retrato | Testar A4, Letter e Legal em retrato | Página com altura maior que largura |
| Paisagem | Testar A4, Letter e Legal em paisagem | Página com largura maior que altura |
| Margem zero | Configurar margem 0 | Imagem pode ocupar toda a área da página sem corte |
| Margem padrão | Configurar margem 10 mm | Conteúdo respeita a margem visualmente |
| Margem máxima | Configurar margem 50 mm | Conteúdo permanece dentro da área útil |
| Nome de arquivo | Usar acentos, espaços e símbolos no nome | Nome final seguro, sem caracteres inválidos |
| Persistência | Gerar, fechar o app completamente e abrir novamente | Arquivo continua no armazenamento privado do app |
| Visualização | Tocar em “Visualizar PDF” | Abre um visualizador compatível ou informa indisponibilidade |
| Exportação | Tocar em “Exportar PDF”, escolher uma pasta e abrir a cópia pelo gerenciador de arquivos | A cópia tem o nome e o conteúdo do documento gerado |
| Cancelamento | Abrir “Exportar PDF” e fechar o seletor de pastas | O aplicativo volta à conclusão e nenhuma cópia é criada |
| Compartilhamento | Tocar em “Compartilhar PDF” | Abre a folha de compartilhamento com o PDF anexado |
| Falha de leitura | Remover/invalidar uma imagem antes de gerar, se possível | Mensagem de erro clara; botão de tentar novamente funciona |
| Recuperação | Após uma falha, corrigir a seleção e gerar novamente | Nova geração funciona sem reiniciar o aplicativo |

## Limites desta validação

- Os testes unitários não executam o módulo nativo de manipulação de imagem nem o armazenamento real do Android/iOS.
- A compatibilidade efetiva de HEIC, PNG com transparência, visualização e compartilhamento depende do dispositivo e deve ser confirmada na matriz manual.
- O [relatório da integração da equipe](RELATORIO_INTEGRACAO_EQUIPE.md) registra a execução da suíte completa.
