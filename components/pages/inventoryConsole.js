// inventoryConsole.js — homepage hero replacement.
// Was a photo slider + a separate multi-field search form + a static
// make/body-type grid. This replaces all three with one dense "search the
// live inventory" panel (counts computed from the same stock feed the
// listing page uses), matching the auction/inventory-platform direction the
// client asked for instead of a marketing-style hero banner.
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { apiInventory } from "../utilities/apiBase";
import { useStockAccess, stockUrl } from "../vehicles/stockAccess";
import { getCarBodyType, getCarMake } from "../utilities/ichinomiyaCardAdapter";
import { fetchAllMakesModels, getMakesData, getModelsData } from "../vehicles/vehicleData";

const BUDGETS = [
  { label: "Under $10,000", minPrice: "", maxPrice: "10000" },
  { label: "$10,000 – $20,000", minPrice: "10000", maxPrice: "20000" },
  { label: "$20,000 – $40,000", minPrice: "20000", maxPrice: "40000" },
  { label: "$40,000 – $75,000", minPrice: "40000", maxPrice: "75000" },
  { label: "$75,000+", minPrice: "75000", maxPrice: "" },
];

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const InventoryConsole = () => {
  const router = useRouter();
  const [cars, setCars] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const { tier, loading: accessLoading } = useStockAccess();
  // Locked rows carry no price or body type, so those counts are only
  // meaningful for activated accounts.
  const showSpecCounts = tier === "full";

  useEffect(() => {
    fetchAllMakesModels().finally(() => setCatalogLoaded(true));
  }, []);

  // Same URL (tier included) as the stock rows below, so the browser serves
  // both from one request.
  useEffect(() => {
    if (accessLoading) return;
    fetch(stockUrl(`${apiInventory}/cars/fetchStock.php`, tier), { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCars(Array.isArray(data) ? data : []))
      .catch(() => setCars([]));
  }, [tier, accessLoading]);

  const makesWithCounts = useMemo(() => {
    const map = new Map();
    cars.forEach((car) => {
      const name = getCarMake(car);
      if (!name) return;
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [cars]);

  // The full make catalog (67 makes / thousands of models) merged with live
  // stock counts, for the Make/Model selects - "Shop by Make" tiles above
  // stay stock-derived only, since they're a quick-browse shortcut rather
  // than an exhaustive filter.
  const selectMakes = useMemo(() => {
    const countMap = new Map(makesWithCounts.map((m) => [m.name, m.count]));
    const stockOnlyCounts = new Map();
    cars.forEach((car) => {
      const name = getCarMake(car);
      if (!name) return;
      stockOnlyCounts.set(name, (stockOnlyCounts.get(name) || 0) + 1);
    });
    const names = new Set([...getMakesData(), ...stockOnlyCounts.keys()]);
    return Array.from(names)
      .map((name) => ({ name, count: countMap.get(name) || stockOnlyCounts.get(name) || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cars, makesWithCounts, catalogLoaded]);

  const modelsForSelectedMake = useMemo(() => {
    if (!selectedMake) return [];
    const models = getModelsData()[selectedMake];
    return Array.isArray(models) ? models : [];
  }, [selectedMake, catalogLoaded]);

  const bodyTypesWithCounts = useMemo(() => {
    const map = new Map();
    cars.forEach((car) => {
      const name = getCarBodyType(car);
      if (!name) return;
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [cars]);

  const budgetsWithCounts = useMemo(() => {
    return BUDGETS.map((b) => {
      const min = b.minPrice ? Number(b.minPrice) : -Infinity;
      const max = b.maxPrice ? Number(b.maxPrice) : Infinity;
      const count = cars.filter((car) => {
        const p = Number(car.final_value ?? car.price ?? 0);
        return p >= min && p <= max;
      }).length;
      return { ...b, count };
    });
  }, [cars]);

  const goToMake = (name) => router.push(`/stock-list?make=${encodeURIComponent(name)}`);
  const goToBodyType = (name) => router.push(`/stock-list?bodyType=${encodeURIComponent(name)}`);
  const goToBudget = (b) => {
    const params = new URLSearchParams();
    if (b.minPrice) params.set("minPrice", b.minPrice);
    if (b.maxPrice) params.set("maxPrice", b.maxPrice);
    router.push(`/stock-list?${params.toString()}`);
  };
  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("search", keyword.trim());
    if (selectedMake) params.set("make", selectedMake);
    if (selectedModel) params.set("model", selectedModel);
    if (selectedBodyType) params.set("bodyType", selectedBodyType);
    if (selectedBudget) {
      const budget = budgetsWithCounts.find((b) => b.label === selectedBudget);
      if (budget?.minPrice) params.set("minPrice", budget.minPrice);
      if (budget?.maxPrice) params.set("maxPrice", budget.maxPrice);
    }
    router.push(`/stock-list?${params.toString()}`);
  };

  return (
    <div className="px-4 pt-4 md:pt-6">
      <div className="mx-auto max-w-[1320px] border border-gray-200 bg-white">
        {/* Console header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-5 py-3.5">
          <h1 className="font-display text-lg font-bold text-white md:text-xl">
            Search the Live Inventory
          </h1>
          <span className="font-mono text-xs text-white/80">
            {cars.length ? `${cars.length.toLocaleString()} vehicles` : "Loading stock…"} &middot; updated from Japan
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-2 border-b border-gray-200 px-5 py-3 md:flex-row md:items-center">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by make, model or stock number"
            className="w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-navy md:flex-1"
          />
          <select
            value={selectedMake}
            onChange={(e) => {
              setSelectedMake(e.target.value);
              setSelectedModel("");
            }}
            className="border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-navy md:w-40"
          >
            <option value="">Any Make</option>
            {selectMakes.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.count})
              </option>
            ))}
          </select>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedMake}
            className="border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-navy disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 md:w-40"
          >
            <option value="">Any Model</option>
            {modelsForSelectedMake.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedBodyType}
            onChange={(e) => setSelectedBodyType(e.target.value)}
            className="border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-navy md:w-40"
          >
            <option value="">Any Body Type</option>
            {bodyTypesWithCounts.map((b) => (
              <option key={b.name} value={b.name}>
                {showSpecCounts ? `${b.name} (${b.count})` : b.name}
              </option>
            ))}
          </select>
          <select
            value={selectedBudget}
            onChange={(e) => setSelectedBudget(e.target.value)}
            className="border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-navy md:w-44"
          >
            <option value="">Any Budget</option>
            {budgetsWithCounts.map((b) => (
              <option key={b.label} value={b.label}>
                {showSpecCounts ? `${b.label} (${b.count})` : b.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-brand-orange px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-brand-orange-hover"
          >
            Search
          </button>
        </form>

        {/* Hidden on mobile - the Make/Body Type/Budget selects above already
            cover this, and repeating them as tiles was noise on a small screen */}
        <div className="hidden md:grid md:grid-cols-[1.3fr_1fr_1fr]">
          {/* Shop by make */}
          <div className="border-b border-gray-200 p-4 md:border-b-0 md:border-r">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Shop by Make</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {(makesWithCounts.length ? makesWithCounts : Array.from({ length: 8 }, () => null)).map((m, i) =>
                m ? (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => goToMake(m.name)}
                    className="border border-gray-200 px-1 py-2 text-center text-[11px] font-semibold transition hover:border-brand-navy"
                  >
                    {m.name}
                    <div className="font-mono text-[10px] text-brand-orange">{m.count}</div>
                  </button>
                ) : (
                  <div key={`skel-${i}`} className="h-[46px] animate-pulse border border-gray-100 bg-gray-100" />
                )
              )}
            </div>
          </div>

          {/* Shop by body type */}
          <div className="border-b border-gray-200 p-4 md:border-b-0 md:border-r">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Shop by Body Type</p>
            <div className="flex flex-col gap-1.5">
              {(bodyTypesWithCounts.length || cars.length ? bodyTypesWithCounts : Array.from({ length: 5 }, () => null)).map((b, i) =>
                b ? (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => goToBodyType(b.name)}
                    className="flex items-center justify-between border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-brand-navy"
                  >
                    <span>{b.name}</span>
                    {showSpecCounts && <span className="font-mono text-gray-400">{b.count}</span>}
                  </button>
                ) : (
                  <div key={`skel-${i}`} className="h-[30px] animate-pulse border border-gray-100 bg-gray-100" />
                )
              )}
            </div>
          </div>

          {/* Shop by budget */}
          <div className="p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Shop by Budget</p>
            <div className="flex flex-col gap-1.5">
              {budgetsWithCounts.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => goToBudget(b)}
                  className="flex items-center justify-between border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-brand-navy"
                >
                  <span>{b.label}</span>
                  {showSpecCounts && <span className="font-mono text-gray-400">{b.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryConsole;
