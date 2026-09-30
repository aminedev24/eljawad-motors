// useCompare.js — shared "compare vehicles" store (module-level singleton),
// mirroring useFavorites.js's useSyncExternalStore pattern but client-side
// only: comparison is an ephemeral browsing-session tool, not something that
// needs to survive login/logout or sync across devices, so no backend calls.
import { useCallback, useSyncExternalStore } from "react";
import { getCarPriceUsd, normalizeCurrency } from "../utilities/ichinomiyaCardAdapter";

export const MAX_COMPARE = 5;
// v2: snapshots now include price/currency/drive/bodyType — bumping the key
// instead of migrating keeps pre-v2 sessions from rendering blank rows.
const STORAGE_KEY = "eljawad_compare_v2";

const readInitial = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

let items = readInitial();
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => items;
const emit = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
  listeners.forEach((listener) => listener());
};

const refOf = (car) => String(car?.ref_no || car?.stock_no || car?.id || "").trim();

const snapshotOf = (car) => ({
  ref: refOf(car),
  make: car.make || "",
  model: car.model || "",
  year: car.year || "",
  mileage: car.mileage || "",
  modelCode: car.model_code || car.modelCode || "",
  engine: car.engine_capacity || car.engineCapacity || car.cc || car.engine || "",
  fuel: car.fuel || "",
  transmission: car.transmission || "",
  drive: car.drive || car.drive_train || "",
  bodyType: car.category || car.body || "",
  grade: car.grade || "",
  seats: car.seats || car.seating_capacity || "",
  color: car.color || "",
  chassis: car.chassis_no || car.chassisNumber || car.chassis || "",
  // Price uses the same fallback chain as the stock grid/detail page so the
  // compare table can't disagree with what buyers see elsewhere.
  price: getCarPriceUsd(car),
  currency: normalizeCurrency(car),
  image: Array.isArray(car.images) ? car.images[0] : "",
});

export function toggleCompare(car) {
  const ref = refOf(car);
  if (!ref) return;
  const exists = items.some((c) => c.ref === ref);
  if (exists) {
    items = items.filter((c) => c.ref !== ref);
  } else {
    if (items.length >= MAX_COMPARE) return;
    items = [...items, snapshotOf(car)];
  }
  emit();
}

export function removeFromCompare(ref) {
  items = items.filter((c) => c.ref !== String(ref).trim());
  emit();
}

export function clearCompare() {
  items = [];
  emit();
}

export function useCompare() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => []);
  const isComparing = useCallback(
    (car) => snapshot.some((c) => c.ref === refOf(car)),
    [snapshot]
  );
  return {
    items: snapshot,
    count: snapshot.length,
    isFull: snapshot.length >= MAX_COMPARE,
    isComparing,
    toggleCompare,
    removeFromCompare,
    clearCompare,
  };
}
