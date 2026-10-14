CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    -- Sempre minúsculo (a API normaliza): sem isso "Admin@x.com" e
    -- "admin@x.com" viram duas contas.
    email TEXT UNIQUE NOT NULL CHECK (email = lower(email)),
    -- Só contas de cooperativa têm senha: hash argon2id (gerar com
    -- `pnpm password:hash` no backend).
    password TEXT,
    -- Munícipe entra só com a conta Google: este é o `sub` dela, que não muda
    -- mesmo se o e-mail da conta mudar. A conta é criada no primeiro login.
    google_sub TEXT UNIQUE,
    -- 'user' = munícipe (entra pelo Google); 'cooperative_admin' = quem
    -- usa o painel de uma cooperativa. Não há administrador geral: cooperativas
    -- e seus admins são criados direto no banco por quem mantém o sistema.
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'cooperative_admin')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cooperative_id UUID REFERENCES cooperatives(id),
    -- Endereço do munícipe: address_lat/lng é o pin que ele põe em cima da
    -- casa; o trecho e o lado são confirmados por ele na tela e comparados
    -- direto com route_streets.street_id/side. Os quatro vêm juntos ou
    -- nenhum. Sem FK para streets de propósito: import-streets faz TRUNCATE
    -- streets ... CASCADE, e uma FK aqui faria esse TRUNCATE apagar users.
    address TEXT,
    address_number TEXT,
    address_lat DOUBLE PRECISION,
    address_lng DOUBLE PRECISION,
    address_street_id INTEGER,
    address_side TEXT CHECK (address_side IN ('left', 'right')),
    -- Último dia em que o aviso de "caminhão chegando" foi enviado — um por
    -- coleta, e sobrevive a um restart do backend.
    proximity_notified_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Admin de cooperativa sempre tem a sua; munícipe nunca tem.
    CONSTRAINT users_cooperative_matches_role CHECK ((role = 'cooperative_admin') = (cooperative_id IS NOT NULL)),
    -- Admin de cooperativa entra com senha; munícipe, só pela conta Google.
    CONSTRAINT users_credentials_match_role CHECK (
        (role = 'cooperative_admin') = (password IS NOT NULL)
        AND (role = 'user') = (google_sub IS NOT NULL)
    )
);

-- Ter ao menos uma inscrição é o que liga o aviso de proximidade.
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
