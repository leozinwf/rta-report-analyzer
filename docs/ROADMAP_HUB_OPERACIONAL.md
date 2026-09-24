# Roadmap — HUB Operacional RTA

## Visão

Transformar o RTA Report Analyzer em um HUB operacional que reúna dados de execuções, chamados e documentação para apoiar prevenção, diagnóstico e tratamento de incidentes.

O produto começa como uma ferramenta de leitura e recomendação. Ações de escrita serão adicionadas apenas depois que as relações entre os dados estiverem confiáveis, sempre com confirmação humana e auditoria.

## Resultado esperado

O HUB deverá permitir responder, em uma única interface:

- O que está falhando hoje, na semana e no mês?
- Qual robô, fornecedor, tenant ou ambiente concentra o problema?
- O comportamento representa instabilidade externa, falha do robô ou regra de negócio?
- Já existe um card relacionado no Jira? Qual é seu estado e prioridade?
- O erro reapareceu depois de um card ter sido concluído?
- Existe documentação relacionada? Ela parece compatível com a situação atual?
- É necessário abrir um card, revisar uma prioridade ou atualizar uma documentação?

## Mini mapa do processo

```text
FONTES
  Automation API ───────┐
  Relatórios RTA/CRT ───┼──> CONECTORES SEGUROS
  Jira API ─────────────┤      - credenciais no servidor
  Outline / Docs API ───┘      - paginação, cache e limites
                                  │
                                  v
                         MODELO CANÔNICO
                         - execução e token
                         - robô e fornecedor
                         - erro e classificação
                         - card Jira
                         - documento
                                  │
                                  v
                         MOTOR DE ANÁLISE
                         - agregação mensal
                         - recorrência e regressão
                         - concentração e anomalia
                         - correspondência com Jira/Docs
                                  │
                                  v
                         HUB OPERACIONAL
                         - visão executiva
                         - fila de trabalho
                         - evidências
                         - recomendações
                                  │
                                  v
                         APROVAÇÃO HUMANA
                         - criar/editar card
                         - mudar prioridade
                         - atualizar documentação
```

## Princípios do produto

1. **Leitura antes de escrita:** integrações começam somente leitura.
2. **Credenciais somente no servidor:** nenhuma chave de Automation, Jira ou Docs é enviada ao navegador.
3. **Identidade antes de semelhança:** priorizar ID do robô, token, fornecedor e outros identificadores estáveis; texto semelhante é apenas evidência auxiliar.
4. **Agregados antes de linhas:** dashboards usam resultados pré-calculados; detalhes são carregados sob demanda.
5. **Aprovação humana:** inteligência recomenda, mas não altera sistemas silenciosamente.
6. **Auditabilidade:** toda sincronização, recomendação e ação deve registrar origem, horário, regra e usuário.
7. **Retomada segura:** cargas grandes devem continuar de onde pararam, sem reiniciar o mês inteiro.

## Roadmap

### Fase 0 — Baseline e proteção

**Objetivo:** conhecer o desempenho atual e impedir regressões enquanto a ferramenta cresce.

Entregas:

- Medição separada de leitura, normalização, classificação, análise e renderização.
- Cenário automatizado com aproximadamente 300 mil execuções sintéticas.
- Limites de memória e tempo registrados para ambiente local e produção.
- Tratamento de erro que impeça tela branca e permita reiniciar apenas a etapa que falhou.
- Registro da versão das regras de classificação usada em cada análise.

Critério de conclusão:

- Uma carga grande falha de forma controlada ou termina com métricas visíveis, sem derrubar toda a interface.

### Fase 1 — Mês operacional escalável

**Objetivo:** analisar 276 mil ou mais execuções sem congelar o navegador.

Entregas:

- Leitura, normalização e classificação em Web Worker.
- Processamento em lotes com progresso real e opção de cancelamento.
- Remoção de dados brutos duplicados mantidos em memória.
- Agregação incremental por dia, robô, status, problema, fornecedor, tenant e ambiente.
- Tabelas e listas virtualizadas.
- Histórico mensal no IndexedDB, separado do histórico semanal.
- Deduplicação por plataforma + token, com relatório de duplicidades.
- Comparação entre meses e entre semanas do mesmo mês.

Critério de conclusão:

- Importar, combinar e analisar o volume mensal sem travamentos prolongados; filtros e navegação permanecem utilizáveis.

### Fase 2 — Automation somente leitura

**Objetivo:** reduzir ou eliminar a importação manual do relatório Automation.

Entregas:

- Conector de servidor para `GET /api/v1/executions`.
- Variáveis de ambiente exclusivas para URL, API key e tenant alias.
- Sincronização por intervalo de datas, dividida por dia e por página.
- Cursor/checkpoint para retomada após erro.
- Cache e backoff para respostas temporárias ou limites da API.
- Tela de status da sincronização: período, páginas, registros, erros e última atualização.
- Consulta detalhada por token somente sob demanda ou para casos selecionados.
- Modo de homologação com intervalo curto antes de liberar sincronização mensal.

Critério de conclusão:

- O total e os indicadores de um período de teste coincidem com o relatório exportado, dentro de diferenças conhecidas e documentadas.

### Fase 3 — Camada de dados unificada

**Objetivo:** deixar de depender do estado de um único navegador e preparar uso compartilhado.

Entregas:

- Persistência central para execuções normalizadas, agregados e checkpoints.
- Modelo canônico com origem `Automation`, `RTA` ou `CRT`.
- Identificadores estáveis para robô, fornecedor, tenant, problema, card e documento.
- Política de retenção: agregado histórico, detalhes recentes e amostras de evidência.
- Versionamento das classificações e possibilidade de reprocessamento.
- Separação entre dado operacional e cache das integrações externas.

