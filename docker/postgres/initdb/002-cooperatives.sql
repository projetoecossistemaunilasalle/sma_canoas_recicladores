CREATE TABLE IF NOT EXISTS cooperatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    cnpj TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    instagram TEXT,
    website TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cooperatives (name, cnpj, phone, address)
VALUES
    ('Coopcamate', NULL, NULL, NULL),
    ('Renascer', NULL, NULL, NULL),
    ('Cooarlas', NULL, NULL, NULL),
    ('Coopermag', NULL, NULL, NULL),
    ('Coopersol', NULL, NULL, NULL),
    ('CMGC', NULL, NULL, NULL),
    ('Coopertec', NULL, NULL, NULL),
    ('Mãos Dadas', NULL, NULL, NULL)
ON CONFLICT (name) DO NOTHING;
