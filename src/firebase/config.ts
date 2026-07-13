import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

// Replace these values with your Firebase project config
// Go to: console.firebase.google.com → your project → Project Settings → Your apps

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxENtyYsSzr3Q4G2jDaAuKf1jy4R0DxaY",
  authDomain: "labago-6f245.firebaseapp.com",
  projectId: "labago-6f245",
  storageBucket: "labago-6f245.firebasestorage.app",
  messagingSenderId: "446494078445",
  appId: "1:446494078445:web:a0022fc0c16cfd2a80e3e4",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// React Native's network layer doesn't reliably support the WebChannel
// streaming transport Firestore uses by default — reads/writes can hang
// forever with no error. Long-polling avoids that.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
