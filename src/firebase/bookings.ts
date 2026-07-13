import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import { toBookedRange, type BookedRange } from './schedule';
import { normalizePhone } from '../utils/phone';

export type BookingStatus = 'pending' | 'completed' | 'cancelled';
export type BookingType = 'single' | 'subscription';

export type Booking = {
  id: string;
  name: string;
  phone: string;
  address: string;
  packageId: string;
  packageName: string;
  price: number;
  currency: string;
  date: string;
  time: string;
  payMethod: 'card' | 'cash' | 'swish';
  status: BookingStatus;
  type: BookingType;
  kind?: 'scheduled' | 'wash';
  country: string;
  createdAt: string;
};

type NewBooking = Omit<Booking, 'id' | 'createdAt'>;

const COLLECTION = 'bookings';

// Short, human-readable code derived from the booking's unique Firestore id —
// lets customers/admins tell individual bookings (e.g. separate monthly washes) apart at a glance.
export function orderNumber(id: string): string {
  return id.slice(-6).toUpperCase();
}

export async function fetchBookedRanges(date: string, excludeId?: string): Promise<BookedRange[]> {
  const q = query(collection(db, COLLECTION), where('date', '==', date));
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== excludeId)
    .map((d) => d.data() as Booking)
    .filter((b) => b.status !== 'cancelled')
    .map((b) => toBookedRange(b.time, b.packageId ?? 'quick'));
}

// Live listener: booked ranges for a date update the moment anyone books,
// cancels, or reschedules — keeps the time picker's availability current.
export function watchBookedRanges(
  date: string,
  cb: (ranges: BookedRange[]) => void,
  excludeId?: string,
): () => void {
  const q = query(collection(db, COLLECTION), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs
          .filter((d) => d.id !== excludeId)
          .map((d) => d.data() as Booking)
          .filter((b) => b.status !== 'cancelled')
          .map((b) => toBookedRange(b.time, b.packageId ?? 'quick')),
      ),
    (err) => console.error('watchBookedRanges failed:', err),
  );
}

export async function createBooking(data: NewBooking): Promise<string> {
  const ranges = await fetchBookedRanges(data.date);
  const candidate = toBookedRange(data.time, data.packageId);
  const conflict = ranges.some((r) => candidate.start < r.end && r.start < candidate.end);
  if (conflict) {
    throw new Error('This time slot has just been booked. Please choose another time.');
  }
  const payload: Record<string, unknown> = {
    ...data,
    phone: normalizePhone(data.phone),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  if (payload.kind === undefined) delete payload.kind;

  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}

export async function fetchBookings(): Promise<Booking[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
}

// Live listeners: the callback fires immediately with current data and again
// whenever bookings change in Firestore. Returns an unsubscribe function.
export function watchBookings(cb: (bookings: Booking[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking))),
    (err) => console.error('watchBookings failed:', err),
  );
}

export function watchBookingsByPhone(phone: string, cb: (bookings: Booking[]) => void): () => void {
  const normalized = normalizePhone(phone);
  const q = query(collection(db, COLLECTION), where('phone', '==', normalized));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Booking))
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      ),
    (err) => console.error('watchBookingsByPhone failed:', err),
  );
}

export async function fetchBookingsByPhone(phone: string): Promise<Booking[]> {
  const normalized = normalizePhone(phone);
  const q = query(collection(db, COLLECTION), where('phone', '==', normalized));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Booking))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function markBookingComplete(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: 'completed' });
}

export async function markBookingPending(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: 'pending' });
}

export async function cancelBooking(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: 'cancelled' });
}

export async function deleteBookingsByPhone(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  const q = query(collection(db, COLLECTION), where('phone', '==', normalized));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, COLLECTION, d.id))));
}

export type BookingEdit = {
  date: string;
  time: string;
  address: string;
  name: string;
  phone: string;
};

export async function updateBooking(id: string, data: BookingEdit): Promise<void> {
  const currentSnap = await getDoc(doc(db, COLLECTION, id));
  const packageId = (currentSnap.data() as Booking | undefined)?.packageId ?? 'quick';

  const otherRanges = await fetchBookedRanges(data.date, id);
  const candidate = toBookedRange(data.time, packageId);
  const conflict = otherRanges.some((r) => candidate.start < r.end && r.start < candidate.end);
  if (conflict) {
    throw new Error('This time slot has just been booked. Please choose another time.');
  }

  await updateDoc(doc(db, COLLECTION, id), {
    date: data.date,
    time: data.time,
    address: data.address,
    name: data.name,
    phone: normalizePhone(data.phone),
    status: 'pending',
  });
}
