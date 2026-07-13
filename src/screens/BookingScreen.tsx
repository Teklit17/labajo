import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useLang } from '../i18n/LangContext';
import { useCountry } from '../i18n/CountryContext';
import { fetchOverrides, hoursForDate, slotsForHours, isSlotAvailable, type ScheduleOverride, type BookedRange } from '../firebase/schedule';
import { fetchBookedRanges } from '../firebase/bookings';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Booking'>;

const { width } = Dimensions.get('window');

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateDates() {
  const dates: { day: string; date: string; value: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: String(d.getDate()),
      value: toLocalDateString(d),
    });
  }
  return dates;
}

const DATES = generateDates();

const PKG_ICONS = ['⚡', '✦', '★', '♾️'];

export default function BookingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { t } = useLang();
  const { priceFor, fmt } = useCountry();

  const preSelected = !!route.params?.packageId;
  const orderWash = !!route.params?.orderWash;
  const editBookingId = route.params?.editBookingId;
  const [selectedPkg, setSelectedPkg] = useState(route.params?.packageId ?? t.packages[0].id);
  const [selectedDate, setSelectedDate] = useState(route.params?.prefillDate ?? '');
  const [selectedTime, setSelectedTime] = useState(route.params?.prefillTime ?? '');
  const [address, setAddress] = useState(route.params?.prefillAddress ?? '');
  const [addressNotes, setAddressNotes] = useState('');
  const [name, setName] = useState(route.params?.prefillName ?? '');
  const [phone, setPhone] = useState(route.params?.prefillPhone ?? '');
  const [submitted, setSubmitted] = useState(false);
  const hasSavedProfile = orderWash && !editBookingId && !!route.params?.prefillName && !!route.params?.prefillAddress;
  const [editingProfile, setEditingProfile] = useState(false);
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'swish'>('card');
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(true);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [bookedLoading, setBookedLoading] = useState(false);

  useEffect(() => {
    fetchOverrides()
      .then(setOverrides)
      .catch((e) => console.error(e))
      .finally(() => setOverridesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setBookedRanges([]);
      return;
    }
    setBookedLoading(true);
    fetchBookedRanges(selectedDate, editBookingId)
      .then(setBookedRanges)
      .catch((e) => console.error(e))
      .finally(() => setBookedLoading(false));
  }, [selectedDate]);

  const dayHours = selectedDate ? hoursForDate(selectedDate, overrides) : null;
  const dayClosed = dayHours?.closed ?? false;
  const closeHour = dayHours ? Number(dayHours.close.split(':')[0]) : 0;
  const allTimes = selectedDate && dayHours ? slotsForHours(dayHours) : [];
  const isTimeAvailable = (ti: string) => isSlotAvailable(ti, selectedPkg, closeHour, bookedRanges);
  const times = allTimes.filter(isTimeAvailable);

  useEffect(() => {
    if (selectedDate && selectedTime && !isTimeAvailable(selectedTime)) {
      setSelectedTime('');
    }
  }, [selectedDate, selectedPkg, overrides, bookedRanges]);

  const pkg = t.packages.find((p) => p.id === selectedPkg) ?? t.packages[0];
  const price = orderWash ? 0 : priceFor(pkg.id);
  const isSub = selectedPkg === 'subscription';
  const needsDateTime = true;

  const isAddressValid = address.trim().length >= 5;
  const isNameValid = name.trim().length >= 2;
  const isPhoneValid = phone.replace(/\D/g, '').length >= 7;
  const isDateTimeValid = !needsDateTime || (!!selectedDate && !!selectedTime && !dayClosed);
  const canSubmit = isAddressValid && isNameValid && isPhoneValid && isDateTimeValid;

  function handleBook() {
    setSubmitted(true);
    if (!isAddressValid || !isNameValid || !isPhoneValid) {
      return;
    }
    if (needsDateTime && (!selectedDate || !selectedTime || dayClosed)) {
      Alert.alert(t.missingFields, t.missingFieldsMsg);
      return;
    }
    navigation.navigate('Confirmation', {
      packageId: pkg.id,
      packageName: pkg.name,
      price,
      date: selectedDate,
      time: selectedTime,
      address: addressNotes.trim() ? `${address.trim()} (${addressNotes.trim()})` : address.trim(),
      name,
      phone,
      payMethod,
      isSubscription: isSub,
      kind: orderWash ? 'scheduled' : undefined,
      editBookingId,
    });
  }

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#050505', '#1C0508', '#0A0A0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerGlow} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <View style={styles.backChip}>
            <Ionicons name="chevron-back" size={15} color="#fff" />
          </View>
          <Text style={styles.backTxt}>{t.back.replace('← ', '')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editBookingId ? t.editBookingTitle : t.bookingTitle}</Text>
        <View style={styles.headerLine} />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── SELECTED PACKAGE SUMMARY (shown when pre-selected from home) ── */}
        {preSelected && (
          <View style={styles.selectedPkgBanner}>
            <LinearGradient colors={['#0A0A0A', '#1c1c1c']} style={styles.selectedPkgGrad}>
              <View style={styles.selectedPkgLeft}>
                <Text style={styles.selectedPkgLabel}>VALT PAKET</Text>
                <Text style={styles.selectedPkgName}>{pkg.name}</Text>
                <Text style={styles.selectedPkgDesc}>{pkg.desc}</Text>
              </View>
              <Text style={styles.selectedPkgPrice}>{orderWash ? t.includedInPlan : fmt(price)}</Text>
            </LinearGradient>
          </View>
        )}

        {/* ── SUBSCRIPTION BANNER (only shown when no package pre-selected) ── */}
        {!preSelected && (() => {
          const sub = t.packages.find((p) => p.id === 'subscription')!;
          const subActive = selectedPkg === 'subscription';
          return (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setSelectedPkg('subscription')}
              style={styles.subWrap}
            >
              <LinearGradient
                colors={subActive ? [colors.red, '#8b0010'] : ['#0A0A0A', '#1c1c1c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.subCard}
              >
                <View style={styles.subTop}>
                  <View style={styles.subBadge}>
                    <Text style={styles.subBadgeTxt}>MONTHLY</Text>
                  </View>
                  {subActive && <View style={styles.subCheck}><Ionicons name="checkmark" size={13} color={colors.red} /></View>}
                </View>
                <Text style={styles.subName}>{sub.name}</Text>
                <View style={styles.subPills}>
                  {['Wash 1', 'Wash 2', 'Wash 3', 'Wash 4'].map((w) => (
                    <View key={w} style={styles.subPill}>
                      <Text style={styles.subPillTxt}>{w}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.subBottom}>
                  <View>
                    <Text style={styles.subPriceLabel}>per month</Text>
                    <Text style={styles.subPrice}>{fmt(priceFor('subscription'))}</Text>
                  </View>
                  <Text style={styles.subSaving}>Save ~25%</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })()}

        {/* ── STEP 1: PACKAGE (only shown when no package pre-selected) ── */}
        {!preSelected && <StepBlock num="01" label={t.step1.replace('1. ', '')}>
          {t.packages.filter((p) => p.id !== 'subscription').map((p, i) => {
            const active = selectedPkg === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.pkgRow, active && styles.pkgRowActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedPkg(p.id)}
              >
                <View style={[styles.pkgIcon, active && styles.pkgIconActive]}>
                  <Text style={styles.pkgIconTxt}>{PKG_ICONS[i]}</Text>
                </View>
                <View style={styles.pkgMid}>
                  <Text style={[styles.pkgName, active && styles.pkgNameActive]}>{p.name}</Text>
                  <Text style={styles.pkgDesc}>{p.desc}</Text>
                </View>
                <View style={styles.pkgRight}>
                  <Text style={[styles.pkgPrice, active && styles.pkgPriceActive]}>{fmt(priceFor(p.id))}</Text>
                  {active && <View style={styles.pkgCheck}><Ionicons name="checkmark" size={11} color="#fff" /></View>}
                </View>
              </TouchableOpacity>
            );
          })}
        </StepBlock>}

        {/* ── STEP 2: DATE (first wash date, also used for subscription enrollment) ── */}
        {needsDateTime && <StepBlock num="02" label={t.step2.replace('2. ', '')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {DATES.map((d) => {
              const active = selectedDate === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dateCard, active && styles.dateCardActive]}
                  onPress={() => setSelectedDate(d.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateDay, active && styles.dateTxtActive]}>{d.day}</Text>
                  <Text style={[styles.dateNum, active && styles.dateTxtActive]}>{d.date}</Text>
                  {active && <View style={styles.dateDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </StepBlock>}

        {/* ── STEP 3: TIME (first wash time, also used for subscription enrollment) ── */}
        {needsDateTime && <StepBlock num="03" label={t.step3.replace('3. ', '')}>
          {overridesLoading || bookedLoading ? (
            <ActivityIndicator color={colors.red} />
          ) : !selectedDate ? (
            <Text style={styles.timeHint}>{t.pickDateFirst}</Text>
          ) : dayClosed ? (
            <Text style={styles.timeHint}>{t.closedThisDay}</Text>
          ) : times.length === 0 ? (
            <Text style={styles.timeHint}>{t.fullyBooked}</Text>
          ) : (
            <View style={styles.timeGrid}>
              {allTimes.map((ti) => {
                const available = isTimeAvailable(ti);
                const active = selectedTime === ti;
                return (
                  <TouchableOpacity
                    key={ti}
                    style={[styles.timeChip, active && styles.timeChipActive, !available && styles.timeChipBlank]}
                    onPress={() => available && setSelectedTime(ti)}
                    activeOpacity={available ? 0.8 : 1}
                    disabled={!available}
                  >
                    <Text style={[styles.timeTxt, active && styles.timeTxtActive, !available && styles.timeTxtBlank]}>
                      {ti}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </StepBlock>}

        {hasSavedProfile && !editingProfile ? (
          <StepBlock num="04" label={t.savedDetailsLabel}>
            <View style={styles.savedProfileBox}>
              <View style={styles.savedProfileRow}>
                <View style={styles.savedProfileIcon}><Ionicons name="location-outline" size={14} color={colors.red} /></View>
                <Text style={styles.savedProfileTxt} numberOfLines={2}>{address}</Text>
              </View>
              <View style={styles.savedProfileRow}>
                <View style={styles.savedProfileIcon}><Ionicons name="person-outline" size={14} color={colors.red} /></View>
                <Text style={styles.savedProfileTxt}>{name}</Text>
              </View>
              <View style={styles.savedProfileRow}>
                <View style={styles.savedProfileIcon}><Ionicons name="call-outline" size={14} color={colors.red} /></View>
                <Text style={styles.savedProfileTxt}>{phone}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingProfile(true)} activeOpacity={0.7} style={styles.savedProfileEditBtn}>
                <Ionicons name="create-outline" size={13} color={colors.red} />
                <Text style={styles.savedProfileEditTxt}>{t.changeDetails}</Text>
              </TouchableOpacity>
            </View>
          </StepBlock>
        ) : (
          <>
            {/* ── STEP 4: ADDRESS ── */}
            <StepBlock num="04" label={t.step4.replace('4. ', '')}>
              <FieldInput
                icon="location-outline"
                label={t.labelAddress}
                placeholder={t.addressPlaceholder}
                value={address}
                onChangeText={setAddress}
                error={submitted && !isAddressValid ? t.addressError : undefined}
              />
              <FieldInput
                icon="document-text-outline"
                label={t.addressNotesLabel}
                placeholder={t.addressNotesPlaceholder}
                value={addressNotes}
                onChangeText={setAddressNotes}
                last
              />
            </StepBlock>

            {/* ── STEP 5: CONTACT ── */}
            <StepBlock num="05" label={t.step5.replace('5. ', '')}>
              <FieldInput
                icon="person-outline"
                label={t.labelName}
                placeholder={t.namePlaceholder}
                value={name}
                onChangeText={setName}
                error={submitted && !isNameValid ? t.nameError : undefined}
              />
              <FieldInput
                icon="call-outline"
                label={t.labelPhone}
                placeholder={t.phonePlaceholder}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                error={submitted && !isPhoneValid ? t.phoneError : undefined}
                last
              />
            </StepBlock>
          </>
        )}

        {/* ── STEP 6: PAYMENT (skipped — already covered by the plan) ── */}
        {!orderWash && <StepBlock num="06" label={t.step6.replace('6. ', '')}>
          <View style={styles.payRow}>
            {(['card', 'cash', 'swish'] as const).map((m) => {
              const active = payMethod === m;
              const icon = m === 'card' ? 'card-outline' : m === 'cash' ? 'cash-outline' : 'phone-portrait-outline';
              const label = m === 'card' ? t.card.replace('💳 ', '') : m === 'cash' ? t.cash.replace('💵 ', '') : t.swish.replace('📱 ', '');
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.payChip, active && styles.payChipActive]}
                  onPress={() => setPayMethod(m)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={icon as any} size={20} color={active ? '#fff' : colors.gray600} />
                  <Text style={[styles.payLabel, active && styles.payLabelActive]}>{label}</Text>
                  {active && <View style={styles.payDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.payNote}>{t.payAfterServiceNote}</Text>
        </StepBlock>}
      </ScrollView>

      {/* ── STICKY BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          <View>
            <Text style={styles.bottomPkgName}>{pkg.name}</Text>
            <Text style={styles.bottomPrice}>{orderWash ? t.includedInPlan : fmt(price)}</Text>
          </View>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleBook}
            activeOpacity={canSubmit ? 0.85 : 1}
            disabled={!canSubmit}
          >
            <LinearGradient
              colors={canSubmit ? ['#FF3D57', '#E8001C'] : [colors.gray400, colors.gray400]}
              style={styles.confirmGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.confirmTxt}>{editBookingId ? t.saveChanges : t.confirmBooking}</Text>
              <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.85)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function FieldInput({
  icon, label, placeholder, value, onChangeText, error, keyboardType, last,
}: {
  icon: string;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: 'phone-pad';
  last?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.fieldGroup, !last && { marginBottom: spacing.md }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          !!error && styles.inputWrapError,
        ]}
      >
        <View style={styles.inputIconWrap}>
          <Ionicons name={icon as any} size={14} color={colors.red} />
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!error && (
        <View style={styles.fieldErrorRow}>
          <Ionicons name="alert-circle" size={12} color={colors.red} />
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function StepBlock({ num, label, children }: { num: string; label: string; children: React.ReactNode }) {
  return (
    <View style={sb.wrap}>
      <View style={sb.headerRow}>
        <View style={sb.numBadge}>
          <Text style={sb.numTxt}>{num}</Text>
        </View>
        <Text style={sb.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  numBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(232,0,28,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,0,28,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTxt: { color: colors.red, fontSize: 10, fontWeight: '900' },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: '#9E9E9E' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F7' },

  /* header */
  header: {
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.red,
    opacity: 0.08,
    top: -120,
    right: -80,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  backChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 3 },
  headerLine: { width: 32, height: 3, backgroundColor: colors.red, borderRadius: 2, marginTop: spacing.sm },

  scroll: { flex: 1, backgroundColor: '#F5F5F7' },

  /* packages */
  pkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F8',
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pkgRowActive: { backgroundColor: '#FFF5F6', borderColor: colors.red },
  pkgIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  pkgIconActive: { borderColor: 'rgba(232,0,28,0.25)' },
  pkgIconTxt: { fontSize: 18 },
  pkgMid: { flex: 1 },
  pkgName: { fontSize: 14, fontWeight: '700', color: colors.gray600 },
  pkgNameActive: { color: colors.black },
  pkgDesc: { fontSize: 11, color: colors.gray400, marginTop: 2 },
  pkgRight: { alignItems: 'flex-end', gap: 4 },
  pkgPrice: { fontSize: 14, fontWeight: '900', color: colors.gray400 },
  pkgPriceActive: { color: colors.red },
  pkgCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },

  /* dates */
  dateScroll: { marginHorizontal: -18, paddingLeft: 18 },
  dateCard: {
    width: 52,
    height: 68,
    borderRadius: 16,
    backgroundColor: '#F6F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 2,
  },
  dateCardActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    shadowColor: colors.red,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dateDay: { fontSize: 9, fontWeight: '700', color: colors.gray400, letterSpacing: 1 },
  dateNum: { fontSize: 20, fontWeight: '900', color: colors.black },
  dateTxtActive: { color: '#fff' },
  dateDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },

  /* times */
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeChip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: '#F6F6F8',
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 72,
    alignItems: 'center',
  },
  timeChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    shadowColor: colors.red,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  timeChipBlank: { backgroundColor: '#ECECEE', borderColor: 'transparent', opacity: 0.5 },
  timeTxt: { fontSize: 14, fontWeight: '700', color: colors.gray600 },
  timeTxtActive: { color: '#fff' },
  timeTxtBlank: { color: '#A8A8AC', fontWeight: '600', textDecorationLine: 'line-through' },
  timeHint: { fontSize: 13, color: colors.gray400 },

  /* inputs */
  fieldGroup: {},
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9E9E9E',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F6F8',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapFocused: { borderColor: colors.red, backgroundColor: '#fff' },
  inputWrapError: { borderColor: colors.red, backgroundColor: '#FFF5F6' },
  inputIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  input: { flex: 1, fontSize: 14, color: colors.black, paddingVertical: 13 },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginLeft: 2 },
  fieldError: { color: colors.red, fontSize: 11, fontWeight: '600' },

  /* saved profile summary */
  savedProfileBox: {
    backgroundColor: '#F6F6F8',
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.sm,
  },
  savedProfileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  savedProfileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  savedProfileTxt: { fontSize: 14, color: colors.black, fontWeight: '600', flex: 1 },
  savedProfileEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  savedProfileEditTxt: { fontSize: 12, fontWeight: '800', color: colors.red },

  /* payment */
  payRow: { flexDirection: 'row', gap: spacing.sm },
  payNote: { fontSize: 11, color: colors.gray400, marginTop: spacing.sm, lineHeight: 16 },
  payChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 18,
    backgroundColor: '#F6F6F8',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  payChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    shadowColor: colors.red,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  payLabel: { fontSize: 13, fontWeight: '700', color: colors.gray600 },
  payLabelActive: { color: '#fff' },
  payDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },

  /* bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 28,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  bottomBarInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottomPkgName: { fontSize: 11, color: '#9E9E9E', fontWeight: '700', letterSpacing: 0.5 },
  bottomPrice: { fontSize: 22, fontWeight: '900', color: colors.black, letterSpacing: -0.5 },
  confirmBtn: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: colors.red,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  confirmGrad: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: spacing.lg, gap: spacing.sm },
  confirmTxt: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1.5 },

  /* selected package banner */
  selectedPkgBanner: { marginHorizontal: 20, marginTop: spacing.md, borderRadius: 28, overflow: 'hidden' },
  selectedPkgGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  selectedPkgLeft: { flex: 1 },
  selectedPkgLabel: { color: '#FF3D57', fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  selectedPkgName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  selectedPkgDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
  selectedPkgPrice: { color: '#FF3D57', fontSize: 22, fontWeight: '900' },

  /* subscription banner */
  subWrap: { paddingHorizontal: 20, paddingTop: spacing.md },
  subCard: {
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
  },
  subTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  subBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  subCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  subName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: spacing.md },
  subPills: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  subPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  subPillTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  subBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  subPriceLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 },
  subPrice: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subSaving: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
