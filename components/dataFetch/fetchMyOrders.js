// fetchMyOrders.js — "My Orders" tab on the customer profile.
// Purchase history: reservations that progressed past the hold stage
// (payment received, ordered, shipped, delivered, cancelled, expired), as
// cards with what has been paid.

import { useEffect, useState } from "react";
import { apiBaseUrl } from "../utilities/apiBase";
import { PaymentBreakdown } from "../user/payments";
import {
  StatusBadge, VehicleCard, ViewVehicleButton, EmptyState, LoadingState, ProfilePager,
  pageOf, firstImage, vehicleHref,
} from "../user/profileUi";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${apiBaseUrl}/inventory/cars/fetchMyReservations.php`, { method: "GET", credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch orders");
        return response.json();
      })
      .then((data) => setOrders(Array.isArray(data.orders) ? data.orders : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <p className="py-8 text-sm text-red-600">Error: {error}</p>;
  if (orders.length === 0) {
    return <EmptyState icon="fa-shipping-fast" title="No orders yet" hint="Orders appear here once your payment is confirmed." />;
  }

  const { visible, page: current, totalPages } = pageOf(orders, page);
  return (
    <>
      <div className="space-y-3">
        {visible.map((r) => {
          const name = [r.year, r.make, r.model].filter(Boolean).join(" ") || r.vehicle_ref || "Vehicle";
          const href = vehicleHref(r.vehicle_ref);
          return (
            <VehicleCard key={r.id} image={firstImage(r.image)} title={name} href={href}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a href={href} className="text-xs font-extrabold uppercase leading-tight text-primary hover:underline">{name}</a>
                  <p className="mt-0.5 text-[9px] font-bold uppercase text-gray-400">
                    Order #{r.id} · Ref: {r.vehicle_ref}
                    {r.created_at ? ` · ${new Date(String(r.created_at).replace(" ", "T")).toLocaleDateString("en-US")}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <PaymentBreakdown r={r} />
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

export default MyOrders;
