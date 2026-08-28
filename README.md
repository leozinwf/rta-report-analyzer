# RTA Report Analyzer

> Analisador de relatórios Excel para diagnóstico operacional de automações RTA.

Aplicação web desenvolvida para importar relatórios em Excel, transformar os dados em indicadores úteis e facilitar a investigação de problemas em execuções de automação.

## Visão geral

O **RTA Report Analyzer** organiza dados de relatórios operacionais em uma interface de análise, permitindo sair de uma planilha extensa e chegar rapidamente aos pontos que precisam de atenção.

O projeto foi pensado em torno de um fluxo simples:

```text
Relatório Excel
      ↓
Importação e leitura dos dados
      ↓
Tratamento e organização
      ↓
Dashboard e indicadores
      ↓
Execuções / Robôs / Problemas / Etapas / Tentativas
      ↓
Investigação do cenário
```

## O que a aplicação oferece

- Importação de relatórios Excel
- Dashboard com indicadores e visualizações
- Consulta de execuções
- Listagem e detalhamento de robôs
- Análise de problemas
- Visualização de etapas
- Consulta de tentativas
- Filtros e navegação por diferentes dimensões do relatório
- Estrutura preparada para evolução com recursos de análise assistida

A aplicação possui páginas específicas para **Dashboard, Execuções, Robôs, Problemas, Etapas, Tentativas, Ambientes e Tenants**, além do fluxo de importação do relatório. fileciteturn23file0L2-L5

## Tecnologias

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Recharts
- Lucide React
- SheetJS (`xlsx`)
- Vitest

As dependências e scripts do projeto estão definidos em `package.json`, incluindo build com TypeScript/Vite e execução de testes com Vitest. fileciteturn19file0L1-L6

## Arquitetura

A estrutura do projeto está organizada por responsabilidade, com separação entre:

```text
src/
├── ai/          # recursos relacionados à análise assistida
├── components/  # componentes reutilizáveis da interface
├── context/     # estado compartilhado da aplicação
├── data/        # dados e estruturas de apoio
├── fixtures/    # dados para desenvolvimento e testes
├── hooks/       # lógica reutilizável
├── pages/       # páginas e fluxos da aplicação
├── services/    # serviços de processamento e integração
├── types/       # tipos TypeScript
└── utils/       # funções utilitárias
```

A organização atual separa páginas, hooks, services, context, fixtures, tipos, utilitários e recursos de análise, o que facilita a evolução do projeto. fileciteturn20file0L1-L2

## Como executar

### Pré-requisitos

- Node.js
- npm

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testes

```bash
npm test
```

## Fluxo de uso

1. Abra a aplicação.
2. Importe o relatório Excel.
3. Aguarde o processamento dos dados.
4. Navegue pelo dashboard e pelas áreas de análise.
5. Investigue execuções, robôs, problemas, etapas e tentativas.

## Por que este projeto existe

Relatórios operacionais podem concentrar grande volume de informações, tornando difícil identificar rapidamente falhas, padrões e pontos de atenção.

O RTA Report Analyzer transforma esse cenário em uma experiência de análise mais estruturada, com foco em **observabilidade operacional, diagnóstico e produtividade**.

## Status

🚧 **Em desenvolvimento**

O projeto está sendo evoluído continuamente, com foco em ampliar a profundidade da análise, melhorar a experiência de investigação e adicionar recursos que apoiem a identificação de erros e padrões.

## Roadmap

- [ ] Melhorar classificação e agrupamento de problemas
- [ ] Expandir indicadores e visualizações
- [ ] Melhorar análise de tendências
- [ ] Ampliar cobertura de testes
- [ ] Evoluir recursos de análise assistida
- [ ] Adicionar documentação técnica mais detalhada

## Autor

**Leonardo Sabatini**

Analista de Sistemas | Automação | Java | APIs | Desenvolvimento Backend

- GitHub: https://github.com/leozinwf
- LinkedIn: https://www.linkedin.com/in/leonardosabatini/
- Portfólio: https://leozinwf.space/
