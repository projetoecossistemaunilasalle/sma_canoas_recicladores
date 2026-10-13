-- ============================================
-- BAIRROS
-- ============================================
-- Limites dos bairros de Canoas (boundary=administrative, admin_level=10 no
-- OSM), preenchidos por `pnpm neighborhoods:import` a partir de
-- backend/data/canoas-bairros.json — não pelo app. O bairro de um endereço
-- sai do pin com ST_Intersects, não do trecho de rua: uma rua de divisa fica
-- nos dois bairros, mas o pin da casa cai do lado certo.
CREATE TABLE IF NOT EXISTS neighborhoods (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    name TEXT NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS neighborhoods_geom_idx ON neighborhoods USING GIST(geom);
