CREATE TABLE IF NOT EXISTS streets (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT,
    name TEXT,
    geom GEOMETRY(LineString, 4326) NOT NULL,
    source INTEGER,
    target INTEGER,
    cost DOUBLE PRECISION,          -- segundos (sentido geométrico: 0→1)
    reverse_cost DOUBLE PRECISION,  -- segundos (contra geométrico: 1→0)
    length_km DOUBLE PRECISION,
    requires_collection BOOLEAN DEFAULT false,
    oneway BOOLEAN DEFAULT false,
    highway_type TEXT
);

CREATE INDEX IF NOT EXISTS streets_geom_idx ON streets USING GIST(geom);
CREATE INDEX IF NOT EXISTS streets_source_idx ON streets(source);
CREATE INDEX IF NOT EXISTS streets_target_idx ON streets(target);

CREATE TABLE IF NOT EXISTS collection_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    cooperative_id UUID REFERENCES cooperatives(id),
    status TEXT DEFAULT 'planned',
    total_distance_km DOUBLE PRECISION,
    total_duration_seconds DOUBLE PRECISION,
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RUAS DE UMA ROTA (ordem de coleta)
-- ============================================
CREATE TABLE IF NOT EXISTS route_streets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES collection_routes(id) ON DELETE CASCADE,
    street_id INTEGER NOT NULL REFERENCES streets(id),
    stop_order INTEGER NOT NULL,
    direction TEXT DEFAULT 'forward',  -- 'forward' (0→1) ou 'reverse' (1→0)
    distance_from_previous_km DOUBLE PRECISION,
    duration_from_previous_seconds DOUBLE PRECISION
);

-- ============================================
-- FUNÇÃO: ETA seguindo a rota
-- ============================================
CREATE OR REPLACE FUNCTION get_eta_following_route(
    p_vehicle_id UUID,
    p_citizen_lat DOUBLE PRECISION,
    p_citizen_lng DOUBLE PRECISION
)
RETURNS TABLE (
    status TEXT,                    -- 'chegando', 'na_rua', 'passou', 'nao_esta_na_rota'
    tempo_segundos DOUBLE PRECISION,
    tempo_texto TEXT,
    distancia_km DOUBLE PRECISION,
    ruas_restantes INTEGER,
    rua_atual TEXT,
    rua_cidadao TEXT
) AS $$
DECLARE
    v_route_id UUID;
    v_street_id INTEGER;
    v_street_name TEXT;
    v_fraction DOUBLE PRECISION;
    v_direction TEXT;
    
    c_street_id INTEGER;
    c_street_name TEXT;
    c_fraction DOUBLE PRECISION;
    
    v_stop_order INTEGER;
    c_stop_order INTEGER;
    
    tempo_rua_atual DOUBLE PRECISION;
    tempo_intermediario DOUBLE PRECISION;
    tempo_rua_cidadao DOUBLE PRECISION;
    dist_total DOUBLE PRECISION;
