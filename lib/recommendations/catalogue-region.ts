export type CatalogueRegion = {
  allowedCountries: string[] | null;
  blockedCountries: string[] | null;
};

// Provider rules are cached globally; viewer filtering is done at read time.
// null means unknown/malformed and must not admit this provider response.
export function parseCatalogueRegion(value: unknown): CatalogueRegion | null {
  const worldwide = { allowedCountries: null, blockedCountries: null };
  if (value === undefined) return worldwide;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.length !== 1 || !["allowed", "blocked"].includes(keys[0]))
    return null;
  const list = row[keys[0]];
  if (
    !Array.isArray(list) ||
    list.length > 250 ||
    list.some((code) => typeof code !== "string" || !/^[A-Z]{2}$/.test(code)) ||
    new Set(list).size !== list.length
  )
    return null;
  if (keys[0] === "allowed")
    return list.length ? { ...worldwide, allowedCountries: list } : null;
  return list.length ? { ...worldwide, blockedCountries: list } : worldwide;
}

// Vercel supplies this header. Other hosts require an explicitly trusted adapter;
// browser query parameters, account country and arbitrary proxy headers are not used.
export function catalogueViewerCountry(
  headers: Headers,
  vercel: string | undefined,
) {
  if (vercel !== "1") return null;
  const country = headers.get("x-vercel-ip-country");
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}
