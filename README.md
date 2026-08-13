# SMA Canoas Recicladores

Projeto 10 - Reciclagem. Sistema de gestão de frota e rotas de coleta para cooperativas de reciclagem de Canoas/RS: cadastro de cooperativas, veículos, posições de GPS e rotas de coleta montadas sobre a malha viária (pgRouting).

## Stack

- **Backend**: Fastify + TypeScript + Drizzle ORM (pnpm) — `backend/`
- **Frontend**: Next.js 16 (App Router) (npm) — `frontend/` (ainda no scaffold padrão do `create-next-app`, sem telas próprias implementadas)
- **Banco de dados**: PostgreSQL 16 com PostGIS + pgRouting, rodando em container Docker — `docker/postgres/`

## Pré-requisitos

- Node.js 22+
- pnpm 10 (`corepack enable` já resolve a versão certa para o backend)
- Docker e Docker Compose (para o banco de dados)

## Passo a passo para rodar localmente

### 1. Clonar e configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` se necessário. As variáveis relevantes para rodar localmente (fora do Docker Compose de backend/frontend, que hoje está comentado):

| Variável | Uso | Valor local sugerido |
|---|---|---|
| `DATABASE_URL` | Backend, string de conexão do Postgres | `postgresql://postgres:postgres@localhost:5432/recicladores?sslmode=disable` |
| `JWT_SECRET` | Backend, chave para assinar os tokens JWT | qualquer string secreta |
| `JWT_EXPIRES_IN` | Backend, validade do token (opcional) | `7d` |
| `PORT` | Porta do backend | `3001` |
| `NEXT_PUBLIC_API_URL` | Frontend, URL base da API | `http://localhost:3001` em dev local |

> O `docker-compose.yml` usa `localhost:5432` mapeado do container, então rodando o backend fora do Docker (`pnpm dev`) use `localhost` no `DATABASE_URL`, não `db` (esse hostname só existe dentro da rede do Compose).

### 2. Subir o banco de dados

```bash
docker compose up -d db
```

Isso builda a imagem customizada do Postgres (PostGIS + pgRouting) e, na primeira inicialização, executa os scripts em `docker/postgres/initdb/*.sql` (extensões, tabelas de cooperativas, veículos, usuários e malha viária).

Aguarde o container ficar saudável:

```bash
docker compose ps
```

### 3. Instalar dependências e rodar o backend

```bash
cd backend
pnpm install
pnpm dev
```

A API sobe em `http://localhost:3001` (respeitando `PORT` do `.env`) e a documentação Swagger fica em `http://localhost:3001/admin/docs`.

Popule o banco com dados de exemplo (cooperativas, usuários admin, veículos e posições):

```bash
pnpm db:seed
```

Os usuários criados pelo seed usam a senha `password` (ex.: `admin@coopcamate.com` / `password`, `user@example.com` / `password`).

Outros comandos úteis do backend:

```bash
pnpm db:generate   # gera migration a partir do schema Drizzle (src/db/schema.ts)
pnpm db:migrate    # aplica migrations pendentes no banco
pnpm db:studio     # abre o Drizzle Studio para inspecionar o banco
```

### 4. Instalar dependências e rodar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em `http://localhost:3000`.

## Rodando tudo via Docker (build de produção)

Os serviços `backend` e `frontend` do `docker-compose.yml` estão comentados por padrão (fluxo atual de desenvolvimento é local + banco em container). Para testar os builds de produção via Docker, descomente os dois serviços no `docker-compose.yml` e rode:

```bash
docker compose up --build
```

## Estrutura do projeto

```
backend/    API Fastify (rotas, controllers, services, schema do banco)
frontend/   Aplicação Next.js
docker/     Imagem customizada do Postgres (PostGIS + pgRouting) e scripts de init
render.yaml Configuração de deploy no Render
```

Detalhes de arquitetura (padrão de módulos do backend, autenticação/multi-tenancy, modelo de dados) estão documentados em [CLAUDE.md](CLAUDE.md).

## Deploy

O `render.yaml` define o deploy no Render: backend e frontend como serviços Docker separados, mais um banco Postgres gerenciado. `DATABASE_URL` é injetada automaticamente a partir do banco; lembre-se de configurar `JWT_SECRET` manualmente no painel do Render, pois ele não está no `render.yaml`.

## Pontos de atenção

- O frontend ainda é o scaffold padrão do Next.js — não há telas/integração com a API implementadas.
- Não há suíte de testes automatizados (backend nem frontend) nem lint configurado no backend.
- As tabelas do banco de desenvolvimento são criadas pelos scripts SQL em `docker/postgres/initdb/`, não pelas migrations do Drizzle. Rodar `pnpm db:migrate` contra esse mesmo banco tentará recriar tabelas já existentes — veja [CLAUDE.md](CLAUDE.md) para mais contexto antes de usar migrations do Drizzle nele.
