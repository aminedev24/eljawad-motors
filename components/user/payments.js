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
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
          <span className="block text-[11px] font-bold uppercase text-gray-600">Total</span>
          <p className="mt-0.5 text-sm font-extrabold text-gray-900">{money(cur, r.agreed_price)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
          <span className="block text-[11px] font-bold uppercase text-gray-600">Paid</span>
          <p className="mt-0.5 text-sm font-extrabold text-green-700">{money(cur, r.amount_paid)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
          <span className="block text-[11px] font-bold uppercase text-gray-600">Remaining</span>
          <p className={`mt-0.5 text-sm font-extrabold ${remaining > 0 ? "text-amber-700" : "text-green-700"}`}>
            {remaining > 0 ? money(cur, remaining) : "Fully Paid"}
          </p>
        </div>
      </div>
      {payments.length > 0 && (
        <ul className="space-y-0.5 text-xs text-gray-700">
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
      <p className="mb-6 text-sm text-gray-700">Payments we have received from you, and the vehicles they were applied to.</p>
      {totals.map((t) => (
        <div key={t.currency} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Total Paid", t.received, "fa-wallet", "border-t-gray-700", "text-gray-900"],
            ["Applied to Vehicles", t.consumed, "fa-car", "border-t-primary", "text-primary"],
            ["Available Balance", t.leftover, "fa-piggy-bank", "border-t-green-600", "text-green-700"],
          ].map(([label, val, icon, edge, cls]) => (
            <div key={label} className={`flex items-center gap-3 rounded-xl border border-gray-200 border-t-4 ${edge} bg-white p-4 shadow-sm`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 ${cls}`}>
                <i className={`fas ${icon}`} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-bold uppercase tracking-wide text-gray-600">{label}</span>
                <p className={`mt-0.5 text-lg font-extrabold sm:text-xl ${cls}`}>{money(t.currency, val)}</p>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="space-y-4">
        {visible.map((d) => {
          const used = Number(d.amount) > 0 ? Math.min(100, Math.round((Number(d.consumed) / Number(d.amount)) * 100)) : 0;
          // Fully used / partly used / still all credit.
          const state = used >= 100
            ? { label: "Fully used", chip: "bg-primary/10 text-primary border-primary/20", edge: "border-l-primary", icon: "fa-check-circle" }
            : used > 0
            ? { label: "Partly used", chip: "bg-amber-50 text-amber-800 border-amber-200", edge: "border-l-amber-500", icon: "fa-adjust" }
            : { label: "Credit available", chip: "bg-green-50 text-green-800 border-green-200", edge: "border-l-green-600", icon: "fa-piggy-bank" };
          return (
            <div key={d.id} className={`overflow-hidden rounded-xl border border-gray-200 border-l-[6px] ${state.edge} bg-white shadow-sm`}>
              {/* Header: amount and state */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                    <i className="fas fa-money-check-alt" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Payment received</p>
                    <p className="text-xl font-extrabold text-gray-900">{money(d.currency, d.amount)}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${state.chip}`}>
                  <i className={`fas ${state.icon}`} /> {state.label}
                </span>
              </div>

              <div className="space-y-3 p-4">
                {/* Details */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Paid on", d.date, "text-gray-900"],
                    ["Sent by", d.remitter || "-", "text-gray-900"],
                    ["Applied", money(d.currency, d.consumed), "text-primary"],
                    ["Available", money(d.currency, d.leftover), "text-green-700"],
                  ].map(([label, value, cls]) => (
                    <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
                      <p className={`mt-0.5 truncate text-sm font-bold ${cls}`} title={String(value)}>{value}</p>
                    </div>
                  ))}
                </div>

                {used > 0 ? (
                  <>
                    <div>
                      <div className="mb-1 flex justify-between text-xs font-bold text-gray-700">
                        <span>Used for vehicles</span>
                        <span>{used}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${used}%` }} />
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {d.allocations.map((a, i) => (
                        <li key={i}>
                          <a
                            href={vehicleHref(a.vehicle_ref)}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm transition hover:border-primary hover:bg-primary/5"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <i className="fas fa-car text-primary" />
                              <span className="truncate font-semibold text-gray-900">{a.vehicle_name || "Vehicle"}</span>
                              <span className="shrink-0 text-gray-500">· Ref {a.vehicle_ref}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2 font-extrabold text-gray-900">
                              {money(d.currency, a.amount)}
                              <i className="fas fa-chevron-right text-[10px] text-gray-400" />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-800">
                    <i className="fas fa-info-circle mt-0.5" />
                    Not used yet: this amount is credit on your account, ready to go towards a vehicle.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ProfilePager page={pageSafe} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
