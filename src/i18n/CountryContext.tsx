import React, { createContext, useContext, useState } from "react";
import { usePackagesCatalog } from "./packagesStore";

export type Country = "SE";

type CountryConfig = {
  country: Country;
  currencySymbol: string;
  currency: "SEK" | "CAD";
  area: string;
  // Kept for reference/back-compat; live pricing comes from the
  // Firestore-backed catalog (see packagesStore) via priceFor().
  packages: { id: string; price: number }[];
};

export const COUNTRY_CONFIG: Record<Country, CountryConfig> = {
  SE: {
    country: "SE",
    currency: "SEK",
    currencySymbol: "SEK",
    area: "Gävle · Sandviken · Valbo · Storvik · Forsbacka · Hofors · Ockelbo · Skutskär · Älvkarleby · Tierp",
    packages: [
      { id: "quick", price: 199 },
      { id: "standard", price: 499 },
      { id: "premium", price: 1199 },
      { id: "subscription", price: 1499 },
    ],
  },
};

type CountryContextType = {
  config: CountryConfig;
  country: Country;
  setCountry: (c: Country) => void;
  priceFor: (id: string) => number;
  fmt: (price: number) => string;
};

const CountryContext = createContext<CountryContextType>({
  config: COUNTRY_CONFIG.SE,
  country: "SE",
  setCountry: () => {},
  priceFor: () => 0,
  fmt: () => "",
});

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState<Country>("SE");
  const config = COUNTRY_CONFIG[country];
  const catalog = usePackagesCatalog();

  function priceFor(id: string) {
    const cataloged = catalog.find((p) => p.id === id)?.prices[country];
    if (cataloged !== undefined) return cataloged;
    return config.packages.find((p) => p.id === id)?.price ?? 0;
  }

  function fmt(price: number) {
    return `${price} SEK`;
  }

  return (
    <CountryContext.Provider
      value={{ config, country, setCountry, priceFor, fmt }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}
