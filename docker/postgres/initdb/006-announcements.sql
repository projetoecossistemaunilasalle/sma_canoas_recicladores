CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
    type TEXT NOT NULL DEFAULT 'aviso' CHECK (type IN ('aviso', 'noticia')),
    title TEXT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON announcements(created_at DESC);

-- Até 3 imagens por aviso, servidas por URL (GET /announcement-images/:id)
-- em vez de embutidas em cada listagem. Trocar uma imagem cria uma linha
-- nova (id novo), então a URL de cada uma pode ficar em cache para sempre.
CREATE TABLE IF NOT EXISTS announcement_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    slot TEXT NOT NULL CHECK (slot IN ('main', 'sub1', 'sub2')),
    mime TEXT NOT NULL,
    data BYTEA NOT NULL,
    UNIQUE (announcement_id, slot)
);
