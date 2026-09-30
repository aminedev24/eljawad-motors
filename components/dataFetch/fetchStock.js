import React, { useEffect, useState, useCallback, useMemo } from "react";
import getConfig from "next/config";
import { apiBaseUrl } from '../utilities/apiBase';
import CarCard from '../vehicles/carCard';

// Each row maps to an existing sort mode on /stock-list (see sortSelections in
// stockListV2.js) so "View All" actually reproduces the ordering shown here.
// "Premium Stock" has no matching highest-price-first sort there, so its
// View All link intentionally omits a sort param rather than claim one.
const ROWS = [
  { id: 'new', label: 'Newest Arrivals', viewAllHref: '/stock-list?sort=newest' },
  { id: 'premium', label: 'Premium Stock', viewAllHref: '/stock-list' },
  { id: 'hot', label: 'Trending Now', viewAllHref: '/stock-list?sort=popularity' },
];

const ROW_SIZE = 24;

const HOT_MODELS = ['land cruiser', 'hilux', 'hiace', 'prado', 'x-trail', 'pajero', 'alphard', 'patrol', 'fortuner', 'navara'];

function scoreCar(car) {
  const s = String(car.grade || '').replace(/[^0-9.]/g, '');
  const grade = parseFloat(s) || 0;
  const mileage = parseInt(car.mileage) || 999999;
  const hot = HOT_MODELS.some((m) => (car.model || '').toLowerCase().includes(m));
  return hot ? grade + 10 : grade;
}

const SkeletonCard = () => (
  <div className="bg-[var(--white)] border border-[var(--border-color)] rounded overflow-hidden flex flex-col h-full min-w-0">
    <div className="relative h-32 overflow-hidden bg-gray-100">
      <div className="absolute inset-0 animate-pulse bg-gray-200" />
    </div>
    <div className="p-2.5 space-y-1.5 flex-1 min-h-0">
      <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
    </div>
    <div className="mx-2.5 mt-1 pt-2 border-t border-[var(--border-color)] grid grid-cols-2 gap-1.5">
      <div className="h-2 rounded bg-gray-200 animate-pulse" />
      <div className="h-2 rounded bg-gray-200 animate-pulse" />
      <div className="h-2 rounded bg-gray-200 animate-pulse" />
      <div className="h-2 rounded bg-gray-200 animate-pulse" />
    </div>
    <div className="px-2.5 pb-2.5 pt-1.5 mt-auto">
      <div className="h-6 rounded bg-gray-200 animate-pulse" />
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className="mb-10">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
      <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {Array.from({ length: ROW_SIZE }).map((_, i) => (
        <SkeletonCard key={`skel-${i}`} />
      ))}
    </div>
  </div>
);

const CarsList = () => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = apiBaseUrl;

  useEffect(() => {
    fetch(`${apiUrl}/inventory/cars/fetchStock.php`)
      .then((res) => res.json())
      .then((data) => {
        setCars(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching cars:", err);
        setLoading(false);
      });
  }, [apiUrl]);

  const handleViewDetails = useCallback((car) => {
    if (!car) return;
    const identifier = car.ref_no || car.id || car.stock_no;
    if (!identifier) return;
    // window.open needs the basePath spelled out - unlike next/router,
    // it has no idea the GitHub Pages build is served from /eljawad-motors.
    const { publicRuntimeConfig } = getConfig() || {};
    const basePath = publicRuntimeConfig?.basePath || "";
    window.open(`${basePath}/vehicle?id=${encodeURIComponent(String(identifier).trim())}`, '_blank', 'noopener');
  }, []);

  const rowCars = useMemo(() => {
    if (!cars.length) return { new: [], premium: [], hot: [] };
    const sortedNew = [...cars].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
    const sortedPremium = [...cars].sort((a, b) => (parseFloat(b.final_value || b.price || 0)) - (parseFloat(a.final_value || a.price || 0)));
    const hotByScore = [...cars].sort((a, b) => scoreCar(b) - scoreCar(a));
    return {
      new: sortedNew.slice(0, ROW_SIZE),
      premium: sortedPremium.slice(0, ROW_SIZE),
      hot: hotByScore.slice(0, ROW_SIZE),
    };
  }, [cars]);

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-[1400px] mx-auto">
        {ROWS.map((row) => <SkeletonRow key={row.id} />)}
      </div>
    );
  }

  if (cars.length === 0) return null;

  return (
    <div className="px-4 py-6 max-w-[1400px] mx-auto">
      {ROWS.map((row) => (
        <div key={row.id} className="mb-10 last:mb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-2xl font-bold text-[var(--primary-color)] tracking-tight">
              {row.label}
            </h2>
            <a href={row.viewAllHref} className="text-[11px] font-bold text-[var(--primary-color)] uppercase tracking-wider flex items-center gap-1 hover:underline">
              View All
              <span className="text-[9px]">&rsaquo;</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {rowCars[row.id].map((car, index) => (
              <div key={`${car.ref_no || car.id || car.stock_no || 'car'}-${index}`}>
                <CarCard car={car} onViewDetails={handleViewDetails} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="text-center mt-6">
        <a href="/stock-list" className="inline-block bg-[var(--primary-color)] text-white py-2.5 px-8 text-sm font-extrabold uppercase tracking-wider rounded hover:opacity-90 transition">
          View Full Inventory ({cars.length} vehicles)
        </a>
      </div>
    </div>
  );
};

export default CarsList;
