import { sql, type SQL } from "drizzle-orm"

// Street-name matching for the address search (GET /public/geocode), done
// against our own `streets` table — the public Nominatim API forbids
// search-as-you-type. The typed query (normalizeStreetText) and streets.name
// (normalizedStreetName, in SQL) go through the same folding, so the two must
// stay in sync: lowercase, no accents, the spelling variants old street names
// mix freely (Victor/Vitor, Luiz/Luis, Ruy/Rui, Walter/Valter, Philippe/Felipe)
// collapsed, and punctuation turned into single spaces ("Dr." → "dr",
// "BR-116" → "br 116").
const FOLD_FROM = "áàâãäéèêëíìîïóòôõöúùûüçñyzw"
const FOLD_TO = "aaaaaeeeeiiiiooooouuuucnisv"
const FOLD_MAP = new Map([...FOLD_FROM].map((c, i) => [c, FOLD_TO[i]]))

export function normalizeStreetText(text: string): string {
  return [...text.normalize("NFC").toLowerCase()]
    .map((c) => FOLD_MAP.get(c) ?? c)
    .join("")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/ct/g, "t")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function normalizedStreetName(column: SQL): SQL {
  return sql`trim(regexp_replace(replace(replace(replace(translate(lower(${column}), ${FOLD_FROM}, ${FOLD_TO}), 'ph', 'f'), 'th', 't'), 'ct', 't'), '[^a-z0-9]+', ' ', 'g'))`
}

// Connector words and bare numbers don't have to appear in the name — "rua
// joão de souza" still finds "Rua João Souza", and a house number typed after
// the street ("tiradentes 450") isn't part of any name — but they still rank
// results ("rua 1" puts "Rua 1" before "Rua 13").
const OPTIONAL_WORDS = new Set(["de", "da", "do", "das", "dos", "e"])

export function parseStreetQuery(query: string) {
  const tokens = [...new Set(normalizeStreetText(query).split(" ").filter(Boolean))]
  const required = tokens.filter((t) => !OPTIONAL_WORDS.has(t) && !/^\d+$/.test(t))
  return { tokens, required: required.length > 0 ? required : tokens }
}
