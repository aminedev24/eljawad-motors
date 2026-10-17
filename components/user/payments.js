// Customer side of income management (ported from ichinomiya-motors'
// PaymentsTab): the "My Payments" profile tab, the paid/remaining cell on
// reservation and order rows, and the card on the vehicle details page.
// Data: server/finance/income/getMyIncome.php and the `payments` /
// amount_paid fields of fetchMyReservations.php.
import { useEffect, useState } from "react";
import { apiBaseUrl } from "../utilities/apiBase";
import { ProfilePager, pageOf, EmptyState, LoadingState, vehicleHref } from "./profileUi";
// Whole amounts without decimals, anything else with both cents (28,261.20).
const money = (cur, n) => {
  const v = Number(n || 0);
  const cents = Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2;
  return `${cur || "USD"} ${v.toLocaleString("en-US", { minimumFractionDigits: cents, maximumFractionDigits: 2 })}`;
};

const paidPct = (r) => {
  const total = Number(r.agreed_price) || 0;
  return total > 0 ? Math.min(100, Math.round((Number(r.amount_paid) / total) * 100)) : 0;
};

// Total / paid / remaining for one vehicle, plus the payments applied to it
// (reservation and order cards).
export function PaymentBreakdown({ r }) {
  const cur = r.payment_currency || r.currency;
  const remaining = Number(r.amount_remaining);
  const payments = r.payments || [];
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
          <span className="block font-bold uppercase text-gray-400">Total</span>
          <p className="mt-0.5 font-extrabold text-gray-800">{money(cur, r.agreed_price)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
          <span className="block font-bold uppercase text-gray-400">Paid</span>
          <p className="mt-0.5 font-extrabold text-green-600">{money(cur, r.amount_paid)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
          <span className="block font-bold uppercase text-gray-400">Remaining</span>
          <p className={`mt-0.5 font-extrabold ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
            {remaining > 0 ? money(cur, remaining) : "Fully Paid"}
          </p>
        </div>
      </div>
      {payments.length > 0 && (
        <ul className="space-y-0.5 text-[10px] text-gray-500">
          {payments.map((p, i) => (
            <li key={i}>
              <i className="fas fa-check mr-1 text-green-500" />
              {money(cur, p.amount)} from your payment of {p.income_date}
              {p.remitter ? ` (sent by ${p.remitter})` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Highlighted version for the vehicle details page.
export function VehiclePaymentCard({ r }) {
  const cur = r.payment_currency || r.currency;
  const total = Number(r.agreed_price) || 0;
  const paid = Number(r.amount_paid) || 0;
  const remaining = Number(r.amount_remaining);
  const pct = paidPct(r);
  const payments = r.payments || [];
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-primary">
        <i className="fas fa-wallet mr-1.5" />Your Payments on This Vehicle
      </p>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span>
          <b className="text-sm text-green-600">{money(cur, paid)}</b> <span className="text-gray-500">paid of {money(cur, total)}</span>
        </span>
        <span className="text-gray-500">{pct}%</span>
      </div>
      <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs font-bold ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
        {remaining > 0 ? `Remaining ${money(cur, remaining)}` : "Fully Paid"}
      </p>
      {payments.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-primary/15 pt-2 text-[10px] text-gray-500">
          {payments.map((p, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">{p.income_date}{p.remitter ? ` · ${p.remitter}` : ""}</span>
              <b className="whitespace-nowrap text-gray-700">{money(cur, p.amount)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "My Payments" profile tab.
export default function MyPayments() {
  const [data, setData] = useState({ incomes: [], totals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`${apiBaseUrl}/finance/income/getMyIncome.php`, { credentials: "include" })
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setData({ incomes: d.incomes || [], totals: d.totals || [] });
        else setError(d.error || "Could not load your payments.");
      })
      .catch(() => setError("Could not load your payments."))
      .finally(() => setLoading(false));
  }, []);

  const { incomes, totals } = data;
  const { visible, page: pageSafe, totalPages } = pageOf(incomes, page);

  if (loading) return <LoadingState />;
  if (error) return <p className="py-8 text-sm text-red-600">{error}</p>;

  if (incomes.length === 0) {
    return <EmptyState icon="fa-wallet" title="No payments yet" hint="Payments appear here once we confirm receipt." />;
  }

  return (
    <div>
      <p className="mb-6 text-sm text-[var(--grey-text)]">Payments we have received from you, and the vehicles they were applied to.</p>
      {totals.map((t) => (
        <div key={t.currency} className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ["Total Paid", t.received, "text-gray-900"],
            ["Applied to Vehicles", t.consumed, "text-primary"],
            ["Available Balance", t.leftover, "text-green-600"],
          ].map(([label, val, cls]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-white p-3">
              <span className="block text-[10px] font-bold uppercase text-gray-400">{label}</span>
              <p className={`mt-0.5 text-sm font-extrabold sm:text-lg ${cls}`}>{money(t.currency, val)}</p>
            </div>
          ))}
        </div>
      ))}
      <div className="space-y-3">
        {visible.map((d) => {
          const used = Number(d.amount) > 0 ? Math.min(100, Math.round((Number(d.consumed) / Number(d.amount)) * 100)) : 0;
          const unused = Number(d.consumed) <= 0;
          return (
            <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">{money(d.currency, d.amount)}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase text-gray-400">Paid on {d.date}</p>
                  {d.remitter && <p className="mt-0.5 text-[11px] text-gray-500">Sent by {d.remitter}</p>}
                </div>
                <div className="text-right text-[10px]">
                  <p className="text-gray-500">Applied <b className="text-primary">{money(d.currency, d.consumed)}</b></p>
                  <p className="text-gray-500">Available <b className="text-green-600">{money(d.currency, d.leftover)}</b></p>
                </div>
              </div>
              {/* How much of this payment has gone to vehicles so far */}
              {!unused && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${used}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">{used}% used</span>
                </div>
              )}
              {unused ? (
                <p className="mt-2 rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] text-green-700">
                  <i className="fas fa-piggy-bank mr-1.5" />
                  Not used yet: this amount is credit on your account, ready to go towards a vehicle.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-[11px] text-gray-600">
                  {d.allocations.map((a, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <a href={vehicleHref(a.vehicle_ref)} className="truncate hover:text-primary hover:underline">
                        <i className="fas fa-car mr-1 text-gray-300" />
                        {a.vehicle_name || "Vehicle"} <span className="text-gray-400">· Ref {a.vehicle_ref}</span>
                      </a>
                      <b className="whitespace-nowrap">{money(d.currency, a.amount)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <ProfilePager page={pageSafe} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
