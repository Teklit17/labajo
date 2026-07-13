import { collection, getDocs, query, where, addDoc, orderBy, deleteDoc, updateDoc, doc, deleteField } from 'firebase/firestore';
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

export async function fetchSubscriberStats(): Promise<SubscriberStat[]> {
  const q = query(
    collection(db, 'bookings'),
    where('type', '==', 'subscription'),
  );
  const snap = await getDocs(q);

  // Group all subscription bookings by phone. Only docs marked kind: 'wash'
  // count as a used wash — the initial enrollment booking does not.
  const byPhone: Record<string, { name: string; packageName: string; washDates: string[]; sinceDate: string }> = {};

  snap.docs.forEach((d) => {
    const data = d.data();
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

    const isCompletedWash =
      data.kind === 'wash' || (data.kind === 'scheduled' && data.status === 'completed');
    if (isCompletedWash) {
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

export async function getSubscriberMonthlyUsage(phone: string): Promise<{ used: number; remaining: number }> {
  const normalized = normalizePhone(phone);

  const q = query(
    collection(db, 'bookings'),
    where('phone', '==', normalized),
    where('type', '==', 'subscription'),
  );
  const snap = await getDocs(q);

  // enrollment date = earliest subscription booking; anchors the 30-day cycle
  const enrolledAt = snap.docs.reduce((min, d) => {
    const c = d.data().createdAt ?? '';
    return c && (!min || c < min) ? c : min;
  }, '');
  const cycleStart = currentCycleStart(enrolledAt);

  const usedThisCycle = snap.docs.filter((d) => {
    const data = d.data();
    // kind-less subscription bookings are enrollments, which double as the
    // first wash (they carry the date/time picked at signup)
    const isCompletedWash =
      data.kind === 'wash' ||
      ((data.kind === 'scheduled' || !data.kind) && data.status === 'completed');
    return isCompletedWash && (data.createdAt ?? '') >= cycleStart;
  }).length;
  return { used: usedThisCycle, remaining: Math.max(0, 4 - usedThisCycle) };
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
