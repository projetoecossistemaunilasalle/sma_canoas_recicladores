CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate TEXT UNIQUE,
    model TEXT,
    color TEXT,
    cooperative_id UUID REFERENCES cooperatives(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO vehicles (plate, model, color, cooperative_id)
VALUES
    ('TQQ8I27', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'Coopcamate')),
    ('IRG3B70', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'Coopcamate')),
    ('ILP1F49', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'Coopcamate')),
    ('IBW5F26', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'Coopcamate')),
    ('IKQ3D59', 'Truck', 'Blue', (SELECT id FROM cooperatives WHERE name = 'Renascer')),
    ('ITM6I78', 'Truck', 'Blue', (SELECT id FROM cooperatives WHERE name = 'Renascer')),
    ('UIX3A70', 'Truck', 'Blue', (SELECT id FROM cooperatives WHERE name = 'Renascer')),
    ('LXH5I27', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'Cooarlas')),
    ('ITM6I76', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'Cooarlas')),
    ('IJI6D69', 'Truck', 'Green', (SELECT id FROM cooperatives WHERE name = 'Coopermag')),
    ('TQQ8A19', 'Truck', 'Green', (SELECT id FROM cooperatives WHERE name = 'Coopermag')),
    ('IOW2E82', 'Truck', 'Green', (SELECT id FROM cooperatives WHERE name = 'Coopermag')),
    ('IQJ9774', 'Truck', 'Silver', (SELECT id FROM cooperatives WHERE name = 'Coopersol')),
    ('IBJ7D85', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'CMGC')),
    ('TQROC37', 'Truck', 'White', (SELECT id FROM cooperatives WHERE name = 'CMGC')),
    ('UIX3B41', 'Truck', 'Red', (SELECT id FROM cooperatives WHERE name = 'Coopertec')),
    ('INY4F75', 'Truck', 'Red', (SELECT id FROM cooperatives WHERE name = 'Coopertec')),
    ('IRQ2B89', 'Truck', 'Red', (SELECT id FROM cooperatives WHERE name = 'Coopertec')),
    ('CBL3F92', 'Truck', 'Yellow', (SELECT id FROM cooperatives WHERE name = 'Mãos Dadas')),
    ('TQQ8A18', 'Truck', 'Yellow', (SELECT id FROM cooperatives WHERE name = 'Mãos Dadas')),
    ('JDL4I58', 'Truck', 'Yellow', (SELECT id FROM cooperatives WHERE name = 'Mãos Dadas'))

ON CONFLICT (plate) DO NOTHING;

CREATE TABLE IF NOT EXISTS vehicle_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicle_positions_location_idx ON vehicle_positions USING GIST(location);
CREATE INDEX IF NOT EXISTS vehicle_positions_vehicle_time_idx ON vehicle_positions(vehicle_id, recorded_at DESC);

INSERT INTO vehicle_positions (vehicle_id, location, recorded_at)
VALUES
    ((SELECT id FROM vehicles WHERE plate = 'TQQ8I27'), ST_SetSRID(ST_MakePoint(-51.218, -29.918), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IRG3B70'), ST_SetSRID(ST_MakePoint(-51.219, -29.919), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'ILP1F49'), ST_SetSRID(ST_MakePoint(-51.220, -29.920), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IBW5F26'), ST_SetSRID(ST_MakePoint(-51.221, -29.921), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IKQ3D59'), ST_SetSRID(ST_MakePoint(-51.222, -29.922), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'ITM6I78'), ST_SetSRID(ST_MakePoint(-51.223, -29.923), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'UIX3A70'), ST_SetSRID(ST_MakePoint(-51.224, -29.924), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'LXH5I27'), ST_SetSRID(ST_MakePoint(-51.225, -29.925), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'ITM6I76'), ST_SetSRID(ST_MakePoint(-51.226, -29.926), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IJI6D69'), ST_SetSRID(ST_MakePoint(-51.227, -29.927), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'TQQ8A19'), ST_SetSRID(ST_MakePoint(-51.228, -29.928), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IOW2E82'), ST_SetSRID(ST_MakePoint(-51.229, -29.929), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IQJ9774'), ST_SetSRID(ST_MakePoint(-51.230, -29.930), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IBJ7D85'), ST_SetSRID(ST_MakePoint(-51.231, -29.931), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'TQROC37'), ST_SetSRID(ST_MakePoint(-51.232, -29.932), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'UIX3B41'), ST_SetSRID(ST_MakePoint(-51.233, -29.933), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'INY4F75'), ST_SetSRID(ST_MakePoint(-51.234, -29.934), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'IRQ2B89'), ST_SetSRID(ST_MakePoint(-51.235, -29.935), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'CBL3F92'), ST_SetSRID(ST_MakePoint(-51.236, -29.936), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'TQQ8A18'), ST_SetSRID(ST_MakePoint(-51.237, -29.937), 4326), NOW()),
    ((SELECT id FROM vehicles WHERE plate = 'JDL4I58'), ST_SetSRID(ST_MakePoint(-51.238, -29.938), 4326), NOW());
    

