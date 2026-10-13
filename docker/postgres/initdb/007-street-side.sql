-- ============================================
-- FUNÇÃO: de que lado do trecho um ponto está
-- ============================================
-- 'left' / 'right' relativo ao sentido source→target do trecho, pelo sinal
-- do produto vetorial entre a direção LOCAL do trecho (uns 2 m antes e
-- depois do ponto mais próximo — o trecho inteiro pode fazer curva) e o
-- ponto. Em lng/lat puro mesmo: escalar um eixo não muda o sinal.
-- NULL quando o ponto está praticamente em cima do eixo da rua — aí não dá
-- pra afirmar o lado, e quem decide é o munícipe na tela.
CREATE OR REPLACE FUNCTION street_side(
    p_geom GEOMETRY,
    p_point GEOMETRY,
    p_min_meters DOUBLE PRECISION DEFAULT 3
)
RETURNS TEXT AS $$
DECLARE
    f DOUBLE PRECISION;
    window_f DOUBLE PRECISION;
    a GEOMETRY;
    b GEOMETRY;
    cross_z DOUBLE PRECISION;
BEGIN
    IF ST_Distance(p_geom::geography, p_point::geography) < p_min_meters THEN
        RETURN NULL;
    END IF;

    f := ST_LineLocatePoint(p_geom, p_point);
    window_f := LEAST(0.5, 2.0 / GREATEST(ST_Length(p_geom::geography), 1));
    a := ST_LineInterpolatePoint(p_geom, GREATEST(f - window_f, 0));
    b := ST_LineInterpolatePoint(p_geom, LEAST(f + window_f, 1));

    cross_z := (ST_X(b) - ST_X(a)) * (ST_Y(p_point) - ST_Y(a))
             - (ST_Y(b) - ST_Y(a)) * (ST_X(p_point) - ST_X(a));

    IF cross_z > 0 THEN
        RETURN 'left';
    ELSIF cross_z < 0 THEN
        RETURN 'right';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
