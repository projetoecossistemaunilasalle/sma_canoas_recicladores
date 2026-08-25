CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cooperative_id UUID REFERENCES cooperatives(id),
    address TEXT,
    address_lat DOUBLE PRECISION,
    address_lng DOUBLE PRECISION,
    notify_proximity BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (name, email, password, role, cooperative_id)
VALUES
    ('Admin', 'admin@Coopcamate.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopcamate')),
    ('Admin', 'admin@Renascer.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Renascer')),
    ('Admin', 'admin@Cooarlas.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Cooarlas')),
    ('Admin', 'admin@Coopermag.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopermag')),
    ('Admin', 'admin@Coopersol.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopersol')),
    ('Admin', 'admin@CMGC.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'CMGC')),
    ('Admin', 'admin@Coopertec.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Coopertec')),
    ('Admin', 'admin@MaosDadas.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','cooperative_admin', (SELECT id FROM cooperatives WHERE name = 'Mãos Dadas'))
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password, role)
VALUES
    ('User', 'user@example.com', '$argon2id$v=19$m=65536,p=4,t=3$+9xA1MMYCUWRBcwygam1CQ$V/dfMDl5tPzs+hQW9uTkPDabNQ+d+2OV0VEkd7BeNeA','user')
ON CONFLICT (email) DO NOTHING;