// stockListV2.js
// Preview stock list that adopts the Ichinomiya marketplace LAYOUT (left filter
// sidebar + top filter bar + dense results grid + pagination) while reusing
// Eljawad Motors's own data source and client-side filter/sort/pagination logic
// (lifted from components/misc/stockList.js). Rebranded to Eljawad Motors navy/orange.
// The existing /stock-list and its components are left untouched.
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSliders, faXmark, faCarSide, faGrip, faList, faTableCellsLarge } from "@fortawesome/free-solid-svg-icons";
import CarCardV2 from "../vehicles/carCard";
import StockFilterBarV2 from "./stockFilterBarV2";
import StockSidebarV2 from "./stockSidebarV2";
import { getCarPlaceholderImage } from "../utilities/stockPlaceholders";
import { apiInventory } from "../utilities/apiBase";
import { fetchAllMakesModels, getMakesData, getModelsData } from "../vehicles/vehicleData";
import {
  getCarBodyType,
  getCarMake,
  getCarPriceUsd,
  getCarModelCode,
  getCarChassis,
  normalizeCurrency,
  displayStockId,
  parseImageUrls,
} from "../utilities/ichinomiyaCardAdapter";
import { formatNumberWithUnit } from "../utilities/numberFormat";
import { useCompare } from "../vehicles/useCompare";

// Denser row for the "list" view toggle - same fields as the grid card, laid
// out horizontally instead of stacked, closer to an inventory-tool listing
// than a marketplace card.
const StockListRow = ({ car, onViewDetails }) => {
  const { isComparing, toggleCompare, isFull } = useCompare();
  const comparing = isComparing(car);
  const priceAmount = getCarPriceUsd(car);
  const currency = normalizeCurrency(car);
  const stockRef = car.ref_no || car.stock_no || "";
  const thumb = Array.isArray(car.images) ? car.images[0] : "";

  return (
    <div
      className="flex items-center gap-3 border border-gray-200 bg-white p-2 transition hover:border-brand-navy cursor-pointer"
      onClick={() => onViewDetails(car)}
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden bg-gray-100">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={`${car.make} ${car.model}`} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-xs font-bold uppercase text-brand-charcoal">
            {car.make} {car.model}
          </h3>
          {stockRef && (
            <span className="shrink-0 font-mono text-[9px] font-bold text-white bg-[var(--grey-text)] px-1.5 py-0.5">
              {stockRef}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wide text-gray-500">
          <span>{car.year || "N/A"}</span>
          <span>{formatNumberWithUnit(car.mileage) || "N/A"} km</span>
          <span>{formatNumberWithUnit(car.engine_capacity || car.cc) || "N/A"}</span>
          <span>{car.transmission || "N/A"}</span>
          <span>{car.fuel || "N/A"}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-display text-sm font-bold text-[var(--accent-color)]">
          {priceAmount > 0 ? `${currency} ${priceAmount.toLocaleString()}` : "TBD"}
        </div>
        <label
          className="mt-1 flex items-center justify-end gap-1 text-[9px] font-semibold uppercase text-gray-400 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={comparing}
            disabled={!comparing && isFull}
            onChange={() => toggleCompare(car)}
            className="h-3 w-3 accent-[var(--primary-color)]"
          />
          Compare
        </label>
      </div>
    </div>
  );
};

// Table row for the "table" view toggle - matches jpctrade.com's spec-table
// pattern (stock #, spec columns, price) more literally than the card/row
// views.
const StockTableRow = ({ car, onViewDetails }) => {
  const priceAmount = getCarPriceUsd(car);
  const currency = normalizeCurrency(car);
  const stockRef = car.ref_no || car.stock_no || "";
  const chassis = getCarChassis(car);
  const thumb = Array.isArray(car.images) ? car.images[0] : "";

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => onViewDetails(car)}>
      <td className="p-2">
        <div className="h-12 w-16 shrink-0 overflow-hidden bg-gray-100">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={`${car.make} ${car.model}`} className="h-full w-full object-cover" loading="lazy" />
          )}
        </div>
      </td>
      <td className="p-3 font-mono text-xs font-bold text-brand-navy">{stockRef}</td>
      <td className="p-3 font-semibold text-brand-charcoal">{car.make} {car.model}</td>
      <td className="p-3 text-gray-600">{car.year || "N/A"}</td>
      <td className="p-3 font-mono text-xs text-gray-600">{chassis || "N/A"}</td>
      <td className="p-3 text-gray-600">{formatNumberWithUnit(car.mileage) || "N/A"} km</td>
      <td className="p-3 text-gray-600">{formatNumberWithUnit(car.engine_capacity || car.cc) || "N/A"}</td>
      <td className="p-3 text-gray-600">{car.transmission || "N/A"}</td>
      <td className="p-3 font-bold text-[var(--accent-color)]">
        {priceAmount > 0 ? `${currency} ${priceAmount.toLocaleString()}` : "TBD"}
      </td>
      <td className="p-3 text-right">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-navy hover:underline">
          View &rarr;
        </span>
      </td>
    </tr>
  );
};

