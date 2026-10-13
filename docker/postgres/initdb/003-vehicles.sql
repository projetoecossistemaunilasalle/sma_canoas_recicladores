CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate TEXT UNIQUE,
    model TEXT,
    color TEXT,
    type TEXT NOT NULL DEFAULT 'caminhao' CHECK (type IN ('caminhao', 'bicicleta')),
    cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
    -- Empréstimo: cooperative_id continua sendo a dona; esta é quem está com
    -- o veículo agora (NULL = não emprestado).
    loaned_to_cooperative_id UUID REFERENCES cooperatives(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_positions_location_idx ON vehicle_positions USING GIST(location);
CREATE INDEX IF NOT EXISTS vehicle_positions_vehicle_time_idx ON vehicle_positions(vehicle_id, recorded_at DESC);
