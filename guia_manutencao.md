# Guia de Manutenção e Documentação Final - Finance

Este documento serve como o manual definitivo de arquitetura, operação e manutenção da plataforma **Finance**. O sistema foi construído sob padrões empresariais (enterprise-grade) utilizando **Java 21 (Spring Boot 3)**, **React (TypeScript + MUI)** e **Docker/DevOps** com rastreabilidade completa e monitoramento de saúde.

---

## 1. Arquitetura do Sistema

O sistema adota os princípios da **Clean Architecture**, **DDD (Domain-Driven Design)** e **SOLID**, garantindo baixo acoplamento e facilidade de substituição de componentes (banco, controllers, etc.).

### 1.1 Estrutura do Monorepositório
```
project-finance/
├── backend/               # Core Spring Boot 3 & Java 21
│   ├── src/main/java/com/finance/
│   │   ├── domain/        # Entidades puras, regras de domínio e interfaces de repositório
│   │   ├── application/   # Casos de Uso (Use Cases), DTOs e mapeamentos
│   │   ├── infrastructure/# Persistência JPA, Segurança JWT/Argon2id, Cache Redis, Auditoria e Gemini AI
│   │   └── presentation/  # Controladores REST (/api/v1/...) e Tratamento Global de Erros
│   ├── pom.xml            # Dependências Maven
│   └── Dockerfile         # Build multi-stage da JVM
├── frontend/              # Interface Web React + TS + Material UI (MUI)
│   ├── src/
│   │   ├── modules/       # Divisão de telas (auth, dashboard, investments, reports, ai-finance)
│   │   ├── routes/        # Rotas públicas e protegidas por autenticação
│   │   └── theme/         # Tema escuro premium com destaque neon (azul/violeta)
│   └── nginx.conf         # Configuração de rotas de proxy reverso e arquivos estáticos

└── docker-compose.yml     # Orquestrador de contêineres locais (Postgres, Redis, Backend, Frontend, Prometheus, Grafana)
```

---

## 2. Sistema de Auditoria (`audit_log`)

A auditoria de ações foi integrada nos **Casos de Uso (UseCases)** da aplicação e registra o histórico de alterações na tabela `audit_log`:

- **Ações Monitoradas**: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`.
- **Informações Gravadas**:
  - Usuário que realizou a ação (referência UUID).
  - Ação e nome da entidade (ex: `TRANSACTION`, `ACCOUNT`, `INVESTMENT`).
  - Diffs JSON contendo o estado anterior (`payload_before`) e o estado posterior (`payload_after`).
  - IP de origem do cliente e cabeçalho `User-Agent` (extraídos dinamicamente do contexto da requisição HTTP).
- **Mecanismo Transacional**: O `AuditLogService` utiliza `@Transactional(propagation = Propagation.REQUIRES_NEW)` para garantir que a gravação do log de auditoria seja independente da transação de negócio principal (evitando que falhas de negócio revertam o log e garantindo rastreabilidade mesmo em erros subsequentes).

---

## 3. Inteligência Artificial (AI Finance)

O módulo **AI Finance** integra com o **Gemini API** utilizando `GeminiService`:
- **Classificação Automática**: Transações descritas de forma livre (ex: "Fui ao Pão de Açúcar comprar janta") são enviadas ao modelo e categorizadas em JSON estruturado (ex: `Mercado`).
- **Assistente Conversacional**: Um chatbot interativo com histórico que responde a perguntas financeiras complexas com base em dados de fluxo de caixa atuais do usuário.
- **Resiliência e Fallback Local**: Caso a variável `GEMINI_API_KEY` não esteja presente no ambiente ou o serviço falhe, o sistema ativa um **mecanismo de fallback heurístico local** via regex/tokens para classificar as categorias padrão (ex: palavras como "posto", "combustivel", "gasolina" são mapeadas para a categoria *Combustível*), mantendo a aplicação 100% funcional.

---

## 4. DevOps, Monitoramento & Infraestrutura

A stack de infraestrutura é executada via Docker e orquestrada de forma simplificada.

### 4.1 Proxy Reverso (Nginx)
O servidor Nginx embutido no contêiner `frontend` atua como o **Proxy de Entrada (Gateway)**:
- Distribui o conteúdo estático do React compilado em `/` para o navegador do cliente.
- Redireciona de forma transparente todas as requisições de `/api/v1` para `http://backend:8080/api/v1` sobre a rede do Docker, eliminando problemas de CORS no desenvolvimento/produção.

### 4.2 Prometheus & Grafana
- **Coleta de Métricas (Prometheus)**: O Spring Boot Actuator expõe métricas em `/actuator/prometheus` por meio da biblioteca Micrometer. O Prometheus realiza scrapes periódicos (a cada 15 segundos) conforme definido em `docker/prometheus/prometheus.yml`.
- **Painéis Visuais (Grafana)**: O Grafana está configurado na porta `3000` (senha padrão configurada no compose: `admin_secure_pass_2026`). O Grafana possui provisionamento automático de datasource apontando diretamente para o Prometheus.
- **Métricas Monitoradas**: CPU do host, consumo de memória da JVM (Heap/Non-Heap size), contagem de threads ativas, taxa de erros HTTP (4xx e 5xx) e tempo médio de resposta dos endpoints.

---

## 5. Manutenção e Comandos Úteis

### 5.1 Subir a Stack Completa via Docker
Para compilar e iniciar todos os contêineres em background:
```bash
docker compose up -d --build
```
Isso iniciará:
1. **postgres** (porta 5432)
2. **redis** (porta 6379)
3. **backend** (porta 8080)
4. **frontend** (porta 80 - Proxy de entrada)
5. **prometheus** (porta 9090)
6. **grafana** (porta 3000)

### 5.2 Executar os Testes Unitários e de Integração (Backend)
```bash
# Na pasta /backend
mvn clean test
```

### 5.3 Executar as Migrações do Banco de Dados
O sistema utiliza o **Flyway** para migrações automáticas de esquema. Qualquer alteração estrutural no banco de dados deve ser declarada como um novo script SQL versionado em:
`/backend/src/main/resources/db/migration/` (ex: `V2__adicionar_novas_colunas.sql`). As migrações são executadas automaticamente na inicialização da JVM.

