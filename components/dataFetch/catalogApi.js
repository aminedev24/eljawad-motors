// Full-catalog endpoints (server/inventory/catalog), used instead of
// fetchStock.php when SITE.fullCatalog is set: the server filters, sorts and
// pages ~80k cars, so the browser only ever downloads one page.
import { apiInventory } from "../utilities/apiBase";
import { stockUrl } from "../vehicles/stockAccess";

const FILTER_KEYS = ["make", "model", "bodyType", "transmission", "fuel", "minPrice", "maxPrice", "yearFrom", "yearTo", "search"];

export async function fetchCatalogPage({ filters = {}, sort = "newest", page = 1, perPage = 15, tier, signal }) {
  const params = new URLSearchParams();
  FILTER_KEYS.forEach((key) => {
    const value = String(filters[key] ?? "").trim();
    if (value) params.set(key, value);
  });
  params.set("sort", sort);
  params.set("page", String(page));
  params.set("perPage", String(perPage));
  const res = await fetch(stockUrl(`${apiInventory}/catalog/search.php?${params}`, tier), {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Catalog search failed (${res.status})`);
  return res.json();
}

// Filter options + counts change once an hour; one request per page load.
let facetsPromise = null;
export function fetchCatalogFacets() {
  if (!facetsPromise) {
    facetsPromise = fetch(`${apiInventory}/catalog/facets.php`)
      .then((res) => {
        if (!res.ok) throw new Error(`Catalog facets failed (${res.status})`);
        return res.json();
      })
      .catch((err) => {
        facetsPromise = null;
        throw err;
      });
  }
  return facetsPromise;
}
