// fetchMyReservations.js — "My Reservations" tab on the customer profile.
// Active holds (reserved / under negotiation) on vehicles the user has
// started a purchase for, as cards with what has been paid so far.

import { useEffect, useState } from "react";
import { apiBaseUrl } from "../utilities/apiBase";
import { PaymentBreakdown } from "../user/payments";
import {
  StatusBadge, VehicleCard, ViewVehicleButton, EmptyState, LoadingState, ProfilePager,
  pageOf, firstImage, formatCountdown, vehicleHref,
} from "../user/profileUi";

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${apiBaseUrl}/inventory/cars/fetchMyReservations.php`, { method: "GET", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch reservations");
        return response.json();
      })
      .then((data) => setReservations(Array.isArray(data.reservations) ? data.reservations : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <p className="py-8 text-sm text-red-600">Error: {error}</p>;
  if (reservations.length === 0) {
    return (
      <EmptyState
        icon="fa-calendar-times"
        title="No reservations yet"
        hint="Reservations appear here once our team holds a vehicle for you."
        action={
          <a href="/stock-list" className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md transition hover:bg-primary/90">
            <i className="fas fa-search mr-2" />Browse stock
          </a>
        }
      />
    );
  }

  const { visible, page: current, totalPages } = pageOf(reservations, page);
  return (
    <>
      <div className="space-y-3">
        {visible.map((r) => {
          const name = [r.year, r.make, r.model].filter(Boolean).join(" ") || r.vehicle_ref || "Vehicle";
          const href = vehicleHref(r.vehicle_ref);
          const countdown = r.expires_at ? formatCountdown(r.expires_at) : "";
          const urgent = r.expires_at && new Date(String(r.expires_at).replace(" ", "T")).getTime() - Date.now() < 86400000;
          return (
            <VehicleCard key={r.id} image={firstImage(r.image)} title={name} href={href}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a href={href} className="text-xs font-extrabold uppercase leading-tight text-primary hover:underline">{name}</a>
                  <p className="mt-0.5 text-[9px] font-bold uppercase text-gray-400">
                    Ref: {r.vehicle_ref}{r.destination_country ? ` · To ${r.destination_country}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-[10px] font-extrabold text-gray-800">
                Total <b className="text-[var(--accent-color)]">{r.currency || "USD"} {Number(r.price || 0).toLocaleString("en-US")}</b>
              </p>
              {(Number(r.amount_paid) > 0 || (r.payments || []).length > 0) && <PaymentBreakdown r={r} />}
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-[10px]">
                {countdown && (
                  <span className={`font-bold ${urgent ? "text-red-600" : "text-gray-600"}`}>
                    <i className="fas fa-clock mr-1" />Held: {countdown}
                  </span>
                )}
                <span className="ml-auto"><ViewVehicleButton href={href} /></span>
              </div>
            </VehicleCard>
          );
        })}
      </div>
      <ProfilePager page={current} totalPages={totalPages} onPage={setPage} />
    </>
  );
};

export default MyReservations;
