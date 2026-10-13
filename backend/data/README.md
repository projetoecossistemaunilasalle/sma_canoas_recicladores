# data/

Raw OpenStreetMap extracts for Canoas, RS — committed to git so deploy builds don't depend on the Overpass API being reachable. Both are OSM data, under the ODbL (attribution: "© OpenStreetMap contributors").

| File | What | Consumed by |
|---|---|---|
| `canoas.osm` (~4MB) | street network (`way[highway]`) | `pnpm streets:import` |
| `canoas-bairros.json` (~200KB) | the 18 bairro boundaries (`boundary=administrative`, `admin_level=10`), with inline geometry | `pnpm neighborhoods:import` |

To (re)download them, run from the repo root. Overpass rejects requests without a User-Agent (HTTP 406), and when it's busy it answers with an HTML/XML error page instead of data — check the file before committing it.

```bash
curl -s -A "canoas-recicla/1.0" -X POST "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:xml][timeout:180];area(3600242574)->.canoas;(way(area.canoas)[highway];);(._;>;);out body;' \
  -o backend/data/canoas.osm

curl -s -A "canoas-recicla/1.0" -X POST "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:json][timeout:90];area(3600242574)->.canoas;relation(area.canoas)[boundary=administrative][admin_level=10];out geom;' \
  -o backend/data/canoas-bairros.json
```

`3600242574` is Canoas' OSM administrative-boundary relation id (`242574`, offset by Overpass' `+3600000000` area-id convention). Look up a different city's relation id via `https://nominatim.openstreetmap.org/search?city=<name>&state=<state>&country=<country>&format=json`.

The bairro limits are drawn by OSM volunteers, not taken from the municipal law. If official limits are needed, the prefeitura's boundary file can replace `canoas-bairros.json` — `import-neighborhoods.ts` only needs a name and closed rings per bairro.
