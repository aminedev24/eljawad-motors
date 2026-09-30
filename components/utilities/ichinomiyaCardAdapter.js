// ichinomiyaCardAdapter.js
//
// Maps a raw Eljawad Motors car record (from /server/inventory/cars/fetchStock.php)
// into the flat shape the Ichinomiya-style card + detail layouts expect.
//
// The raw car is kept on `.raw` because the existing handlers
// (onViewDetails / onRequestInvoice / RequestNowModal) read raw API fields
// like ref_no, fob, currency and chassis_no.

const UNKNOWN_LIKE = new Set(["", "n/a", "na", "unknown", "0", "null", "undefined"]);

const isUnknownLike = (value) =>
  UNKNOWN_LIKE.has(String(value ?? "").trim().toLowerCase());

// Clean a value for display: blank string when missing / "N/A" / "0".
const clean = (value) => (isUnknownLike(value) ? "" : String(value).trim());

const parseAmount = (value) => {
  const numeric = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const firstKnown = (...values) => {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }
  return "";
};

// Numeric price in the listing currency. The API exposes the partner price as
// fob/final_value; manually added cars may only have `price`.
export const getCarPriceUsd = (car) => {
  const candidates = [car?.fob, car?.final_value, car?.price]
    .map(parseAmount)
    .filter((value) => value !== null);

  const positive = candidates.find((value) => value > 0);
  if (positive != null) return positive;

  return candidates[0] ?? 0;
};

export const getCarMake = (car) => firstKnown(car?.make, car?.manufacturer, car?.brand);

export const getCarBodyType = (car) =>
  firstKnown(car?.category, car?.body, car?.shape, car?.body_type, car?.type, car?.size);

export const getCarModelCode = (car) =>
  firstKnown(car?.model_code, car?.modelCode, car?.modelcode, car?.code);

export const getCarChassis = (car) =>
  firstKnown(
    car?.chassis_no,
    car?.chassisNumber,
    car?.chassis,
    car?.vin_number,
    car?.frame_no,
    car?.frameNo,
    car?.vin
  );

// Partner stock (company === 'ichinomiya_import') is priced in USD even when the
// API row mislabels currency as "JPY". Manual cars keep their own currency; a
// missing value defaults to USD (the site lists export prices in USD).
export const normalizeCurrency = (car) => {
  if (String(car?.company || "").toLowerCase() === "ichinomiya_import") {
    return "USD";
  }
  return (car?.currency || "USD").toUpperCase();
};

// Steering -> RHD / LHD short tag (blank when absent — typical for partner cars).
export const steeringTag = (steering) => {
  const s = String(steering || "");
  if (s.includes("Right")) return "RHD";
  if (s.includes("Left")) return "LHD";
  return "";
};

// Display stock ID: third-party (partner) cars get a sequential "TP-" id derived
// from their already-sequential ref_no; Eljawad Motors-own cars keep their ref/id.
export const displayStockId = (car) => {
  const isPartner = String(car?.company || "").toLowerCase() === "ichinomiya_import";
  const ref = String(car?.ref_no ?? car?.id ?? "").trim();
  if (isPartner) {
    const digits = ref.replace(/\D/g, "");
    return `TP-${(digits || ref || "0").padStart(4, "0")}`;
  }
  return ref;
};

// Half-mask a chassis number: keep the first half, asterisk the rest.
export const maskChassis = (value) => {
  const s = String(value ?? "").trim();
  if (!s || isUnknownLike(s)) return "";
  return s.slice(0, 4);
};

// Upgrade http image URLs to https so partner photos (served over http) load on
// the https site. Localhost dev paths are left untouched.
export const secureImageUrl = (url) => {
  if (typeof url !== "string") return url;
  if (/^http:\/\/localhost/i.test(url)) return url;
  return url.replace(/^http:\/\//i, "https://");
};

// Parse image_urls into a clean array of URL strings. Storage varies by source:
// partner feed rows store a JSON array (["url","url"]), while Eljawad Motors-managed
// rows added via the reservation/import flow store a comma-separated string
// ("url,url,url"). Accept both, plus a single bare URL.
export const parseImageUrls = (imageUrls) => {
  if (!imageUrls) return [];
  const raw = String(imageUrls).trim();
  if (!raw || raw === "[]" || raw.toLowerCase() === "null") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean);
    }
    if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
  } catch (e) {
    // Not JSON — fall through to comma-separated handling.
  }
  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [raw];
};

export const adaptCarForCard = (car) => {
  const make = getCarMake(car);
  const model = clean(car?.model);
  const year = clean(car?.year);
  const priceUsd = getCarPriceUsd(car);
  const currency = normalizeCurrency(car);
  const mileageNum = Number(String(car?.mileage ?? "").replace(/[^\d.-]/g, ""));

  const images = Array.isArray(car?.images) ? car.images : [];
  const identifier = car?.ref_no || car?.id || car?.stock_no || "";

  return {
    name: [year, make, model].filter(Boolean).join(" "),
    make,
    model,
    year,
    cc: clean(car?.engine_capacity),
    trans: clean(car?.transmission),
    fuel: clean(car?.fuel),
    body: getCarBodyType(car),
    modelCode: getCarModelCode(car),
    chassis: getCarChassis(car),
    color: clean(car?.color),
    mileage: Number.isFinite(mileageNum) && mileageNum > 0 ? mileageNum : null,
    steering: clean(car?.steering),
    drive: clean(car?.drive) || clean(car?.drive_train),
    ref: displayStockId(car),
    images,
    img: images[0] || "",
    priceUsd,
    currency,
    priceLabel:
      priceUsd > 0 ? `${currency} ${priceUsd.toLocaleString("en-US")}` : "Price on request",
    url: identifier
      ? `/vehicle/${encodeURIComponent(String(identifier).trim())}`
      : "/stock-list",
    status: "", // Eljawad Motors/partner data has no sold/reserved status
    raw: car,
  };
};

export { isUnknownLike };
