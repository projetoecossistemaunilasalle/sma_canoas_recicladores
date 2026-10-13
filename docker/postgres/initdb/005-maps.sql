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
    highway_type TEXT,
    -- Bairro(s) do trecho, pelo ponto do meio — derivado dos limites em
    -- neighborhoods (008), para a busca de endereço filtrar e mostrar
    -- bairros sem um join espacial a cada tecla. Rua de divisa fica com os
    -- dois. Recalculado pelos dois imports (backend/src/db/street-neighborhoods.ts).
    neighborhood_names TEXT[]
);

CREATE INDEX IF NOT EXISTS streets_geom_idx ON streets USING GIST(geom);
CREATE INDEX IF NOT EXISTS streets_source_idx ON streets(source);
CREATE INDEX IF NOT EXISTS streets_target_idx ON streets(target);

CREATE TABLE IF NOT EXISTS collection_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
    total_distance_km DOUBLE PRECISION,
    total_duration_seconds DOUBLE PRECISION,
    -- Recorrência semanal: dias em que a rota roda, turno e horário de início.
    days_of_week TEXT[],       -- ex: {seg,qua,sex}
    shift TEXT,                -- 'manha' | 'tarde' | 'noite'
    start_time TIME,           -- ex: 08:00
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
    -- true = rua escolhida pela cooperativa; false = conector preenchido pelo pgr_dijkstra
    is_stop BOOLEAN NOT NULL DEFAULT false,
    -- Coleta por lado da rua / trecho parcial — só vale em paradas (conector
    -- só passa, não coleta). Uma cooperativa pode atender a mesma rua em
    -- dias diferentes, cada dia de um lado, e às vezes só até certo ponto.
    --   side: relativo ao sentido geométrico do trecho (source→target — o
    --         mesmo em que RouteService.computePath sempre percorre uma parada).
    --   start_fraction / end_fraction: pedaço coletado, no espaço 0..1 do
    --         ST_LineLocatePoint (0 = início da geometria).
    side TEXT NOT NULL DEFAULT 'both' CHECK (side IN ('both', 'left', 'right')),
    start_fraction DOUBLE PRECISION NOT NULL DEFAULT 0,
    end_fraction DOUBLE PRECISION NOT NULL DEFAULT 1,
    CHECK (start_fraction >= 0 AND end_fraction <= 1 AND start_fraction < end_fraction)
);

-- ============================================
-- FUNÇÃO: pedaço de um trecho, no sentido em que é percorrido
-- ============================================
-- Da fração p_from até p_to (0..1, espaço do ST_LineLocatePoint): se
-- p_from > p_to, o pedaço sai invertido, já no sentido de quem dirige.
CREATE OR REPLACE FUNCTION street_piece(p_geom GEOMETRY, p_from DOUBLE PRECISION, p_to DOUBLE PRECISION)
RETURNS GEOMETRY AS $$
    SELECT CASE WHEN p_from <= p_to THEN ST_LineSubstring(p_geom, p_from, p_to)
                ELSE ST_Reverse(ST_LineSubstring(p_geom, p_to, p_from)) END
$$ LANGUAGE sql IMMUTABLE;

-- ============================================
-- FUNÇÃO: ETA seguindo a rota
-- ============================================
-- Quanto falta para o caminhão da rota p_route_id chegar na casa do munícipe
-- (o pin + o trecho e o lado que ele confirmou), SEMPRE seguindo a sequência
-- de coleta planejada — nunca em linha reta pulando ruas que o caminhão
-- ainda tem que coletar. Só conta a passagem que coleta o lado e o trecho
-- dele (route_streets.side / start_fraction / end_fraction): o caminhão no
-- mesmo quarteirão coletando o outro lado não é "a rua dele".
-- Quando o GPS não bate com nenhuma rua da rota, reconecta com um
-- pgr_dijkstra real (nó a nó — mesmo padrão de RouteService.computePath)
-- até o ponto mais próximo da rota, e só então segue a sequência.
-- Devolve também o trajeto (path_geojson) e as paradas no caminho
-- (stops_json) para desenhar no mapa. O tempo em texto é formatado no backend.
DROP FUNCTION IF EXISTS get_eta_following_route(UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT);
DROP FUNCTION IF EXISTS format_tempo(DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION get_eta_following_route(
    p_route_id UUID,
    p_citizen_lat DOUBLE PRECISION,
    p_citizen_lng DOUBLE PRECISION,
    p_citizen_street_id INTEGER,
    p_citizen_side TEXT  -- 'left' | 'right', relativo a source→target
)
RETURNS TABLE (
    status TEXT,                -- 'chegando', 'na_rua', 'passou', 'nao_esta_na_rota', 'sem_rota'
    seconds DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    path_geojson TEXT,          -- LineString GeoJSON: posição atual -> ... -> casa
    stops_json TEXT             -- [{streetId,name,lat,lng}] paradas no caminho, em ordem
) AS $$
DECLARE
    citizen GEOMETRY := ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326);
    truck GEOMETRY;
    -- cur: trecho da rota onde o caminhão está (ou onde reentra nela);
    -- cit: trecho do munícipe. Ambos com .fraction = posição no trecho.
    cur RECORD;
    cit RECORD;
    on_route BOOLEAN;
    c_order INTEGER;
    exit_f DOUBLE PRECISION;
    pieces GEOMETRY[] := '{}';
    stops JSONB := '[]';
    total_s DOUBLE PRECISION := 0;
    total_km DOUBLE PRECISION := 0;
    veh_node BIGINT;
    resume_node BIGINT;
    cost_to_source DOUBLE PRECISION;
    cost_to_target DOUBLE PRECISION;
    -- Nó por onde a cadeia está saindo: a direção de cada trecho seguinte
    -- sai da adjacência real (source/target), não de route_streets.direction.
    chain_node BIGINT;
    rec RECORD;
