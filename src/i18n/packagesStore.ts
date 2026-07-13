import { useSyncExternalStore } from 'react';
import { fetchPackages, DEFAULT_PACKAGES, type CatalogPackage } from '../firebase/packages';

// Module-level store for the wash-package catalog (name/desc/price).
// Loaded once at app start from Firestore (falling back to hardcoded
// defaults), then shared by LangContext (name/desc) and CountryContext
// (price) so both stay in sync without extra prop drilling. AdminScreen
// calls reloadPackagesCatalog() after a save so the change is reflected
// live across the app (Home/Booking screens) immediately.
let packages: CatalogPackage[] = DEFAULT_PACKAGES;
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getPackagesSnapshot(): CatalogPackage[] {
  return packages;
}

export function subscribePackages(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function reloadPackagesCatalog(): Promise<void> {
  const p = fetchPackages().then((data) => {
    packages = data;
    loaded = true;
    notify();
  });
  inFlight = p;
  await p;
}

// Kicks off the initial fetch once; safe to call from multiple components.
export function ensurePackagesLoaded(): void {
  if (loaded || inFlight) return;
  reloadPackagesCatalog().catch((e) => console.error(e));
}

export function usePackagesCatalog(): CatalogPackage[] {
  ensurePackagesLoaded();
  return useSyncExternalStore(subscribePackages, getPackagesSnapshot, getPackagesSnapshot);
}
