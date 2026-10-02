// carCard.js  Unified vehicle card
// Visual design from inc (FontAwesome icons, specs bar, two-button layout).
// Theme CSS variables used throughout for consistent branding.
// Compact layout mirrors the Ichinomiya marketplace CarGrid: fixed-height
// thumbnail, tiny uppercase text, single-row spec line and one action button.
import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faLock, faImages, faGaugeHigh, faRoad, faGasPump, faCogs, faScaleBalanced } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/router';
import { useUser } from '../user/userContext';
import { useFavorites, toggleFavorite } from './useFavorites';
import { useCompare } from './useCompare';
import { getCarPriceUsd, normalizeCurrency, secureImageUrl } from '../utilities/ichinomiyaCardAdapter';
import { formatNumberWithUnit } from '../utilities/numberFormat';
import { Censored, UnlockButton } from './stockAccess';

const PLACEHOLDER_IMAGE = '/images/vehicles/artisbay-placeholder.svg';

const absoluteUrlPattern = /https?:\/\/[^\s"']+/gi;
const escapedAbsoluteUrlPattern = /https?:\\\/\\\/[^\s"']+/gi;

const parseImageCandidates = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]' || trimmed.toLowerCase() === 'null') return [];

  // Most partner rows store image_urls as a JSON string.
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);
    }
  } catch (error) {
    // Fall through to regex extraction below.
  }

  const absoluteMatches = [...trimmed.matchAll(absoluteUrlPattern)].map((match) => match[0]);
  if (absoluteMatches.length > 0) return absoluteMatches;

  const escapedMatches = [...trimmed.matchAll(escapedAbsoluteUrlPattern)]
    .map((match) => match[0].replace(/\\\//g, '/'));
  if (escapedMatches.length > 0) return escapedMatches;

  return [trimmed];
};

const UnlockedCarCard = ({ car, imgBasePath, onViewDetails }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();
  const { user } = useUser();
  const favorites = useFavorites();
  const isFavorite = favorites.isFavorite(car.ref_no || car.stock_no || "");
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const { isComparing, toggleCompare, isFull } = useCompare();
  const comparing = isComparing(car);
  const stockRef = car.ref_no || car.stock_no || "";
  const make = car.make || "N/A";
  const model = car.model || "Model N/A";
  const priceAmount = getCarPriceUsd(car);
  const currency = normalizeCurrency(car);
  const price = priceAmount > 0 ? `${currency} ${priceAmount.toLocaleString()}` : "Price TBD";
  const year = car.year || "N/A";
  const mileage = formatNumberWithUnit(car.mileage) || "N/A";
  const fuel = car.fuel || "N/A";
  const transmission = car.transmission || "N/A";
  const cc = formatNumberWithUnit(car.engine_capacity || car.engineCapacity || car.cc || car.engine) || "N/A";
  const category = car.category || car.body || car.shape || car.body_type || car.type || "N/A";

  const rawStatus = String(car.status || car.availability || "").toLowerCase().trim();
  const isSold = rawStatus === "sold" || rawStatus.startsWith("sold");
  const isReserved = rawStatus === "reserved";

  const mainImageUrl = useMemo(() => {
    const base = (imgBasePath || "").replace(/\/+$/, "");
    const isDummyUrl = (url) => /images\.unsplash\.com/i.test(url);

    const candidates = [
      ...parseImageCandidates(car.images),
      ...parseImageCandidates(car.image_urls),
    ];
    let candidate = candidates[0] || null;
    if (!candidate) return PLACEHOLDER_IMAGE;

    const trimmed = String(candidate).trim();
    if (!trimmed || trimmed === "[]" || trimmed.toLowerCase() === "null") return PLACEHOLDER_IMAGE;

    const absoluteMatch = [...trimmed.matchAll(absoluteUrlPattern)].pop();
    if (absoluteMatch) {
      const absoluteUrl = absoluteMatch[0];
      return isDummyUrl(absoluteUrl) ? PLACEHOLDER_IMAGE : secureImageUrl(absoluteUrl);
    }

    const normalized = trimmed.replace(/^\//, "");
    if (!base) return `/${normalized}`;
    return `${base}/${normalized}`;
  }, [car.images, car.image_urls, imgBasePath]);

  const imageCount = useMemo(() => {
    const candidates = [
      ...parseImageCandidates(car.images),
      ...parseImageCandidates(car.image_urls),
    ];
    return candidates.length;
  }, [car.images, car.image_urls]);

  useEffect(() => { setImageLoaded(false); }, [mainImageUrl]);

  const handleFavoriteClick = async (event) => {
    event.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    await toggleFavorite(car);
    setFavoriteBusy(false);
  };

  const handleImageLoad = () => setImageLoaded(true);
  const handleImageError = (event) => {
    setImageLoaded(true);
    const img = event?.target;
    if (img && img.src.indexOf(PLACEHOLDER_IMAGE) === -1) {
      img.onerror = null;
      img.src = PLACEHOLDER_IMAGE;
    }
  };

  return (
    <div className="group flex h-full flex-col bg-[var(--white)] border border-[var(--border-color)] transition-colors duration-300 overflow-hidden hover:border-[var(--primary-color)]">

      {/* Image Section */}
      <div className="relative h-32 overflow-hidden cursor-pointer" onClick={() => onViewDetails && onViewDetails(car)}>
        {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />}
        <img
          src={mainImageUrl}
          alt={`${make} ${model}`}
          className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        <span className="absolute top-0 left-0 bg-[var(--primary-color)] text-white text-[9px] font-extrabold px-2 py-0.5 tracking-wider">
          {year}
        </span>
        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={handleFavoriteClick}
          className={`absolute top-0 right-0 z-20 flex h-7 w-7 items-center justify-center border-b border-l border-[var(--border-color)] bg-white/95 transition ${
            isFavorite ? "text-red-500" : "text-[var(--grey-text)] hover:text-[var(--primary-color)]"
          }`}
        >
          <FontAwesomeIcon icon={faHeart} className={`h-3.5 w-3.5 ${isFavorite ? "text-red-500" : ""}`} />
        </button>
        {isSold && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/65">
            <div className="rounded bg-red-700 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg">
              Sold
            </div>
          </div>
        )}
        {isReserved && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55">
            <div className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-lg">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Under Negotiation
            </div>
          </div>
        )}
        {imageCount > 1 && (
          <span className="absolute bottom-1 right-1 z-10 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            <FontAwesomeIcon icon={faImages} className="h-2.5 w-2.5" />
            {imageCount}
          </span>
        )}
      </div>

      {/* Details Section */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-[12px] font-bold text-[var(--text-color)] uppercase truncate leading-tight cursor-pointer" onClick={() => onViewDetails && onViewDetails(car)}>
            {make} {model}
          </h3>
          {stockRef && (
            <span className="shrink-0 font-mono text-[9px] font-bold text-white bg-[var(--grey-text)] px-1.5 py-0.5 tracking-wide">
              {stockRef}
            </span>
          )}
        </div>
        {isSold || isReserved ? (
          <div className="mt-1 font-display text-[15px] font-bold italic text-[var(--grey-text)]">Price on request</div>
        ) : (
          <div className="mt-1 font-display text-[18px] font-bold text-[var(--accent-color)]">
            {price} {priceAmount > 0 && <small className="text-[9px] text-gray-500 font-normal not-italic">FOB</small>}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-y-1 gap-x-2 text-[9px] text-[var(--grey-text)] uppercase tracking-wide border-t border-[var(--border-color)] pt-2">
          <span className="flex items-center gap-1"><FontAwesomeIcon icon={faGaugeHigh} className="h-2.5 w-2.5 text-[var(--accent-color)]" />{cc}</span>
          <span className="flex items-center gap-1"><FontAwesomeIcon icon={faRoad} className="h-2.5 w-2.5 text-[var(--accent-color)]" />{mileage}km</span>
          <span className="flex items-center gap-1"><FontAwesomeIcon icon={faGasPump} className="h-2.5 w-2.5 text-[var(--accent-color)]" />{fuel}</span>
          <span className="flex items-center gap-1"><FontAwesomeIcon icon={faCogs} className="h-2.5 w-2.5 text-[var(--accent-color)]" />{transmission}</span>
        </div>

        <label className="mt-2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--grey-text)] cursor-pointer">
          <input
            type="checkbox"
            checked={comparing}
            disabled={!comparing && isFull}
            onChange={(e) => { e.stopPropagation(); toggleCompare(car); }}
            onClick={(e) => e.stopPropagation()}
            className="h-3 w-3 accent-[var(--primary-color)]"
          />
          <FontAwesomeIcon icon={faScaleBalanced} className="h-2.5 w-2.5" />
          Compare
        </label>

        <button
          type="button"
          onClick={() => onViewDetails(car)}
          className="mt-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--primary-color)] border-b border-transparent group-hover:border-[var(--primary-color)] transition w-fit"
        >
          View Details &rarr;
        </button>
      </div>
    </div>
  );
};

// Locked units (see components/vehicles/stockAccess.js) arrive with only a
// photo, make and model; everything else is censored behind an unlock prompt.
const LockedCarCard = ({ car, imgBasePath }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const make = car.make || "N/A";
  const model = car.model || "";
  const imageUrl = useMemo(() => {
    const candidate = [...parseImageCandidates(car.images), ...parseImageCandidates(car.image_urls)][0];
    if (!candidate) return PLACEHOLDER_IMAGE;
    const absolute = [...String(candidate).matchAll(absoluteUrlPattern)].pop();
    if (absolute) return secureImageUrl(absolute[0]);
    const base = (imgBasePath || "").replace(/\/+$/, "");
    const normalized = String(candidate).trim().replace(/^\//, "");
    return base ? `${base}/${normalized}` : `/${normalized}`;
  }, [car.images, car.image_urls, imgBasePath]);

  return (
    <div className="flex h-full flex-col bg-[var(--white)] border border-[var(--border-color)] overflow-hidden">
      <div className="relative h-32 overflow-hidden">
        {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" aria-hidden="true" />}
        <img
          src={imageUrl}
          alt={`${make} ${model}`}
          className={`w-full h-full object-cover ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            setImageLoaded(true);
            if (e.target.src.indexOf(PLACEHOLDER_IMAGE) === -1) e.target.src = PLACEHOLDER_IMAGE;
          }}
        />
        <span className="absolute top-0 left-0 flex items-center gap-1 bg-[var(--primary-color)] text-white text-[9px] font-extrabold px-2 py-0.5 tracking-wider uppercase">
          <FontAwesomeIcon icon={faLock} className="h-2.5 w-2.5" /> Locked
        </span>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-display text-[12px] font-bold text-[var(--text-color)] uppercase truncate leading-tight">
          {make} {model}
        </h3>
        <div className="mt-2"><Censored className="h-3.5 w-24" /></div>
        <div className="mt-2 grid grid-cols-2 gap-y-2 gap-x-2 border-t border-[var(--border-color)] pt-2">
          <Censored className="w-12" />
          <Censored className="w-10" />
          <Censored className="w-14" />
          <Censored className="w-9" />
        </div>
        <UnlockButton
          car={car}
          className="mt-auto pt-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--accent-color)] hover:underline w-fit"
        />
      </div>
    </div>
  );
};

const CarCard = (props) =>
  props.car?.locked ? <LockedCarCard {...props} /> : <UnlockedCarCard {...props} />;

export default CarCard;
