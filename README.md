# Edu Downloader

Aplicativo mobile desenvolvido com **React Native e Expo**, com o objetivo de centralizar ferramentas de manipulação e gerenciamento de mídias e documentos em um único ambiente.

O Edu Downloader foi idealizado para facilitar atividades relacionadas ao uso de materiais pedagógicos, oferecendo recursos para download de mídias, conversão de arquivos e criação de documentos PDF.

## Objetivo do projeto

O projeto busca oferecer uma aplicação simples e acessível para auxiliar profissionais da área educacional no gerenciamento de arquivos utilizados em suas atividades.

A proposta é reduzir a dependência de plataformas externas e ferramentas complexas, reunindo funcionalidades de manipulação de mídias e documentos em uma interface unificada.

## Funcionalidades

### Download de mídia
- Download de arquivos de vídeo em MP4 e áudio em MP3, quando disponibilizados diretamente pela origem.
- Inserção e validação de URLs.
- Identificação do formato e dos metadados disponíveis.
- Seleção de opções de download confirmadas pela origem.
- Acompanhamento do progresso real da transferência.
- Cancelamento de operações quando suportado.
- Armazenamento local dos arquivos concluídos.

### Conversão de vídeos
- Seleção de um vídeo da galeria e exibição do nome, da duração e do tamanho quando disponíveis.
- Escolha de qualidade de áudio de 128, 192 ou 320 kbps.
- Processamento e exportação de áudio pendentes.

### Criação de PDF
- Seleção de imagens da galeria.
- Visualização das imagens selecionadas.
- Remoção de imagens.
- Organização e reordenação das páginas.
- Configuração do nome do documento.
- Definição do tamanho da página.
- Escolha da orientação.
- Configuração das margens.
- Geração do documento PDF.
- Progresso da geração, visualização, exportação para uma pasta e compartilhamento do arquivo gerado.

### Downloads
- Listagem dos arquivos e operações.
- Pesquisa por nome.
- Filtros por categoria.
- Exibição de status e progresso.
- Abertura de arquivos concluídos.
- Estados de carregamento, erro e lista vazia.

### Histórico
- Registro das atividades realizadas.
- Histórico de downloads realizados.
- Filtros de atividade para os tipos reconhecidos pela interface.
- Agrupamento de registros por data.
- Filtros por tipo de atividade.
- Abertura de arquivos disponíveis.
- Exclusão de registros com confirmação.

## Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| JavaScript | Linguagem principal |
| React Native | Desenvolvimento da interface mobile |
| Expo SDK 58 | Ambiente e ferramentas de desenvolvimento |
| React 19 | Biblioteca para construção da interface |
| React Navigation 7 | Navegação entre telas |
| Expo Image Picker | Seleção de imagens e mídias |
| Expo File System | Gerenciamento de arquivos |
| Expo Sharing | Compartilhamento de arquivos |
| Expo Image Manipulator | Manipulação de imagens |
| Expo Font | Carregamento de fontes personalizadas |
| Inter e Montserrat | Tipografia da aplicação |

## Estrutura do projeto

```text
EduDownloader_DesenvolvimentoMobile/
│
├── assets/
│   ├── files/
│   ├── media/
│   ├── navigation/
│   └── screens/
│
├── docs/
│   ├── componentes.md
│   ├── downloads-historico.md
│   ├── GOAL06_DOWNLOADS_HISTORICO.md
│   ├── INTEGRACAO_EMILLY_PDF.md
│   ├── INTEGRACAO_EQUIPE.md
│   ├── PDF_TEST_MATRIX.md
│   └── RELATORIO_INTEGRACAO_EQUIPE.md
│
├── src/
│   ├── components/
│   ├── dev/
│   ├── hooks/
│   ├── media/
│   ├── navigation/
│   ├── pdf/
│   ├── screens/
│   └── styles/
│
├── tests/
│
├── App.js
├── app.json
├── index.js
├── package.json
└── package-lock.json
```

### Organização dos diretórios

- **assets/**: imagens, ícones e recursos visuais.
- **docs/**: documentação técnica e registros de integração.
- **src/components/**: componentes reutilizáveis da interface.
- **src/dev/**: telas de demonstração e prévias para desenvolvimento.
- **src/hooks/**: hooks personalizados.
- **src/media/**: contratos, serviços e gerenciamento de mídias.
- **src/navigation/**: configuração e integração da navegação.
- **src/pdf/**: seleção de imagens, montagem e gravação do PDF.
- **src/screens/**: telas e módulos da aplicação.
- **src/styles/**: estilos, cores, tipografia e configurações responsivas.
- **tests/**: testes automatizados.

## Navegação

A aplicação possui uma navegação principal com cinco opções:

1. Início
2. Downloads
3. PDF
4. Histórico
5. Perfil

A navegação é estruturada com React Navigation e utiliza uma barra inferior compartilhada entre as telas principais.

O fluxo da galeria abre a escolha de qualidade de áudio. A aba PDF reúne seleção, organização, configuração, geração e conclusão. As demonstrações continuam acessíveis pela Home. Consulte o [relatório da integração da equipe](docs/RELATORIO_INTEGRACAO_EQUIPE.md) para o escopo validado e o roteiro no celular.

## Componentes reutilizáveis

O projeto possui componentes compartilhados para manter a consistência visual e facilitar a manutenção:

- Button
- Input
- Header
- BottomNavigation
- Card
- LoadingIndicator
- ProgressBar
- ErrorMessage
- ConfirmationDialog

Os componentes possuem propriedades configuráveis e são utilizados pelas diferentes telas da aplicação.

## Identidade visual

A interface utiliza uma identidade visual baseada em:

- Azul principal: `#0131CD`
- Verde-limão: `#B9FC01`
- Branco: `#FFFFFF`

A tipografia utiliza Inter e Montserrat. Os estilos são organizados em arquivos próprios, com suporte a diferentes dimensões de tela.

## Instalação e execução

### Pré-requisitos

- Node.js
- npm
- Expo Go compatível com o SDK utilizado

### 1. Clonar o repositório

```bash
git clone https://github.com/EmillyDelf/EduDownloader_DesenvolvimentoMobile
```

### 2. Entrar na pasta do projeto

```bash
cd EduDownloader_DesenvolvimentoMobile
```

### 3. Instalar as dependências

```bash
npm ci
```

### 4. Iniciar a aplicação

```bash
npx expo start
```

Após iniciar o servidor, utilize o QR Code apresentado no terminal para abrir a aplicação no Expo Go.

Para executar diretamente em uma plataforma:

```bash
npm run android
```

```bash
npm run ios
```

```bash
npm run web
```

## Testes

O projeto possui testes automatizados para verificar contratos, componentes, navegação e funcionalidades dos módulos.

Para executar os testes:

```bash
node --test tests/*.test.cjs
```

A validação por testes automatizados não substitui os testes de execução em dispositivos físicos ou emuladores.

## Desenvolvimento

O projeto foi desenvolvido de forma colaborativa, com divisão de responsabilidades entre os integrantes da equipe e integração das funcionalidades em uma aplicação principal.

As implementações priorizam componentes reutilizáveis, organização modular, consistência visual, acessibilidade e manutenção do código.

## Projeto acadêmico

**Edu Downloader — Desenvolvimento Mobile**

Projeto desenvolvido como atividade acadêmica da disciplina de Desenvolvimento Mobile.

