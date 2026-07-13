import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkSubscriptionByPhone, type SubscriptionStatus } from '../firebase/subscription';
import { normalizePhone } from '../utils/phone';

type SubscriptionContextType = {
  phone: string;
  setPhone: (p: string) => void;
  subscription: SubscriptionStatus | null;
  loading: boolean;
  checkPhone: (p: string) => Promise<SubscriptionStatus | null>;
  clearPhone: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  phone: '',
  setPhone: () => {},
  subscription: null,
  loading: false,
  checkPhone: async () => null,
  clearPhone: () => {},
});

const STORAGE_KEY = '@labago_phone';

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [phone, setPhoneState] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        setPhoneState(saved);
        checkSubscriptionByPhone(saved).then((result) => {
          setSubscription(result);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function checkPhone(p: string): Promise<SubscriptionStatus | null> {
    setLoading(true);
    const normalized = normalizePhone(p);
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
    setPhoneState(normalized);
    const result = await checkSubscriptionByPhone(normalized);
    setSubscription(result);
    setLoading(false);
    return result;
  }

  function clearPhone() {
    AsyncStorage.removeItem(STORAGE_KEY);
    setPhoneState('');
    setSubscription(null);
  }

  return (
    <SubscriptionContext.Provider value={{ phone, setPhone: setPhoneState, subscription, loading, checkPhone, clearPhone }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
