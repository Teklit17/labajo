import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useLang } from '../i18n/LangContext';
import { useCountry } from '../i18n/CountryContext';
import { createBooking, updateBooking, cancelBooking, orderNumber } from '../firebase/bookings';
import { cityNameFor } from '../utils/travelFees';
import { getOrCreatePin } from '../firebase/pin';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Confirmation'>;

export default function ConfirmationScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { t } = useLang();
  const { fmt, config } = useCountry();
  const saved = useRef(false);
  const [pin, setPin] = useState<string | null>(null);
  const [pinIsNew, setPinIsNew] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(!params.editBookingId);
  const [bookingId, setBookingId] = useState<string | null>(params.editBookingId ?? null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const badgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(badgeAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      delay: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  const dateFormatted = new Date(params.date + 'T00:00:00').toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const isEditing = !!params.editBookingId;

  function loadPin() {
    setPinLoading(true);
    setPinError(null);
    getOrCreatePin(params.phone)
      .then(({ pin: p, isNew }) => {
        setPin(p);
        setPinIsNew(isNew);
      })
      .catch((err) => {
        console.error('PIN lookup failed:', err);
        setPinError(err?.message ?? 'Could not generate your PIN code.');
      })
      .finally(() => setPinLoading(false));
  }

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;

    const save = isEditing
      ? updateBooking(params.editBookingId!, {
          date: params.date,
          time: params.time,
          address: params.address,
          name: params.name,
          phone: params.phone,
        })
      : createBooking({
          name: params.name,
          phone: params.phone,
          address: params.address,
          packageId: params.packageId,
          packageName: params.packageName,
          price: params.price,
          city: params.city,
          travelFee: params.travelFee,
          currency: config.currency,
          date: params.date,
          time: params.time,
          payMethod: params.payMethod,
          status: 'pending',
          type: params.isSubscription ? 'subscription' : 'single',
          kind: params.kind,
          country: config.country,
        });

    save
      .then((result) => {
        if (isEditing) return;
        if (typeof result === 'string') setBookingId(result);
        loadPin();
      })
      .catch((err) => {
        console.error('Firestore save failed:', err);
        Alert.alert(
          'Save failed',
          err?.message ?? 'Could not save booking. Check your internet connection.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      });
  }, []);

  const isSub = params.isSubscription;
  const isScheduledWash = params.kind === 'scheduled';
  const showDateTime = true;
  const canManage = !!bookingId && !cancelled;

  function handleEdit() {
    if (!bookingId) return;
    navigation.navigate('Booking', {
      packageId: params.packageId,
      orderWash: isScheduledWash,
      editBookingId: bookingId,
      prefillPhone: params.phone,
      prefillName: params.name,
      prefillAddress: params.address,
      prefillDate: params.date,
      prefillTime: params.time,
      prefillCity: params.city,
    });
  }

  function confirmCancel() {
    if (!bookingId) return;
    setCancelling(true);
    cancelBooking(bookingId)
      .then(() => setCancelled(true))
      .catch((err) => {
        console.error('Cancel failed:', err);
        setCancelError(err?.message ?? 'Could not cancel booking.');
      })
      .finally(() => {
        setCancelling(false);
        setConfirmingCancel(false);
      });
  }

  const details = [
    { icon: 'cube' as const, label: t.labelPackage, value: isSub && !isScheduledWash ? `${params.packageName} · 4× / ${t.perMonth}` : params.packageName },
    ...(showDateTime ? [
      { icon: 'calendar' as const, label: t.labelDate, value: dateFormatted },
      { icon: 'time' as const, label: t.labelTime, value: params.time },
    ] : []),
    { icon: 'location' as const, label: t.labelAddress, value: params.address },
    ...(params.travelFee && params.travelFee > 0 ? [{
      icon: 'car' as const,
      label: t.travelFeeLabel,
      value: `${cityNameFor(params.city ?? '')} · +${fmt(params.travelFee)}`,
    }] : []),
    { icon: 'person' as const, label: t.labelName, value: params.name },
    { icon: 'call' as const, label: t.labelPhone, value: params.phone },
    ...(isScheduledWash ? [] : [{
      icon: 'card' as const,
      label: t.labelPayment,
      value: params.payMethod === 'card' ? t.payCard : params.payMethod === 'swish' ? t.paySwish : t.payCash,
    }]),
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#F5F5F7]"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* ── TOP HERO ── */}
      <LinearGradient
        colors={['#050505', '#1C0508', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-[68px] pb-16 px-6 items-center overflow-hidden rounded-b-[40px]"
      >
        {/* decorative glow */}
        <View className="absolute w-[340px] h-[340px] rounded-full bg-[#E8001C] opacity-10 -top-[180px] self-center" />
        <View className="absolute w-[200px] h-[200px] rounded-full bg-[#E8001C] opacity-[0.06] -bottom-[100px] -left-[80px]" />

        {/* check badge with rings */}
        <Animated.View
          style={{
            width: 128,
            height: 128,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            opacity: badgeAnim,
            transform: [{ scale: badgeAnim }],
          }}
        >
          <View className="absolute w-32 h-32 rounded-full border border-white/[0.06]" />
          <View className="absolute w-[100px] h-[100px] rounded-full border border-white/[0.12]" />
          <LinearGradient
            colors={['#FF3D57', '#E8001C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#E8001C',
              shadowOpacity: 0.5,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }}
          >
            <Ionicons name="checkmark" size={36} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Text className="text-white text-2xl font-black tracking-[2px] text-center mb-2.5">
          {isEditing ? t.orderUpdated : t.confirmed}
        </Text>
        <Text className="text-white/55 text-[13px] text-center leading-5 max-w-[280px] mb-6">
          {isEditing ? t.orderUpdatedSub : t.confirmedSub}
        </Text>

        {/* SMS pill */}
        <View className="flex-row items-center gap-2 bg-white/[0.08] border border-white/[0.14] rounded-full px-4 py-2">
          <Ionicons name="chatbubble-ellipses-outline" size={13} color="#FF3D57" />
          <Text className="text-white/70 text-xs font-semibold">{t.smsReminderSent}</Text>
        </View>
      </LinearGradient>

      {/* ── RECEIPT CARD ── */}
      <View
        className="bg-white mx-5 -mt-8 rounded-[28px] overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
          shadowColor: '#0A0A0A',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
        }}
      >
        <View className="px-5 pt-5 pb-4 flex-row justify-between items-center">
          <View className="flex-1 pr-3">
            {bookingId && (
              <View className="self-start bg-[#0A0A0A] rounded-full px-2.5 py-1 mb-2">
                <Text className="text-white text-[9px] font-extrabold tracking-[1px]">
                  {t.orderNumber} #{orderNumber(bookingId)}
                </Text>
              </View>
            )}
            <Text className="text-[17px] font-black text-[#0A0A0A]" numberOfLines={1}>{params.packageName}</Text>
            <Text className="text-[11px] text-[#9E9E9E] font-semibold mt-0.5">
              {isScheduledWash ? t.includedInPlan : isSub ? t.perMonth : t.labelTotal}
            </Text>
          </View>
          {!isScheduledWash && (
            <Text className="text-[28px] font-black text-[#E8001C] tracking-[-0.5px]">{fmt(params.price)}</Text>
          )}
        </View>

        {/* ticket divider */}
        <View className="h-4 justify-center">
          <View className="absolute -left-2 w-4 h-4 rounded-full bg-[#F5F5F7]" />
          <View className="absolute -right-2 w-4 h-4 rounded-full bg-[#F5F5F7]" />
          <View className="flex-row justify-between px-6 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <View key={i} className="w-2 h-px bg-black/10" />
            ))}
          </View>
        </View>

        <View className="px-5 pt-2 pb-5">
          {details.map((d, i) => (
            <View
              key={d.label}
              className={`flex-row justify-between items-center py-3 ${i < details.length - 1 ? 'border-b border-black/[0.04]' : ''}`}
            >
              <View className="flex-row items-center gap-2.5 flex-shrink">
                <View className="w-8 h-8 rounded-full bg-[#F5F5F7] items-center justify-center">
                  <Ionicons name={`${d.icon}-outline` as any} size={14} color="#E8001C" />
                </View>
                <Text className="text-[13px] text-[#616161] font-medium">{d.label}</Text>
              </View>
              <Text className="text-[13px] font-extrabold text-[#0A0A0A] max-w-[48%] text-right" numberOfLines={2}>
                {d.value}
              </Text>
            </View>
          ))}

          {cancelled ? (
            <View className="flex-row items-center justify-center gap-1.5 bg-[#E8001C]/[0.08] rounded-xl py-2.5 mt-4">
              <Ionicons name="close-circle" size={14} color={colors.red} />
              <Text className="text-xs font-extrabold text-[#E8001C] tracking-[0.5px]">{t.bookingCancelled}</Text>
            </View>
          ) : confirmingCancel ? (
            <View className="bg-[#E8001C]/[0.05] border border-[#E8001C]/[0.12] rounded-2xl p-3 gap-2.5 mt-4">
              <Text className="text-xs text-[#616161] leading-[18px]">{t.cancelBookingMsg}</Text>
              {cancelError && <Text className="text-xs text-[#E8001C] font-bold">{cancelError}</Text>}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 items-center justify-center border border-black/[0.1] bg-white rounded-full py-2.5"
                  onPress={() => { setConfirmingCancel(false); setCancelError(null); }}
                  disabled={cancelling}
                  activeOpacity={0.8}
                >
                  <Text className="text-xs font-extrabold tracking-[0.5px] text-[#0A0A0A]">{t.cancelBookingNo}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center justify-center bg-[#E8001C] rounded-full py-2.5"
                  onPress={confirmCancel}
                  disabled={cancelling}
                  activeOpacity={0.8}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-xs font-extrabold tracking-[0.5px] text-white">{t.cancelBookingYes}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : canManage ? (
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 border border-black/[0.1] bg-white rounded-full py-2.5"
                onPress={handleEdit}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={14} color={colors.black} />
                <Text className="text-xs font-extrabold tracking-[0.5px] text-[#0A0A0A]">{t.editBooking}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center justify-center bg-[#E8001C]/[0.06] border border-[#E8001C]/[0.15] rounded-full py-2.5"
                onPress={() => setConfirmingCancel(true)}
                activeOpacity={0.8}
              >
                <Text className="text-xs font-extrabold tracking-[0.5px] text-[#E8001C]">{t.cancelBooking}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── PIN CARD ── */}
      {!isEditing && (
        <View
          className="bg-[#0A0A0A] mx-5 mt-4 rounded-[28px] p-6 items-center overflow-hidden"
          style={{
            shadowColor: '#0A0A0A',
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 5,
          }}
        >
          <View className="absolute w-[240px] h-[240px] rounded-full bg-[#E8001C] opacity-[0.12] -top-[120px] -right-[70px]" />

          {pin && pinIsNew ? (
            <>
              <View className="w-10 h-10 rounded-full bg-[#E8001C]/[0.15] border border-[#E8001C]/[0.3] items-center justify-center mb-3">
                <Ionicons name="key" size={17} color="#FF3D57" />
              </View>
              <Text className="text-white/60 text-[10px] font-extrabold tracking-[2px] mb-3.5">
                {t.yourPinTitleNew}
              </Text>
              <View className="flex-row gap-2 mb-4">
                {pin.split('').map((digit, i) => (
                  <View
                    key={i}
                    className="w-11 h-14 rounded-xl bg-white/[0.08] border border-white/[0.14] items-center justify-center"
                  >
                    <Text className="text-white text-[22px] font-black">{digit}</Text>
                  </View>
                ))}
              </View>
              <Text className="text-white/50 text-xs text-center leading-[18px] max-w-[260px]">{t.yourPinNote}</Text>
            </>
          ) : pin ? (
            // Existing PIN: never re-display it — anyone can type any phone number
            // into a booking, so showing the stored PIN would leak account access.
            <>
              <View className="w-10 h-10 rounded-full bg-[#E8001C]/[0.15] border border-[#E8001C]/[0.3] items-center justify-center mb-3">
                <Ionicons name="lock-closed" size={17} color="#FF3D57" />
              </View>
              <Text className="text-white/60 text-[10px] font-extrabold tracking-[2px] mb-3.5 text-center">
                {t.existingPinTitle}
              </Text>
              <Text className="text-white/50 text-xs text-center leading-[18px] max-w-[260px]">{t.existingPinNote}</Text>
            </>
          ) : pinLoading ? (
            <ActivityIndicator color="#FF3D57" />
          ) : (
            <>
              <View className="w-10 h-10 rounded-full bg-[#E8001C]/[0.15] border border-[#E8001C]/[0.3] items-center justify-center mb-3">
                <Ionicons name="alert-circle" size={17} color="#FF3D57" />
              </View>
              <Text className="text-white/60 text-[10px] font-extrabold tracking-[2px] mb-2">PIN CODE UNAVAILABLE</Text>
              <Text className="text-white/50 text-xs text-center leading-[18px] max-w-[260px]">
                {pinError ?? 'Something went wrong generating your PIN code.'}
              </Text>
              <TouchableOpacity
                className="mt-3 bg-white/[0.1] border border-white/[0.18] rounded-full px-[18px] py-2"
                onPress={loadPin}
                activeOpacity={0.8}
              >
                <Text className="text-white text-[11px] font-extrabold tracking-[1px]">TRY AGAIN</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ── WHAT'S NEXT ── */}
      <View
        className="bg-white mx-5 mt-4 rounded-[28px] p-5"
        style={{
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
          shadowColor: '#0A0A0A',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-2 mb-4">
          <View className="w-[3px] h-3 bg-[#E8001C] rounded-full" />
          <Text className="text-[10px] font-extrabold tracking-[3px] text-[#9E9E9E]">{t.whatsNextTitle}</Text>
        </View>
        {t.whatsNextSteps.map((step, i) => (
          <View key={i} className="flex-row gap-3">
            <View className="items-center">
              <View className="w-6 h-6 rounded-full bg-[#E8001C]/[0.08] border border-[#E8001C]/[0.2] items-center justify-center">
                <Text className="text-[#E8001C] text-[10px] font-black">{i + 1}</Text>
              </View>
              {i < t.whatsNextSteps.length - 1 && <View className="w-px flex-1 bg-black/[0.08] my-1" />}
            </View>
            <Text
              className={`text-[#616161] text-[13px] leading-5 flex-1 pt-[3px] ${i < t.whatsNextSteps.length - 1 ? 'pb-4' : ''}`}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>

      {/* ── CTA ── */}
      <TouchableOpacity
        className="mx-5 mt-5 rounded-full overflow-hidden"
        style={{
          shadowColor: '#E8001C',
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
        activeOpacity={0.85}
        onPress={() =>
          isEditing
            ? navigation.navigate('OrderDetails', { phone: params.phone })
            : navigation.navigate('Main')
        }
      >
        <LinearGradient
          colors={['#FF3D57', '#E8001C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17 }}
        >
          <Text className="text-white font-extrabold text-sm tracking-[2px]">{t.backHome}</Text>
          <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>

      <Text className="text-center text-[#9E9E9E] text-[11px] tracking-[2px] mt-6">LABAGO · {config.area}</Text>
    </ScrollView>
  );
}
