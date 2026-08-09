CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cooperative_id UUID REFERENCES cooperatives(id),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email, password, role, cooperative_id)
VALUES
    ('Admin', 'admin@Coopcamate.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopcamate')),
    ('Admin', 'admin@Renascer.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Renascer')),
    ('Admin', 'admin@Cooarlas.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Cooarlas')),
    ('Admin', 'admin@Coopermag.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopermag')),
    ('Admin', 'admin@Coopersol.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopersol')),
    ('Admin', 'admin@CMGC.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'CMGC')),
    ('Admin', 'admin@Coopertec.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopertec')),
    ('Admin', 'admin@MaosDadas.com', 'password', 'cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Mãos Dadas'))
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password, role)
VALUES
    ('User', 'user@example.com', 'password', 'user')
ON CONFLICT (email) DO NOTHING;