import { useSyncExternalStore } from 'react';
import { watchPackages, DEFAULT_PACKAGES, type CatalogPackage } from '../firebase/packages';

// Module-level store for the wash-package catalog (name/desc/price).
// Backed by a live Firestore listener (falling back to hardcoded defaults),
// then shared by LangContext (name/desc) and CountryContext (price) so both
// stay in sync without extra prop drilling. Any change — e.g. admin edits a
// price — streams to every screen immediately.
let packages: CatalogPackage[] = DEFAULT_PACKAGES;
let watching = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getPackagesSnapshot(): CatalogPackage[] {
  return packages;
}

export function subscribePackages(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Starts the live catalog listener once; safe to call from multiple components.
export function ensurePackagesLoaded(): void {
  if (watching) return;
  watching = true;
  watchPackages((data) => {
    packages = data;
    notify();
  });
}

export function usePackagesCatalog(): CatalogPackage[] {
  ensurePackagesLoaded();
  return useSyncExternalStore(subscribePackages, getPackagesSnapshot, getPackagesSnapshot);
}
