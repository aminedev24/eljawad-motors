// stockFilterBarV2.js
// Top horizontal filter bar  adapted from Ichinomiya's FilterForm, rebranded to
// Eljawad Motors and wired to Eljawad Motors's filter keys (make, bodyType, price tier,
// transmission, fuel, yearFrom, yearTo, search). Controlled component: option
// lists are derived from live stock and passed in by stockListV2.
// Compact layout mirrors the Ichinomiya marketplace: 6-column grid, tiny
// labels, text-xs fields, and Search/Reset inline in the grid.
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders, faSearch, faUndo } from "@fortawesome/free-solid-svg-icons";

const labelCls =
  "block text-[9px] font-extrabold uppercase tracking-wider text-gray-500 mb-1";
const fieldCls =
  "w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-brand-charcoal outline-none transition focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/30";

const StockFilterBarV2 = ({
  filters = {},
  searchInput = "",
  onSearchInputChange,
  onSearchSubmit,
  onFilterChange,
  onReset,
  hasActiveFilters = false,
  options = {},
}) => {
  const {
    makes = [],
    bodyTypes = [],
    models = [],
    transmissions = [],
    fuels = [],
    years = [],
    minPriceOptions = [],
    maxPriceOptions = [],
  } = options;

  const change = (key) => (e) => onFilterChange(key, e.target.value || null);

  return (
    <div className="mb-4 rounded-lg border border-gray-300 bg-white p-3.5 shadow-sm md:p-4">
      <h3 className="mb-2.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-brand-navy">
        <FontAwesomeIcon icon={faSliders} className="h-3 w-3" />
        Search vehicles
        <span className="ml-1 h-px flex-1 bg-gray-200" />
      </h3>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit && onSearchSubmit();
        }}
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <div>
            <label className={labelCls}>Make</label>
            <select value={filters.make || ""} onChange={change("make")} className={fieldCls}>
              <option value="">Any make</option>
              {makes.map((m) => (
                <option key={m.name} value={m.name} disabled={m.count === 0}>
                  {m.name} ({m.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Model</label>
            <select value={filters.model || ""} onChange={change("model")} className={fieldCls}>
              <option value="">All models</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Body type</label>
            <select
              value={filters.bodyType || ""}
              onChange={change("bodyType")}
              className={fieldCls}
            >
              <option value="">Any body</option>
              {bodyTypes.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Min price</label>
            <select value={filters.minPrice || ""} onChange={change("minPrice")} className={fieldCls}>
              {minPriceOptions.map((o) => (
                <option key={o.value || "min-any"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Max price</label>
            <select value={filters.maxPrice || ""} onChange={change("maxPrice")} className={fieldCls}>
              {maxPriceOptions.map((o) => (
                <option key={o.value || "max-any"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Transmission</label>
            <select
              value={filters.transmission || ""}
              onChange={change("transmission")}
              className={fieldCls}
            >
              <option value="">Any</option>
              {transmissions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Fuel</label>
            <select value={filters.fuel || ""} onChange={change("fuel")} className={fieldCls}>
              <option value="">Any</option>
              {fuels.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Year from</label>
            <select
              value={filters.yearFrom || ""}
              onChange={change("yearFrom")}
              className={fieldCls}
            >
              <option value="">Any</option>
              {years.map((y) => (
                <option key={`from-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Year to</label>
            <select value={filters.yearTo || ""} onChange={change("yearTo")} className={fieldCls}>
              <option value="">Any</option>
              {years.map((y) => (
                <option key={`to-${y}`} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Keyword</label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => onSearchInputChange && onSearchInputChange(e.target.value)}
                placeholder="Make, model or ref"
                className={`${fieldCls} pl-8`}
              />
            </div>
          </div>

          <div className="flex gap-1.5 items-end">
            <button
              type="submit"
              className="flex flex-1 flex-col items-center justify-center rounded border border-primary bg-primary py-1.5 px-2 text-[9px] font-extrabold uppercase tracking-wider text-white transition hover:bg-primary/90"
            >
              <FontAwesomeIcon icon={faSearch} className="mb-0.5 h-3 w-3" />
              Search
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={!hasActiveFilters}
              className="flex flex-1 flex-col items-center justify-center rounded bg-gray-100 py-1.5 px-2 text-[9px] font-extrabold uppercase tracking-wider text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              title="Reset filters"
            >
              <FontAwesomeIcon icon={faUndo} className="mb-0.5 h-3 w-3" />
              Reset
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StockFilterBarV2;
