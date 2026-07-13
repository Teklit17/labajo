import { collection, getDocs, query, where, addDoc, orderBy, deleteDoc, updateDoc, doc, deleteField, onSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from './config';
import { normalizePhone } from '../utils/phone';

export type SubscriptionStatus = {
  active: boolean;
  packageName: string;
  phone: string;
  createdAt: string;
};

export async function checkSubscriptionByPhone(phone: string): Promise<SubscriptionStatus | null> {
  const normalized = normalizePhone(phone);
  const q = query(
    collection(db, 'bookings'),
    where('phone', '==', normalized),
    where('type', '==', 'subscription'),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return {
    active: true,
    packageName: data.packageName ?? 'Monthly Plan',
    phone: normalized,
    createdAt: data.createdAt ?? '',
  };
}

// Live listener: subscription status updates the moment the plan is
// created or ended. Returns an unsubscribe function.
export function watchSubscriptionByPhone(
  phone: string,
  cb: (status: SubscriptionStatus | null) => void,
): () => void {
  const normalized = normalizePhone(phone);
  const q = query(
    collection(db, 'bookings'),
    where('phone', '==', normalized),
    where('type', '==', 'subscription'),
    where('status', '==', 'pending'),
  );
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        cb(null);
        return;
      }
      const data = snap.docs[0].data();
      cb({
        active: true,
        packageName: data.packageName ?? 'Monthly Plan',
        phone: normalized,
        createdAt: data.createdAt ?? '',
      });
    },
    (err) => console.error('watchSubscriptionByPhone failed:', err),
  );
}

/* The plan runs in rolling 30-day cycles anchored at the enrollment date
   (e.g. enrolled Jan 15 → cycle runs to Feb 14), NOT per calendar month. */
export const CYCLE_DAYS = 30;
const CYCLE_MS = CYCLE_DAYS * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO timestamp of the start of the current 30-day cycle for a subscriber. */
export function currentCycleStart(enrolledAt: string, now: Date = new Date()): string {
  const start = new Date(enrolledAt).getTime();
  if (isNaN(start) || start > now.getTime()) {
    // unknown enrollment date — fall back to the last 30 days
    return new Date(now.getTime() - CYCLE_MS).toISOString();
  }
  const cyclesElapsed = Math.floor((now.getTime() - start) / CYCLE_MS);
  return new Date(start + cyclesElapsed * CYCLE_MS).toISOString();
}

/** Days remaining in the subscriber's current 30-day cycle. */
export function cycleDaysLeft(enrolledAt: string, now: Date = new Date()): number {
  const cycleStart = new Date(currentCycleStart(enrolledAt, now)).getTime();
  return Math.max(0, Math.ceil((cycleStart + CYCLE_MS - now.getTime()) / DAY_MS));
}

export type SubscriberStat = {
  phone: string;
  name: string;
  packageName: string;
  washesUsedThisMonth: number;
  washesRemaining: number;
  totalWashes: number;
  sinceDate: string;
};

// Single source of truth for what counts as a used wash, shared by the
// admin stats and the customer usage card so both always show the same
// numbers. A logged wash (kind: 'wash') always counts; scheduled washes and
// the kind-less enrollment booking (which doubles as the first wash — it
// carries the date/time picked at signup) count once marked completed.
function isCompletedWash(data: DocumentData): boolean {
  return (
    data.kind === 'wash' ||
    ((data.kind === 'scheduled' || !data.kind) && data.status === 'completed')
  );
}

function statsFromDocs(docs: DocumentData[]): SubscriberStat[] {
  // Group all subscription bookings by phone.
  const byPhone: Record<string, { name: string; packageName: string; washDates: string[]; sinceDate: string }> = {};

  docs.forEach((data) => {
    const phone: string = data.phone ?? '';
    if (!phone) return;

    if (!byPhone[phone]) {
      byPhone[phone] = {
        name: data.name ?? '',
        packageName: data.packageName ?? 'Monthly Plan',
        washDates: [],
        sinceDate: data.createdAt ?? '',
      };
    }
    if (!byPhone[phone].name && data.name) byPhone[phone].name = data.name;

    // keep earliest date as the subscriber's since-date
    if ((data.createdAt ?? '') < byPhone[phone].sinceDate || !byPhone[phone].sinceDate) {
      byPhone[phone].sinceDate = data.createdAt ?? '';
    }

    if (isCompletedWash(data)) {
      byPhone[phone].washDates.push(data.createdAt ?? '');
    }
  });

  return Object.entries(byPhone).map(([phone, s]) => {
    const cycleStart = currentCycleStart(s.sinceDate);
    const usedThisCycle = s.washDates.filter((d) => d >= cycleStart).length;
    return {
      phone,
      name: s.name,
      packageName: s.packageName,
      washesUsedThisMonth: usedThisCycle,
      washesRemaining: Math.max(0, 4 - usedThisCycle),
      totalWashes: s.washDates.length,
      sinceDate: s.sinceDate,
    };
  });
}