BEGIN
    -- 1. PEGA A ROTA ATIVA DO VEÍCULO
    SELECT cr.id INTO v_route_id
    FROM collection_routes cr
    WHERE cr.vehicle_id = p_vehicle_id
      AND cr.status IN ('active', 'planned')
      AND cr.scheduled_date = CURRENT_DATE
    ORDER BY cr.created_at DESC
    LIMIT 1;
    
    IF v_route_id IS NULL THEN
        RETURN QUERY SELECT 'sem_rota'::TEXT, 0::DOUBLE PRECISION, 'Sem rota ativa hoje'::TEXT, 0::DOUBLE PRECISION, 0, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 2. POSIÇÃO ATUAL DO CAMINHÃO (GPS mais recente)
    SELECT 
        ST_LineLocatePoint(s.geom, vp.location),
        s.id,
        s.name,
        rs.direction
    INTO v_fraction, v_street_id, v_street_name, v_direction
    FROM vehicle_positions vp
    CROSS JOIN LATERAL (
        SELECT s.id, s.name, s.geom, rs.direction
        FROM streets s
        JOIN route_streets rs ON rs.street_id = s.id
        WHERE rs.route_id = v_route_id
        ORDER BY s.geom <-> vp.location
        LIMIT 1
    ) s
    WHERE vp.vehicle_id = p_vehicle_id
    ORDER BY vp.recorded_at DESC
    LIMIT 1;

    -- 3. POSIÇÃO DO CIDADÃO
    SELECT 
        s.id,
        s.name,
        ST_LineLocatePoint(s.geom, ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326))
    INTO c_street_id, c_street_name, c_fraction
    FROM streets s
    ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326)
    LIMIT 1;

    -- 4. VERIFICA SE O CIDADÃO ESTÁ NA MESMA RUA
    IF v_street_id = c_street_id THEN
        -- Mesma rua: calcula distância entre as frações
        IF v_direction = 'forward' THEN
            -- Caminhão vai de 0→1
            IF c_fraction >= v_fraction THEN
                tempo_rua_atual := (c_fraction - v_fraction) * s.cost;
                dist_total := (c_fraction - v_fraction) * s.length_km;
            ELSE
                -- Cidadão está "atrás" no sentido da rota (já passou ou vai voltar)
                tempo_rua_atual := (1 - v_fraction + c_fraction) * s.cost;
                dist_total := (1 - v_fraction + c_fraction) * s.length_km;
            END IF;
        ELSE
            -- Caminhão vai de 1→0 (reverse)
            IF c_fraction <= v_fraction THEN
                tempo_rua_atual := (v_fraction - c_fraction) * s.cost;
                dist_total := (v_fraction - c_fraction) * s.length_km;
            ELSE
                tempo_rua_atual := (v_fraction + (1 - c_fraction)) * s.cost;
                dist_total := (v_fraction + (1 - c_fraction)) * s.length_km;
            END IF;
        END IF;
        
        RETURN QUERY SELECT 
            'na_rua'::TEXT,
            tempo_rua_atual,
            format_tempo(tempo_rua_atual),
            dist_total,
            0,
            v_street_name,
            c_street_name;
        RETURN;
    END IF;

    -- 5. VERIFICA SE A RUA DO CIDADÃO ESTÁ NA ROTA
    SELECT rs.stop_order INTO c_stop_order
    FROM route_streets rs
    WHERE rs.route_id = v_route_id AND rs.street_id = c_street_id;
    
    IF c_stop_order IS NULL THEN
        RETURN QUERY SELECT 'nao_esta_na_rota'::TEXT, 0::DOUBLE PRECISION, 'Sua rua não está na rota de hoje'::TEXT, 0::DOUBLE PRECISION, 0, v_street_name, c_street_name;
        RETURN;
    END IF;

    -- 6. EM QUAL ORDEM DA ROTA ESTÁ O CAMINHÃO?
    SELECT rs.stop_order INTO v_stop_order
    FROM route_streets rs
    WHERE rs.route_id = v_route_id AND rs.street_id = v_street_id;

    IF v_stop_order IS NULL THEN
        -- Caminhão não está em nenhuma rua da rota (GPS fora do trajeto)
        -- Calcula direto via pgRouting como fallback
        RETURN QUERY SELECT * FROM get_eta_fallback(p_vehicle_id, p_citizen_lat, p_citizen_lng);
        RETURN;
    END IF;

    -- 7. O CAMINHÃO JÁ PASSOU DA RUA DO CIDADÃO?
    IF v_stop_order > c_stop_order THEN
        RETURN QUERY SELECT 'passou'::TEXT, 0::DOUBLE PRECISION, 'O caminhão já passou pela sua rua hoje'::TEXT, 0::DOUBLE PRECISION, 0, v_street_name, c_street_name;
        RETURN;
    END IF;

    -- 8. CALCULA TEMPO RESTANTE NA RUA ATUAL
    IF v_direction = 'forward' THEN
        tempo_rua_atual := (1 - v_fraction) * s.cost;
        dist_total := (1 - v_fraction) * s.length_km;
    ELSE
        tempo_rua_atual := v_fraction * s.cost;
        dist_total := v_fraction * s.length_km;
    END IF;

    -- 9. SOMA AS RUAS INTERMEDIÁRIAS (entre a atual e a do cidadão)
    SELECT COALESCE(SUM(s.cost), 0), COALESCE(SUM(s.length_km), 0)
    INTO tempo_intermediario, dist_total
    FROM route_streets rs
    JOIN streets s ON s.id = rs.street_id
    WHERE rs.route_id = v_route_id
      AND rs.stop_order > v_stop_order
      AND rs.stop_order < c_stop_order;

    -- 10. TEMPO DA RUA DO CIDADÃO (do início até a casa)
    SELECT rs.direction INTO v_direction
    FROM route_streets rs
    WHERE rs.route_id = v_route_id AND rs.street_id = c_street_id;
    
    IF v_direction = 'forward' THEN
        tempo_rua_cidadao := c_fraction * s.cost;
        dist_total := dist_total + (c_fraction * s.length_km);
    ELSE
        tempo_rua_cidadao := (1 - c_fraction) * s.cost;
        dist_total := dist_total + ((1 - c_fraction) * s.length_km);
    END IF;

    -- 11. RETORNA
    RETURN QUERY SELECT 
        'chegando'::TEXT,
        (tempo_rua_atual + tempo_intermediario + tempo_rua_cidadao),
        format_tempo(tempo_rua_atual + tempo_intermediario + tempo_rua_cidadao),
        dist_total,
        (c_stop_order - v_stop_order),
        v_street_name,
        c_street_name;

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO AUXILIAR: Formata segundos para texto
-- ============================================
CREATE OR REPLACE FUNCTION format_tempo(segundos DOUBLE PRECISION)
RETURNS TEXT AS $$
DECLARE
    m INTEGER;
    h INTEGER;
