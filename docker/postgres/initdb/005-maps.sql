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
    -- Recorrência semanal: dias em que a rota roda, turno e horário de início.
    days_of_week TEXT[],       -- ex: {seg,qua,sex}
    shift TEXT,                -- 'manha' | 'tarde' | 'noite'
    start_time TIME,           -- ex: 08:00
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
    duration_from_previous_seconds DOUBLE PRECISION,
    is_stop BOOLEAN NOT NULL DEFAULT false  -- true = rua escolhida pela cooperativa; false = conector preenchido pelo pgr_dijkstra
);

-- ============================================
-- FUNÇÃO: ETA seguindo a rota
-- ============================================
-- get_eta_following_route: SEMPRE calcula seguindo a sequência de coleta
-- planejada (nunca em linha reta ignorando ruas que o caminhão ainda tem que
-- coletar). Quando o GPS do caminhão não bate com nenhuma rua da rota (entre
-- pontos de GPS, fora do trajeto, etc.), reconecta com um pgr_dijkstra real
-- (nó a nó — mesmo padrão comprovado em route.service.ts:computePath, que
-- evita a armadilha do pgr_withPoints em ruas de mão única) até o ponto mais
-- próximo de volta na rota, e só então continua pela sequência planejada.
-- Também devolve a geometria completa do trajeto (path_geojson) e os pontos
-- intermediários (stops_json) para desenhar no mapa.
DROP FUNCTION IF EXISTS get_eta_following_route(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);
DROP FUNCTION IF EXISTS get_eta_fallback(UUID, DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION get_eta_following_route(
    p_vehicle_id UUID,
    p_citizen_lat DOUBLE PRECISION,
    p_citizen_lng DOUBLE PRECISION,
    -- Optional: when the caller already resolved which exact street segment
    -- represents the citizen (see PublicTrackingService.checkAddress, which
    -- picks the nearest *served* segment sharing the searched street's
    -- name), pass it here to use it directly instead of re-deriving it —
    -- avoids re-running the ambiguous nearest-segment search this function
    -- would otherwise do on its own near corners where several streets
    -- meet close together. NULL preserves the old lat/lng-only behavior.
    p_citizen_street_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    status TEXT,                    -- 'chegando', 'na_rua', 'passou', 'nao_esta_na_rota', 'sem_rota'
    tempo_segundos DOUBLE PRECISION,
    tempo_texto TEXT,
    distancia_km DOUBLE PRECISION,
    ruas_restantes INTEGER,
    rua_atual TEXT,
    rua_cidadao TEXT,
    path_geojson TEXT,               -- LineString GeoJSON: posição atual -> ... -> cidadão
    stops_json TEXT                  -- [{streetId,name,lat,lng}] pontos intermediários, em ordem
) AS $$
DECLARE
    v_route_id UUID;
    v_current_location GEOMETRY(Point, 4326);
    v_street_id INTEGER;
    v_street_name TEXT;
    v_fraction DOUBLE PRECISION;
    v_direction TEXT;
    v_street_cost DOUBLE PRECISION;
    v_street_length_km DOUBLE PRECISION;
    v_street_geom GEOMETRY;

    c_street_id INTEGER;
    c_street_name TEXT;
    c_fraction DOUBLE PRECISION;
    c_street_cost DOUBLE PRECISION;
    c_street_length_km DOUBLE PRECISION;
    c_street_geom GEOMETRY;

    v_stop_order INTEGER;
    c_stop_order INTEGER;

    tempo_rua_atual DOUBLE PRECISION := 0;
    tempo_intermediario DOUBLE PRECISION := 0;
    tempo_rua_cidadao DOUBLE PRECISION := 0;
    tempo_reconexao DOUBLE PRECISION := 0;
    dist_rua_atual DOUBLE PRECISION := 0;
    dist_intermediario DOUBLE PRECISION := 0;
    dist_rua_cidadao DOUBLE PRECISION := 0;
    dist_reconexao DOUBLE PRECISION := 0;

    v_seq INTEGER := 0;
    veh_node BIGINT;
    resume_source INTEGER;
    resume_target INTEGER;
    resume_node BIGINT;
    dijkstra_edges INTEGER;
    cost_to_source DOUBLE PRECISION;
    cost_to_target DOUBLE PRECISION;
    rec RECORD;

    -- Node the chain is currently exiting from, used to derive each
    -- subsequent segment's REAL traversal direction from actual node
    -- adjacency (source/target) instead of trusting route_streets.direction
    -- — that column can go stale (seen in practice: stop_order sequencing
    -- and street_id chaining were correct and genuinely connected node to
    -- node, but stored direction values didn't match, which flipped some
    -- segments backward and drew the path crossing itself instead of
    -- following the real streets).
    chain_node INTEGER;
BEGIN
    CREATE TEMP TABLE IF NOT EXISTS temp_path_segments (
        seq INTEGER, geom GEOMETRY(LineString, 4326)
    ) ON COMMIT DROP;
    TRUNCATE temp_path_segments;

    CREATE TEMP TABLE IF NOT EXISTS temp_path_stops (
        seq INTEGER, street_id INTEGER, name TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION
    ) ON COMMIT DROP;
    TRUNCATE temp_path_stops;

    CREATE TEMP TABLE IF NOT EXISTS temp_reconnect (
        seq INTEGER, end_vid BIGINT, node BIGINT, edge INTEGER, cost DOUBLE PRECISION, agg_cost DOUBLE PRECISION
    ) ON COMMIT DROP;
    TRUNCATE temp_reconnect;

    -- 1. PEGA A ROTA ATIVA DO VEÍCULO (recorrência semanal: dia da semana + horário de início)
    SELECT cr.id INTO v_route_id
    FROM collection_routes cr
    WHERE cr.vehicle_id = p_vehicle_id
      AND cr.status IN ('active', 'planned')
      AND cr.days_of_week IS NOT NULL
      AND (
        CASE EXTRACT(ISODOW FROM CURRENT_DATE)
          WHEN 1 THEN 'seg' WHEN 2 THEN 'ter' WHEN 3 THEN 'qua'
          WHEN 4 THEN 'qui' WHEN 5 THEN 'sex' WHEN 6 THEN 'sab'
          WHEN 7 THEN 'dom'
        END = ANY(cr.days_of_week)
      )
      AND cr.start_time IS NOT NULL
      AND LOCALTIME >= cr.start_time
    ORDER BY cr.created_at DESC
    LIMIT 1;

    IF v_route_id IS NULL THEN
        RETURN QUERY SELECT 'sem_rota'::TEXT, 0::DOUBLE PRECISION, 'Sem rota ativa hoje'::TEXT, 0::DOUBLE PRECISION, 0, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 2. POSIÇÃO ATUAL DO CAMINHÃO. Feito em duas etapas de propósito: pegar
    -- a posição mais recente é INDEPENDENTE de ela bater com alguma rua da
    -- rota (ver histórico do bug do CROSS JOIN LATERAL nos comentários do
    -- git). Só então tenta encaixar essa posição numa rua da rota, e só se
    -- estiver de fato perto dela (300m) — sem encaixe aqui, v_street_id fica
    -- NULL e o passo 6 reconecta via pgRouting real em vez de simplesmente
    -- desistir ou ignorar a sequência planejada.
    SELECT vp.location INTO v_current_location
    FROM vehicle_positions vp
    WHERE vp.vehicle_id = p_vehicle_id
    ORDER BY vp.recorded_at DESC
    LIMIT 1;

    IF v_current_location IS NULL THEN
        RETURN QUERY SELECT 'sem_rota'::TEXT, 0::DOUBLE PRECISION, 'Sem posição de GPS recente do veículo'::TEXT, 0::DOUBLE PRECISION, 0, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    SELECT
        ST_LineLocatePoint(s.geom, v_current_location),
        s.id, s.name, rs.direction, s.geom, rs.stop_order
    INTO v_fraction, v_street_id, v_street_name, v_direction, v_street_geom, v_stop_order
    FROM streets s
    JOIN route_streets rs ON rs.street_id = s.id
    WHERE rs.route_id = v_route_id
      AND ST_DWithin(s.geom::geography, v_current_location::geography, 300)
    ORDER BY s.geom <-> v_current_location
    LIMIT 1;

    IF v_street_id IS NOT NULL THEN
        SELECT cost, length_km INTO v_street_cost, v_street_length_km
        FROM streets WHERE id = v_street_id;
    END IF;

    -- 3. POSIÇÃO DO CIDADÃO
    IF p_citizen_street_id IS NOT NULL THEN
        -- O chamador já resolveu o trecho certo (com preferência por manter
        -- o nome da rua buscada perto de esquinas) — usa direto, sem
        -- redescobrir e arriscar cair num trecho vizinho não coberto.
        SELECT s.id, s.name,
               ST_LineLocatePoint(s.geom, ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326)), s.geom
        INTO c_street_id, c_street_name, c_fraction, c_street_geom
        FROM streets s
        WHERE s.id = p_citizen_street_id;
    ELSE
        -- Sem trecho pré-resolvido: restringe às ruas desta própria rota,
        -- dentro de um raio curto (mesmo raciocínio do passo 2 para o
        -- caminhão). OSM divide uma rua real em vários trechos curtos (um a
        -- cada cruzamento); sem essa restrição, o trecho literalmente mais
        -- próximo do cidadão às vezes é um trecho vizinho que não faz parte
        -- da rota. Fora desse raio, c_street_id fica NULL e os passos
        -- seguintes resolvem para 'nao_esta_na_rota' normalmente.
        SELECT
            s.id, s.name,
            ST_LineLocatePoint(s.geom, ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326)), s.geom
        INTO c_street_id, c_street_name, c_fraction, c_street_geom
        FROM streets s
        JOIN route_streets rs ON rs.street_id = s.id
        WHERE rs.route_id = v_route_id
          AND ST_DWithin(s.geom::geography, ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326)::geography, 300)
        ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326)
        LIMIT 1;
    END IF;

    IF c_street_id IS NOT NULL THEN
        SELECT cost, length_km INTO c_street_cost, c_street_length_km
        FROM streets WHERE id = c_street_id;
    END IF;

    -- 4. VERIFICA SE O CIDADÃO JÁ ESTÁ NA MESMA RUA (sem precisar reconectar)
    IF v_street_id IS NOT NULL AND v_street_id = c_street_id THEN
        IF v_direction = 'forward' THEN
            IF c_fraction >= v_fraction THEN
                tempo_rua_atual := (c_fraction - v_fraction) * v_street_cost;
                dist_rua_atual := (c_fraction - v_fraction) * v_street_length_km;
                INSERT INTO temp_path_segments VALUES (1, ST_LineSubstring(v_street_geom, v_fraction, c_fraction));
            ELSE
                tempo_rua_atual := (1 - v_fraction + c_fraction) * v_street_cost;
                dist_rua_atual := (1 - v_fraction + c_fraction) * v_street_length_km;
                INSERT INTO temp_path_segments VALUES
                    (1, ST_LineSubstring(v_street_geom, v_fraction, 1)),
                    (2, ST_LineSubstring(v_street_geom, 0, c_fraction));
            END IF;
        ELSE
            IF c_fraction <= v_fraction THEN
                tempo_rua_atual := (v_fraction - c_fraction) * v_street_cost;
                dist_rua_atual := (v_fraction - c_fraction) * v_street_length_km;
                INSERT INTO temp_path_segments VALUES (1, ST_Reverse(ST_LineSubstring(v_street_geom, c_fraction, v_fraction)));
            ELSE
                tempo_rua_atual := (v_fraction + (1 - c_fraction)) * v_street_cost;
                dist_rua_atual := (v_fraction + (1 - c_fraction)) * v_street_length_km;
                INSERT INTO temp_path_segments VALUES
                    (1, ST_Reverse(ST_LineSubstring(v_street_geom, 0, v_fraction))),
                    (2, ST_Reverse(ST_LineSubstring(v_street_geom, c_fraction, 1)));
            END IF;
        END IF;

        RETURN QUERY SELECT
            'na_rua'::TEXT, tempo_rua_atual, format_tempo(tempo_rua_atual), dist_rua_atual, 0,
            v_street_name, c_street_name,
            (SELECT ST_AsGeoJSON(ST_MakeLine(array_agg(geom ORDER BY seq))) FROM temp_path_segments),
            '[]'::TEXT;
        RETURN;
    END IF;

    -- 5. VERIFICA SE A RUA DO CIDADÃO ESTÁ NA ROTA. Uma mesma rua pode
    -- aparecer em mais de um stop_order (a rota passa duas vezes pelo mesmo
    -- trecho — visto na prática nesta base). Sem ORDER BY/LIMIT aqui, qual
    -- linha "ganha" não é garantido pelo padrão SQL e pode variar entre um
    -- SELECT literal (psql) e uma prepared statement (como o driver do
    -- backend usa) — exatamente o tipo de inconsistência que fazia esta
    -- função parecer "às vezes limpa, às vezes com a linha cortando o
    -- quarteirão" em testes manuais. Sempre pega a PRIMEIRA passagem
    -- (menor stop_order): é a que o cidadão de fato vê primeiro.
    SELECT rs.stop_order INTO c_stop_order
    FROM route_streets rs
    WHERE rs.route_id = v_route_id AND rs.street_id = c_street_id
    ORDER BY rs.stop_order
    LIMIT 1;

    IF c_stop_order IS NULL THEN
        RETURN QUERY SELECT 'nao_esta_na_rota'::TEXT, 0::DOUBLE PRECISION, 'Sua rua não está na rota de hoje'::TEXT, 0::DOUBLE PRECISION, 0, v_street_name, c_street_name, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 6. RECONEXÃO: se o GPS do caminhão não bateu com nenhuma rua da rota
    -- (v_street_id NULL, vindo do passo 2), acha o ponto da própria rota
    -- geograficamente mais perto da posição real e calcula um caminho real
    -- (pgr_dijkstra, nó a nó) até lá — nunca uma linha reta até o cidadão
    -- que pule ruas que o caminhão ainda precisa coletar.
    IF v_street_id IS NULL THEN
        SELECT
            CASE WHEN ST_Distance(ST_StartPoint(s.geom), v_current_location) <= ST_Distance(ST_EndPoint(s.geom), v_current_location)
                 THEN s.source ELSE s.target END
        INTO veh_node
        FROM streets s
        ORDER BY s.geom <-> v_current_location
        LIMIT 1;

        SELECT rs.stop_order, s.id, s.name, s.cost, s.length_km, s.geom, s.source, s.target
        INTO v_stop_order, v_street_id, v_street_name, v_street_cost, v_street_length_km, v_street_geom, resume_source, resume_target
        FROM route_streets rs
        JOIN streets s ON s.id = rs.street_id
        WHERE rs.route_id = v_route_id
        ORDER BY s.geom <-> v_current_location
        LIMIT 1;

        -- route_streets.direction can be stale and not match the resume
        -- street's real source/target topology (same staleness problem as
        -- chain_node below handles for later segments) — trusting it here
        -- picked the wrong end of the street to reconnect to in practice,
        -- which fed a wrong node into the dijkstra call below and threw the
        -- rest of the path off. Instead, try reconnecting to BOTH real ends
        -- and keep whichever the graph actually connects to (and is
        -- cheaper, if both do) — that determines the true direction.
        cost_to_source := CASE WHEN veh_node = resume_source THEN 0 END;
        cost_to_target := CASE WHEN veh_node = resume_target THEN 0 END;

        IF cost_to_source IS NULL OR cost_to_target IS NULL THEN
            TRUNCATE temp_reconnect;
            INSERT INTO temp_reconnect
            SELECT seq, end_vid, node, edge, cost, agg_cost
            FROM pgr_dijkstra(
                'SELECT id, source, target, cost, reverse_cost FROM streets',
                veh_node::bigint, ARRAY[resume_source, resume_target]::bigint[], directed := true
            );
            IF cost_to_source IS NULL THEN
                SELECT MAX(agg_cost) INTO cost_to_source FROM temp_reconnect WHERE end_vid = resume_source;
            END IF;
            IF cost_to_target IS NULL THEN
                SELECT MAX(agg_cost) INTO cost_to_target FROM temp_reconnect WHERE end_vid = resume_target;
            END IF;
        END IF;

        IF cost_to_source IS NULL AND cost_to_target IS NULL THEN
            -- Malha de ruas genuinamente desconexa entre a posição real do
            -- caminhão e sua própria rota — não inventa um "chegando" com
            -- número zerado, assume honestamente que não dá pra calcular
            -- agora. Raro: a malha importada é ~99% conectada (checado via
            -- pgr_connectedComponents), isso só deve disparar numa lacuna
            -- real de topologia.
            RETURN QUERY SELECT 'sem_rota'::TEXT, 0::DOUBLE PRECISION, 'Não foi possível calcular o trajeto no momento'::TEXT, 0::DOUBLE PRECISION, 0, NULL::TEXT, c_street_name, NULL::TEXT, NULL::TEXT;
            RETURN;
        END IF;

        IF cost_to_target IS NULL OR (cost_to_source IS NOT NULL AND cost_to_source <= cost_to_target) THEN
            v_direction := 'forward';
            resume_node := resume_source;
        ELSE
            v_direction := 'reverse';
            resume_node := resume_target;
        END IF;
        v_fraction := CASE WHEN v_direction = 'forward' THEN 0 ELSE 1 END;

        IF veh_node IS DISTINCT FROM resume_node THEN
            dijkstra_edges := 0;
            FOR rec IN
                -- pgr_dijkstra's row semantics are node[i] --edge[i]--> node[i+1] —
                -- edge[i] STARTS at THIS row's own node, not the previous
                -- row's (a LAG(node) here would be off by one and get the
                -- direction backwards for every edge, first one included).
                SELECT
                    CASE WHEN s.source = p.node THEN 'forward' ELSE 'reverse' END AS direction,
                    p.cost AS seg_cost, s.length_km AS seg_length_km, s.geom AS seg_geom
                FROM temp_reconnect p
                JOIN streets s ON s.id = p.edge
                WHERE p.end_vid = resume_node AND p.edge <> -1
                ORDER BY p.seq
            LOOP
                dijkstra_edges := dijkstra_edges + 1;
                v_seq := v_seq + 1;
                tempo_reconexao := tempo_reconexao + COALESCE(rec.seg_cost, 0);
                dist_reconexao := dist_reconexao + COALESCE(rec.seg_length_km, 0);
                IF rec.direction = 'forward' THEN
                    INSERT INTO temp_path_segments VALUES (v_seq, rec.seg_geom);
                ELSE
                    INSERT INTO temp_path_segments VALUES (v_seq, ST_Reverse(rec.seg_geom));
                END IF;
            END LOOP;
        END IF;

        -- Caso raro: o ponto de reconexão é a própria rua do cidadão.
        IF v_street_id = c_street_id THEN
            v_seq := v_seq + 1;
            IF v_direction = 'forward' THEN
                tempo_rua_atual := (c_fraction - v_fraction) * v_street_cost;
                dist_rua_atual := (c_fraction - v_fraction) * v_street_length_km;
                INSERT INTO temp_path_segments VALUES (v_seq, ST_LineSubstring(v_street_geom, v_fraction, c_fraction));
            ELSE
                tempo_rua_atual := (v_fraction - c_fraction) * v_street_cost;
                dist_rua_atual := (v_fraction - c_fraction) * v_street_length_km;
                INSERT INTO temp_path_segments VALUES (v_seq, ST_Reverse(ST_LineSubstring(v_street_geom, c_fraction, v_fraction)));
            END IF;

            RETURN QUERY SELECT
                'chegando'::TEXT,
                (tempo_reconexao + tempo_rua_atual),
                format_tempo(tempo_reconexao + tempo_rua_atual),
                (dist_reconexao + dist_rua_atual),
                0,
                v_street_name, c_street_name,
                (SELECT ST_AsGeoJSON(ST_MakeLine(array_agg(geom ORDER BY seq))) FROM temp_path_segments),
                '[]'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- 7. O CAMINHÃO JÁ PASSOU DA RUA DO CIDADÃO?
    IF v_stop_order > c_stop_order THEN
        RETURN QUERY SELECT 'passou'::TEXT, 0::DOUBLE PRECISION, 'O caminhão já passou pela sua rua hoje'::TEXT, 0::DOUBLE PRECISION, 0, v_street_name, c_street_name, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 8. TEMPO/GEOMETRIA RESTANTE NA RUA ATUAL
    v_seq := v_seq + 1;
    IF v_direction = 'forward' THEN
        tempo_rua_atual := (1 - v_fraction) * v_street_cost;
        dist_rua_atual := (1 - v_fraction) * v_street_length_km;
        INSERT INTO temp_path_segments VALUES (v_seq, ST_LineSubstring(v_street_geom, v_fraction, 1));
    ELSE
        tempo_rua_atual := v_fraction * v_street_cost;
        dist_rua_atual := v_fraction * v_street_length_km;
        INSERT INTO temp_path_segments VALUES (v_seq, ST_Reverse(ST_LineSubstring(v_street_geom, 0, v_fraction)));
    END IF;

    -- Node the current/resume street exits at, anchoring the adjacency
    -- check used from here on (see chain_node declaration above).
    SELECT CASE WHEN v_direction = 'forward' THEN target ELSE source END
    INTO chain_node
    FROM streets WHERE id = v_street_id;

    -- 9. RUAS INTERMEDIÁRIAS (entre a atual e a do cidadão), com geometria e marcador por rua
    FOR rec IN
        SELECT rs.street_id, rs.direction, s.name, s.cost, s.length_km, s.geom, s.source, s.target
        FROM route_streets rs
        JOIN streets s ON s.id = rs.street_id
        WHERE rs.route_id = v_route_id
          AND rs.stop_order > v_stop_order
          AND rs.stop_order < c_stop_order
        ORDER BY rs.stop_order
    LOOP
        v_seq := v_seq + 1;
        tempo_intermediario := tempo_intermediario + COALESCE(rec.cost, 0);
        dist_intermediario := dist_intermediario + COALESCE(rec.length_km, 0);
        IF rec.source = chain_node THEN
            INSERT INTO temp_path_segments VALUES (v_seq, rec.geom);
            chain_node := rec.target;
        ELSIF rec.target = chain_node THEN
            INSERT INTO temp_path_segments VALUES (v_seq, ST_Reverse(rec.geom));
            chain_node := rec.source;
        ELSIF rec.direction = 'forward' THEN
            -- Not adjacent to the previous segment (shouldn't happen for a
            -- properly planned route) — fall back to the stored direction
            -- rather than fabricate a connection.
            INSERT INTO temp_path_segments VALUES (v_seq, rec.geom);
            chain_node := rec.target;
        ELSE
            INSERT INTO temp_path_segments VALUES (v_seq, ST_Reverse(rec.geom));
            chain_node := rec.source;
        END IF;
        INSERT INTO temp_path_stops VALUES (
            v_seq, rec.street_id, rec.name,
            ST_Y(ST_LineInterpolatePoint(rec.geom, 0.5)), ST_X(ST_LineInterpolatePoint(rec.geom, 0.5))
        );
    END LOOP;

    -- 10. RUA DO CIDADÃO (do início da rua até a casa) — direção real
    -- (adjacência ao nó da cadeia), com fallback pro valor salvo.
    SELECT
        CASE
            WHEN source = chain_node THEN 'forward'
            WHEN target = chain_node THEN 'reverse'
            ELSE (SELECT rs.direction FROM route_streets rs WHERE rs.route_id = v_route_id AND rs.street_id = c_street_id)
        END
    INTO v_direction
    FROM streets WHERE id = c_street_id;

    v_seq := v_seq + 1;
    IF v_direction = 'forward' THEN
        tempo_rua_cidadao := c_fraction * c_street_cost;
        dist_rua_cidadao := c_fraction * c_street_length_km;
        INSERT INTO temp_path_segments VALUES (v_seq, ST_LineSubstring(c_street_geom, 0, c_fraction));
    ELSE
        tempo_rua_cidadao := (1 - c_fraction) * c_street_cost;
        dist_rua_cidadao := (1 - c_fraction) * c_street_length_km;
        INSERT INTO temp_path_segments VALUES (v_seq, ST_Reverse(ST_LineSubstring(c_street_geom, c_fraction, 1)));
    END IF;

    -- 11. RETORNA
    RETURN QUERY SELECT
        'chegando'::TEXT,
        (tempo_reconexao + tempo_rua_atual + tempo_intermediario + tempo_rua_cidadao),
        format_tempo(tempo_reconexao + tempo_rua_atual + tempo_intermediario + tempo_rua_cidadao),
        (dist_reconexao + dist_rua_atual + dist_intermediario + dist_rua_cidadao),
        (c_stop_order - v_stop_order),
        v_street_name,
        c_street_name,
        (SELECT ST_AsGeoJSON(ST_MakeLine(array_agg(geom ORDER BY seq))) FROM temp_path_segments),
        (SELECT COALESCE(json_agg(json_build_object('streetId', street_id, 'name', name, 'lat', lat, 'lng', lng) ORDER BY seq), '[]'::json)::TEXT FROM temp_path_stops);

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

