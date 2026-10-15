// fetchSavedVehicles.js — "Saved Vehicles" tab on the customer profile.
// Reads the shared favorites store so hearts stay in sync with the rest of
// the site. Clicking the heart on any card removes the vehicle here too.

import { useState } from "react";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faTrashAlt, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { useFavorites, removeFavorite } from "../vehicles/useFavorites";
import { SITE } from "../utilities/siteConfig";

const PLACEHOLDER_IMAGE = SITE.vehiclePlaceholder;

const firstImage = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value[0] || "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "[]" || trimmed.toLowerCase() === "null") return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed[0] || "";
  } catch (err) {
    /* plain string path below */
  }
  const absolute = trimmed.match(/https?:\/\/[^\s"']+/gi);
  if (absolute) return absolute[absolute.length - 1];
  return trimmed.split(",")[0].trim();
};

const SavedVehicles = () => {
  const router = useRouter();
  const favorites = useFavorites();
  const [removingRef, setRemovingRef] = useState(null);

  const vehicles = Array.isArray(favorites.vehicles) ? favorites.vehicles : [];

  const handleRemove = async (ref) => {
    setRemovingRef(ref);
    await removeFavorite(ref);
    setRemovingRef(null);
  };

  if (favorites.loading) {
    return (
      <div className="flex justify-center py-16">
        <i className="fas fa-circle-notch animate-spin text-2xl text-[var(--primary-color)]" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 text-sm text-[var(--grey-text)]">
        Vehicles you have saved for later. Sign in to save from any stock page.
      </p>

      {vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-white py-16 text-center">
          <FontAwesomeIcon icon={faHeart} className="mb-3 text-4xl text-gray-300" />
          <p className="font-bold text-[var(--text-color)]">No saved vehicles yet</p>
          <p className="mt-1 text-sm text-[var(--grey-text)]">
            Browse the stock list and tap the heart on any vehicle.
          </p>
          <button
            onClick={() => router.push("/stock-list")}
            className="mt-4 rounded-md bg-[var(--accent-color)] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[var(--accent-color-hover)]"
          >
            Browse stock
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {vehicles.map((vehicle) => {
            const ref = String(vehicle.ref_no || "").trim();
            const name = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
            const status = String(vehicle.status || "").toLowerCase().trim();
            const isSold = status === "sold" || status.startsWith("sold");
            const isReserved = status === "reserved";
            const img = firstImage(vehicle.image) || PLACEHOLDER_IMAGE;
            const price = Number(vehicle.price || 0);

            return (
              <div key={vehicle.favorite_id || ref} className="flex flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-white shadow-sm">
                <div className="relative h-20 overflow-hidden">
                  <img src={img} alt={name} className="h-full w-full object-cover" loading="lazy" />
                  {isSold && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="rounded bg-red-700 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">Sold</span>
                    </span>
                  )}
                  {isReserved && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Under Negotiation
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-2">
                  <p className="truncate text-[11px] font-extrabold uppercase leading-tight text-[var(--text-color)]">{name}</p>
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="truncate font-mono text-[9px] text-[var(--grey-text)]">Ref: {ref}</p>
                    {isSold || isReserved ? (
                      <p className="shrink-0 text-[10px] font-extrabold italic text-[var(--grey-text)]">On request</p>
                    ) : (
                      <p className="shrink-0 text-[11px] font-extrabold text-[var(--accent-color)]">
                        {vehicle.currency || "USD"} {price.toLocaleString("en-US")}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto flex gap-1.5 pt-2">
                    <button
                      onClick={() => router.push(`/vehicle?id=${encodeURIComponent(ref)}`)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[var(--primary-color)] py-1 text-[8px] font-extrabold uppercase tracking-wider text-white transition hover:bg-[var(--primary-color-hover)]"
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="h-2 w-2" /> View
                    </button>
                    <button
                      onClick={() => handleRemove(ref)}
                      disabled={removingRef === ref}
                      title="Remove from saved"
                      className="flex items-center justify-center rounded-md border border-[var(--border-color)] px-2 py-1 text-[var(--grey-text)] transition hover:border-red-300 hover:text-red-600"
                    >
                      {removingRef === ref ? (
                        <i className="fas fa-circle-notch animate-spin text-[9px]" />
                      ) : (
                        <FontAwesomeIcon icon={faTrashAlt} className="h-2 w-2" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedVehicles;
