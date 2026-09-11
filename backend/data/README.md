# data/

`canoas.osm` is a raw OpenStreetMap extract of the Canoas, RS street network — committed to git (~4MB) so deploy builds don't depend on the Overpass API being reachable. Consumed by `pnpm streets:import`.

To (re)download it, run from the repo root:

```bash
curl -s -X POST "https://overpass-api.de/api/interpreter" \
  --data-urlencode 'data=[out:xml][timeout:180];area(3600242574)->.canoas;(way(area.canoas)[highway];);(._;>;);out body;' \
  -o backend/data/canoas.osm
```

`3600242574` is Canoas' OSM administrative-boundary relation id (`242574`, offset by Overpass' `+3600000000` area-id convention). Look up a different city's relation id via `https://nominatim.openstreetmap.org/search?city=<name>&state=<state>&country=<country>&format=json`.
