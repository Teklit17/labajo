import React from 'react';
import { cssInterop } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';

// NativeWind only maps className for registered components; without this,
// className on LinearGradient is silently ignored.
cssInterop(LinearGradient, { className: 'style' });
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LangProvider } from './src/i18n/LangContext';
import { CountryProvider } from './src/i18n/CountryContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';

import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import ConfirmationScreen from './src/screens/ConfirmationScreen';
import AdminScreen from './src/screens/AdminScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';

export type RootStackParamList = {
  Main: undefined;
  Admin: undefined;
  OrderDetails: { phone: string };
  PrivacyPolicy: undefined;
  Booking: {
    packageId?: string;
    orderWash?: boolean;
    prefillPhone?: string;
    prefillName?: string;
    editBookingId?: string;
    prefillAddress?: string;
    prefillDate?: string;
    prefillTime?: string;
  };
  Confirmation: {
    packageId: string;
    packageName: string;
    price: number;
    date: string;
    time: string;
    address: string;
    name: string;
    phone: string;
    payMethod: 'card' | 'cash' | 'swish';
    isSubscription?: boolean;
    kind?: 'scheduled';
    editBookingId?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={HomeScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Confirmation" component={ConfirmationScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <CountryProvider>
      <LangProvider>
        <SubscriptionProvider>
          <RootNavigator />
        </SubscriptionProvider>
      </LangProvider>
    </CountryProvider>
  );
}
