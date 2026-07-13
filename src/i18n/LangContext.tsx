import React, { createContext, useContext, useMemo, useState } from 'react';
import { translations, Lang, T } from './translations';
import { usePackagesCatalog } from './packagesStore';

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
};

const LangContext = createContext<LangContextType>({
  lang: 'sv',
  setLang: () => {},
  t: translations.sv,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('sv');
  const catalog = usePackagesCatalog();

  // t.packages is normally the hardcoded array from translations.ts —
  // here we override it with the live (Firestore-backed) catalog so
  // every existing call site (t.packages.map/find/...) keeps working
  // unchanged while showing admin-edited names/descriptions.
  const t = useMemo<T>(() => {
    const base = translations[lang];
    return {
      ...base,
      packages: catalog.map((p) => ({
        id: p.id,
        name: lang === 'sv' ? p.name_sv : p.name_en,
        desc: lang === 'sv' ? p.desc_sv : p.desc_en,
      })),
    };
  }, [lang, catalog]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
