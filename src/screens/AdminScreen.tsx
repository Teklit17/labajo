import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, useWindowDimensions, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useLang } from '../i18n/LangContext';
import { useCountry } from '../i18n/CountryContext';
import { watchBookings, markBookingComplete, markBookingPending, deleteBookingsByPhone, orderNumber, type Booking } from '../firebase/bookings';
import {
  fetchSubscriberStats, fetchAllReviewsForAdmin, deleteReview, setReviewHidden,
  replyToReview, deleteReviewReply, type SubscriberStat, type Review,
} from '../firebase/subscription';
import {
  fetchOverrides, setOverride, clearOverride, hoursForDate,
  type ScheduleOverride, type DayHours,
} from '../firebase/schedule';
import { fetchAllPins, deletePin, type CustomerPin } from '../firebase/pin';
import { fetchPackages, updatePackage, type CatalogPackage, type PackageEdit } from '../firebase/packages';
import { reloadPackagesCatalog } from '../i18n/packagesStore';
import { normalizePhone } from '../utils/phone';

type Tab = 'bookings' | 'subscribers' | 'schedule' | 'pins' | 'customers' | 'reviews' | 'packages';
type Filter = 'upcoming' | 'completed' | 'all';

export default function AdminScreen() {
  const { t } = useLang();
  const { fmt } = useCountry();
  const { width: screenWidth } = useWindowDimensions();

  const [tab, setTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [pins, setPins] = useState<CustomerPin[]>([]);
  const [pinSearch, setPinSearch] = useState('');
  const [showInactivePins, setShowInactivePins] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [confirmingDeletePhone, setConfirmingDeletePhone] = useState<string | null>(null);
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);
  const [confirmingDeleteAllInactive, setConfirmingDeleteAllInactive] = useState(false);
  const [deletingAllInactive, setDeletingAllInactive] = useState(false);
  const [confirmingInactivePhone, setConfirmingInactivePhone] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [togglingReviewId, setTogglingReviewId] = useState<string | null>(null);
  const [confirmingDeleteReviewId, setConfirmingDeleteReviewId] = useState<string | null>(null);
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [savingPackageId, setSavingPackageId] = useState<string | null>(null);
  const [packageSaveState, setPackageSaveState] = useState<Record<string, 'success' | 'error'>>({});

  const load = useCallback(async () => {
    try {
      const [sData, oData, pData, rData, pkgData] = await Promise.all([
        fetchSubscriberStats(), fetchOverrides(), fetchAllPins(), fetchAllReviewsForAdmin(), fetchPackages(),
      ]);
      setSubscribers(sData);
      setOverrides(oData);
      setPins(pData);
      setReviews(rData);
      setPackages(pkgData);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Bookings stream in live — new orders appear without any manual refresh.
  useEffect(() => {
    const unsub = watchBookings((bData) => {
      setBookings(bData);
      setLoading(false);
    });
    return unsub;
  }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const toggleStatus = async (b: Booking) => {
    const next = b.status === 'completed' ? 'pending' : 'completed';
    setBookings((prev) => prev.map((x) => x.id === b.id ? { ...x, status: next } : x));
    try {
      if (next === 'completed') await markBookingComplete(b.id);
      else await markBookingPending(b.id);
    } catch {
      setBookings((prev) => prev.map((x) => x.id === b.id ? { ...x, status: b.status } : x));
    }
  };

  const handleSaveOverride = async (date: string, hours: DayHours) => {
    setSavingDate(date);
    try {
      await setOverride(date, hours);
      setOverrides((prev) => [...prev.filter((o) => o.date !== date), { date, ...hours }]);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDate(null);
    }
  };

  const handleResetOverride = async (date: string) => {
    setSavingDate(date);
    try {
      await clearOverride(date);
      setOverrides((prev) => prev.filter((o) => o.date !== date));
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDate(null);
    }
  };

  const handleDeleteCustomer = async (phone: string) => {
    setDeletingPhone(phone);
    try {
      await deleteBookingsByPhone(phone);
      await deletePin(phone);
      setBookings((prev) => prev.filter((b) => normalizePhone(b.phone) !== phone));
      setPins((prev) => prev.filter((p) => p.phone !== phone));
      setSubscribers((prev) => prev.filter((s) => normalizePhone(s.phone) !== phone));
      setConfirmingDeletePhone(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingPhone(null);
    }
  };

  const handleDeleteAllInactive = async (phones: string[]) => {
    setDeletingAllInactive(true);
    try {
      for (const phone of phones) {
        await deleteBookingsByPhone(phone);
        await deletePin(phone);
      }
      const gone = new Set(phones);
      setBookings((prev) => prev.filter((b) => !gone.has(normalizePhone(b.phone))));
      setPins((prev) => prev.filter((p) => !gone.has(p.phone)));
      setSubscribers((prev) => prev.filter((s) => !gone.has(normalizePhone(s.phone))));
      setConfirmingDeleteAllInactive(false);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingAllInactive(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    setDeletingReviewId(id);
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setConfirmingDeleteReviewId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleToggleReviewHidden = async (r: Review) => {
    setTogglingReviewId(r.id);
    try {
      await setReviewHidden(r.id, !r.hidden);
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, hidden: !r.hidden } : x)));
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingReviewId(null);
    }
  };

  const handleSendReply = async (id: string) => {
    const text = (replyDrafts[id] ?? '').trim();
    if (!text) return;
    setReplyingId(id);
    try {
      await replyToReview(id, text);
      setReviews((prev) => prev.map((x) => (x.id === id ? { ...x, reply: text, repliedAt: new Date().toISOString() } : x)));
    } catch (e) {
      console.error(e);
    } finally {
      setReplyingId(null);
    }
  };

  const handleDeleteReply = async (id: string) => {
    setReplyingId(id);
    try {
      await deleteReviewReply(id);
      setReviews((prev) => prev.map((x) => (x.id === id ? { ...x, reply: undefined, repliedAt: undefined } : x)));
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
    } catch (e) {
      console.error(e);
    } finally {
      setReplyingId(null);
    }
  };

  const handleSavePackage = async (id: string, data: PackageEdit) => {
    setSavingPackageId(id);
    setPackageSaveState((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      await updatePackage(id, data);
      setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      await reloadPackagesCatalog();
      setPackageSaveState((prev) => ({ ...prev, [id]: 'success' }));
    } catch (e) {
      console.error(e);
      setPackageSaveState((prev) => ({ ...prev, [id]: 'error' }));
    } finally {
      setSavingPackageId(null);
    }
  };

  const scheduleDays = generateNext30Days();

  type CustomerRow = {
    phone: string;
    name: string;
    pin: string | null;
    bookingCount: number;
    lastBooking: Booking | null;
    hasActive: boolean;
    pinCreatedAt?: string;
  };

  const customerMap = new Map<string, CustomerRow>();
  for (const b of bookings) {
    const phone = normalizePhone(b.phone);
    const existing = customerMap.get(phone);
    if (!existing) {
      customerMap.set(phone, {
        phone, name: b.name, pin: null, bookingCount: 1,
        lastBooking: b, hasActive: b.status === 'pending',
      });
    } else {
      existing.bookingCount += 1;
      if (b.status === 'pending') existing.hasActive = true;
      if (b.createdAt > (existing.lastBooking?.createdAt ?? '')) {
        existing.lastBooking = b;
        existing.name = b.name;
      }
    }
  }
  for (const p of pins) {
    const existing = customerMap.get(p.phone);
    if (existing) existing.pin = p.pin;
    else customerMap.set(p.phone, {
      phone: p.phone, name: '', pin: p.pin, bookingCount: 0,
      lastBooking: null, hasActive: false, pinCreatedAt: p.createdAt,
    });
  }
  const allCustomers = Array.from(customerMap.values()).sort(
    (a, b) => (b.lastBooking?.createdAt ?? '').localeCompare(a.lastBooking?.createdAt ?? '')
  );
  const filteredCustomers = customerSearch.trim()
    ? allCustomers.filter((c) =>
        c.phone.includes(normalizePhone(customerSearch)) ||
        c.name.toLowerCase().includes(customerSearch.trim().toLowerCase())
      )
    : allCustomers;

  // Retention: the privacy policy promises deletion 12 months after the last
  // booking. Last activity = newest booking, or PIN creation for PIN-only rows.
  const retentionCutoff = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString();
  })();
  const lastActivityOf = (c: CustomerRow) => c.lastBooking?.createdAt || c.pinCreatedAt || '';
  const inactiveCustomers = allCustomers.filter((c) => {
    const last = lastActivityOf(c);
    return !!last && last < retentionCutoff && !c.hasActive;
  });

  const isEnrollmentBooking = (b: Booking) =>
    b.type === 'subscription' && b.kind !== 'scheduled' && b.kind !== 'wash';

  // Enrollment bookings double as the subscriber's first wash when they carry
  // a date/time picked at signup — show those as real jobs.
  const visibleBookings = bookings.filter((b) => !isEnrollmentBooking(b) || (!!b.date && !!b.time));

  const filtered = visibleBookings.filter((b) =>
    filter === 'upcoming' ? b.status === 'pending'
    : filter === 'completed' ? b.status === 'completed'
    : true
  );

  const totalRevenue = bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + b.price, 0);
  const completedCount = visibleBookings.filter((b) => b.status === 'completed').length;
  const upcomingCount = visibleBookings.filter((b) => b.status === 'pending').length;
  const activeSubCount = subscribers.length;

  const activePhones = new Set(bookings.filter((b) => b.status === 'pending').map((b) => b.phone));
  const searchedPins = pinSearch.trim()
    ? pins.filter((p) => p.phone.includes(normalizePhone(pinSearch)))
    : pins;
  const activePins = searchedPins.filter((p) => activePhones.has(p.phone));
  const inactivePins = searchedPins.filter((p) => !activePhones.has(p.phone));

  return (
    <ScrollView
      className="flex-1 bg-[#F5F5F7]"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />}
    >
      {/* ── HEADER ── */}
      <LinearGradient colors={['#0A0A0A', '#160303', '#0A0A0A']} className="pt-16 pb-8 px-6 overflow-hidden rounded-b-[32px]">
        <View className="absolute w-[240px] h-[240px] rounded-full bg-[#E8001C] opacity-[0.05] -top-[100px] -right-[60px]" />
        <View className="absolute inset-0 border-b border-white/[0.06]" />

        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/10 items-center justify-center">
              <Ionicons name="shield-checkmark" size={20} color="#E8001C" />
            </View>
            <View>
              <Text className="text-white text-[22px] font-black tracking-[0.5px] leading-[24px]">Adminpanel</Text>
              <Text className="text-white/40 text-[12px] font-medium mt-0.5">{t.adminWelcome}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full px-2.5 py-1.5">
            <View className="w-[6px] h-[6px] rounded-full bg-[#22C55E]" />
            <Text className="text-[#22C55E] text-[10px] font-extrabold tracking-[0.5px]">LIVE</Text>
          </View>
        </View>

        {/* ── STATS ROW ── */}
        <View className="flex-row items-center bg-white/[0.04] border border-white/[0.08] rounded-2xl px-2 py-3">
          {[
            { label: 'Kommande', value: String(upcomingCount), icon: 'calendar' as const, accent: '#E8001C' },
            { label: 'Avklarade', value: String(completedCount), icon: 'checkmark-done' as const, accent: '#22C55E' },
            { label: 'Abonnenter', value: String(activeSubCount), icon: 'infinite' as const, accent: '#7C3AED' },
            { label: 'Intäkter', value: `${totalRevenue} SEK`, icon: 'trending-up' as const, accent: '#F59E0B' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View className="w-px h-9 bg-white/[0.08]" />}
              <View className="flex-1 items-center gap-1.5">
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 24, height: 24, backgroundColor: `${s.accent}22` }}
                >
                  <Ionicons name={s.icon} size={12} color={s.accent} />
                </View>
                <Text className="text-white text-[15px] font-black">{s.value}</Text>
                <Text className="text-white/40 text-[9px] tracking-[0.3px]">{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* ── TABS ── */}
      {(() => {
        const gap = 10;
        const horizontalPadding = 24;
        const columns = screenWidth >= 900 ? 7 : screenWidth >= 600 ? 5 : screenWidth >= 380 ? 3 : 2;
        const cardWidth = (screenWidth - horizontalPadding * 2 - gap * (columns - 1)) / columns;
        return (
      <View className="flex-row flex-wrap px-6 mt-6" style={{ gap }}>
        {([
          ['bookings', 'Bokningar', 'calendar-outline', '#E8001C'],
          ['subscribers', 'Abonnenter', 'infinite', '#7C3AED'],
          ['schedule', 'Schema', 'time-outline', '#0EA5E9'],
          ['pins', 'PIN-koder', 'key-outline', '#F59E0B'],
          ['customers', 'Kunder', 'people-outline', '#22C55E'],
          ['reviews', 'Omdömen', 'star-outline', '#EC4899'],
          ['packages', 'Paket', 'pricetags-outline', '#6366F1'],
        ] as const).map(([key, label, icon, accent]) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              className="items-center justify-center rounded-2xl border"
              style={{
                width: cardWidth,
                paddingVertical: 14,
                backgroundColor: active ? accent : '#fff',
                borderColor: active ? accent : 'rgba(0,0,0,0.06)',
                shadowColor: active ? accent : '#000',
                shadowOpacity: active ? 0.25 : 0.04,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: active ? 4 : 1,
              }}
              onPress={() => setTab(key)}
              activeOpacity={0.85}
            >
              <View
                className="items-center justify-center rounded-full mb-1.5"
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: active ? 'rgba(255,255,255,0.2)' : `${accent}14`,
                }}
              >
                <Ionicons name={icon} size={15} color={active ? '#fff' : accent} />
              </View>
              <Text
                className="text-[11px] font-bold tracking-[0.2px] text-center"
                style={{ color: active ? '#fff' : '#3A3A3A' }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
        );
      })()}

      {loading ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: 32 }} />
      ) : tab === 'pins' ? (

        /* ══════════════════
            PIN CODES TAB
        ══════════════════ */
        <View className="px-6 pt-5 pb-8">
          {/* ── Search ── */}
          <View
            className="flex-row items-center gap-2.5 bg-white rounded-2xl px-3 mb-4"
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
            <View className="w-8 h-8 rounded-xl bg-[#F59E0B]/[0.1] items-center justify-center">
              <Ionicons name="search" size={14} color="#F59E0B" />
            </View>
            <TextInput
              className="flex-1 text-sm text-[#0A0A0A] py-3.5 font-semibold"
              placeholder="Sök telefonnummer…"
              placeholderTextColor={colors.gray400}
              value={pinSearch}
              onChangeText={setPinSearch}
              keyboardType="phone-pad"
            />
            {pinSearch.length > 0 && (
              <TouchableOpacity onPress={() => setPinSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {activePins.length === 0 && inactivePins.length === 0 ? (
            <View className="items-center mt-10 gap-2">
              <View className="w-14 h-14 rounded-full bg-black/[0.04] items-center justify-center">
                <Ionicons name="key-outline" size={22} color={colors.gray400} />
              </View>
              <Text className="text-[#9E9E9E] text-center text-sm">
                {pinSearch ? 'Inget nummer hittades.' : 'Inga PIN-koder ännu.'}
              </Text>
            </View>
          ) : (
            <>
              {activePins.length === 0 ? (
                <Text className="text-[#9E9E9E] text-center mt-8 text-sm">Inga aktiva bokningar hittades.</Text>
              ) : (
                <>
                  <Text className="text-[10px] font-extrabold tracking-[1.2px] text-[#9E9E9E] mb-2 px-1">
                    AKTIVA BOKNINGAR ({activePins.length})
                  </Text>
                  {activePins.map((p) => (
                    <View
                      key={p.phone}
                      className="flex-row items-center gap-3 bg-white rounded-2xl p-4 mb-2.5"
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
                      <View className="w-11 h-11 rounded-xl bg-[#F59E0B]/[0.08] border border-[#F59E0B]/[0.15] items-center justify-center">
                        <Ionicons name="key" size={16} color="#F59E0B" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-extrabold text-[#0A0A0A]">{p.phone}</Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <View className="w-[6px] h-[6px] rounded-full bg-[#22C55E]" />
                          <Text className="text-[10px] text-[#9E9E9E] font-semibold">
                            Aktiv{p.createdAt ? ` · sedan ${new Date(p.createdAt).toLocaleDateString('sv-SE')}` : ''}
                          </Text>
                        </View>
                      </View>
                      <View className="bg-[#0A0A0A] rounded-xl px-3.5 py-2 items-center">
                        <Text className="text-[7px] font-extrabold tracking-[1.5px] text-white/40">PIN</Text>
                        <Text className="text-base font-black text-white tracking-[4px]">{p.pin}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {inactivePins.length > 0 && (
                <View className="mt-2">
                  <TouchableOpacity
                    className="flex-row items-center gap-1.5 bg-white border border-black/[0.06] rounded-full px-3.5 py-2 self-start"
                    onPress={() => setShowInactivePins((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showInactivePins ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={colors.gray400}
                    />
                    <Text className="text-[11px] font-extrabold text-[#9E9E9E] tracking-[0.3px]">
                      {showInactivePins ? 'Dölj' : 'Visa'} ej aktiva ({inactivePins.length})
                    </Text>
                  </TouchableOpacity>

                  {showInactivePins && (
                    <View className="mt-3">
                      {inactivePins.map((p) => (
                        <View
                          key={p.phone}
                          className="flex-row items-center gap-3 bg-white rounded-2xl p-4 mb-2.5 border border-black/[0.05] opacity-[0.55]"
                        >
                          <View className="w-11 h-11 rounded-xl bg-black/[0.04] border border-black/[0.05] items-center justify-center">
                            <Ionicons name="key-outline" size={16} color={colors.gray400} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-extrabold text-[#0A0A0A]">{p.phone}</Text>
                            {p.createdAt && (
                              <Text className="text-[10px] text-[#9E9E9E] font-semibold mt-0.5">
                                Sedan {new Date(p.createdAt).toLocaleDateString('sv-SE')}
                              </Text>
                            )}
                          </View>
                          <View className="bg-[#9E9E9E] rounded-xl px-3.5 py-2 items-center">
                            <Text className="text-[7px] font-extrabold tracking-[1.5px] text-white/50">PIN</Text>
                            <Text className="text-base font-black text-white tracking-[4px]">{p.pin}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>

      ) : tab === 'schedule' ? (

        /* ══════════════════
            SCHEDULE TAB
        ══════════════════ */
        <View className="px-6 pt-5 pb-8">
          <View className="bg-[#0EA5E9]/[0.06] rounded-2xl border border-[#0EA5E9]/[0.15] p-3.5 mb-4 flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-xl bg-[#0EA5E9]/[0.12] items-center justify-center">
              <Ionicons name="information-circle" size={16} color="#0EA5E9" />
            </View>
            <Text className="text-xs text-[#3A6A80] leading-[18px] flex-1 font-medium">
              Standard: Mån–Fre 08:00–18:00 · Lör–Sön 09:00–18:00. Justera enskilda dagar vid behov.
            </Text>
          </View>
          {scheduleDays.map((date) => (
            <ScheduleDayRow
              key={date}
              date={date}
              hours={hoursForDate(date, overrides)}
              isOverridden={overrides.some((o) => o.date === date)}
              saving={savingDate === date}
              onSave={(h) => handleSaveOverride(date, h)}
              onReset={() => handleResetOverride(date)}
            />
          ))}
        </View>

      ) : tab === 'bookings' ? (

        /* ══════════════════
            BOOKINGS TAB
        ══════════════════ */
        <View className="px-6 pt-5 pb-8">
          {/* Filter chips */}
          <View className="flex-row gap-2 mb-5">
            {([
              ['upcoming', 'Kommande', 'time-outline', '#E8001C'],
              ['completed', 'Avklarade', 'checkmark-done-outline', '#22C55E'],
              ['all', 'Alla', 'apps-outline', '#0A0A0A'],
            ] as const).map(([f, label, icon, accent]) => {
              const active = filter === f;
              return (
                <TouchableOpacity
                  key={f}
                  className="flex-1 flex-row items-center justify-center gap-1.5 py-3 px-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: active ? accent : '#fff',
                    borderColor: active ? accent : 'rgba(0,0,0,0.06)',
                    shadowColor: active ? accent : '#000',
                    shadowOpacity: active ? 0.22 : 0.04,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: active ? 3 : 1,
                  }}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={icon} size={13} color={active ? '#fff' : colors.gray400} />
                  <Text className={`text-xs font-extrabold tracking-[0.3px] ${active ? 'text-white' : 'text-[#616161]'}`}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filtered.length === 0 ? (
            <View className="items-center mt-10 gap-2">
              <View className="w-14 h-14 rounded-full bg-black/[0.04] items-center justify-center">
                <Ionicons name="calendar-outline" size={22} color={colors.gray400} />
              </View>
              <Text className="text-[#9E9E9E] text-center text-sm">Inga bokningar att visa.</Text>
            </View>
          ) : (
            filtered.map((b) => {
              const isCompleted = b.status === 'completed';
              const isCancelled = b.status === 'cancelled';
              const statusAccent = isCancelled ? '#9E9E9E' : isCompleted ? '#22C55E' : '#E8001C';
              const isUpcoming = !isCompleted && !isCancelled;
              const initial = (b.name || '?')[0]?.toUpperCase() ?? '?';

              if (!isUpcoming) {
                // Compact card for completed / cancelled bookings
                return (
                  <View
                    key={b.id}
                    className="bg-white rounded-2xl mb-2.5 border border-black/[0.06] overflow-hidden"
                    style={{ opacity: 0.65 }}
                  >
                    <View className="flex-row">
                      <View style={{ width: 4, backgroundColor: statusAccent }} />
                      <View className="flex-1 p-4">
                        <View className="flex-row items-start mb-2">
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5 mb-0.5 flex-wrap">
                              <Text className="text-[15px] font-extrabold text-[#0A0A0A]">{b.name}</Text>
                              {isCancelled && (
                                <View className="bg-[#9E9E9E] rounded-full px-1.5 py-0.5"><Text className="text-white text-[8px] font-extrabold tracking-[1px]">AVBOKAD</Text></View>
                              )}
                              {isCompleted && (
                                <View className="bg-[#22C55E]/10 rounded-full px-1.5 py-0.5"><Text className="text-[#22C55E] text-[8px] font-extrabold tracking-[1px]">KLAR</Text></View>
                              )}
                            </View>
                            <Text className="text-[11px] text-[#9E9E9E]">{b.packageName} · #{orderNumber(b.id)}</Text>
                          </View>
                          <Text className="text-[15px] font-black text-[#9E9E9E]">{b.price} SEK</Text>
                        </View>
                        <View className="gap-[5px]">
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons name="calendar-outline" size={12} color={colors.gray400} />
                            <Text className="text-xs text-[#616161]">{b.date} · {b.time}</Text>
                          </View>
                        </View>
                        {!isCancelled && (
                          <TouchableOpacity
                            className="flex-row items-center justify-center gap-1.5 bg-[#0A0A0A] rounded-xl py-2.5 mt-3"
                            onPress={() => toggleStatus(b)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text className="text-xs font-extrabold tracking-[1px] text-white">✓ AVKLARAD</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              }

              return (
              <View
                key={b.id}
                className="rounded-3xl mb-4 overflow-hidden bg-white"
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.05)',
                  shadowColor: '#0A0A0A',
                  shadowOpacity: 0.07,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 4,
                }}
              >
                {/* ── Red accent line ── */}
                <LinearGradient
                  colors={['#FF3D57', '#E8001C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3 }}
                />

                <View className="p-5">
                  {/* ── Header: who ── */}
                  <View className="flex-row items-center mb-4">
                    <LinearGradient
                      colors={['#FF3D57', '#E8001C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        shadowColor: '#E8001C',
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 3 },
                      }}
                    >
                      <Text className="text-white font-black text-[17px]">{initial}</Text>
                    </LinearGradient>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5 flex-wrap">
                        <Text className="text-[16px] font-black text-[#0A0A0A] tracking-[-0.3px]">{b.name}</Text>
                        {b.type === 'subscription' && (
                          <View className="bg-[#E8001C] rounded-full px-2 py-0.5 flex-row items-center gap-0.5">
                            <Ionicons name="infinite" size={9} color="#fff" />
                            <Text className="text-white text-[8px] font-extrabold tracking-[1px]">MÅNADS</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <Text className="text-[11px] text-[#9E9E9E] font-semibold">{b.packageName}</Text>
                        <View className="w-[3px] h-[3px] rounded-full bg-black/15" />
                        <Text className="text-[10px] font-bold text-[#BDBDBD] tracking-[0.5px]">#{orderNumber(b.id)}</Text>
                      </View>
                    </View>
                    {/* Status pill */}
                    <View className="flex-row items-center gap-1.5 bg-[#E8001C]/[0.07] border border-[#E8001C]/[0.15] rounded-full px-2.5 py-1.5">
                      <View className="w-[6px] h-[6px] rounded-full bg-[#E8001C]" />
                      <Text className="text-[8px] font-extrabold tracking-[1.2px] text-[#E8001C]">KOMMANDE</Text>
                    </View>
                  </View>

                  {/* ── When & how much: unified strip ── */}
                  <View className="flex-row items-center bg-[#F7F7F9] border border-black/[0.04] rounded-2xl py-3 px-1 mb-3">
                    {([
                      ['calendar-outline', 'DATUM', b.date, '#0A0A0A'],
                      ['time-outline', 'TID', b.time, '#0A0A0A'],
                      ['cash-outline', 'PRIS', `${b.price} kr`, '#E8001C'],
                    ] as const).map(([icon, label, value, valueColor], i) => (
                      <React.Fragment key={label}>
                        {i > 0 && <View className="w-px h-8 bg-black/[0.06]" />}
                        <View className="flex-1 items-center gap-1">
                          <View className="flex-row items-center gap-1">
                            <Ionicons name={icon} size={10} color="#9E9E9E" />
                            <Text className="text-[8px] font-extrabold tracking-[1.2px] text-[#9E9E9E]">{label}</Text>
                          </View>
                          <Text className="text-[14px] font-black tracking-[-0.2px]" style={{ color: valueColor }} numberOfLines={1}>{value}</Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>

                  {/* ── Contact: tap to call / open maps ── */}
                  <View className="rounded-2xl border border-black/[0.05] overflow-hidden mb-4">
                    {b.address && (
                      <TouchableOpacity
                        className="flex-row items-center gap-3 px-3.5 py-3 border-b border-black/[0.04]"
                        onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(b.address!)}`)}
                        activeOpacity={0.7}
                      >
                        <View className="w-8 h-8 rounded-xl bg-[#E8001C]/[0.08] items-center justify-center">
                          <Ionicons name="location" size={14} color="#E8001C" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[9px] font-extrabold tracking-[0.8px] text-[#9E9E9E] mb-0.5">ADRESS</Text>
                          <Text className="text-[13px] text-[#0A0A0A] font-bold" numberOfLines={1}>{b.address}</Text>
                        </View>
                        <View className="flex-row items-center gap-1 bg-[#F5F5F7] rounded-full px-2.5 py-1.5">
                          <Text className="text-[9px] font-extrabold tracking-[0.8px] text-[#616161]">KARTA</Text>
                          <Ionicons name="arrow-forward" size={10} color={colors.gray600} />
                        </View>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      className="flex-row items-center gap-3 px-3.5 py-3"
                      onPress={() => Linking.openURL(`tel:${b.phone}`)}
                      activeOpacity={0.7}
                    >
                      <View className="w-8 h-8 rounded-xl bg-[#E8001C]/[0.08] items-center justify-center">
                        <Ionicons name="call" size={14} color="#E8001C" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[9px] font-extrabold tracking-[0.8px] text-[#9E9E9E] mb-0.5">TELEFON</Text>
                        <Text className="text-[13px] text-[#0A0A0A] font-bold" numberOfLines={1}>{b.phone}</Text>
                      </View>
                      <View className="flex-row items-center gap-1 bg-[#F5F5F7] rounded-full px-2.5 py-1.5">
                        <Text className="text-[9px] font-extrabold tracking-[0.8px] text-[#616161]">RING</Text>
                        <Ionicons name="arrow-forward" size={10} color={colors.gray600} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* ── Primary action ── */}
                  <TouchableOpacity
                    className="rounded-2xl overflow-hidden"
                    onPress={() => toggleStatus(b)}
                    activeOpacity={0.9}
                    style={{ shadowColor: '#E8001C', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }}
                  >
                    <LinearGradient
                      colors={['#FF3D57', '#E8001C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                      <Text className="text-xs font-extrabold tracking-[1.5px] text-white">MARKERA SOM KLAR</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
              );
            })
          )}
        </View>

      ) : tab === 'customers' ? (

        /* ══════════════════
            CUSTOMERS TAB (GDPR data management)
        ══════════════════ */
        <View className="px-6 pt-5 pb-8">
          {/* ── Search ── */}
          <View
            className="flex-row items-center gap-2.5 bg-white rounded-2xl px-3 mb-4"
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
            <View className="w-8 h-8 rounded-xl bg-[#22C55E]/[0.1] items-center justify-center">
              <Ionicons name="search" size={14} color="#22C55E" />
            </View>
            <TextInput
              className="flex-1 text-sm text-[#0A0A0A] py-3.5 font-semibold"
              placeholder="Sök namn eller telefonnummer…"
              placeholderTextColor={colors.gray400}
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />
            {customerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCustomerSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Retention: inactive 12+ months ── */}
          <View
            className="bg-white rounded-2xl p-4 mb-4"
            style={{
              borderWidth: 1,
              borderColor: inactiveCustomers.length > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(0,0,0,0.05)',
              shadowColor: '#0A0A0A',
              shadowOpacity: 0.05,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View className="flex-row items-center gap-2.5 mb-1">
              <View className="w-8 h-8 rounded-xl bg-[#F59E0B]/[0.12] items-center justify-center">
                <Ionicons name="time-outline" size={15} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-extrabold text-[#0A0A0A] tracking-[0.3px]">
                  INAKTIVA 12+ MÅNADER
                </Text>
                <Text className="text-[10px] text-[#9E9E9E] font-semibold mt-px">
                  Integritetspolicyn: data raderas 12 mån efter senaste bokning
                </Text>
              </View>
              {inactiveCustomers.length > 0 && (
                <View className="bg-[#F59E0B]/[0.12] rounded-full px-2.5 py-1">
                  <Text className="text-[11px] font-black text-[#F59E0B]">{inactiveCustomers.length}</Text>
                </View>
              )}
            </View>

            {inactiveCustomers.length === 0 ? (
              <Text className="text-xs text-[#9E9E9E] italic mt-2 ml-[42px]">
                Inga kunder har varit inaktiva i 12+ månader.
              </Text>
            ) : (
              <>
                {inactiveCustomers.map((c) => {
                  const last = lastActivityOf(c);
                  const confirming = confirmingInactivePhone === c.phone;
                  return (
                    <View key={c.phone} className="mt-2.5 bg-[#F7F7F9] border border-black/[0.04] rounded-2xl p-3">
                      <View className="flex-row items-center gap-2.5">
                        <View className="flex-1">
                          <Text className="text-xs font-extrabold text-[#0A0A0A]" numberOfLines={1}>
                            {c.name || 'Okänt namn'}
                          </Text>
                          <Text className="text-[10px] text-[#9E9E9E] font-semibold mt-px">
                            {c.phone} · senast aktiv {last ? new Date(last).toLocaleDateString('sv-SE') : '–'}
                          </Text>
                        </View>
                        {deletingPhone === c.phone ? (
                          <ActivityIndicator size="small" color={colors.red} />
                        ) : (
                          <TouchableOpacity
                            className="w-8 h-8 rounded-xl bg-[#E8001C]/[0.08] border border-[#E8001C]/[0.15] items-center justify-center"
                            onPress={() => setConfirmingInactivePhone(confirming ? null : c.phone)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color={colors.red} />
                          </TouchableOpacity>
                        )}
                      </View>
                      {confirming && (
                        <View className="flex-row gap-2 mt-2.5">
                          <TouchableOpacity
                            className="flex-1 items-center justify-center border border-black/[0.1] bg-white rounded-xl py-2"
                            onPress={() => setConfirmingInactivePhone(null)}
                            activeOpacity={0.8}
                          >
                            <Text className="text-[11px] font-extrabold text-[#616161]">AVBRYT</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="flex-1 items-center justify-center bg-[#E8001C] rounded-xl py-2"
                            onPress={() => {
                              setConfirmingInactivePhone(null);
                              handleDeleteCustomer(c.phone);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text className="text-[11px] font-extrabold text-white">RADERA</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}

                {confirmingDeleteAllInactive ? (
                  <View className="bg-[#E8001C]/[0.05] border border-[#E8001C]/[0.12] rounded-2xl p-3 gap-2.5 mt-3">
                    <Text className="text-xs text-[#616161] leading-[18px]">
                      Radera all data (bokningar + PIN-koder) för {inactiveCustomers.length} inaktiva kunder permanent? Detta kan inte ångras.
                    </Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 items-center justify-center border border-black/[0.1] bg-white rounded-xl py-2.5"
                        onPress={() => setConfirmingDeleteAllInactive(false)}
                        disabled={deletingAllInactive}
                        activeOpacity={0.8}
                      >
                        <Text className="text-[11px] font-extrabold text-[#616161]">AVBRYT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 items-center justify-center bg-[#E8001C] rounded-xl py-2.5"
                        onPress={() => handleDeleteAllInactive(inactiveCustomers.map((c) => c.phone))}
                        disabled={deletingAllInactive}
                        activeOpacity={0.8}
                      >
                        {deletingAllInactive ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text className="text-[11px] font-extrabold text-white">JA, RADERA ALLA</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-1.5 border border-[#E8001C]/[0.25] bg-[#E8001C]/[0.05] rounded-xl py-2.5 mt-3"
                    onPress={() => setConfirmingDeleteAllInactive(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={13} color={colors.red} />
                    <Text className="text-[11px] font-extrabold text-[#E8001C]">RADERA ALLA INAKTIVA</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {filteredCustomers.length === 0 ? (
            <View className="items-center mt-10 gap-2">
              <View className="w-14 h-14 rounded-full bg-black/[0.04] items-center justify-center">
                <Ionicons name="people-outline" size={22} color={colors.gray400} />
              </View>
              <Text className="text-[#9E9E9E] text-center text-sm">
                {customerSearch ? 'Ingen kund hittades.' : 'Inga kunder ännu.'}
              </Text>
            </View>
          ) : (
            filteredCustomers.map((c) => {
              const expanded = expandedPhone === c.phone;
              const custBookings = bookings.filter((b) => normalizePhone(b.phone) === c.phone);
              return (
                <View
                  key={c.phone}
                  className="bg-white rounded-2xl p-4 mb-2.5"
                  style={{
                    borderWidth: 1,
                    borderColor: expanded ? 'rgba(34,197,94,0.25)' : 'rgba(0,0,0,0.05)',
                    shadowColor: '#0A0A0A',
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                  }}
                >
                  <TouchableOpacity
                    className="flex-row items-center gap-3"
                    onPress={() => setExpandedPhone(expanded ? null : c.phone)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#4ADE80', '#22C55E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#22C55E',
                        shadowOpacity: 0.25,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 3 },
                      }}
                    >
                      <Text className="text-white font-black text-[16px]">
                        {(c.name || c.phone)[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </LinearGradient>
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-[#0A0A0A]">{c.name || 'Okänt namn'}</Text>
                      <Text className="text-[11px] text-[#9E9E9E] font-semibold mt-0.5">{c.phone}</Text>
                    </View>
                    {c.hasActive && (
                      <View className="flex-row items-center gap-1.5 bg-[#22C55E]/[0.07] border border-[#22C55E]/[0.15] rounded-full px-2.5 py-1.5">
                        <View className="w-[6px] h-[6px] rounded-full bg-[#22C55E]" />
                        <Text className="text-[8px] font-extrabold tracking-[1px] text-[#22C55E]">AKTIV</Text>
                      </View>
                    )}
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.gray400}
                    />
                  </TouchableOpacity>

                  <View className="flex-row items-center gap-2 mt-3 pl-[56px]">
                    <View className="flex-row items-center gap-1 bg-[#F7F7F9] border border-black/[0.04] rounded-full px-2.5 py-1">
                      <Ionicons name="calendar-outline" size={10} color={colors.gray600} />
                      <Text className="text-[10px] font-bold text-[#616161]">
                        {c.bookingCount} bokning{c.bookingCount === 1 ? '' : 'ar'}
                      </Text>
                    </View>
                    {c.pin && (
                      <View className="flex-row items-center gap-1 bg-[#F7F7F9] border border-black/[0.04] rounded-full px-2.5 py-1">
                        <Ionicons name="key" size={10} color={colors.gray600} />
                        <Text className="text-[10px] font-extrabold text-[#616161] tracking-[1px]">{c.pin}</Text>
                      </View>
                    )}
                  </View>

                  {expanded && (
                    <View className="mt-4 pt-4 border-t border-t-[#F0F0F0]">
                      {custBookings.length === 0 ? (
                        <Text className="text-xs text-[#9E9E9E] italic mb-3">Inga bokningar, endast PIN-kod finns sparad.</Text>
                      ) : (
                        <View className="bg-[#F7F7F9] border border-black/[0.04] rounded-2xl px-3.5 mb-3">
                          {custBookings.map((b, i) => {
                            const stColor = b.status === 'completed' ? '#22C55E' : b.status === 'cancelled' ? '#9E9E9E' : '#E8001C';
                            const stLabel = b.status === 'completed' ? 'KLAR' : b.status === 'cancelled' ? 'AVBOKAD' : 'KOMMANDE';
                            return (
                              <View
                                key={b.id}
                                className={`flex-row justify-between items-center py-2.5 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}
                              >
                                <View className="flex-1 pr-2">
                                  <Text className="text-xs font-bold text-[#0A0A0A]" numberOfLines={1}>{b.packageName}</Text>
                                  <Text className="text-[10px] text-[#9E9E9E] font-semibold mt-px">
                                    #{orderNumber(b.id)} · {b.date} {b.time}
                                  </Text>
                                </View>
                                <View className="rounded-full px-2 py-[3px]" style={{ backgroundColor: `${stColor}14` }}>
                                  <Text className="text-[8px] font-extrabold tracking-[0.5px]" style={{ color: stColor }}>
                                    {stLabel}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {confirmingDeletePhone === c.phone ? (
                        <View className="bg-[#E8001C]/[0.05] border border-[#E8001C]/[0.12] rounded-2xl p-3 gap-2.5">
                          <Text className="text-xs text-[#616161] leading-[18px]">
                            Radera all data (bokningar + PIN-kod) för denna kund permanent?
                          </Text>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              className="flex-1 items-center justify-center border border-black/[0.1] bg-white rounded-xl py-2.5"
                              onPress={() => setConfirmingDeletePhone(null)}
                              disabled={deletingPhone === c.phone}
                              activeOpacity={0.8}
                            >
                              <Text className="text-[11px] font-extrabold tracking-[0.5px] text-[#0A0A0A]">AVBRYT</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              className="flex-1 items-center justify-center bg-[#E8001C] rounded-xl py-2.5"
                              onPress={() => handleDeleteCustomer(c.phone)}
                              disabled={deletingPhone === c.phone}
                              activeOpacity={0.8}
                            >
                              {deletingPhone === c.phone ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text className="text-[11px] font-extrabold tracking-[0.5px] text-white">JA, RADERA</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          className="flex-row items-center justify-center gap-1.5 bg-[#E8001C]/[0.06] border border-[#E8001C]/[0.15] rounded-xl py-2.5"
                          onPress={() => setConfirmingDeletePhone(c.phone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={13} color={colors.red} />
                          <Text className="text-[11px] font-extrabold tracking-[0.5px] text-[#E8001C]">RADERA KUNDDATA</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

      ) : tab === 'reviews' ? (

        /* ══════════════════
            REVIEWS TAB (moderation)
        ══════════════════ */
        <View className="px-6 pt-5 pb-8">
          {reviews.length === 0 ? (
            <View className="items-center mt-10 gap-2">
              <View className="w-14 h-14 rounded-full bg-black/[0.04] items-center justify-center">
                <Ionicons name="star-outline" size={22} color={colors.gray400} />
              </View>
              <Text className="text-[#9E9E9E] text-center text-sm">Inga omdömen ännu.</Text>
            </View>
          ) : (
            reviews.map((r) => {
              const draft = replyDrafts[r.id] ?? r.reply ?? '';
              return (
                <View
                  key={r.id}
                  className={`bg-white rounded-2xl p-4 mb-2.5 gap-3 ${r.hidden ? 'opacity-50' : ''}`}
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
                  {/* ── Header: who & rating ── */}
                  <View className="flex-row items-center gap-3">
                    <LinearGradient
                      colors={['#F9A8D4', '#EC4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#EC4899',
                        shadowOpacity: 0.25,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 3 },
                      }}
                    >
                      <Text className="text-white font-black text-[16px]">{r.name[0]?.toUpperCase() ?? '?'}</Text>
                    </LinearGradient>
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-[#0A0A0A] mb-0.5">{r.name}</Text>
                      <View className="flex-row items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= r.rating ? 'star' : 'star-outline'}
                            size={12}
                            color={s <= r.rating ? '#FFB800' : '#E0E0E0'}
                          />
                        ))}
                      </View>
                    </View>
                    {r.reply && !r.hidden && (
                      <View className="flex-row items-center gap-1 bg-[#22C55E]/[0.07] border border-[#22C55E]/[0.15] rounded-full px-2.5 py-1.5">
                        <Ionicons name="checkmark" size={9} color="#22C55E" />
                        <Text className="text-[8px] font-extrabold tracking-[1px] text-[#22C55E]">BESVARAD</Text>
                      </View>
                    )}
                    {r.hidden && (
                      <View className="flex-row items-center gap-1 bg-black/[0.05] border border-black/[0.08] rounded-full px-2.5 py-1.5">
                        <Ionicons name="eye-off" size={9} color={colors.gray600} />
                        <Text className="text-[8px] font-extrabold tracking-[1px] text-[#616161]">DOLD</Text>
                      </View>
                    )}
                  </View>

                  {/* ── Review text ── */}
                  <View className="bg-[#F7F7F9] border border-black/[0.04] rounded-2xl px-3.5 py-3">
                    <Text className="text-[13px] text-[#4A4A4A] leading-[19px]">{r.text}</Text>
                  </View>

                  {/* ── Reply ── */}
                  <TextInput
                    className="bg-white rounded-xl border border-black/[0.08] px-3 py-2.5 text-[13px] text-[#0A0A0A] min-h-[44px]"
                    style={{ textAlignVertical: 'top' }}
                    placeholder="Skriv ett svar…"
                    placeholderTextColor={colors.gray400}
                    value={draft}
                    onChangeText={(v) => setReplyDrafts((prev) => ({ ...prev, [r.id]: v }))}
                    multiline
                  />

                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                        (replyingId === r.id || !draft.trim()) ? 'bg-[#EDEDF0]' : 'bg-[#EC4899]'
                      }`}
                      style={(replyingId === r.id || !draft.trim()) ? undefined : {
                        shadowColor: '#EC4899',
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 3,
                      }}
                      onPress={() => handleSendReply(r.id)}
                      disabled={replyingId === r.id || !draft.trim()}
                      activeOpacity={0.8}
                    >
                      {replyingId === r.id ? (
                        <ActivityIndicator color="#EC4899" size="small" />
                      ) : (
                        <>
                          <Ionicons name="send" size={11} color={!draft.trim() ? colors.gray400 : '#fff'} />
                          <Text className={`text-[11px] font-extrabold tracking-[0.5px] ${!draft.trim() ? 'text-[#9E9E9E]' : 'text-white'}`}>
                            {r.reply ? 'UPPDATERA SVAR' : 'SVARA'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {r.reply && (
                      <TouchableOpacity
                        className="w-[38px] h-[38px] rounded-xl bg-white border border-black/[0.08] items-center justify-center"
                        onPress={() => handleDeleteReply(r.id)}
                        disabled={replyingId === r.id}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={colors.gray600} />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      className="w-[38px] h-[38px] rounded-xl bg-white border border-black/[0.08] items-center justify-center"
                      onPress={() => handleToggleReviewHidden(r)}
                      disabled={togglingReviewId === r.id}
                      activeOpacity={0.8}
                    >
                      {togglingReviewId === r.id ? (
                        <ActivityIndicator color={colors.gray600} size="small" />
                      ) : (
                        <Ionicons name={r.hidden ? 'eye-outline' : 'eye-off-outline'} size={16} color={colors.gray600} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="w-[38px] h-[38px] rounded-xl bg-[#E8001C]/[0.06] border border-[#E8001C]/[0.15] items-center justify-center"
                      onPress={() => setConfirmingDeleteReviewId(r.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.red} />
                    </TouchableOpacity>
                  </View>

                  {confirmingDeleteReviewId === r.id && (
                    <View className="bg-[#E8001C]/[0.05] border border-[#E8001C]/[0.12] rounded-2xl p-3 gap-2.5">
                      <Text className="text-xs text-[#616161] leading-[18px]">Radera detta omdöme permanent?</Text>
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          className="flex-1 items-center justify-center border border-black/[0.1] bg-white rounded-xl py-2.5"
                          onPress={() => setConfirmingDeleteReviewId(null)}
                          activeOpacity={0.8}
                        >
                          <Text className="text-[11px] font-extrabold tracking-[0.5px] text-[#0A0A0A]">AVBRYT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 items-center justify-center bg-[#E8001C] rounded-xl py-2.5"
                          onPress={() => handleDeleteReview(r.id)}
                          disabled={deletingReviewId === r.id}
                          activeOpacity={0.8}
                        >
                          {deletingReviewId === r.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text className="text-[11px] font-extrabold tracking-[0.5px] text-white">JA, RADERA</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

      ) : tab === 'packages' ? (

        /* ══════════════════
            PACKAGES TAB
        ══════════════════ */
        <View className="px-6 pt-5 pb-8">
          {packages.length === 0 ? (
            <View className="items-center mt-10 gap-2">
              <View className="w-14 h-14 rounded-full bg-black/[0.04] items-center justify-center">
                <Ionicons name="pricetags-outline" size={22} color={colors.gray400} />
              </View>
              <Text className="text-[#9E9E9E] text-center text-sm">Inga paket hittades.</Text>
            </View>
          ) : (
            packages.map((p) => (
              <PackageEditCard
                key={p.id}
                pkg={p}
                saving={savingPackageId === p.id}
                saveState={packageSaveState[p.id]}
                onSave={(data) => handleSavePackage(p.id, data)}
              />
            ))
          )}
        </View>

      ) : (

        /* ══════════════════
            SUBSCRIBERS TAB
        ══════════════════ */
        <View className="px-6 pt-5 pb-8">
          {subscribers.length === 0 ? (
            <Text className="text-[#9E9E9E] text-center mt-8 text-sm">Inga abonnenter ännu.</Text>
          ) : (
            subscribers.map((s) => {
              const pct = (s.washesUsedThisMonth / 4) * 100;
              const allUsed = s.washesRemaining === 0;
              return (
                <View
                  key={s.phone}
                  className="rounded-3xl mb-4 overflow-hidden bg-white"
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.05)',
                    shadowColor: '#0A0A0A',
                    shadowOpacity: 0.07,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 4,
                  }}
                >
                  {/* ── Purple accent line ── */}
                  <LinearGradient
                    colors={['#A78BFA', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 3 }}
                  />

                  <View className="p-5">
                    {/* ── Header: who ── */}
                    <View className="flex-row items-center mb-4">
                      <LinearGradient
                        colors={['#A78BFA', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                          shadowColor: '#7C3AED',
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 3 },
                        }}
                      >
                        <Text className="text-white font-black text-[17px]">{(s.name || s.phone)[0].toUpperCase()}</Text>
                      </LinearGradient>
                      <View className="flex-1">
                        <Text className="text-[16px] font-black text-[#0A0A0A] tracking-[-0.3px]">{s.name || 'Okänd'}</Text>
                        <Text className="text-[11px] text-[#9E9E9E] font-semibold mt-0.5">{s.phone}</Text>
                      </View>
                      {/* Status pill */}
                      <View className="flex-row items-center gap-1.5 bg-[#7C3AED]/[0.07] border border-[#7C3AED]/[0.15] rounded-full px-2.5 py-1.5">
                        <Ionicons name="infinite" size={10} color="#7C3AED" />
                        <Text className="text-[8px] font-extrabold tracking-[1.2px] text-[#7C3AED]">ABONNENT</Text>
                      </View>
                    </View>

                    {/* ── Usage stats: unified strip ── */}
                    <View className="flex-row items-center bg-[#F7F7F9] border border-black/[0.04] rounded-2xl py-3 px-1 mb-3">
                      {([
                        ['water-outline', 'DENNA MÅNAD', `${s.washesUsedThisMonth} / 4`, '#0A0A0A'],
                        ['hourglass-outline', 'KVAR', String(s.washesRemaining), allUsed ? '#22C55E' : '#7C3AED'],
                        ['sparkles-outline', 'TOTALT', String(s.totalWashes), '#0A0A0A'],
                      ] as const).map(([icon, label, value, valueColor], i) => (
                        <React.Fragment key={label}>
                          {i > 0 && <View className="w-px h-8 bg-black/[0.06]" />}
                          <View className="flex-1 items-center gap-1">
                            <View className="flex-row items-center gap-1">
                              <Ionicons name={icon} size={10} color="#9E9E9E" />
                              <Text className="text-[8px] font-extrabold tracking-[1.2px] text-[#9E9E9E]">{label}</Text>
                            </View>
                            <Text className="text-[14px] font-black tracking-[-0.2px]" style={{ color: valueColor }} numberOfLines={1}>{value}</Text>
                          </View>
                        </React.Fragment>
                      ))}
                    </View>

                    {/* ── Wash progress ── */}
                    <View className="gap-2 mb-3">
                      <View className="h-1.5 bg-[#F0F0F0] rounded-[3px] overflow-hidden">
                        <LinearGradient
                          colors={['#A78BFA', '#7C3AED']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ height: '100%', width: `${Math.min(pct, 100)}%` as any, borderRadius: 3 }}
                        />
                      </View>
                      <View className="flex-row gap-1.5">
                        {[1, 2, 3, 4].map((n) => {
                          const used = n <= s.washesUsedThisMonth;
                          return (
                            <View
                              key={n}
                              className={`flex-1 flex-row items-center justify-center gap-1 rounded-xl py-2 border ${
                                used ? 'bg-[#7C3AED] border-[#7C3AED]' : 'bg-[#F7F7F9] border-black/[0.05]'
                              }`}
                            >
                              <Ionicons name={used ? 'water' : 'water-outline'} size={13} color={used ? '#fff' : colors.gray400} />
                              <Text className={`text-[10px] font-bold ${used ? 'text-white' : 'text-[#9E9E9E]'}`}>
                                Tvätt {n}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* ── Remaining banner ── */}
                    <View
                      className={`flex-row items-center gap-2 rounded-2xl px-3.5 py-3 border ${
                        allUsed ? 'bg-[#22C55E]/[0.06] border-[#22C55E]/20' : 'bg-[#7C3AED]/[0.05] border-[#7C3AED]/[0.12]'
                      }`}
                    >
                      <Ionicons
                        name={allUsed ? 'checkmark-circle' : 'time-outline'}
                        size={15}
                        color={allUsed ? '#22C55E' : '#7C3AED'}
                      />
                      <Text className={`text-xs font-bold flex-1 ${allUsed ? 'text-[#22C55E]' : 'text-[#7C3AED]'}`}>
                        {allUsed
                          ? 'Alla tvättar använda denna månad'
                          : `${s.washesRemaining} tvätt${s.washesRemaining > 1 ? 'ar' : ''} kvar denna månad`}
                      </Text>
                    </View>

                    {/* ── Footer ── */}
                    <View className="flex-row items-center justify-between gap-3 mt-3 px-1">
                      <View className="flex-row items-center gap-1.5 flex-1">
                        <Ionicons name="information-circle-outline" size={13} color={colors.gray400} />
                        <Text className="text-[#9E9E9E] text-[10px] flex-1 leading-[14px]">
                          Markera tvätten som klar under fliken Bokningar.
                        </Text>
                      </View>
                      <Text className="text-[10px] text-[#BDBDBD] font-semibold">
                        Sedan {new Date(s.sinceDate).toLocaleDateString('sv-SE')}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateNext30Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(toLocalDateString(d));
  }
  return days;
}

function ScheduleDayRow({
  date, hours, isOverridden, saving, onSave, onReset,
}: {
  date: string;
  hours: DayHours;
  isOverridden: boolean;
  saving: boolean;
  onSave: (hours: DayHours) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(hours.open);
  const [close, setClose] = useState(hours.close);
  const [closed, setClosed] = useState(hours.closed);

  useEffect(() => {
    setOpen(hours.open);
    setClose(hours.close);
    setClosed(hours.closed);
  }, [hours.open, hours.close, hours.closed]);

  const dateObj = new Date(date + 'T00:00:00');
  const weekday = dateObj.toLocaleDateString('sv-SE', { weekday: 'long' });
  const monthShort = dateObj.toLocaleDateString('sv-SE', { month: 'short' });
  const dirty = open !== hours.open || close !== hours.close || closed !== hours.closed;

  return (
    <View
      className="bg-white rounded-2xl mb-2.5 overflow-hidden"
      style={{
        borderWidth: 1,
        borderColor: isOverridden ? 'rgba(14,165,233,0.35)' : 'rgba(0,0,0,0.05)',
        shadowColor: '#0A0A0A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {isOverridden && (
        <LinearGradient
          colors={['#7DD3FC', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 3 }}
        />
      )}

      <View className="p-4">
        {/* ── Date + status ── */}
        <View className="flex-row items-center gap-3 mb-3">
          <View
            className={`w-11 h-11 rounded-xl items-center justify-center border ${
              closed ? 'bg-[#F7F7F9] border-black/[0.05]' : 'bg-[#0EA5E9]/[0.07] border-[#0EA5E9]/[0.15]'
            }`}
          >
            <Text className={`text-[15px] font-black leading-[17px] ${closed ? 'text-[#9E9E9E]' : 'text-[#0EA5E9]'}`}>
              {dateObj.getDate()}
            </Text>
            <Text className={`text-[8px] font-extrabold tracking-[0.5px] uppercase ${closed ? 'text-[#BDBDBD]' : 'text-[#0EA5E9]/60'}`}>
              {monthShort.replace('.', '')}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-[#0A0A0A] capitalize">{weekday}</Text>
            <Text className="text-[11px] text-[#9E9E9E] font-semibold mt-px capitalize">
              {closed ? 'Stängt hela dagen' : `${open || '–'} – ${close || '–'}`}
            </Text>
          </View>
          {isOverridden && (
            <View className="flex-row items-center gap-1 bg-[#0EA5E9]/[0.07] border border-[#0EA5E9]/[0.15] rounded-full px-2.5 py-1.5">
              <Ionicons name="create-outline" size={9} color="#0EA5E9" />
              <Text className="text-[8px] font-extrabold tracking-[1px] text-[#0EA5E9]">ANPASSAD</Text>
            </View>
          )}
        </View>

        {/* ── Hours editor ── */}
        <View className="flex-row items-center gap-2 mb-3">
          <TouchableOpacity
            className={`flex-row items-center gap-1.5 py-2.5 px-3 rounded-xl border ${
              closed ? 'bg-[#0A0A0A] border-[#0A0A0A]' : 'bg-[#0EA5E9]/[0.07] border-[#0EA5E9]/[0.15]'
            }`}
            onPress={() => setClosed((c) => !c)}
            activeOpacity={0.8}
          >
            <Ionicons name={closed ? 'moon' : 'sunny'} size={12} color={closed ? '#fff' : '#0EA5E9'} />
            <Text className={`text-[11px] font-extrabold tracking-[0.5px] ${closed ? 'text-white' : 'text-[#0EA5E9]'}`}>
              {closed ? 'STÄNGT' : 'ÖPPET'}
            </Text>
          </TouchableOpacity>

          {!closed && (
            <>
              <TextInput
                className="flex-1 bg-[#F7F7F9] rounded-xl border border-black/[0.04] py-2.5 px-2.5 text-[13px] font-bold text-[#0A0A0A] text-center"
                value={open}
                onChangeText={setOpen}
                placeholder="08:00"
                placeholderTextColor={colors.gray400}
              />
              <Text className="text-[#BDBDBD] font-bold">–</Text>
              <TextInput
                className="flex-1 bg-[#F7F7F9] rounded-xl border border-black/[0.04] py-2.5 px-2.5 text-[13px] font-bold text-[#0A0A0A] text-center"
                value={close}
                onChangeText={setClose}
                placeholder="18:00"
                placeholderTextColor={colors.gray400}
              />
            </>
          )}
        </View>

        {/* ── Actions ── */}
        <View className="flex-row justify-end gap-2">
          {isOverridden && (
            <TouchableOpacity
              className="flex-row items-center gap-1 py-2 px-3 rounded-xl border border-black/[0.08]"
              onPress={onReset}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={11} color={colors.gray600} />
              <Text className="text-[11px] font-extrabold text-[#616161] tracking-[0.5px]">ÅTERSTÄLL</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className={`py-2 px-4 rounded-xl min-w-[70px] items-center justify-center ${
              (!dirty || saving) ? 'bg-[#EDEDF0]' : 'bg-[#0EA5E9]'
            }`}
            style={!dirty || saving ? undefined : {
              shadowColor: '#0EA5E9',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
            onPress={() => onSave({ open, close, closed })}
            disabled={!dirty || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#0EA5E9" size="small" />
            ) : (
              <Text className={`text-[11px] font-extrabold tracking-[0.5px] ${(!dirty || saving) ? 'text-[#9E9E9E]' : 'text-white'}`}>
                SPARA
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PackageEditCard({
  pkg, saving, saveState, onSave,
}: {
  pkg: CatalogPackage;
  saving: boolean;
  saveState: 'success' | 'error' | undefined;
  onSave: (data: PackageEdit) => void;
}) {
  const [nameEn, setNameEn] = useState(pkg.name_en);
  const [nameSv, setNameSv] = useState(pkg.name_sv);
  const [descEn, setDescEn] = useState(pkg.desc_en);
  const [descSv, setDescSv] = useState(pkg.desc_sv);
  const [priceSe, setPriceSe] = useState(String(pkg.prices.SE));

  useEffect(() => {
    setNameEn(pkg.name_en);
    setNameSv(pkg.name_sv);
    setDescEn(pkg.desc_en);
    setDescSv(pkg.desc_sv);
    setPriceSe(String(pkg.prices.SE));
  }, [pkg.name_en, pkg.name_sv, pkg.desc_en, pkg.desc_sv, pkg.prices.SE]);

  const dirty =
    nameEn !== pkg.name_en || nameSv !== pkg.name_sv ||
    descEn !== pkg.desc_en || descSv !== pkg.desc_sv ||
    priceSe !== String(pkg.prices.SE);

  const handleSave = () => {
    const price = Number(priceSe.replace(',', '.'));
    onSave({
      name_en: nameEn.trim(),
      name_sv: nameSv.trim(),
      desc_en: descEn.trim(),
      desc_sv: descSv.trim(),
      prices: { SE: Number.isFinite(price) ? price : 0 },
    });
  };

  return (
    <View
      className="bg-white rounded-2xl mb-4 overflow-hidden"
      style={{
        borderWidth: 1,
        borderColor: dirty ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.05)',
        shadowColor: '#0A0A0A',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {/* ── Indigo accent line ── */}
      <LinearGradient
        colors={['#A5B4FC', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 3 }}
      />

      <View className="p-4">
        {/* ── Header ── */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-11 h-11 rounded-xl bg-[#6366F1]/[0.08] border border-[#6366F1]/[0.15] items-center justify-center">
            <Ionicons name="pricetag" size={16} color="#6366F1" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-[#0A0A0A]" numberOfLines={1}>{nameSv || pkg.name_sv}</Text>
            <Text className="text-[9px] font-extrabold text-[#6366F1] tracking-[1.2px] mt-0.5">{pkg.id.toUpperCase()}</Text>
          </View>
          <View className="bg-[#0A0A0A] rounded-xl px-3 py-2 items-center">
            <Text className="text-[7px] font-extrabold tracking-[1.5px] text-white/40">PRIS</Text>
            <Text className="text-sm font-black text-white">{priceSe || '0'} kr</Text>
          </View>
        </View>

        {/* ── Name fields ── */}
        <Text className="text-[9px] font-extrabold tracking-[1px] text-[#9E9E9E] mb-1">NAMN · SVENSKA</Text>
        <TextInput
          className="bg-[#F7F7F9] rounded-xl border border-black/[0.04] px-3 py-2.5 text-[13px] font-semibold text-[#0A0A0A] mb-2.5"
          value={nameSv}
          onChangeText={setNameSv}
          placeholder="Namn (svenska)"
          placeholderTextColor={colors.gray400}
        />

        <Text className="text-[9px] font-extrabold tracking-[1px] text-[#9E9E9E] mb-1">NAMN · ENGELSKA</Text>
        <TextInput
          className="bg-[#F7F7F9] rounded-xl border border-black/[0.04] px-3 py-2.5 text-[13px] font-semibold text-[#0A0A0A] mb-2.5"
          value={nameEn}
          onChangeText={setNameEn}
          placeholder="Name (English)"
          placeholderTextColor={colors.gray400}
        />

        {/* ── Description fields ── */}
        <Text className="text-[9px] font-extrabold tracking-[1px] text-[#9E9E9E] mb-1">BESKRIVNING · SVENSKA</Text>
        <TextInput
          className="bg-[#F7F7F9] rounded-xl border border-black/[0.04] px-3 py-2.5 text-[13px] text-[#0A0A0A] min-h-[52px] mb-2.5"
          style={{ textAlignVertical: 'top' }}
          value={descSv}
          onChangeText={setDescSv}
          placeholder="Beskrivning (svenska)"
          placeholderTextColor={colors.gray400}
          multiline
        />

        <Text className="text-[9px] font-extrabold tracking-[1px] text-[#9E9E9E] mb-1">BESKRIVNING · ENGELSKA</Text>
        <TextInput
          className="bg-[#F7F7F9] rounded-xl border border-black/[0.04] px-3 py-2.5 text-[13px] text-[#0A0A0A] min-h-[52px] mb-2.5"
          style={{ textAlignVertical: 'top' }}
          value={descEn}
          onChangeText={setDescEn}
          placeholder="Description (English)"
          placeholderTextColor={colors.gray400}
          multiline
        />

        {/* ── Price field ── */}
        <Text className="text-[9px] font-extrabold tracking-[1px] text-[#9E9E9E] mb-1">PRIS</Text>
        <View className="flex-row items-center bg-[#F7F7F9] rounded-xl border border-black/[0.04] px-3">
          <TextInput
            className="flex-1 py-2.5 text-[13px] font-bold text-[#0A0A0A]"
            value={priceSe}
            onChangeText={setPriceSe}
            placeholder="0"
            placeholderTextColor={colors.gray400}
            keyboardType="numeric"
          />
          <Text className="text-[10px] font-extrabold tracking-[0.5px] text-[#9E9E9E]">SEK</Text>
        </View>

        {/* ── Actions ── */}
        <View className="flex-row items-center justify-end gap-2 mt-3">
          {saveState === 'success' && !dirty && (
            <View className="flex-row items-center gap-1 bg-[#22C55E]/[0.07] border border-[#22C55E]/[0.15] rounded-full px-2.5 py-1.5">
              <Ionicons name="checkmark-circle" size={11} color="#22C55E" />
              <Text className="text-[10px] font-extrabold text-[#22C55E]">Sparat</Text>
            </View>
          )}
          {saveState === 'error' && (
            <View className="flex-row items-center gap-1 bg-[#E8001C]/[0.06] border border-[#E8001C]/[0.15] rounded-full px-2.5 py-1.5">
              <Ionicons name="alert-circle" size={11} color="#E8001C" />
              <Text className="text-[10px] font-extrabold text-[#E8001C]">Kunde inte spara</Text>
            </View>
          )}
          <TouchableOpacity
            className={`py-2.5 px-4 rounded-xl min-w-[80px] items-center justify-center ${
              (!dirty || saving) ? 'bg-[#EDEDF0]' : 'bg-[#6366F1]'
            }`}
            style={!dirty || saving ? undefined : {
              shadowColor: '#6366F1',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
            onPress={handleSave}
            disabled={!dirty || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#6366F1" size="small" />
            ) : (
              <Text className={`text-[11px] font-extrabold tracking-[0.5px] ${(!dirty || saving) ? 'text-[#9E9E9E]' : 'text-white'}`}>
                SPARA
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
