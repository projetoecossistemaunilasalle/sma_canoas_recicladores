ALTER TABLE cooperatives ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE cooperatives ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
    type TEXT NOT NULL DEFAULT 'aviso' CHECK (type IN ('aviso', 'noticia')),
    title TEXT,
    body TEXT NOT NULL,
    main_image TEXT,
    sub_image_1 TEXT,
    sub_image_2 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON announcements(created_at DESC);
