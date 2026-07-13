import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './config';
import { normalizePhone } from '../utils/phone';

const COLLECTION = 'customerPins';
const TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out. Check your internet connection and try again.`)), TIMEOUT_MS)
    ),
  ]);
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function getOrCreatePin(phone: string): Promise<{ pin: string; isNew: boolean }> {
  const normalized = normalizePhone(phone);
  const ref = doc(db, COLLECTION, normalized);
  const snap = await withTimeout(getDoc(ref), 'Fetching PIN');
  if (snap.exists()) {
    return { pin: String(snap.data().pin), isNew: false };
  }
  const pin = generatePin();
  await withTimeout(setDoc(ref, { pin, createdAt: new Date().toISOString() }), 'Saving PIN');
  return { pin, isNew: true };
}

export async function verifyPin(phone: string, pin: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const snap = await withTimeout(getDoc(doc(db, COLLECTION, normalized)), 'Verifying PIN');
  if (!snap.exists()) return false;
  return String(snap.data().pin) === pin.trim();
}

export async function deletePin(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  await deleteDoc(doc(db, COLLECTION, normalized));
}

export type CustomerPin = { phone: string; pin: string; createdAt: string };

export async function fetchAllPins(): Promise<CustomerPin[]> {
  const snap = await withTimeout(getDocs(collection(db, COLLECTION)), 'Fetching PIN codes');
  return snap.docs
    .map((d) => ({ phone: d.id, pin: String(d.data().pin), createdAt: d.data().createdAt ?? '' }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
