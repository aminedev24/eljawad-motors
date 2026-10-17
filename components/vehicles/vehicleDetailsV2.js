// vehicleDetailsV2.js — Unified vehicle detail page
// Visual design: "Manifest" — a dense auction/inventory-platform layout
// (stamped photo, fact ticker, inspection-diagram callouts, ticket-stub price
// block, ledger, running-text equipment list, request slip) replacing the
// earlier soft two-column dealer-card design.
// Data fetching uses fetchVehicle.php (single efficient query, dynamic partner DB detection).
// Theme CSS variables used throughout for consistent branding.
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faExpand,
  faImages,
  faShareAlt,
  faPaperPlane,
  faArrowLeft,
  faCar,
  faHeart,
  faScaleBalanced,
  faTriangleExclamation,
  faBan,
  faListCheck,
  faCircleInfo,
  faCircleCheck,
  faHandshake,
} from "@fortawesome/free-solid-svg-icons";
import { useUser } from "../user/userContext";
import { useFavorites, toggleFavorite } from "./useFavorites";
import { useCompare } from "./useCompare";
import { apiBaseUrl } from "../utilities/apiBase";
import { formatNumberWithUnit } from "../utilities/numberFormat";
import VehicleInquiryForm from "./vehicleInquiryForm";
import { SITE } from "../utilities/siteConfig";
import { VehiclePaymentCard } from "../user/payments";
import { useStockAccess, LoginWall, UnlockButton, Censored } from "./stockAccess";
import {
  normalizeCurrency,
  displayStockId,
  maskChassis,
  secureImageUrl,
  getCarPriceUsd,
  parseImageUrls,
} from "../utilities/ichinomiyaCardAdapter";