BEGIN
    IF segundos < 60 THEN
        RETURN 'menos de 1 minuto';
    END IF;
    
    m := FLOOR(segundos / 60)::INTEGER;
    
    IF m < 60 THEN
        RETURN m || ' minutos';
    END IF;
    
    h := FLOOR(m / 60)::INTEGER;
    m := m % 60;
    
    RETURN h || 'h ' || m || 'min';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNÇÃO FALLBACK: Se o caminhão saiu da rota (GPS fora do trajeto)
-- ============================================
CREATE OR REPLACE FUNCTION get_eta_fallback(
    p_vehicle_id UUID,
    p_citizen_lat DOUBLE PRECISION,
    p_citizen_lng DOUBLE PRECISION
)
RETURNS TABLE (
    status TEXT,
    tempo_segundos DOUBLE PRECISION,
    tempo_texto TEXT,
    distancia_km DOUBLE PRECISION,
    ruas_restantes INTEGER,
    rua_atual TEXT,
    rua_cidadao TEXT
) AS $$
DECLARE
    v_lng DOUBLE PRECISION;
    v_lat DOUBLE PRECISION;
    c_edge_id INTEGER;
    c_fraction DOUBLE PRECISION;
    v_edge_id INTEGER;
    v_fraction DOUBLE PRECISION;
    total_cost DOUBLE PRECISION;
BEGIN
    -- Posição do caminhão
    SELECT ST_X(location), ST_Y(location)
    INTO v_lng, v_lat
    FROM vehicle_positions
    WHERE vehicle_id = p_vehicle_id
    ORDER BY recorded_at DESC
    LIMIT 1;

    -- Rua do cidadão
    SELECT s.id, ST_LineLocatePoint(s.geom, ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326))
    INTO c_edge_id, c_fraction
    FROM streets s
    ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326)
    LIMIT 1;

    -- Rua do veículo
    SELECT s.id, ST_LineLocatePoint(s.geom, ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326))
    INTO v_edge_id, v_fraction
    FROM streets s
    ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)
    LIMIT 1;

    -- Calcula via pgr_withPoints
    CREATE TEMP TABLE IF NOT EXISTS temp_eta_points (
        pid INTEGER, edge_id INTEGER, fraction DOUBLE PRECISION
    ) ON COMMIT DROP;
    
    TRUNCATE temp_eta_points;
    INSERT INTO temp_eta_points VALUES (-1, v_edge_id, v_fraction), (-2, c_edge_id, c_fraction);

    SELECT MAX(agg_cost) INTO total_cost
    FROM pgr_withPoints(
        'SELECT id, source, target, cost, reverse_cost FROM streets',
        'SELECT pid, edge_id, fraction FROM temp_eta_points',
        -1, -2, directed := true
    );

    RETURN QUERY SELECT 
        'chegando'::TEXT,
        total_cost,
        format_tempo(total_cost),
        0::DOUBLE PRECISION,
        0,
        NULL::TEXT,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;