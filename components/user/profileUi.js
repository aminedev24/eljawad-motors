// Shared building blocks for the customer profile tabs, styled after
// ichinomiya-motors' profile (components/profile/ProfileTabs.jsx there):
// vehicle cards with a thumbnail, status badges with icons, empty states and
// a compact pager.
import { pageItems } from "../misc/Pagination";
import { parseImageUrls, secureImageUrl } from "../utilities/ichinomiyaCardAdapter";
import { SITE } from "../utilities/siteConfig";

export const PROFILE_PER_PAGE = 4;

const STATUS = {
  reserved:         { label: "Reserved",          icon: "fa-bookmark",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
  pending_payment:  { label: "Under Negotiation", icon: "fa-handshake",      cls: "bg-blue-50 text-blue-700 border-blue-200" },
  payment_received: { label: "Payment Received",  icon: "fa-check-circle",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ordered:          { label: "Ordered",           icon: "fa-file-signature", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  shipped:          { label: "Shipped",           icon: "fa-ship",           cls: "bg-orange-50 text-orange-700 border-orange-200" },
  delivered:        { label: "Delivered",         icon: "fa-flag-checkered", cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled:        { label: "Cancelled",         icon: "fa-times-circle",   cls: "bg-gray-50 text-gray-500 border-gray-200" },
  expired:          { label: "Expired",           icon: "fa-hourglass-end",  cls: "bg-gray-50 text-gray-500 border-gray-200" },
  sold:             { label: "Sold",              icon: "fa-ban",            cls: "bg-red-50 text-red-700 border-red-200" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: String(status || "").replace(/_/g, " "), icon: "fa-circle", cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${s.cls}`}>
      <i className={`fas ${s.icon}`} /> {s.label}
    </span>
  );
}

// "2d 4h remaining" until a hold expires.
export function formatCountdown(expiresAt) {
  const diff = new Date(String(expiresAt).replace(" ", "T")).getTime() - Date.now();
  if (!Number.isFinite(diff)) return "";
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h remaining` : `${h}h ${m}m remaining`;
}

// First usable photo of a stored image list (JSON array, comma list or URL).
export function firstImage(value) {
  const url = parseImageUrls(value)[0];
  return url ? secureImageUrl(url.replace(/\\\//g, "/")) : SITE.vehiclePlaceholder;
}

export const vehicleHref = (ref) => `/vehicle?id=${encodeURIComponent(String(ref || ""))}`;

export function ViewVehicleButton({ href }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary transition hover:bg-primary hover:text-white"
    >
      View Vehicle <i className="fas fa-arrow-right text-[9px]" />
    </a>
  );
}

// One vehicle as a horizontal card: thumbnail left, details right.
export function VehicleCard({ image, title, href, children }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-md sm:flex-row">
      <a href={href} className="block h-28 shrink-0 bg-gray-100 sm:h-auto sm:w-32 sm:border-r sm:border-gray-200">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(SITE.vehiclePlaceholder)) e.currentTarget.src = SITE.vehiclePlaceholder;
          }}
        />
      </a>
      <div className="flex flex-1 flex-col gap-1.5 p-3">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-gray-300">
        <i className={`fas ${icon} text-3xl`} />
      </div>
      <p className="font-bold text-gray-500">{title}</p>
      {hint && <p className="mt-1 text-sm text-gray-400">{hint}</p>}
      {action}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex justify-center py-12">
      <i className="fas fa-circle-notch animate-spin text-2xl text-primary" />
    </div>
  );
}

// Compact pager (Prev · 1 … 4 5 [6] 7 8 … 20 · Next).
export function ProfilePager({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const go = (n) => onPage(Math.min(Math.max(n, 1), totalPages));
  const navCls =
    "rounded-lg border border-gray-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button onClick={() => go(page - 1)} disabled={page === 1} className={navCls}>
        <i className="fas fa-chevron-left mr-1 text-[8px]" /> Prev
      </button>
      {pageItems(page, totalPages, 1).map((n) =>
        typeof n === "string" ? (
          <span key={n} className="text-[10px] text-gray-400">…</span>
        ) : (
          <button
            key={n}
            onClick={() => go(n)}
            aria-current={n === page ? "page" : undefined}
            className={`h-7 min-w-[1.75rem] rounded-lg px-1 text-[10px] font-bold transition ${
              n === page ? "bg-primary text-white shadow" : "border border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {n}
          </button>
        )
      )}
      <button onClick={() => go(page + 1)} disabled={page === totalPages} className={navCls}>
        Next <i className="fas fa-chevron-right ml-1 text-[8px]" />
      </button>
    </nav>
  );
}

// Slice of a list for the current page, with the page clamped to the list.
export function pageOf(list, page, perPage = PROFILE_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const safe = Math.min(Math.max(page, 1), totalPages);
  return { visible: list.slice((safe - 1) * perPage, safe * perPage), page: safe, totalPages };
}