const PLACEHOLDER_IMAGE = SITE.vehiclePlaceholder;
const absoluteUrlPattern = /https?:\/\/[^\s"']+/gi;
const UNKNOWN = new Set(["", "n/a", "na", "unknown", "0", "null", "undefined", "-", "--"]);
const isUnknownLike = (v) => UNKNOWN.has(String(v ?? "").trim().toLowerCase());

// Kept in sync with the partner source's full option code table (see
// ichinomiya-motors server-scripts/process_upload.php $OPTIONS_MAP) so a
// genuinely-listed feature (e.g. Rear Camera, Cruise Control) never gets
// silently dropped just because it was missing from an older, shorter list.
const EQUIPMENT_LIST = [
  'Air Bag', 'Anti-lock Brakes', 'Air Conditioner', 'Alloy Wheels', 'Power Window',
  'Power Steering', 'Power Seat', 'Power Slide Door', 'HID Light', 'Fog Light',
  'LED Light', 'Push Start', 'Steering Switch', 'Back Monitor', 'Sun Roof',
  'Glass Roof', 'Roof Rail', 'Leather Seat', 'Seat Heater', 'Back Tyre',
  'Grill Guard', 'Side Step', 'Aero Parts', 'Rear Spoiler', 'Navigation System',
  'Keyless Entry', 'Parking Sensor', 'Cruise Control', '360 Camera',
  'Electric Tailgate', 'Rear Camera', 'Lane Keep Assist', 'Pre-collision System',
  'Blind Spot Monitor', 'Adaptive Cruise', 'Auto High Beam', 'Parking Assist',
  'Wireless Charger', 'ETC', 'Dashcam',
];

// A torn/perforated-edge rule used between sections instead of a plain
// border line - the "manifest" language treats sections as torn paper, not
// bordered cards.
const TornEdge = ({ flip = false }) => (
  <svg
    viewBox="0 0 400 10"
    preserveAspectRatio="none"
    className="block h-2 w-full"
    aria-hidden="true"
  >
    <polyline
      points={
        flip
          ? "0,10 10,0 20,10 30,0 40,10 50,0 60,10 70,0 80,10 90,0 100,10 110,0 120,10 130,0 140,10 150,0 160,10 170,0 180,10 190,0 200,10 210,0 220,10 230,0 240,10 250,0 260,10 270,0 280,10 290,0 300,10 310,0 320,10 330,0 340,10 350,0 360,10 370,0 380,10 390,0 400,10"
          : "0,0 10,10 20,0 30,10 40,0 50,10 60,0 70,10 80,0 90,10 100,0 110,10 120,0 130,10 140,0 150,10 160,0 170,10 180,0 190,10 200,0 210,10 220,0 230,10 240,0 250,10 260,0 270,10 280,0 290,10 300,0 310,10 320,0 330,10 340,0 350,10 360,0 370,10 380,0 390,10 400,0"
      }
      fill="none"
      stroke="#e2e2e2"
      strokeWidth="1.5"
    />
  </svg>
);

// A highlighter-style inline tag for calling out equipment, included
// services, and status text within otherwise plain running paragraphs -
// solid ink, not a faint tint, so it actually reads as a highlight.
const Highlight = ({ tone = "accent", children }) => (
  <span
    className={`inline-block px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
      tone === "accent"
        ? "bg-[var(--accent-color)] text-white"
        : tone === "primary"
        ? "bg-[var(--primary-color)] text-white"
        : "bg-[var(--charcoal-color)] text-white"
    }`}
  >
    {children}
  </span>
);

// Bolds only the clause that matters, in place, rather than the whole
// sentence - research on disclaimer scanning (NN/g) shows highlighting a
// short key phrase beats a uniform block, which readers skip entirely.
const WarnLine = ({ children, critical }) => (
  <div className="flex items-start gap-2.5 border-b border-amber-200/70 py-2.5 text-sm leading-relaxed text-[var(--text-color)] last:border-b-0">
    <FontAwesomeIcon icon={faTriangleExclamation} className="mt-1 shrink-0 text-sm text-amber-600" />
    <p>
      {children} <strong className="bg-amber-100 px-1 font-bold text-amber-800">{critical}</strong>
    </p>
  </div>
);

const VehicleDetailsV2 = ({ initialVehicleId = "" }) => {
  const router = useRouter();
  const { id: queryId } = router.query;
  const effectiveVehicleId = queryId || initialVehicleId;

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { tier, loading: accessLoading } = useStockAccess();
  const [loginRequired, setLoginRequired] = useState(false);

  const apiUrl = apiBaseUrl;
  const imgBasePath =
    process.env.NODE_ENV === "development"
      ? "http://localhost/artisbay-next/server"
      : "/server";

  const handleImageError = useCallback((event) => {
    const img = event?.target;
    if (!img || img.src.includes(PLACEHOLDER_IMAGE)) return;
    img.onerror = null;
    img.src = PLACEHOLDER_IMAGE;
  }, []);

  const resolveImageUrl = useCallback(
    (imagePath) => {
      if (!imagePath) return PLACEHOLDER_IMAGE;
      const trimmed = String(imagePath).trim();
      if (!trimmed || trimmed === "[]" || trimmed.toLowerCase() === "null") return PLACEHOLDER_IMAGE;
      if (trimmed === PLACEHOLDER_IMAGE || /images\/vehicles\/(artisbay|start-auction)-placeholder\.svg$/.test(trimmed)) {
        return PLACEHOLDER_IMAGE;
      }
      const absolute = [...trimmed.matchAll(absoluteUrlPattern)];
      if (absolute.length > 0) return secureImageUrl(absolute[absolute.length - 1][0]);
      if (trimmed.startsWith("http")) return secureImageUrl(trimmed);
      const normalized = trimmed.replace(/^\/+/, "");
      const withoutServer = normalized.startsWith("server/") ? normalized.slice(7) : normalized;
      if (withoutServer.startsWith("inventory/cars/")) return `${imgBasePath}/${withoutServer}`;
      if (withoutServer.startsWith("uploads/")) return `${imgBasePath}/inventory/cars/${withoutServer}`;
      if (withoutServer.startsWith("inventory/")) return `${imgBasePath}/${withoutServer}`;
      return `${imgBasePath}/${withoutServer}`;
    },
    [imgBasePath]
  );

  useEffect(() => {
    if (!router.isReady && !initialVehicleId) return;
    if (accessLoading || tier === "guest") return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`${apiUrl}/inventory/cars/fetchVehicle.php?id=${encodeURIComponent(effectiveVehicleId)}&tier=${tier}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            setLoginRequired(true);
            throw new Error("Login required");
          }
          if (res.status === 404) throw new Error("Vehicle not found");
          throw new Error("Failed to fetch vehicle details");
        }
        return res.json();
      })
      .then((item) => {
        if (!isMounted) return;

        let imagesArray = parseImageUrls(item.image_urls);
        const sanitizedImages = Array.isArray(imagesArray)
          ? imagesArray.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean)
          : [];

        let optionsArray = parseImageUrls(item.options);

        setCar({
          ...item,
          images: sanitizedImages.length > 0 ? sanitizedImages : [PLACEHOLDER_IMAGE],
          options: Array.isArray(optionsArray) ? optionsArray : [],
        });
        setError(null);
        setActiveImageIndex(0);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Vehicle details fetch failed:", err);
        setError(err.message === "Vehicle not found"
          ? "Vehicle not found in current stock."
          : "Unable to load vehicle details. Please try again."
        );
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [effectiveVehicleId, apiUrl, router.isReady, initialVehicleId, tier, accessLoading]);

  const galleryImages = useMemo(() => {
    if (!car) return [];
    const sources = Array.isArray(car.images) ? car.images : [];
    const resolved = sources.map((p) => resolveImageUrl(p)).filter(Boolean);
    return resolved.length > 0 ? resolved : [PLACEHOLDER_IMAGE];
  }, [car, resolveImageUrl]);

  useEffect(() => {
    setActiveImageIndex((prev) => Math.min(prev, Math.max(galleryImages.length - 1, 0)));
  }, [galleryImages.length]);

  const nextImage = useCallback(() => {
    if (!galleryImages.length) return;
    setActiveImageIndex((p) => (p + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    if (!galleryImages.length) return;
    setActiveImageIndex((p) => (p - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: car ? `${car.make} ${car.model}` : "Vehicle", url }); } catch (e) {}
    } else {
      try { await navigator.clipboard.writeText(url); alert("Link copied!"); } catch (e) {}
    }
  }, [car]);

  const backToStock = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/stock-list");
    }
  }, [router]);

  const priceDisplay = useMemo(() => {
    if (!car) return "Contact us";
    const numeric = getCarPriceUsd(car);
    if (!Number.isFinite(numeric) || numeric <= 0) return "Contact us";
    return `${normalizeCurrency(car)} ${numeric.toLocaleString("en-US")}`;
  }, [car]);

  const carName = car ? [car.year, car.make, car.model].filter(Boolean).join(" ") : "";
  const bodyType = car ? car.category || car.body || "" : "";
  const carOptions = useMemo(() => (car && Array.isArray(car.options) ? car.options : []), [car]);

  const rawStatus = car ? String(car.status || car.availability || "").toLowerCase().trim() : "";
  const isSold = rawStatus === "sold" || rawStatus.startsWith("sold");
  const isReserved = rawStatus === "reserved";

  const { user } = useUser();
  const favorites = useFavorites();
  const carRef = car ? String(car.ref_no || car.stock_no || "").trim() : "";
  const isFavorite = favorites.isFavorite(carRef);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  // The customer's own reservation or order of this car, for the
  // "Your Payments on This Vehicle" card.
  const [myReservation, setMyReservation] = useState(null);
  useEffect(() => {
    if (!user || !carRef || ["admin", "sales"].includes(user.role)) {
      setMyReservation(null);
      return;
    }
    let cancelled = false;
    fetch(`${apiUrl}/inventory/cars/fetchMyReservations.php`, { credentials: "include" })
      .then((res) => res.json())
      .then((d) => {
        if (cancelled) return;
        const mine = [...(d.reservations || []), ...(d.orders || [])].find(
          (r) => String(r.vehicle_ref || "").toUpperCase() === carRef.toUpperCase() && !["cancelled", "expired"].includes(r.status)
        );
        setMyReservation(mine || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, carRef, apiUrl]);
  const { isComparing, toggleCompare, isFull: isCompareFull } = useCompare();
  const comparing = car ? isComparing(car) : false;

  const handleFavoriteClick = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (favoriteBusy || !carRef) return;
    setFavoriteBusy(true);
    await toggleFavorite(car);
    setFavoriteBusy(false);
  };

  // One authoritative spec table - real reference sites (e.g. beforward.jp)
  // use a single plain spec table rather than splitting fields across a
  // ticker, an illustrated diagram, and a ledger.
  const ledgerRows = useMemo(() => {
    if (!car) return [];
    return [
      { label: "Ref No", value: displayStockId(car) },
      { label: "Make", value: car.make },
      { label: "Model", value: car.model },
      { label: "Model Code", value: car.model_code || car.modelCode },
      { label: "Body Type", value: bodyType },
      { label: "Color", value: car.color },
      { label: "Year", value: car.year },
      { label: "Mileage", value: formatNumberWithUnit(car.mileage) },
      { label: "Engine", value: formatNumberWithUnit(car.engine_capacity) },
      { label: "Fuel", value: car.fuel },
      { label: "Transmission", value: car.transmission },
      { label: "Drive", value: car.drive || car.drive_train },
      { label: "Steering", value: car.steering },
      { label: "Seats", value: car.seat },
      { label: "Doors", value: car.door },
      { label: "Chassis No.", value: maskChassis(car.chassis_no || car.chassis || car.chassisNo || car.frame_no || car.vin_number) },
    ]
      .filter((row) => !isUnknownLike(row.value))
      .map((row, i) => ({ ...row, index: String(i + 1).padStart(2, "0") }));
  }, [car, bodyType]);

  const equippedItems = useMemo(() => EQUIPMENT_LIST.filter((item) => carOptions.includes(item)), [carOptions]);

  // The six specs buyers scan first, surfaced in the desktop info rail
  // (values reuse the already-cleaned ledger rows so unknowns stay hidden).
  const quickSpecs = useMemo(
    () =>
      ["Year", "Mileage", "Engine", "Transmission", "Fuel", "Drive"].map((label) => ({
        label,
        value: ledgerRows.find((row) => row.label === label)?.value || "—",
      })),
    [ledgerRows]
  );

  if (!accessLoading && (tier === "guest" || loginRequired)) {
    return <LoginWall title="Log in to view this vehicle" />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--background-color)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[var(--primary-color)]/20 border-t-[var(--accent-color)]" />
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary-color)]">
            Loading vehicle...
          </p>
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--background-color)] px-4">
        <div className="max-w-md border border-[var(--border-color)] bg-[var(--white)] p-8 text-center">
          <FontAwesomeIcon icon={faCar} className="mb-3 text-4xl text-gray-300" />
          <p className="text-lg font-bold text-[var(--text-color)]">
            {error || "Unable to locate this vehicle."}
          </p>
          <button
            type="button"
            onClick={backToStock}
            className="mt-5 inline-flex items-center gap-2 bg-[var(--primary-color)] px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[var(--primary-color-hover)]"
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Stocklist
          </button>
        </div>
      </div>
    );
  }

  if (car.locked) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] py-6">
        <div className="mx-auto w-full max-w-3xl px-4">
          <button
            type="button"
            onClick={backToStock}
            className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--primary-color)] hover:underline"
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Stocklist
          </button>
          <div className="overflow-hidden border border-[var(--border-color)] bg-[var(--white)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryImages[0] || PLACEHOLDER_IMAGE}
              alt={`${car.make} ${car.model}`}
              onError={handleImageError}
              className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
            />
            <div className="p-5">
              <h1 className="font-display text-2xl font-bold uppercase text-[var(--primary-color)]">
                {car.make} {car.model}
              </h1>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border-color)] pt-4 sm:grid-cols-3">
                {["Price (FOB)", "Year", "Mileage", "Engine", "Transmission", "Fuel"].map((label) => (
                  <div key={label}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--grey-text)]">{label}</div>
                    <Censored className="mt-1.5 h-3 w-20" />
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded border border-[var(--accent-color)]/40 bg-[var(--accent-color)]/10 p-4">
                <p className="text-sm text-[var(--text-color)]">
                  This vehicle is outside your free preview. Contact our sales department to unlock the
                  full stock, including photos, specifications and prices.
                </p>
                <UnlockButton
                  car={car}
                  className="mt-3 inline-block rounded bg-[var(--accent-color)] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:opacity-90"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)] py-3 lg:py-6">
      <div className="mx-auto w-full max-w-[1280px] px-4">
        {/* Breadcrumb */}
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--grey-text)]">
          <button onClick={() => router.push("/")} className="hover:text-[var(--primary-color)]">HOME</button>
          <span>/</span>
          <button onClick={backToStock} className="hover:text-[var(--primary-color)]">STOCK</button>
          {car.make && (
            <>
              <span>/</span>
              <button
                onClick={() => router.push(`/stock-list?make=${encodeURIComponent(car.make)}`)}
                className="uppercase hover:text-[var(--primary-color)]"
              >
                {car.make}
              </button>
            </>
          )}
          <span>/</span>
          <span className="font-medium text-[var(--text-color)]">{carName}</span>
        </nav>

        {/* Page title row - moved out of the photo overlay so the image
            stays clean and the name reads as a real heading */}
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-lg font-extrabold uppercase tracking-wide text-[var(--charcoal-color)] lg:text-2xl">
            {carName}
          </h1>
          <span className="font-mono text-xs font-semibold text-[var(--grey-text)]">
            Lot {displayStockId(car)}
          </span>
        </div>

        {/* Desktop split: gallery left, sticky info rail right. Mobile keeps
            the original stacked flow. */}
        <div className="lg:flex lg:items-start lg:gap-5">
          <div className="min-w-0 lg:flex-1">
            {/* Hero photo - tall enough to actually see the car: 4/3 on
                phones, 16/9 tablets, 16/10 desktop (the old 16/4.2 banner
                cropped most of every photo away) */}
            <div className="relative aspect-[4/3] overflow-hidden border border-[var(--border-color)] bg-gray-100 sm:aspect-video lg:aspect-[16/10]">
          <img
            src={galleryImages[activeImageIndex]}
            alt={`${carName} photo ${activeImageIndex + 1}`}
            className="h-full w-full object-cover"
            onError={handleImageError}
          />

          {isSold && (
            <div
              className="pointer-events-none absolute right-4 top-4 border-[4px] border-double px-4 py-2 font-mono text-xl font-extrabold uppercase tracking-widest shadow-lg md:right-6 md:top-5 md:text-2xl"
              style={{ transform: "rotate(-9deg)", borderColor: "#b91c1c", color: "#b91c1c", background: "rgba(255,255,255,0.9)" }}
            >
              Sold
            </div>
          )}
          {isReserved && (
            <div
              className="pointer-events-none absolute right-4 top-4 border-[4px] border-double px-4 py-2 font-mono text-xl font-extrabold uppercase tracking-widest shadow-lg md:right-6 md:top-5 md:text-2xl"
              style={{ transform: "rotate(-9deg)", borderColor: "#2563eb", color: "#2563eb", background: "rgba(255,255,255,0.9)" }}
            >
              Under Negotiation
            </div>
          )}
          {!isSold && !isReserved && (
            <div
              className="pointer-events-none absolute right-6 top-5 border-[3px] border-double px-3 py-1.5 font-mono text-base font-extrabold uppercase tracking-widest"
              style={{ transform: "rotate(-9deg)", borderColor: "var(--accent-color)", color: "var(--accent-color)", background: "rgba(254,254,254,0.76)" }}
            >
              Available
            </div>
          )}

          {galleryImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                aria-label="Previous photo"
                className="absolute left-3.5 top-1/2 z-10 flex h-[34px] w-[34px] -translate-y-1/2 items-center justify-center bg-black/50 text-white transition hover:bg-black/70"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
              </button>
              <button
                onClick={nextImage}
                aria-label="Next photo"
                className="absolute right-3.5 top-1/2 z-10 flex h-[34px] w-[34px] -translate-y-1/2 items-center justify-center bg-black/50 text-white transition hover:bg-black/70"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </button>
              <span className="absolute left-4 top-5 rounded-none bg-black/60 px-2.5 py-1 font-mono text-xs font-semibold text-white">
                {activeImageIndex + 1} / {galleryImages.length}
              </span>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {galleryImages.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pt-1.5">
            {galleryImages.map((img, i) => (
              <button
                key={`${img}-${i}`}
                onClick={() => setActiveImageIndex(i)}
                className={`h-12 w-[4.5rem] shrink-0 overflow-hidden border-2 transition lg:h-16 lg:w-24 ${
                  i === activeImageIndex ? "border-[var(--primary-color)]" : "border-dashed border-gray-300 hover:border-gray-400"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" onError={handleImageError} />
              </button>
            ))}
          </div>
        )}

        {/* Photo utility bar */}
        <div className="flex items-center gap-4 pt-1.5 text-xs text-[var(--grey-text)]">
          <span><FontAwesomeIcon icon={faImages} className="mr-1" />{galleryImages.length} photo{galleryImages.length === 1 ? "" : "s"}</span>
          <a
            href={galleryImages[activeImageIndex]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition hover:text-[var(--primary-color)]"
          >
            <FontAwesomeIcon icon={faExpand} /> Fullscreen
          </a>
          <button onClick={handleShare} className="ml-auto flex items-center gap-1 transition hover:text-[var(--primary-color)]">
            <FontAwesomeIcon icon={faShareAlt} /> Share
          </button>
        </div>
          </div>

          {/* Info rail - status, ticket-stub price, CTA and the six specs
              buyers scan first; sticks beside the gallery on desktop */}
          <aside className="mt-3 shrink-0 lg:sticky lg:top-[120px] lg:mt-0 lg:w-[400px]">
            <div className="border border-[var(--border-color)] bg-[var(--white)] p-4">
              {myReservation && (
                <div className="mb-3">
                  <VehiclePaymentCard r={myReservation} />
                </div>
              )}
              {(isSold || isReserved) && (
                <div
                  role="status"
                  className={`mb-3 flex items-start gap-3 px-4 py-3 text-white ${isSold ? "bg-red-700" : "bg-blue-600"}`}
                >
                  <FontAwesomeIcon icon={isSold ? faBan : faHandshake} className="mt-0.5 text-lg" />
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest">
                      {!isSold && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />}
                      {isSold ? "Sold" : "Under Negotiation"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/90">
                      {isSold
                        ? "This vehicle has been sold. Send a request and we\u2019ll find you a similar unit."
                        : "Another buyer is finalizing this vehicle. Send a request and we\u2019ll tell you if it becomes available, or offer a similar unit."}
                    </p>
                  </div>
                </div>
              )}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {!isSold && !isReserved && (
                  <span className="bg-[var(--accent-color)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Available Now
                  </span>
                )}
                {equippedItems.length > 0 && (
                  <span className="bg-[var(--primary-color)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    {equippedItems.length} Features
                  </span>
                )}
                <span className="bg-[var(--charcoal-color)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Inspected
                </span>
              </div>

              {/* Ticket-stub price */}
              <div className="flex border border-[var(--primary-color)]">
                <div className="flex-1 py-2.5 text-center">
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400">FOB Japan</div>
                  {isSold || isReserved ? (
                    <div className="font-mono text-lg font-extrabold italic leading-tight text-gray-400">Price on request</div>
                  ) : (
                    <div className="font-mono text-2xl font-extrabold leading-tight text-[var(--accent-color)]">{priceDisplay}</div>
                  )}
                </div>
                <div
                  className="w-2"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, var(--white) 3px, transparent 3.1px), linear-gradient(to right, transparent calc(50% - 1px), var(--primary-color) calc(50% - 1px), var(--primary-color) calc(50% + 1px), transparent calc(50% + 1px))",
                    backgroundSize: "8px 14px, 100% 100%",
                    backgroundRepeat: "repeat-y, no-repeat",
                    backgroundPosition: "center",
                  }}
                />
                <div className="flex w-11 flex-col items-center justify-center gap-2.5 py-2">
                  <button
                    type="button"
                    onClick={handleFavoriteClick}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    className={isFavorite ? "text-red-500" : "text-[var(--primary-color)] hover:text-[var(--primary-color-hover)]"}
                  >
                    <FontAwesomeIcon icon={faHeart} className="text-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCompare(car)}
                    disabled={!comparing && isCompareFull}
                    aria-label={comparing ? "Remove from compare" : "Add to compare"}
                    className={`disabled:cursor-not-allowed disabled:opacity-40 ${comparing ? "text-[var(--accent-color)]" : "text-[var(--primary-color)] hover:text-[var(--primary-color-hover)]"}`}
                  >
                    <FontAwesomeIcon icon={faScaleBalanced} className="text-sm" />
                  </button>
                  <button type="button" onClick={backToStock} aria-label="Back to stock" className="text-[var(--primary-color)] hover:text-[var(--primary-color-hover)]">
                    <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => document.getElementById("request-now-panel")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-2 flex w-full items-center justify-center gap-2 bg-[var(--accent-color)] py-2.5 text-xs font-extrabold uppercase tracking-widest text-white transition hover:bg-[var(--accent-color-hover)]"
              >
                <FontAwesomeIcon icon={faPaperPlane} /> Request This Vehicle
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("important-notes")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 underline-offset-2 hover:underline"
              >
                <FontAwesomeIcon icon={faTriangleExclamation} /> Please read the important notes before ordering
              </button>

              <div className="mt-3 grid grid-cols-2 gap-x-5 border-t border-[var(--border-color)] pt-3">
                {quickSpecs.map((spec) => (
                  <div key={spec.label} className="flex items-baseline justify-between gap-2 border-b border-gray-100 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{spec.label}</span>
                    <span className="font-mono text-xs font-semibold text-[var(--text-color)]">{spec.value}</span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                {isSold
                  ? "Contact us to find a similar unit."
                  : isReserved
                  ? "Contact us for availability."
                  : "Ready to inspect, reserve, and ship from Japan — pre-export inspection and worldwide RoRo / container shipping included."}
              </p>
            </div>
          </aside>
        </div>

        <TornEdge />

        {/* Spec band - specification tiles beside the equipment panel on desktop */}
        <div className="mt-3 lg:flex lg:items-stretch lg:gap-5">
          <section className="min-w-0 flex-1 border border-[var(--border-color)] bg-[var(--white)] p-4 md:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[var(--primary-color)]">
              <FontAwesomeIcon icon={faListCheck} /> Specifications
            </h3>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ledgerRows.map((row) => (
                <div key={row.label} className="border border-gray-100 bg-gray-50 px-3 py-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{row.label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-[var(--text-color)]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Equipment & inclusions panel */}
          <aside className="mt-3 flex flex-col gap-4 border border-[var(--border-color)] bg-[var(--white)] p-4 md:p-5 lg:mt-0 lg:w-[400px] lg:shrink-0">
            <div>
              <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--primary-color)]">Equipment</h3>
              {carOptions.length === 0 ? (
                <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
                  <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 text-gray-400" />
                  Equipment data isn&rsquo;t available for this vehicle. Contact us to confirm specific features.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {equippedItems.map((item) => (
                      <Highlight key={item}>{item}</Highlight>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                    From the seller&rsquo;s inspection sheet; may not be exhaustive. Contact us to confirm a specific feature.
                  </p>
                </>
              )}
            </div>

            <div className="border-t border-[var(--border-color)] pt-4">
              <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--primary-color)]">Included with every vehicle</h3>
              <ul className="space-y-2 text-sm text-[var(--text-color)]">
                {["Pre-export inspection", "Export documents handled end to end", "Worldwide RoRo / container shipping"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 text-[var(--accent-color)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <TornEdge flip />

        {/* Disclaimer - the terms buyers most often miss, so it gets a
            heading and a strong edge instead of a quiet strip */}
        <div id="important-notes" className="mt-4 border border-amber-300 border-l-[6px] border-l-amber-500 bg-amber-50 px-4 pb-1 pt-3 md:px-5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-amber-800">
            <FontAwesomeIcon icon={faTriangleExclamation} /> Important — please read before ordering
          </h3>
          <WarnLine critical="excludes freight, insurance, and import duties.">
            Prices are approximate FOB Japan and
          </WarnLine>
          <WarnLine critical="reservation alone does not guarantee availability until your payment is reflected in our account.">
            Vehicles are listed online and viewed by many buyers daily;
          </WarnLine>
          <WarnLine critical="we will offer a similar unit or process a refund based on your decision.">
            If the vehicle is unavailable when your payment is reflected,
          </WarnLine>
          <WarnLine critical="verify import regulations for your country before ordering.">
            Please
          </WarnLine>
        </div>

        {/* Request slip - its own full-width row so the form has room to breathe */}
        <div
          id="request-now-panel"
          className="mt-4 border border-[var(--primary-color)] bg-[var(--white)] p-4 lg:p-6"
        >
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-base font-bold uppercase text-[var(--primary-color)]">
              Request quotation &mdash; Lot #{displayStockId(car)}
            </h3>
            <span className="font-mono text-[10px] uppercase text-gray-400">File with {SITE.name}</span>
          </div>
          <VehicleInquiryForm car={car} />
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsV2;
