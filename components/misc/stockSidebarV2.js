// stockSidebarV2.js
// Left "Shop by" filter sidebar — adapted from Ichinomiya's Sidebar, rebranded
// to Eljawad Motors. Counts are computed from the live stock (passed in),
// not from a static stock.json. Clicking an active row toggles it off.
// Also holds the full filter set (model/price/transmission/fuel/year/
// keyword) so this is the ONE filter surface on desktop - real reference
// sites (e.g. Ichinomiya Motors) run filters from a single sidebar rather
// than duplicating fields across a sidebar AND a separate top bar, which
// research flags as an anti-pattern. stockFilterBarV2 still covers the same
// ground for narrow/mobile widths where this sidebar is hidden.
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

const fieldCls =
  "w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-brand-charcoal outline-none transition focus:border-brand-navy focus:ring-1 focus:ring-brand-navy/30";
const labelCls = "mb-1 block text-[9px] font-extrabold uppercase tracking-wider text-gray-500";

const Panel = ({ title, count, children }) => (
  <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-brand-navy">
      {title}
      {count != null && <span className="ml-auto text-[10px] opacity-70">{count}</span>}
    </div>
    <div className="max-h-72 overflow-y-auto">{children}</div>
  </div>
);

const Row = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between border-b border-gray-100 px-3.5 py-1.5 text-xs transition last:border-b-0 ${
      active
        ? "bg-brand-navy/10 font-semibold text-brand-navy"
        : "text-gray-600 hover:bg-brand-navy/5 hover:text-brand-navy"
    }`}
  >
    {children}
  </button>
);

const StockSidebarV2 = ({
  makes = [],
  bodyTypes = [],
  priceOptions = [],
  selected = {},
  onQuickFilter,
  searchInput = "",
  onSearchInputChange,
  onSearchSubmit,
  onFilterChange,
  options = {},
  onReset,
  hasActiveFilters = false,
}) => {
  const { models = [], transmissions = [], fuels = [], years = [] } = options;
  const change = (key) => (e) => onFilterChange && onFilterChange(key, e.target.value || null);

  const toggle = (key, value) => {
    const current = selected[key] || "";
    onQuickFilter(key, current === String(value) ? null : value);
  };

  const isPriceActive = (o) => {
    const [min, max] = String(o.value).split("-");
    return (
      (min ? selected.minPrice === min : !selected.minPrice) &&
      (max ? selected.maxPrice === max : !selected.maxPrice)
    );
  };

  const togglePrice = (o) => {
    if (!o.value) {
      onQuickFilter("minPrice", null);
      onQuickFilter("maxPrice", null);
      return;
    }
    if (isPriceActive(o)) {
      onQuickFilter("minPrice", null);
      onQuickFilter("maxPrice", null);
      return;
    }
    const [min, max] = String(o.value).split("-");
    onQuickFilter("minPrice", min || null);
    onQuickFilter("maxPrice", max || null);
  };

  return (
    <aside className="hidden w-[230px] shrink-0 lg:block">
      <div className="sticky top-4">
        <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-navy">Filters</span>
            <button
              type="button"
              onClick={onReset}
              disabled={!hasActiveFilters}
              className="text-[10px] font-bold uppercase tracking-wide text-gray-400 transition hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit && onSearchSubmit();
            }}
          >
            <label className={labelCls}>Search</label>
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => onSearchInputChange && onSearchInputChange(e.target.value)}
                placeholder="Make, model, chassis or ref"
                className={`${fieldCls} pl-8`}
              />
            </div>
          </form>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Model</label>
              <select value={selected.model || ""} onChange={change("model")} className={fieldCls}>
                <option value="">All</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Transmission</label>
              <select value={selected.transmission || ""} onChange={change("transmission")} className={fieldCls}>
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
              <select value={selected.fuel || ""} onChange={change("fuel")} className={fieldCls}>
                <option value="">Any</option>
                {fuels.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <div className="flex-1">
                <label className={labelCls}>Yr from</label>
                <select value={selected.yearFrom || ""} onChange={change("yearFrom")} className={fieldCls}>
                  <option value="">Any</option>
                  {years.map((y) => (
                    <option key={`from-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Yr to</label>
                <select value={selected.yearTo || ""} onChange={change("yearTo")} className={fieldCls}>
                  <option value="">Any</option>
                  {years.map((y) => (
                    <option key={`to-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <Panel title="Shop by Make" count={makes.length}>
          {makes.map((m) => (
            <Row
              key={m.name}
              active={(selected.make || "") === m.name}
              onClick={() => toggle("make", m.name)}
            >
              <span className="truncate">{m.name}</span>
              <span className="ml-2 text-[11px] font-bold text-gray-400">{m.count}</span>
            </Row>
          ))}
        </Panel>

        <Panel title="Shop by Body" count={bodyTypes.length}>
          {bodyTypes.map((b) => (
            <Row
              key={b.name}
              active={(selected.bodyType || "") === b.name}
              onClick={() => toggle("bodyType", b.name)}
            >
              <span className="truncate">{b.name}</span>
              <span className="ml-2 text-[11px] font-bold text-gray-400">{b.count}</span>
            </Row>
          ))}
        </Panel>

        <Panel title="Shop by Budget">
          {priceOptions
            .filter((o) => o.value)
            .map((o) => (
              <Row
                key={o.value}
                active={isPriceActive(o)}
                onClick={() => togglePrice(o)}
              >
                <span>{o.label}</span>
                <span className="ml-2 text-[11px] font-bold text-gray-300">›</span>
              </Row>
            ))}
        </Panel>
      </div>
    </aside>
  );
};

export default StockSidebarV2;