Critério de conclusão:

- Dois usuários autorizados enxergam a mesma análise sem importar novamente os arquivos.

### Fase 4 — Jira inteligente

**Objetivo:** transformar o cruzamento com o Jira em uma fila confiável de trabalho.

Entregas:

- Sincronização incremental de cards e estados relevantes.
- Matching baseado primeiro em IDs e entidades; similaridade textual entra apenas como apoio.
- Estados claros: `Card aberto`, `Em validação`, `Concluído`, `Regressão`, `Precisa de card` e `Revisar correspondência`.
- Explicação de cada correspondência e nível de confiança.
- Detecção de regressão após card concluído.
- Sugestão de prioridade com evidências de volume, impacto, recorrência e abrangência.
- Correção manual de correspondência, usada como feedback para melhorar as regras.

Critério de conclusão:

- Uma amostra revisada manualmente atinge precisão acordada antes de qualquer ação automática no Jira.

### Fase 5 — Docs / Outline somente leitura

**Objetivo:** relacionar incidentes e robôs com o conhecimento operacional existente.

Entregas:

- Conector Outline com escopo mínimo `documents:read`.
- Sincronização de coleções, documentos, títulos, conteúdo, URL e atualização.
- Busca por robô, fornecedor, município, erro e palavras-chave controladas.
- Relação entre documento, robô e card Jira com explicação da evidência.
- Alertas de documentação ausente, possivelmente desatualizada ou conflitante.
- Atualização incremental e respeito a paginação e `Retry-After`.

Critério de conclusão:

- O usuário encontra documentação relevante a partir de um caso da fila de trabalho sem sair do HUB.

### Fase 6 — Assistente operacional

**Objetivo:** gerar recomendações combinando Automation, RTA/CRT, Jira e Docs.

Entregas:

- Resumo do incidente com dados verificáveis e links para as fontes.
- Recomendação de classificação: site instável, erro do site, erro do robô ou regra de negócio.
- Sugestão de card, prioridade, responsável e documentação relacionada.
- Comparação com incidentes anteriores e regressões.
- Nível de confiança e motivos exibidos para cada sugestão.
- Feedback do usuário: confirmar, corrigir ou rejeitar recomendação.

Critério de conclusão:

- Recomendações são úteis em uma amostra real e cada afirmação pode ser rastreada até sua evidência.

### Fase 7 — Ações controladas

**Objetivo:** reduzir tarefas manuais sem perder controle operacional.

Entregas:

- Criar rascunho de card Jira.
- Alterar prioridade após confirmação explícita.
- Gerar proposta de atualização documental com comparação antes/depois.
- Aprovação por usuário autorizado.
- Idempotência para impedir ações duplicadas.
- Log de auditoria completo e mecanismo de reversão quando a API permitir.
- Chaves de escrita separadas das chaves de leitura.

Critério de conclusão:

- Nenhuma alteração externa ocorre sem confirmação, autorização e registro auditável.

## Ordem recomendada de execução

```text
Fase 0 ──> Fase 1 ──> Fase 2 ──> Fase 3
              │                      │
              └──── valor rápido     ├──> Fase 4 ──> Fase 6
                                     └──> Fase 5 ──> Fase 6
                                                    │
                                                    v
                                                 Fase 7
```

Fases 4 e 5 podem avançar em paralelo depois que o modelo unificado estiver estável. A Fase 7 só começa após validação das recomendações da Fase 6.

## Primeiro ciclo recomendado

Escopo do primeiro ciclo:

1. Criar o benchmark de 300 mil execuções.
2. Mover o parser e classificador para Worker.
3. Remover `rawData` da estrutura principal.
4. Criar agregação incremental e histórico mensal.
5. Virtualizar as maiores listagens.
6. Validar novamente o relatório combinado de aproximadamente 276 mil execuções.
7. Criar o conector Automation somente leitura em homologação.
8. Comparar API e Excel para o mesmo intervalo.

O ciclo termina com duas demonstrações: análise mensal responsiva e sincronização Automation de um período curto.

## Indicadores do projeto

- Tempo total de ingestão e análise mensal.
- Maior pausa percebida na interface.
- Memória utilizada durante e após o processamento.
- Percentual da carga retomada sem repetição após falha.
- Diferença entre totais da API e do relatório exportado.
- Precisão das correspondências com Jira.
- Precisão das documentações sugeridas.
- Percentual de recomendações confirmadas, corrigidas e rejeitadas.
- Quantidade de tarefas manuais economizadas.
- Incidentes detectados antes de gerar impacto maior.

## Limites até nova decisão

- Não criar, editar ou cancelar execuções no Automation.
- Não criar cards nem alterar prioridade automaticamente no Jira.
- Não atualizar documentos automaticamente.
- Não expor chaves de integração ao frontend.
- Não enviar o conjunto completo de execuções ou documentos para serviços de IA externos.
- Não classificar correspondência textual como certeza sem identificadores ou confirmação humana.

## Registro de decisões

Manter nesta seção decisões que mudem o rumo do HUB.

### Decisão 001 — Evolução para HUB

- **Status:** aceita.
- **Direção:** integrar Automation, RTA/CRT, Jira e Docs.
- **Estratégia:** leitura e recomendação primeiro; escrita controlada depois.
- **Primeira prioridade:** escala mensal e integração Automation somente leitura.

## Referências

- Automation / DooBots API: <https://documenter.getpostman.com/view/42924313/2sB3HnKzqo>
- Dootax Docs: <https://docs.dootax.com.br/home>
- Outline API: <https://www.getoutline.com/developers>

