# SMA Canoas Recicladores

Projeto 10 - Reciclagem. Sistema de gestão de frota e rotas de coleta para as cooperativas de reciclagem de Canoas/RS: as cooperativas cadastram veículos e montam rotas semanais sobre a malha viária (pgRouting), e o munícipe acompanha quando o caminhão passa na rua dele (mapa público, área do cidadão e aviso por notificação).

## Stack

- **Backend**: Fastify + TypeScript + Drizzle ORM (pnpm) — `backend/`
- **Frontend**: Next.js 16 (App Router) (npm) — `frontend/`: home pública, área do cidadão (`/citizen`) e painel da cooperativa (`/dashboard`)
- **Banco de dados**: PostgreSQL 16 com PostGIS + pgRouting, em container Docker — `docker/postgres/`

## Pré-requisitos

- Node.js 22+
- pnpm 10 (`corepack enable` já resolve a versão certa para o backend)
- Docker e Docker Compose (para o banco de dados)

## Rodando localmente

Só o banco roda no Docker; backend e frontend rodam direto na máquina.

### 1. Banco de dados

```bash
docker compose up -d db
```

Isso builda a imagem do Postgres (PostGIS + pgRouting) e, na primeira inicialização, executa `docker/postgres/initdb/*.sql` — que é o schema completo do banco.

### 2. Backend

```bash
cd backend
cp .env.example .env      # preencha JWT_SECRET (qualquer string secreta)
pnpm install
pnpm db:seed              # cooperativas, usuários, veículos
pnpm streets:import       # malha viária de Canoas (OSM) — leva ~1 min
pnpm neighborhoods:import # bairros
pnpm dev
```

A API sobe em `http://localhost:3001` e a documentação (Swagger) fica em `http://localhost:3001/admin/docs`.

Os usuários do seed usam a senha `password` (ex.: `admin@coopcamate.com`, `admin@renascer.com`, `user@example.com`).

As variáveis do backend estão comentadas em `backend/.env.example` — só `DATABASE_URL` e `JWT_SECRET` são obrigatórias; a integração de GPS (Multiportal) e as notificações (Web Push) ficam desligadas sem as delas.

### 3. Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

O frontend sobe em `http://localhost:3000`.

## Cooperativas e seus administradores

Não existe administrador geral no sistema: cooperativas e as contas de quem usa o painel de cada uma são criadas direto no banco por quem mantém o sistema. Cada conta de painel pertence a exatamente uma cooperativa (o banco garante isso).

A senha precisa ser gravada como hash argon2id — gere com:

```bash
cd backend
pnpm password:hash 'a senha da pessoa'
```

E insira (no `psql`, ou no `pnpm db:studio`):

```sql
INSERT INTO cooperatives (name, cnpj, phone) VALUES ('Nova Cooperativa', '00.000.000/0001-00', '51 99999-9999');

INSERT INTO users (name, email, password, role, cooperative_id)
VALUES ('Fulana', 'fulana@cooperativa.com', '<hash gerado acima>', 'cooperative_admin',
        (SELECT id FROM cooperatives WHERE name = 'Nova Cooperativa'));
```

O e-mail precisa estar em minúsculas. Para desativar uma cooperativa (some dos mapas e das listas): `UPDATE cooperatives SET active = false WHERE ...`; para bloquear uma conta: `UPDATE users SET active = false WHERE ...`. Endereço, telefone e o pin no mapa a própria cooperativa edita em "Minha Cooperativa".

## Mudando a API

Os tipos da API no frontend são gerados a partir dos schemas Zod do backend. Depois de mudar um schema:

```bash
cd backend && pnpm openapi          # gera backend/openapi.json
cd ../frontend && npm run api:types  # gera frontend/lib/api-types.ts
```

## Mudando o banco

Não há migrations: o schema é o SQL de `docker/postgres/initdb/`. Altere o `CREATE TABLE` direto (e o espelho em `backend/src/db/schema.ts`). Como o initdb só roda num volume vazio, no banco local aplique a mudança na mão ou recrie o volume (`docker compose down -v`, que apaga os dados, e repita o passo 2).

## Estrutura do projeto

```
backend/    API Fastify (rotas, controllers, services, schema do banco, imports de dados)
frontend/   Aplicação Next.js
docker/     Imagem do Postgres (PostGIS + pgRouting) e o schema (initdb)
```

Detalhes de arquitetura (padrão de módulos do backend, autenticação e isolamento por cooperativa, modelo de dados, rotas e lados da rua) estão em [CLAUDE.md](CLAUDE.md).

## Pontos de atenção

- Não há suíte de testes automatizados (backend nem frontend) nem lint configurado no backend.
- Os limites das ruas e dos bairros vêm do OpenStreetMap (ODbL — a atribuição já aparece nos mapas e na busca).
