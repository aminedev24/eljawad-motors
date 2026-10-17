// fetchSavedVehicles.js — "Saved Vehicles" tab on the customer profile.
// Reads the shared favorites store so hearts stay in sync with the rest of
// the site. Clicking the heart on any card removes the vehicle here too.

import { useState } from "react";
import { useFavorites, removeFavorite } from "../vehicles/useFavorites";
import {
  StatusBadge, VehicleCard, ViewVehicleButton, EmptyState, LoadingState, ProfilePager,
  pageOf, firstImage, vehicleHref,
} from "../user/profileUi";

const SavedVehicles = () => {
  const favorites = useFavorites();
  const [removingRef, setRemovingRef] = useState(null);
  const [page, setPage] = useState(1);

  const vehicles = Array.isArray(favorites.vehicles) ? favorites.vehicles : [];

  const handleRemove = async (ref) => {
    setRemovingRef(ref);
    await removeFavorite(ref);
    setRemovingRef(null);
  };

  if (favorites.loading) return <LoadingState />;
  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon="fa-heart"
        title="No saved vehicles yet"
        hint="Browse the stock list and tap the heart on any vehicle."
        action={
          <a href="/stock-list" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md transition hover:bg-primary/90">
            <i className="fas fa-search mr-2" />Browse stock
          </a>
        }
      />
    );
  }

  const { visible, page: current, totalPages } = pageOf(vehicles, page);
  return (
    <>
      <div className="space-y-3">
        {visible.map((vehicle) => {
          const ref = String(vehicle.ref_no || "").trim();
          const name = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
          const status = String(vehicle.status || "").toLowerCase().trim();
          const isSold = status === "sold" || status.startsWith("sold");
          const isReserved = status === "reserved";
          const href = vehicleHref(ref);
          return (
            <VehicleCard key={vehicle.favorite_id || ref} image={firstImage(vehicle.image)} title={name} href={href}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a href={href} className="text-xs font-extrabold uppercase leading-tight text-primary hover:underline">{name}</a>
                  <p className="mt-0.5 text-[9px] font-bold uppercase text-gray-400">Ref: {ref}</p>
                </div>
                <button
                  onClick={() => handleRemove(ref)}
                  disabled={removingRef === ref}
                  title="Remove from saved"
                  className="text-[11px] text-red-400 transition hover:text-red-600"
                >
                  <i className={`fas ${removingRef === ref ? "fa-spinner animate-spin" : "fa-trash-alt"}`} />
                </button>
              </div>
              {isSold || isReserved ? (
                <div><StatusBadge status={isSold ? "sold" : "pending_payment"} /></div>
              ) : (
                <div className="text-sm font-extrabold leading-tight text-[var(--accent-color)]">
                  {vehicle.currency || "USD"} {Number(vehicle.price || 0).toLocaleString("en-US")}
                </div>
              )}
              <div className="mt-auto flex items-center justify-end">
                <ViewVehicleButton href={href} />
              </div>
            </VehicleCard>
          );
        })}
      </div>
      <ProfilePager page={current} totalPages={totalPages} onPage={setPage} />
    </>
  );
};

export default SavedVehicles;