export async function fetchSubscriberStats(): Promise<SubscriberStat[]> {
  const q = query(
    collection(db, 'bookings'),
    where('type', '==', 'subscription'),
  );
  const snap = await getDocs(q);
  return statsFromDocs(snap.docs.map((d) => d.data()));
}

// Live listener: subscriber stats recompute whenever any subscription
// booking changes. Returns an unsubscribe function.
export function watchSubscriberStats(cb: (stats: SubscriberStat[]) => void): () => void {
  const q = query(
    collection(db, 'bookings'),
    where('type', '==', 'subscription'),
  );
  return onSnapshot(
    q,
    (snap) => cb(statsFromDocs(snap.docs.map((d) => d.data()))),
    (err) => console.error('watchSubscriberStats failed:', err),
  );
}

function usageFromDocs(docs: DocumentData[]): { used: number; remaining: number } {
  // enrollment date = earliest subscription booking; anchors the 30-day cycle
  const enrolledAt = docs.reduce((min: string, d) => {
    const c = d.createdAt ?? '';
    return c && (!min || c < min) ? c : min;
  }, '');
  const cycleStart = currentCycleStart(enrolledAt);

  const usedThisCycle = docs.filter(
    (data) => isCompletedWash(data) && (data.createdAt ?? '') >= cycleStart,
  ).length;
  return { used: usedThisCycle, remaining: Math.max(0, 4 - usedThisCycle) };
}

function subscriberBookingsQuery(phone: string) {
  return query(
    collection(db, 'bookings'),
    where('phone', '==', normalizePhone(phone)),
    where('type', '==', 'subscription'),
  );
}

export async function getSubscriberMonthlyUsage(phone: string): Promise<{ used: number; remaining: number }> {
  const snap = await getDocs(subscriberBookingsQuery(phone));
  return usageFromDocs(snap.docs.map((d) => d.data()));
}

// Live listener: usage recomputes whenever this subscriber's bookings change.
export function watchSubscriberUsage(
  phone: string,
  cb: (usage: { used: number; remaining: number }) => void,
): () => void {
  return onSnapshot(
    subscriberBookingsQuery(phone),
    (snap) => cb(usageFromDocs(snap.docs.map((d) => d.data()))),
    (err) => console.error('watchSubscriberUsage failed:', err),
  );
}

export async function logSubscriptionWash(
  phone: string,
  packageName: string,
  name: string,
): Promise<void> {
  const normalized = normalizePhone(phone);
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await addDoc(collection(db, 'bookings'), {
    name,
    phone: normalized,
    address: '',
    packageName,
    price: 0,
    currency: '',
    date: localDate,
    time: now.toTimeString().slice(0, 5),
    payMethod: 'cash',
    status: 'completed',
    type: 'subscription',
    kind: 'wash',
    country: '',
    createdAt: new Date().toISOString(),
  });
}

export async function findAdminByPhone(phone: string): Promise<{ password: string } | null> {
  const normalized = phone.replace(/\s/g, '');
  const q = query(collection(db, 'Role'), where('Admin', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { password: String(data.password ?? '') };
}

export type Review = {
  id: string;
  name: string;
  phone: string;
  rating: number;
  text: string;
  createdAt: string;
  hidden?: boolean;
  reply?: string;
  repliedAt?: string;
};

type NewReview = Omit<Review, 'id' | 'createdAt' | 'hidden' | 'reply' | 'repliedAt'>;

export async function addReview(data: NewReview): Promise<void> {
  await addDoc(collection(db, 'reviews'), {
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export async function fetchReviews(): Promise<Review[]> {
  const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Review))
    .filter((r) => !r.hidden);
}

export async function fetchAllReviewsForAdmin(): Promise<Review[]> {
  const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
}

// Live listeners: reviews update on their own when added/hidden/replied to.
export function watchReviews(cb: (reviews: Review[]) => void): () => void {
  const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review)).filter((r) => !r.hidden)),
    (err) => console.error('watchReviews failed:', err),
  );
}

export function watchAllReviewsForAdmin(cb: (reviews: Review[]) => void): () => void {
  const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review))),
    (err) => console.error('watchAllReviewsForAdmin failed:', err),
  );
}

export async function deleteReview(id: string): Promise<void> {
  await deleteDoc(doc(db, 'reviews', id));
}

export async function setReviewHidden(id: string, hidden: boolean): Promise<void> {
  await updateDoc(doc(db, 'reviews', id), { hidden });
}

export async function replyToReview(id: string, reply: string): Promise<void> {
  await updateDoc(doc(db, 'reviews', id), {
    reply,
    repliedAt: new Date().toISOString(),
  });
}

export async function deleteReviewReply(id: string): Promise<void> {
  await updateDoc(doc(db, 'reviews', id), {
    reply: deleteField(),
    repliedAt: deleteField(),
  });
}
