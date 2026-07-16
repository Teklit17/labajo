// Travel fees (fuel/driving surcharge) for trips starting from Gävle.
// The nearby cluster around Gävle — including Sandviken — is free;
// only the farther cities carry a surcharge, tiered roughly by
// driving distance. Amounts are in SEK.
export type TravelCity = { id: string; name: string; fee: number };

export const HOME_CITY_ID = 'gavle';

export const TRAVEL_CITIES: TravelCity[] = [
  { id: 'gavle', name: 'Gävle', fee: 0 },
  { id: 'valbo', name: 'Valbo', fee: 0 },
  { id: 'forsbacka', name: 'Forsbacka', fee: 0 },
  { id: 'sandviken', name: 'Sandviken', fee: 0 },
  { id: 'skutskar', name: 'Skutskär', fee: 49 },
  { id: 'alvkarleby', name: 'Älvkarleby', fee: 79 },
  { id: 'storvik', name: 'Storvik', fee: 99 },
  { id: 'ockelbo', name: 'Ockelbo', fee: 99 },
  { id: 'hofors', name: 'Hofors', fee: 129 },
  { id: 'tierp', name: 'Tierp', fee: 129 },
];

export function travelFeeFor(cityId: string): number {
  return TRAVEL_CITIES.find((c) => c.id === cityId)?.fee ?? 0;
}

export function cityNameFor(cityId: string): string {
  return TRAVEL_CITIES.find((c) => c.id === cityId)?.name ?? cityId;
}
