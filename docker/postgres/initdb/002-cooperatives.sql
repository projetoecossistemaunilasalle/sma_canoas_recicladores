CREATE TABLE IF NOT EXISTS cooperatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    cnpj TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    instagram TEXT,
    website TEXT,
    -- Pin dos mapas do munícipe (o endereço é texto livre).
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