const priceFilterOptions = [
  { label: "Any budget", value: "" },
  { label: "Under $10,000", value: "0-10000" },
  { label: "$10,000 – $20,000", value: "10000-20000" },
  { label: "$20,000 – $40,000", value: "20000-40000" },
  { label: "$40,000 – $75,000", value: "40000-75000" },
  { label: "$75,000 – $150,000", value: "75000-150000" },
  { label: "$150,000+", value: "150000-" },
];

const getCarPrice = (car) => {
  return getCarPriceUsd(car);
};

const getCarMileage = (car) => {
  const n = Number(String(car?.mileage ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : Infinity;
};

const getCarRecency = (car) => {
  const shipped = new Date(car?.ship_date).getTime();
  if (Number.isFinite(shipped)) return shipped;
  const year = Number(car?.year);
  return Number.isFinite(year) && year > 0 ? new Date(year, 0, 1).getTime() : 0;
};

const sortSelections = [
  { value: "newest", label: "Latest arrivals" },
  { value: "price", label: "Lowest price" },
  { value: "mileage", label: "Lowest mileage" },
  { value: "popularity", label: "Most viewed" },
];

const EMPTY_FILTERS = {
  make: "",
  bodyType: "",
  minPrice: "",
  maxPrice: "",
  model: "",
  transmission: "",
  fuel: "",
  yearFrom: "",
  yearTo: "",
  search: "",
};

const normalizeText = (value) =>
  typeof value === "string"
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : value != null
    ? String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

const StocklistV2 = () => {
  const router = useRouter();

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(true);

  const apiUrl = apiInventory;
  const imgBasePath =
    process.env.NODE_ENV === "development"
      ? "http://localhost/artisbay-inc/server/inventory/cars"
      : "/server/inventory/cars";

  const itemsPerPage = 15;
  const maxPageButtons = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [unifiedMakesLoaded, setUnifiedMakesLoaded] = useState(false);
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  // Initialize filters from the URL query once (supports deep links / homepage
  // search params). After that, filters live in local state so they are always
  // instant and reliable.
  useEffect(() => {
    if (!router.isReady || initialized) return;
    const q = router.query;
    const val = (k) =>
      typeof q[k] === "string" ? q[k] : Array.isArray(q[k]) ? q[k][0] || "" : "";
    setFilters({
      make: val("make"),
      bodyType: val("bodyType") || val("type"),
      minPrice: val("minPrice") || val("priceFrom"),
      maxPrice: val("maxPrice") || val("priceTo"),
      model: val("model"),
      transmission: val("transmission"),
      // The homepage "Search vehicles" widget (components/misc/searchContainer.js)
      // sends ?fuelType=, not ?fuel= — without this fallback its fuel selection
      // would silently do nothing once this component became the live /stock-list.
      fuel: val("fuel") || val("fuelType"),
      yearFrom: val("yearFrom"),
      yearTo: val("yearTo"),
      search: val("search"),
    });
    setSearchInput(val("search"));
    const sortFromUrl = val("sort");
    if (sortFromUrl === "price" || sortFromUrl === "mileage" || sortFromUrl === "popularity" || sortFromUrl === "newest") {
      setSortOption(sortFromUrl);
    }
    setInitialized(true);
  }, [router.isReady, router.query, initialized]);

  // Mirror filters into the URL once they're initialized, so a refresh, a
  // shared link, or the browser Back button from a vehicle detail page all
  // land back on the same filtered/search results instead of a blank list —
  // previously filters only ever lived in local state and refreshing (or
  // navigating away and back) silently dropped everything the customer had
  // set. router.replace (shallow) updates the URL/history without a
  // server round trip or re-running the cars fetch above.
  useEffect(() => {
    if (!initialized || !router.isReady) return;
    const query = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query[key] = value;
    });
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, initialized, router.isReady]);

  // The header's own quick-search box (present on every page) falls back to
  // this key when it's not showing a page with its own ?search= — keep it in
  // sync with the keyword filter here, including clearing it on Reset, so
  // that fallback never shows a term the customer has already cleared.
  useEffect(() => {
    if (!initialized) return;
    try {
      if (filters.search) sessionStorage.setItem("eljawad_last_search", filters.search);
      else sessionStorage.removeItem("eljawad_last_search");
    } catch (e) {}
  }, [filters.search, initialized]);

  // The one-shot initializer above only runs once per mount — so submitting
  // the header quick-search while ALREADY on /stock-list used to be silently
  // ignored, and the URL mirror below then stripped the fresh ?search= right
  // back off. Keep listening for inbound ?search= changes (header search,
  // homepage widget, footer links…) after initialization instead.
  const urlSearch =
    typeof router.query?.search === "string"
      ? router.query.search
      : Array.isArray(router.query?.search)
      ? router.query.search[0] || ""
      : "";
  useEffect(() => {
    if (!router.isReady || !initialized) return;
    if ((urlSearch || "") === (filters.search || "")) return;
    setFilters((prev) => ({ ...prev, search: urlSearch }));
    setSearchInput(urlSearch);
  }, [urlSearch, filters.search, initialized, router.isReady]);

  const selectedMake = filters.make;
  const selectedBodyType = filters.bodyType;
  const selectedMinPrice = filters.minPrice;
  const selectedMaxPrice = filters.maxPrice;
  const selectedModel = filters.model;
  const selectedTransmission = filters.transmission;
  const selectedFuel = filters.fuel;
  const selectedYearFrom = filters.yearFrom;
  const selectedYearTo = filters.yearTo;
  const searchKeyword = filters.search;

  const handleViewDetails = useCallback(
    (car) => {
      if (!car) return;
      const identifier = car.ref_no || car.id || car.stock_no;
      if (!identifier) {
        console.warn("Vehicle missing identifier", car);
        return;
      }
      // /vehicle?id= (pages/vehicle.js) exports as one real static file, unlike
      // /vehicle/[vehicleId] which only exists on disk as the literal bracket
      // path - a hard reload or new-tab open of a real id there 404s on static
      // hosts with no server-side rewrite (GitHub Pages, unlike the HostGator
      // build's .htaccess fallback).
      router.push(`/vehicle?id=${encodeURIComponent(String(identifier).trim())}`);
    },
    [router]
  );

  useEffect(() => {
    setLoading(true);
    setViewLoading(true);

    const processData = (data) => {
      const normalizedData = data.map((car) => {
        const sanitizedImages = parseImageUrls(car.image_urls);
        return {
          ...car,
          images: sanitizedImages.length > 0 ? sanitizedImages : [getCarPlaceholderImage(car)],
        };
      });
      setCars(normalizedData);
      setLoading(false);
      setTimeout(() => setViewLoading(false), 80);
    };

    const finishEmpty = () => {
      setLoading(false);
      setTimeout(() => setViewLoading(false), 80);
    };

    fetch(`${apiUrl}/cars/fetchStock.php`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(processData)
      .catch((err) => {
        console.error("Error fetching cars:", err);
        // Dev preview fallback: when the local PHP backend isn't running, load a
        // static production snapshot so the design can be reviewed with real data.
        if (process.env.NODE_ENV === "development") {
          fetch("/dev-stock-snapshot.json")
            .then((res) => res.json())
            .then(processData)
            .catch(finishEmpty);
        } else {
          finishEmpty();
        }
      });
  }, [apiUrl]);

  // Load the unified makes/models catalog once (same source the customer
  // forms use), so the filter bar offers every make/model — not just the
  // ones currently present in stock.
  useEffect(() => {
    let cancelled = false;
    fetchAllMakesModels()
      .then(() => { if (!cancelled) setUnifiedMakesLoaded(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const updateFilters = useCallback((updates = {}, options = {}) => {
    setFilters((prev) => {
      const base = options.reset ? { ...EMPTY_FILTERS } : { ...prev };
      Object.entries(updates).forEach(([key, value]) => {
        if (key in base) base[key] = value == null ? "" : value;
      });
      return base;
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleSearchSubmit = () =>
    updateFilters({ search: searchInput.trim() }, { reset: false });
  const handleResetFilters = () => {
    updateFilters({}, { reset: true });
    setSearchInput("");
  };
  const handleFilterChange = (key, value) => {
    // Changing the make invalidates whatever model was previously picked —
    // without this, the live V1 stock-list had exactly this bug: the model
    // dropdown kept showing options (and a stale selection) from the OLD
    // make until the customer clicked Search, because it was wired to a
    // separately-committed value instead of resetting immediately.
    if (key === "make") {
      updateFilters({ make: value, model: "" }, { reset: false });
    } else {
      updateFilters({ [key]: value }, { reset: false });
    }
  };
  const handleQuickFilter = (key, value) => updateFilters({ [key]: value }, { reset: false });

  const filteredCars = useMemo(() => {
    const nMake = normalizeText(selectedMake);
    const nBody = normalizeText(selectedBodyType);
    const nModel = normalizeText(selectedModel);
    const nTrans = normalizeText(selectedTransmission);
    const nFuel = normalizeText(selectedFuel);
    const nSearch = normalizeText(searchKeyword);
    const yearFromNum = selectedYearFrom ? Number(selectedYearFrom) : null;
    const yearToNum = selectedYearTo ? Number(selectedYearTo) : null;

    return cars.filter((car) => {
      const carMake = normalizeText(getCarMake(car));
      const carBody = normalizeText(getCarBodyType(car));
      const carModel = normalizeText(car.model);
      const carModelCode = normalizeText(getCarModelCode(car));
      const carChassis = normalizeText(getCarChassis(car));
      const carRef = normalizeText(car.ref_no || car.stock_no || car.id);
      // Customers only ever see the "TP-XXXX" id printed on the vehicle detail
      // page (displayStockId), never the raw ref_no — search the displayed
      // form too, or pasting the exact id they were shown finds nothing.
      const carStockId = normalizeText(displayStockId(car));
      const carTrans = normalizeText(car.transmission);
      const carFuel = normalizeText(car.fuel);
      const carColor = normalizeText(car.color);
      const carYear = Number(car.year) || 0;

      const makeMatch = selectedMake ? carMake === nMake : true;
      const bodyMatch = selectedBodyType
        ? carBody === nBody || carBody.includes(nBody) || nBody.includes(carBody)
        : true;
      const priceMatch = (() => {
        if (!selectedMinPrice && !selectedMaxPrice) return true;
        const p = getCarPrice(car);
        const min = selectedMinPrice ? Number(selectedMinPrice) : -Infinity;
        const max = selectedMaxPrice ? Number(selectedMaxPrice) : Infinity;
        return p >= min && p <= max;
      })();
      const modelMatch = nModel ? carModel.includes(nModel) : true;
      const transMatch = nTrans ? carTrans === nTrans : true;
      const fuelMatch = nFuel ? carFuel === nFuel : true;
      const yearFromMatch = yearFromNum && yearFromNum > 0 ? carYear >= yearFromNum : true;
      const yearToMatch = yearToNum && yearToNum > 0 ? carYear <= yearToNum : true;
      // Split into words so multi-word queries (e.g. "golf 2018", "tp 1384")
      // match across different fields instead of requiring the whole phrase
      // to appear verbatim in a single one — the old exact-phrase check made
      // most real queries (make + model, model + year, "TP-1234") fail.
      const searchTokens = nSearch ? nSearch.split(" ").filter(Boolean) : [];
      const searchableFields = [
        carMake,
        carBody,
        carModel,
        carModelCode,
        carChassis,
        carRef,
        carStockId,
        carYear ? String(carYear) : "",
        carTrans,
        carFuel,
        carColor,
      ];
      const searchMatch = searchTokens.length
        ? searchTokens.every((token) => searchableFields.some((f) => f.includes(token)))
        : true;

      return (
        makeMatch &&
        bodyMatch &&
        priceMatch &&
        modelMatch &&
        transMatch &&
        fuelMatch &&
        yearFromMatch &&
        yearToMatch &&
        searchMatch
      );
    });
  }, [
    cars,
    selectedMake,
    selectedBodyType,
    selectedMinPrice,
    selectedMaxPrice,
    selectedModel,
    selectedTransmission,
    selectedFuel,
    selectedYearFrom,
    selectedYearTo,
    searchKeyword,
  ]);

  const sortedCars = useMemo(() => {
    return [...filteredCars].sort((a, b) => {
      switch (sortOption) {
        case "price":
          return getCarPrice(a) - getCarPrice(b);
        case "mileage":
          return getCarMileage(a) - getCarMileage(b);
        case "popularity":
          return (b.popularity || 0) - (a.popularity || 0);
        case "newest":
        default:
          return getCarRecency(b) - getCarRecency(a);
      }
    });
  }, [filteredCars, sortOption]);

  const filtersSignature = useMemo(
    () =>
      [
        selectedMake,
        selectedBodyType,
        selectedMinPrice,
        selectedMaxPrice,
        selectedModel,
        selectedTransmission,
        selectedFuel,
        selectedYearFrom,
        selectedYearTo,
        searchKeyword,
        sortOption,
      ]
        .map((v) => v || "")
        .join("|"),
    [
      selectedMake,
      selectedBodyType,
      selectedMinPrice,
      selectedMaxPrice,
      selectedModel,
      selectedTransmission,
      selectedFuel,
      selectedYearFrom,
      selectedYearTo,
      searchKeyword,
      sortOption,
    ]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filtersSignature]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedCars.length / itemsPerPage)),
    [sortedCars.length, itemsPerPage]
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedCars = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedCars.slice(start, start + itemsPerPage);
  }, [sortedCars, currentPage, itemsPerPage]);

  const paginatedCarsForGrid = paginatedCars;

  useEffect(() => {
    if (loading) {
      setViewLoading(true);
      return;
    }
    setViewLoading(true);
    const timer = setTimeout(() => setViewLoading(false), 80);
    return () => clearTimeout(timer);
  }, [loading, currentPage, filtersSignature]);

  const visiblePageNumbers = useMemo(() => {
    const total = totalPages;
    const maxButtons = Math.max(1, maxPageButtons);
    if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);
    const half = Math.floor(maxButtons / 2);
    let start = currentPage - half;
    let end = currentPage + half;
    if (start < 1) {
      start = 1;
      end = start + maxButtons - 1;
    } else if (end > total) {
      end = total;
      start = end - maxButtons + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, maxPageButtons, totalPages]);

  const goToPage = (page) => {
    setViewLoading(true);
    setCurrentPage((prev) => {
      const next = Math.min(Math.max(page, 1), totalPages);
      return prev === next ? prev : next;
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- option lists + counts derived from live stock ---
  const countBy = useCallback(
    (keyOrGetter) => {
      const map = new Map();
      cars.forEach((car) => {
        const rawValue =
          typeof keyOrGetter === "function" ? keyOrGetter(car) : car[keyOrGetter];
        const raw = (rawValue || "").toString().trim();
        if (!raw || raw.toLowerCase() === "unknown") return;
        map.set(raw, (map.get(raw) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    [cars]
  );

  const makesWithCounts = useMemo(() => countBy((car) => getCarMake(car)), [countBy]);
  const bodiesWithCounts = useMemo(() => countBy((car) => getCarBodyType(car)), [countBy]);

  const availableMakes = useMemo(
    () => makesWithCounts.map((m) => m.name).sort((a, b) => a.localeCompare(b)),
    [makesWithCounts]
  );
  const availableBodyTypes = useMemo(
    () => bodiesWithCounts.map((b) => b.name).sort((a, b) => a.localeCompare(b)),
    [bodiesWithCounts]
  );
  const availableTransmissions = useMemo(
    () => countBy("transmission").map((t) => t.name).sort((a, b) => a.localeCompare(b)),
    [countBy]
  );
  const availableFuels = useMemo(
    () => countBy("fuel").map((f) => f.name).sort((a, b) => a.localeCompare(b)),
    [countBy]
  );
  const availableYears = useMemo(() => {
    const set = new Set();
    cars.forEach((car) => {
      const y = Number(car.year);
      if (Number.isFinite(y) && y > 1950 && y < 2100) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [cars]);

  // Scoped to the LIVE selected make (selectedMake === filters.make, updated
  // immediately on every change — there's no separate draft/committed split
  // in this component), so picking a make refreshes the model list on the
  // spot instead of only after a form submit. Derived straight from real
  // inventory data (never a hardcoded per-make list), so any model actually
  // in stock — including ones not in stock today — surfaces automatically
  // the moment real units exist, with nothing to keep manually in sync.
  const availableModels = useMemo(() => {
    const nMake = normalizeText(selectedMake);
    const set = new Set();
    cars.forEach((car) => {
      if (selectedMake && normalizeText(getCarMake(car)) !== nMake) return;
      const model = (car.model || "").trim();
      if (model) set.add(model);
    });
    if (selectedMake) {
      const unifiedModels = getModelsData()[selectedMake];
      if (Array.isArray(unifiedModels)) {
        unifiedModels.forEach((m) => {
          const trimmed = String(m || "").trim();
          if (trimmed) set.add(trimmed);
        });
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cars, selectedMake, unifiedMakesLoaded]);

  // Unified catalog makes merged with any makes present in live stock that
  // aren't in the catalog yet — the filter bar offers the full list, while
  // the sidebar's "Shop by Make" keeps its stock-derived counts.
  const filterMakes = useMemo(() => {
    const set = new Set(availableMakes);
    getMakesData().forEach((m) => {
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableMakes, unifiedMakesLoaded]);

  // Same list, annotated with live stock counts (0 for catalog makes not
  // currently in stock) so the top filter bar can show "Toyota (12)" the
  // way the sidebar already does.
  const filterMakesWithCounts = useMemo(() => {
    const countMap = new Map(makesWithCounts.map((m) => [m.name, m.count]));
    return filterMakes.map((name) => ({ name, count: countMap.get(name) || 0 }));
  }, [filterMakes, makesWithCounts]);

  const filterOptions = {
    makes: filterMakesWithCounts,
    bodyTypes: availableBodyTypes,
    models: availableModels,
    transmissions: availableTransmissions,
    fuels: availableFuels,
    years: availableYears,
    minPriceOptions: [
      { label: "Min price", value: "" },
      { label: "$500", value: "500" },
      { label: "$1,000", value: "1000" },
      { label: "$2,500", value: "2500" },
      { label: "$5,000", value: "5000" },
      { label: "$10,000", value: "10000" },
      { label: "$15,000", value: "15000" },
      { label: "$20,000", value: "20000" },
    ],
    maxPriceOptions: [
      { label: "Max price", value: "" },
      { label: "$1,000", value: "1000" },
      { label: "$2,500", value: "2500" },
      { label: "$5,000", value: "5000" },
      { label: "$10,000", value: "10000" },
      { label: "$15,000", value: "15000" },
      { label: "$20,000", value: "20000" },
      { label: "$30,000", value: "30000" },
    ],
  };

  const hasActiveFilters = Boolean(
    selectedMake ||
      selectedBodyType ||
      selectedMinPrice ||
      selectedMaxPrice ||
      selectedModel ||
      selectedTransmission ||
      selectedFuel ||
      selectedYearFrom ||
      selectedYearTo ||
      searchKeyword
  );

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedMake) chips.push({ key: "make", label: selectedMake });
    if (selectedBodyType)
      chips.push({ key: "bodyType", label: selectedBodyType, extra: ["type"] });
    if (selectedMinPrice) chips.push({ key: "minPrice", label: `From $${Number(selectedMinPrice).toLocaleString()}` });
    if (selectedMaxPrice) chips.push({ key: "maxPrice", label: `To $${Number(selectedMaxPrice).toLocaleString()}` });
    if (selectedModel) chips.push({ key: "model", label: selectedModel });
    if (selectedTransmission) chips.push({ key: "transmission", label: selectedTransmission });
    if (selectedFuel) chips.push({ key: "fuel", label: selectedFuel });
    if (selectedYearFrom) chips.push({ key: "yearFrom", label: `From ${selectedYearFrom}` });
    if (selectedYearTo) chips.push({ key: "yearTo", label: `To ${selectedYearTo}` });
    if (searchKeyword) chips.push({ key: "search", label: `“${searchKeyword}”` });
    return chips;
  }, [
    selectedMake,
    selectedBodyType,
    selectedMinPrice,
    selectedMaxPrice,
    selectedModel,
    selectedTransmission,
    selectedFuel,
    selectedYearFrom,
    selectedYearTo,
    searchKeyword,
  ]);

  const removeChip = (chip) => {
    const updates = { [chip.key]: null };
    (chip.extra || []).forEach((k) => {
      updates[k] = null;
    });
    updateFilters(updates, { reset: false });
  };

  const skeletonCount = Math.min(itemsPerPage, 8);

  // Shared by the desktop segmented control and the mobile 2x2 grid so both
  // stay visually identical while each gets size-appropriate padding.
  const sortOptionButtons = sortSelections.map((s) => (
    <button
      key={s.value}
      type="button"
      onClick={() => setSortOption(s.value)}
      aria-pressed={sortOption === s.value}
      className={`whitespace-nowrap rounded px-2 py-2 text-center text-xs font-semibold transition sm:px-3 sm:py-1.5 ${
        sortOption === s.value
          ? "bg-white text-brand-charcoal shadow-sm"
          : "text-gray-600 hover:text-brand-charcoal"
      }`}
    >
      {s.label}
    </button>
  ));

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="mx-auto w-full max-w-[1440px] px-4">
        <div className="flex items-start gap-5">
          {/* Sidebar — the one filter surface on desktop; the top bar below
              is mobile-only so filters aren't duplicated across two places */}
          <StockSidebarV2
            makes={makesWithCounts}
            bodyTypes={bodiesWithCounts}
            priceOptions={priceFilterOptions}
            selected={filters}
            onQuickFilter={handleQuickFilter}
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={handleSearchSubmit}
            onFilterChange={handleFilterChange}
            options={filterOptions}
            onReset={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Main column — filter bar, results */}
          <main className="min-w-0 flex-1">
            {/* Top filter bar — mobile/tablet only; the sidebar covers this
                ground on desktop (lg:), so it isn't duplicated in both places */}
            <div className="lg:hidden">
              <StockFilterBarV2
                filters={filters}
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onSearchSubmit={handleSearchSubmit}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
                options={filterOptions}
              />
            </div>

            {/* Controls bar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FontAwesomeIcon icon={faCarSide} className="h-4 w-4 text-brand-navy" />
                <span>
                  <strong className="text-brand-charcoal">
                    {numberFormatter.format(sortedCars.length)}
                  </strong>{" "}
                  vehicles
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 p-1">
                  {[
                    { id: "grid", icon: faGrip, label: "Grid view" },
                    { id: "list", icon: faList, label: "List view" },
                    { id: "table", icon: faTableCellsLarge, label: "Table view" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setViewMode(v.id)}
                      title={v.label}
                      aria-label={v.label}
                      aria-pressed={viewMode === v.id}
                      className={`flex h-7 w-7 items-center justify-center rounded transition ${
                        viewMode === v.id
                          ? "bg-white text-brand-navy shadow-sm"
                          : "text-gray-500 hover:text-brand-charcoal"
                      }`}
                    >
                      <FontAwesomeIcon icon={v.icon} className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
                {/* Desktop/tablet sort: inline segmented control */}
                <span className="hidden text-xs font-semibold uppercase tracking-wider text-gray-400 sm:inline">
                  Sort
                </span>
                <div className="hidden items-center gap-1 rounded-md border border-gray-200 bg-gray-100 p-1 sm:flex">
                  {sortOptionButtons}
                </div>
              </div>
              {/* Mobile sort: full-width 2x2 grid instead of a squeezed row */}
              <div className="grid w-full grid-cols-2 gap-1 rounded-md border border-gray-200 bg-gray-100 p-1 sm:hidden">
                {sortOptionButtons}
              </div>
            </div>

            {/* Active filter chips */}
            {activeChips.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => removeChip(chip)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/20 bg-brand-navy/5 px-3 py-1 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy/10"
                  >
                    {chip.label}
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-[#d47827]"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Results */}
            {viewLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: skeletonCount }).map((_, i) => (
                  <div
                    key={`sk-${i}`}
                    className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="h-32 animate-pulse bg-gray-200" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                      <div className="h-5 w-2/5 animate-pulse rounded bg-gray-200" />
                      <div className="h-2.5 w-full animate-pulse rounded bg-gray-200" />
                      <div className="h-7 w-full animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedCars.length > 0 && viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {paginatedCarsForGrid.map((car, index) => (
                  <CarCardV2
                    key={`${car.id || car.ref_no || car.stock_no || "car"}-${index}`}
                    car={car}
                    imgBasePath={imgBasePath}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : sortedCars.length > 0 && viewMode === "list" ? (
              <div className="flex flex-col gap-2">
                {paginatedCarsForGrid.map((car, index) => (
                  <StockListRow
                    key={`${car.id || car.ref_no || car.stock_no || "car"}-${index}`}
                    car={car}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            ) : sortedCars.length > 0 && viewMode === "table" ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="p-3">Photo</th>
                      <th className="p-3">Stock #</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Year</th>
                      <th className="p-3">Chassis No.</th>
                      <th className="p-3">Mileage</th>
                      <th className="p-3">Engine</th>
                      <th className="p-3">Transmission</th>
                      <th className="p-3">Price (FOB)</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCarsForGrid.map((car, index) => (
                      <StockTableRow
                        key={`${car.id || car.ref_no || car.stock_no || "car"}-${index}`}
                        car={car}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : sortedCars.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center">
                <p className="text-lg font-semibold text-brand-charcoal">No vehicles match these filters.</p>
                <p className="mt-1 text-sm text-gray-500">Try widening your budget or clearing a make.</p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-4 rounded-md bg-[#f1892b] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#d47827]"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : null}

            {/* Pagination */}
            {!viewLoading && sortedCars.length > 0 && totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-navy hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ‹ Prev
                  </button>
                  {visiblePageNumbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => goToPage(n)}
                      aria-current={currentPage === n ? "page" : undefined}
                      className={`min-w-[2.5rem] rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        currentPage === n
                          ? "border-brand-charcoal bg-brand-charcoal text-white"
                          : "border-gray-300 text-gray-600 hover:border-brand-navy hover:text-brand-navy"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:border-brand-navy hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next ›
                  </button>
                </div>
                <span className="text-xs text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default StocklistV2;
