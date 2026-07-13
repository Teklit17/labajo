import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'packages';
const TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out. Check your internet connection and try again.`)), TIMEOUT_MS)
    ),
  ]);
}

// Only Sweden (SEK) is configured today in CountryContext, but keyed by
// country code so adding e.g. CA/CAD later is just adding a key here.
export type PackagePrices = { SE: number };

export type CatalogPackage = {
  id: string;
  name_en: string;
  name_sv: string;
  desc_en: string;
  desc_sv: string;
  prices: PackagePrices;
};

// Fallback values — mirrors the previously hardcoded content in
// src/i18n/translations.ts and src/i18n/CountryContext.tsx. Used when
// Firestore is empty (first run) or unreachable (offline), so the app
// never breaks on package data.
export const DEFAULT_PACKAGES: CatalogPackage[] = [
  {
    id: 'quick',
    name_en: 'Quick Wash',
    name_sv: 'Quick Wash',
    desc_en: 'Exterior wash + Rinse & dry + Wheel clean + 20-30 min',
    desc_sv: 'Exteriörtvätt + Sköljning & torkning + Fälgtvätt + 20-30 min',
    prices: { SE: 199 },
  },
  {
    id: 'standard',
    name_en: 'Standard',
    name_sv: 'Standard',
    desc_en: 'Exterior wash + Interior vacuum + Dashboard wipe + Windows + 40-50 min',
    desc_sv: 'Exteriörtvätt + Dammsugning inuti + Torka instrumentpanel + Fönster + 40-50 min',
    prices: { SE: 499 },
  },
  {
    id: 'premium',
    name_en: 'Premium',
    name_sv: 'Premium',
    desc_en: 'Full exterior + Deep interior clean + Wax & polish + Leather care + 60-90 min',
    desc_sv: 'Full exteriör + Djuprengöring inuti + Vax & polish + Lädervård + 60-90 min',
    prices: { SE: 1199 },
  },
  {
    id: 'subscription',
    name_en: 'Monthly Plan',
    name_sv: 'Månadsabonnemang',
    desc_en: '4 standard washes/month + Priority booking + Flexible scheduling + Best value',
    desc_sv: '4 standardtvättar/månad + Prioriterad bokning + Flexibel schemaläggning + Bäst värde',
    prices: { SE: 1499 },
  },
];

export async function fetchPackages(): Promise<CatalogPackage[]> {
  try {
    const snap = await withTimeout(getDocs(collection(db, COLLECTION)), 'Fetching packages');
    if (snap.empty) return DEFAULT_PACKAGES;

    const byId = new Map<string, CatalogPackage>();
    snap.docs.forEach((d) => {
      const data = d.data() as Partial<CatalogPackage>;
      byId.set(d.id, {
        id: d.id,
        name_en: data.name_en ?? '',
        name_sv: data.name_sv ?? '',
        desc_en: data.desc_en ?? '',
        desc_sv: data.desc_sv ?? '',
        prices: { SE: data.prices?.SE ?? 0 },
      });
    });

    // Fill in any packages missing from Firestore with defaults, so a
    // partially-seeded collection still shows all 4 packages.
    return DEFAULT_PACKAGES.map((def) => byId.get(def.id) ?? def);
  } catch (e) {
    console.error(e);
    return DEFAULT_PACKAGES;
  }
}

export type PackageEdit = {
  name_en: string;
  name_sv: string;
  desc_en: string;
  desc_sv: string;
  prices: PackagePrices;
};

export async function updatePackage(id: string, data: PackageEdit): Promise<void> {
  await withTimeout(setDoc(doc(db, COLLECTION, id), data, { merge: true }), 'Saving package');
}