BEGIN
    -- 1. POSIÇÃO ATUAL DO CAMINHÃO DA ROTA
    SELECT vp.location INTO truck
    FROM collection_routes cr
    JOIN vehicle_positions vp ON vp.vehicle_id = cr.vehicle_id
    WHERE cr.id = p_route_id
    ORDER BY vp.recorded_at DESC
    LIMIT 1;

    IF truck IS NULL THEN
        RETURN QUERY SELECT 'sem_rota'::TEXT, 0::DOUBLE PRECISION, 0::DOUBLE PRECISION, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 2. ENCAIXA O CAMINHÃO NUMA RUA DA ROTA, só se estiver de fato perto
    -- (300m). Sem encaixe, o passo 5 reconecta via pgRouting.
    SELECT s.id, s.name, s.geom, s.cost, s.length_km, s.source, s.target,
           rs.stop_order, rs.direction, ST_LineLocatePoint(s.geom, truck) AS fraction
    INTO cur
    FROM streets s
    JOIN route_streets rs ON rs.street_id = s.id
    WHERE rs.route_id = p_route_id
      AND ST_DWithin(s.geom::geography, truck::geography, 300)
    ORDER BY s.geom <-> truck
    LIMIT 1;
    on_route := FOUND;

    -- 3. TRECHO DO MUNÍCIPE (o que ele confirmou na tela)
    SELECT s.id, s.name, s.geom, s.cost, s.length_km, s.source, s.target,
           ST_LineLocatePoint(s.geom, citizen) AS fraction
    INTO cit
    FROM streets s
    WHERE s.id = p_citizen_street_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'nao_esta_na_rota'::TEXT, 0::DOUBLE PRECISION, 0::DOUBLE PRECISION, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 4. JÁ NA MESMA RUA, numa passagem que coleta o lado e o trecho dele
    -- (senão — ex.: coletando o outro lado agora, e volta depois pelo dele —
    -- segue, e o passo 5 acha a passagem certa).
    IF on_route AND cur.id = cit.id AND EXISTS (
        SELECT 1 FROM route_streets rs
        WHERE rs.route_id = p_route_id
          AND rs.stop_order = cur.stop_order
          AND rs.is_stop
          AND rs.side IN ('both', p_citizen_side)
          AND cit.fraction BETWEEN rs.start_fraction AND rs.end_fraction
    ) THEN
        exit_f := CASE WHEN cur.direction = 'forward' THEN 1 ELSE 0 END;
        IF (CASE WHEN cur.direction = 'forward' THEN cit.fraction >= cur.fraction ELSE cit.fraction <= cur.fraction END) THEN
            pieces := pieces || street_piece(cur.geom, cur.fraction, cit.fraction);
            total_s := abs(cit.fraction - cur.fraction) * cur.cost;
            total_km := abs(cit.fraction - cur.fraction) * cur.length_km;
        ELSE
            -- A casa já ficou para trás nesta rua: até o fim dela e entra de novo pelo começo.
            pieces := pieces || street_piece(cur.geom, cur.fraction, exit_f) || street_piece(cur.geom, 1 - exit_f, cit.fraction);
            total_s := (abs(exit_f - cur.fraction) + abs(cit.fraction - (1 - exit_f))) * cur.cost;
            total_km := (abs(exit_f - cur.fraction) + abs(cit.fraction - (1 - exit_f))) * cur.length_km;
        END IF;

        RETURN QUERY SELECT 'na_rua'::TEXT, total_s, total_km, ST_AsGeoJSON(ST_MakeLine(pieces)), '[]'::TEXT;
        RETURN;
    END IF;

    -- 5. A PASSAGEM DA ROTA QUE COLETA A CASA. Uma rua pode estar na rota
    -- mais de uma vez: sempre a primeira (menor stop_order), a que o
    -- munícipe vê primeiro. ORDER BY explícito — sem ele, qual linha ganha
    -- variava entre o psql e a prepared statement do backend.
    SELECT rs.stop_order INTO c_order
    FROM route_streets rs
    WHERE rs.route_id = p_route_id
      AND rs.street_id = cit.id
      AND rs.is_stop
      AND rs.side IN ('both', p_citizen_side)
      AND cit.fraction BETWEEN rs.start_fraction AND rs.end_fraction
    ORDER BY rs.stop_order
    LIMIT 1;

    IF c_order IS NULL THEN
        RETURN QUERY SELECT 'nao_esta_na_rota'::TEXT, 0::DOUBLE PRECISION, 0::DOUBLE PRECISION, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 6. RECONEXÃO: o GPS não bateu com nenhuma rua da rota — acha o trecho
    -- da rota mais perto da posição real e um caminho real (pgr_dijkstra)
    -- até ele. route_streets.direction desse trecho não é confiável para
    -- escolher a ponta de entrada: tenta as DUAS pontas reais e fica com a
    -- que o grafo conecta (e mais barata, se ambas).
    IF NOT on_route THEN
        SELECT CASE WHEN ST_Distance(ST_StartPoint(s.geom), truck) <= ST_Distance(ST_EndPoint(s.geom), truck)
                    THEN s.source ELSE s.target END
        INTO veh_node
        FROM streets s
        ORDER BY s.geom <-> truck
        LIMIT 1;

        SELECT s.id, s.name, s.geom, s.cost, s.length_km, s.source, s.target,
               rs.stop_order, rs.direction, 0::DOUBLE PRECISION AS fraction
        INTO cur
        FROM route_streets rs
        JOIN streets s ON s.id = rs.street_id
        WHERE rs.route_id = p_route_id
        ORDER BY s.geom <-> truck
        LIMIT 1;

        cost_to_source := CASE WHEN veh_node = cur.source THEN 0 END;
        cost_to_target := CASE WHEN veh_node = cur.target THEN 0 END;

        IF cost_to_source IS NULL OR cost_to_target IS NULL THEN
            CREATE TEMP TABLE IF NOT EXISTS temp_reconnect (
                seq INTEGER, end_vid BIGINT, node BIGINT, edge BIGINT, cost DOUBLE PRECISION, agg_cost DOUBLE PRECISION
            ) ON COMMIT DROP;
            TRUNCATE temp_reconnect;
            INSERT INTO temp_reconnect
            SELECT d.seq, d.end_vid, d.node, d.edge, d.cost, d.agg_cost
            FROM pgr_dijkstra(
                'SELECT id, source, target, cost, reverse_cost FROM streets',
                veh_node, ARRAY[cur.source, cur.target]::BIGINT[], directed := true
            ) d;
            cost_to_source := COALESCE(cost_to_source, (SELECT MAX(agg_cost) FROM temp_reconnect WHERE end_vid = cur.source));
            cost_to_target := COALESCE(cost_to_target, (SELECT MAX(agg_cost) FROM temp_reconnect WHERE end_vid = cur.target));
        END IF;

        IF cost_to_source IS NULL AND cost_to_target IS NULL THEN
            -- Malha genuinamente desconexa entre o caminhão e a própria rota
            -- (raro: a malha é ~99% conectada) — não inventa um "chegando".
            RETURN QUERY SELECT 'sem_rota'::TEXT, 0::DOUBLE PRECISION, 0::DOUBLE PRECISION, NULL::TEXT, NULL::TEXT;
            RETURN;
        END IF;

        IF cost_to_target IS NULL OR (cost_to_source IS NOT NULL AND cost_to_source <= cost_to_target) THEN
            cur.direction := 'forward';
            cur.fraction := 0;
            resume_node := cur.source;
        ELSE
            cur.direction := 'reverse';
            cur.fraction := 1;
            resume_node := cur.target;
        END IF;

        IF veh_node IS DISTINCT FROM resume_node THEN
            -- pgr_dijkstra: node[i] --edge[i]--> node[i+1] — edge[i] SAI do
            -- nó desta própria linha (um LAG(node) erraria todo sentido).
            FOR rec IN
                SELECT s.source = p.node AS forward, p.cost, s.length_km, s.geom
                FROM temp_reconnect p
                JOIN streets s ON s.id = p.edge
                WHERE p.end_vid = resume_node AND p.edge <> -1
                ORDER BY p.seq
            LOOP
                pieces := pieces || CASE WHEN rec.forward THEN rec.geom ELSE ST_Reverse(rec.geom) END;
                total_s := total_s + COALESCE(rec.cost, 0);
                total_km := total_km + COALESCE(rec.length_km, 0);
            END LOOP;
        END IF;

        -- Caso raro: o ponto de reconexão é a própria rua do munícipe.
        IF cur.id = cit.id THEN
            pieces := pieces || street_piece(cur.geom, cur.fraction, cit.fraction);
            total_s := total_s + abs(cit.fraction - cur.fraction) * cur.cost;
            total_km := total_km + abs(cit.fraction - cur.fraction) * cur.length_km;
            RETURN QUERY SELECT 'chegando'::TEXT, total_s, total_km, ST_AsGeoJSON(ST_MakeLine(pieces)), '[]'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- 7. O CAMINHÃO JÁ PASSOU DA CASA?
    IF cur.stop_order > c_order THEN
        RETURN QUERY SELECT 'passou'::TEXT, 0::DOUBLE PRECISION, 0::DOUBLE PRECISION, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- 8. O QUE FALTA DA RUA ATUAL
    exit_f := CASE WHEN cur.direction = 'forward' THEN 1 ELSE 0 END;
    pieces := pieces || street_piece(cur.geom, cur.fraction, exit_f);
    total_s := total_s + abs(exit_f - cur.fraction) * cur.cost;
    total_km := total_km + abs(exit_f - cur.fraction) * cur.length_km;
    chain_node := CASE WHEN cur.direction = 'forward' THEN cur.target ELSE cur.source END;

    -- 9. RUAS INTERMEDIÁRIAS, com um marcador por rua
    FOR rec IN
        SELECT rs.street_id, rs.direction, s.name, s.cost, s.length_km, s.geom, s.source, s.target
        FROM route_streets rs
        JOIN streets s ON s.id = rs.street_id
        WHERE rs.route_id = p_route_id
          AND rs.stop_order > cur.stop_order
          AND rs.stop_order < c_order
        ORDER BY rs.stop_order
    LOOP
        -- Sentido pela adjacência ao trecho anterior; o valor salvo só vale
        -- se não forem adjacentes (não deveria acontecer numa rota planejada).
        IF rec.source = chain_node OR (rec.target IS DISTINCT FROM chain_node AND rec.direction = 'forward') THEN
            pieces := pieces || rec.geom;
            chain_node := rec.target;
        ELSE
            pieces := pieces || ST_Reverse(rec.geom);
            chain_node := rec.source;
        END IF;
        total_s := total_s + COALESCE(rec.cost, 0);
        total_km := total_km + COALESCE(rec.length_km, 0);
        stops := stops || jsonb_build_object(
            'streetId', rec.street_id, 'name', rec.name,
            'lat', ST_Y(ST_LineInterpolatePoint(rec.geom, 0.5)), 'lng', ST_X(ST_LineInterpolatePoint(rec.geom, 0.5))
        );
    END LOOP;

    -- 10. RUA DO MUNÍCIPE, da entrada dela até a casa (mesma regra de sentido)
    IF cit.source = chain_node
       OR (cit.target IS DISTINCT FROM chain_node AND (
            SELECT rs.direction FROM route_streets rs
            WHERE rs.route_id = p_route_id AND rs.street_id = cit.id AND rs.stop_order = c_order
       ) = 'forward') THEN
        pieces := pieces || street_piece(cit.geom, 0, cit.fraction);
        total_s := total_s + cit.fraction * cit.cost;
        total_km := total_km + cit.fraction * cit.length_km;
    ELSE
        pieces := pieces || street_piece(cit.geom, 1, cit.fraction);
        total_s := total_s + (1 - cit.fraction) * cit.cost;
        total_km := total_km + (1 - cit.fraction) * cit.length_km;
    END IF;

    RETURN QUERY SELECT 'chegando'::TEXT, total_s, total_km, ST_AsGeoJSON(ST_MakeLine(pieces)), stops::TEXT;
END;
$$ LANGUAGE plpgsql;
