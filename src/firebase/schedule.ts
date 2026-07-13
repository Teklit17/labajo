import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';

export type DayHours = { open: string; close: string; closed: boolean };

// Fixed weekly plan: Mon–Fri 08:00–18:00, Sat–Sun 09:00–18:00.
// Admin overrides (per date) take priority over this default.
export const DEFAULT_WEEKLY_HOURS: Record<number, DayHours> = {
  0: { open: '09:00', close: '18:00', closed: false }, // Sunday
  1: { open: '08:00', close: '18:00', closed: false }, // Monday
  2: { open: '08:00', close: '18:00', closed: false },
  3: { open: '08:00', close: '18:00', closed: false },
  4: { open: '08:00', close: '18:00', closed: false },
  5: { open: '08:00', close: '18:00', closed: false }, // Friday
  6: { open: '09:00', close: '18:00', closed: false }, // Saturday
};

const COLLECTION = 'scheduleOverrides';

export type ScheduleOverride = DayHours & { date: string };

export async function fetchOverrides(): Promise<ScheduleOverride[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({ date: d.id, ...d.data() } as ScheduleOverride));
}

// Live listener: fires immediately with current data and again whenever an
// override is added/changed/removed. Returns an unsubscribe function.
export function watchOverrides(cb: (overrides: ScheduleOverride[]) => void): () => void {
  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => cb(snap.docs.map((d) => ({ date: d.id, ...d.data() } as ScheduleOverride))),
    (err) => console.error('watchOverrides failed:', err),
  );
}

export async function fetchOverride(date: string): Promise<ScheduleOverride | null> {
  const snap = await getDoc(doc(db, COLLECTION, date));
  return snap.exists() ? ({ date, ...snap.data() } as ScheduleOverride) : null;
}

export async function setOverride(date: string, hours: DayHours): Promise<void> {
  await setDoc(doc(db, COLLECTION, date), hours);
}

export async function clearOverride(date: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, date));
}

export function hoursForDate(date: string, overrides: ScheduleOverride[]): DayHours {
  const override = overrides.find((o) => o.date === date);
  if (override) return { open: override.open, close: override.close, closed: override.closed };
  const dow = new Date(date + 'T00:00:00').getDay();
  return DEFAULT_WEEKLY_HOURS[dow];
}

export function slotsForHours(hours: DayHours): string[] {
  if (hours.closed) return [];
  const [openH] = hours.open.split(':').map(Number);
  const [closeH] = hours.close.split(':').map(Number);
  const slots: string[] = [];
  for (let h = openH; h < closeH; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

// How long each package occupies the schedule, in hours.
export const PACKAGE_DURATION_HOURS: Record<string, number> = {
  quick: 1,
  standard: 2,
  premium: 4,
  subscription: 2,
};

export function durationForPackage(packageId: string): number {
  return PACKAGE_DURATION_HOURS[packageId] ?? 1;
}

function timeToHour(time: string): number {
  return Number(time.split(':')[0]);
}

export type BookedRange = { start: number; end: number };

export function toBookedRange(time: string, packageId: string): BookedRange {
  const start = timeToHour(time);
  return { start, end: start + durationForPackage(packageId) };
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// A slot is available only if the whole duration of `packageId` fits before
// closing time and doesn't overlap any existing booking, regardless of that
// booking's own package type.
export function isSlotAvailable(
  time: string,
  packageId: string,
  closeHour: number,
  bookedRanges: BookedRange[]
): boolean {
  const start = timeToHour(time);
  const end = start + durationForPackage(packageId);
  if (end > closeHour) return false;
  return !bookedRanges.some((r) => rangesOverlap(start, end, r.start, r.end));
}
