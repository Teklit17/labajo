import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useLang } from '../i18n/LangContext';
import { useCountry } from '../i18n/CountryContext';
import { fetchBookingsByPhone, cancelBooking, deleteBookingsByPhone, orderNumber, type Booking } from '../firebase/bookings';
import { getSubscriberMonthlyUsage } from '../firebase/subscription';
import { deletePin } from '../firebase/pin';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'OrderDetails'>;

const PKG_ICON: Record<string, string> = {
  quick: '⚡',
  standard: '✦',
  premium: '★',
  subscription: '♾️',
};

export default function OrderDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { lang } = useLang();
  const { fmt } = useCountry();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; remaining: number } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await fetchBookingsByPhone(params.phone);
      setBookings(all.filter((b) => b.status !== 'cancelled'));
      const hasSub = all.some((b) => b.type === 'subscription');
      if (hasSub) {
        setUsage(await getSubscriberMonthlyUsage(params.phone));
      } else {
        setUsage(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.phone]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setCancellingId(null);
      setConfirmingId(null);
    }
  }

  function handleEdit(b: Booking) {
    navigation.navigate('Booking', {
      packageId: b.packageId,
      orderWash: b.type === 'subscription',
      editBookingId: b.id,
      prefillPhone: b.phone,
      prefillName: b.name,
      prefillAddress: b.address,
      prefillDate: b.date,
      prefillTime: b.time,
    });
  }

  async function handleDeleteMyData() {
    setDeleting(true);
    try {
      await deleteBookingsByPhone(params.phone);
      await deletePin(params.phone);
      setBookings([]);
      setDeleted(true);
      setConfirmingDelete(false);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  function handleOrderNextWash() {
    const lastProfile = bookings.find((b) => !!b.address);
    navigation.navigate('Booking', {
      packageId: 'subscription',
      orderWash: true,
      prefillPhone: params.phone,
      prefillName: lastProfile?.name,
      prefillAddress: lastProfile?.address,
    });
  }

  const isEnrollment = (b: Booking) => b.type === 'subscription' && b.kind !== 'scheduled' && b.kind !== 'wash';
  const isSv = lang === 'sv';

  const activeCount = bookings.filter((b) => b.status === 'pending' && !isEnrollment(b)).length;
  const doneCount = bookings.filter((b) => b.status === 'completed').length;

  const enrollmentBooking = bookings.find(isEnrollment) ?? null;
  const hasSubscription = !!enrollmentBooking;
  const hasScheduledWash = bookings.some(
    (b) => b.type === 'subscription' && b.kind === 'scheduled' && b.status === 'pending'
  );
  const visibleBookings = bookings.filter((b) => !isEnrollment(b));

  const now = new Date();
  const nextCycleStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysLeftInCycle = Math.ceil((nextCycleStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <LinearGradient colors={['#0A0A0A', '#150202', '#0A0A0A']} style={styles.header}>
        <View style={styles.headerBlob} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={colors.red} />
          <Text style={styles.backTxt}>{isSv ? 'Tillbaka' : 'Back'}</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={styles.headerIconBox}>
            <Ionicons name="document-text" size={20} color={colors.red} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{isSv ? 'ORDERDETALJER' : 'ORDER DETAILS'}</Text>
            <View style={styles.headerPhoneRow}>
              <Ionicons name="call" size={11} color="rgba(255,255,255,0.4)" />
              <Text style={styles.headerPhone}>{params.phone}</Text>
            </View>
          </View>
        </View>

        {!loading && bookings.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statChipVal}>{activeCount}</Text>
              <Text style={styles.statChipLbl}>{isSv ? 'Aktiva' : 'Active'}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipVal}>{doneCount}</Text>
              <Text style={styles.statChipLbl}>{isSv ? 'Avklarade' : 'Completed'}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipVal}>{bookings.length}</Text>
              <Text style={styles.statChipLbl}>{isSv ? 'Totalt' : 'Total'}</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />}
      >
        {!loading && hasSubscription && usage && (
          <LinearGradient
            colors={[colors.red, '#7a000e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subCard}
          >
            <View style={styles.subTopRow}>
              <View style={styles.subTitleGroup}>
                <View style={styles.subIconBox}>
                  <Ionicons name="infinite" size={16} color="#fff" />
                </View>
                <View>
                  <Text style={styles.subTitle}>{isSv ? 'DITT ABONNEMANG' : 'YOUR SUBSCRIPTION'}</Text>
                  {enrollmentBooking && (
                    <Text style={styles.subOrderNo}>#{orderNumber(enrollmentBooking.id)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.subCycleBadge}>
                <Ionicons name="time-outline" size={11} color="#fff" />
                <Text style={styles.subCycleTxt}>
                  {isSv ? `${daysLeftInCycle} dagar kvar` : `${daysLeftInCycle} days left`}
                </Text>
              </View>
            </View>

            <View style={styles.subUsageBlock}>
              <Text style={styles.subUsageBig}>{usage.remaining}</Text>
              <Text style={styles.subUsageTxt}>
                {isSv
                  ? `av 4 tvättar kvar denna månad`
                  : `of 4 washes left this month`}
              </Text>
            </View>

            <View style={styles.subPillsRow}>
              {[1, 2, 3, 4].map((n) => {
                const used = n <= usage.used;
                return (
                  <View key={n} style={[styles.subPill, used && styles.subPillUsed]}>
                    <Ionicons
                      name={used ? 'checkmark-circle' : 'ellipse-outline'}
                      size={13}
                      color={used ? '#fff' : 'rgba(255,255,255,0.5)'}
                    />
                  </View>
                );
              })}
            </View>

            {usage.remaining > 0 && daysLeftInCycle <= 7 && (
              <View style={styles.subWarnRow}>
                <Ionicons name="alert-circle" size={13} color="#fff" />
                <Text style={styles.subWarnTxt}>
                  {isSv
                    ? 'Dina outnyttjade tvättar följer inte med till nästa månad.'
                    : "Unused washes don't carry over to next month."}
                </Text>
              </View>
            )}
            {usage.remaining > 0 && !hasScheduledWash && (
              <TouchableOpacity style={styles.subOrderBtn} onPress={handleOrderNextWash} activeOpacity={0.85}>
                <Ionicons name="calendar" size={14} color={colors.red} />
                <Text style={styles.subOrderBtnTxt}>{isSv ? 'BOKA NÄSTA TVÄTT' : 'ORDER NEXT WASH'}</Text>
              </TouchableOpacity>
            )}
            {usage.remaining === 0 && (
              <View style={styles.subDoneRow}>
                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                <Text style={styles.subDoneTxt}>
                  {isSv ? 'Alla tvättar använda denna månad' : 'All washes used this month'}
                </Text>
              </View>
            )}
          </LinearGradient>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.red} size="large" />
            <Text style={styles.loadingTxt}>{isSv ? 'Hämtar bokningar…' : 'Loading bookings…'}</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="document-text-outline" size={30} color={colors.red} />
            </View>
            <Text style={styles.emptyTitle}>{isSv ? 'Inga bokningar hittades' : 'No bookings found'}</Text>
            <Text style={styles.emptySub}>
              {isSv ? 'Den här bokningen kan ha avbokats eller så finns inget aktivt hos oss.' : 'This booking may have been cancelled, or there is nothing active on file.'}
            </Text>
          </View>
        ) : visibleBookings.length === 0 ? (
          <Text style={styles.noWashesYet}>
            {isSv ? 'Inga enskilda tvättar bokade än.' : 'No individual washes booked yet.'}
          </Text>
        ) : (
          visibleBookings.map((b) => {
            const enrollment = isEnrollment(b);
            const done = b.status === 'completed';
            return (
              <View key={b.id} style={styles.card}>
                {b.type === 'subscription' && (
                  <LinearGradient
                    colors={[colors.red, '#7a000e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cardAccent}
                  />
                )}

                <View style={styles.cardTop}>
                  <View style={styles.cardIconBox}>
                    <Text style={styles.cardIconTxt}>{PKG_ICON[b.packageId] ?? '🚗'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardPkg}>{b.packageName}</Text>
                      <View style={styles.orderNoBadge}>
                        <Text style={styles.orderNoTxt}>#{orderNumber(b.id)}</Text>
                      </View>
                    </View>
                  </View>
                  {!enrollment && (
                    <Text style={styles.cardPrice}>{fmt(b.price)}</Text>
                  )}
                </View>

                {!enrollment && (
                  <View style={styles.metaBlock}>
                    <View style={styles.metaRow}>
                      <View style={styles.metaIconBox}>
                        <Ionicons name="calendar-outline" size={13} color={colors.red} />
                      </View>
                      <Text style={styles.metaTxt}>
                        {new Date(b.date + 'T00:00:00').toLocaleDateString(isSv ? 'sv-SE' : 'en-US', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })}
                        {'  ·  '}
                        {b.time}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.metaIconBox}>
                        <Ionicons name="location-outline" size={13} color={colors.red} />
                      </View>
                      <Text style={styles.metaTxt} numberOfLines={2}>{b.address}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.metaIconBox}>
                        <Ionicons name="person-outline" size={13} color={colors.red} />
                      </View>
                      <Text style={styles.metaTxt}>{b.name}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.metaIconBox}>
                        <Ionicons name="call-outline" size={13} color={colors.red} />
                      </View>
                      <Text style={styles.metaTxt}>{b.phone}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.metaIconBox}>
                        <Ionicons name="card-outline" size={13} color={colors.red} />
                      </View>
                      <Text style={styles.metaTxt}>
                        {b.payMethod === 'card'
                          ? (isSv ? 'Kort' : 'Card')
                          : b.payMethod === 'swish'
                          ? 'Swish'
                          : (isSv ? 'Kontant' : 'Cash')}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.cardBottomRow}>
                  <View style={[styles.statusPill, done && styles.statusPillDone]}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'time-outline'}
                      size={12}
                      color={done ? '#178A43' : colors.red}
                    />
                    <Text style={[styles.statusTxt, done && styles.statusTxtDone]}>
                      {done ? (isSv ? 'Avklarad' : 'Completed') : (isSv ? 'Väntar' : 'Pending')}
                    </Text>
                  </View>

                  {b.status === 'pending' && !enrollment && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(b)} activeOpacity={0.8}>
                        <Ionicons name="create-outline" size={14} color={colors.black} />
                        <Text style={styles.editBtnTxt}>{isSv ? 'ÄNDRA' : 'EDIT'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setConfirmingId(b.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelBtnTxt}>{isSv ? 'AVBOKA' : 'CANCEL'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {confirmingId === b.id && (
                  <View style={styles.confirmCancelBox}>
                    <Text style={styles.confirmCancelTxt}>
                      {isSv
                        ? 'Är du säker på att du vill avboka? Detta kan inte ångras.'
                        : 'Are you sure you want to cancel? This cannot be undone.'}
                    </Text>
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => setConfirmingId(null)}
                        disabled={cancellingId === b.id}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.editBtnTxt}>{isSv ? 'NEJ' : 'NO'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                        activeOpacity={0.8}
                      >
                        {cancellingId === b.id ? (
                          <ActivityIndicator color={colors.red} size="small" />
                        ) : (
                          <Text style={styles.cancelBtnTxt}>{isSv ? 'JA, AVBOKA' : 'YES, CANCEL'}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        {!loading && (
          <View style={styles.dangerZone}>
            {deleted ? (
              <View style={styles.deletedBox}>
                <Ionicons name="checkmark-circle" size={20} color="#178A43" />
                <Text style={styles.deletedTxt}>
                  {isSv
                    ? 'Din data har raderats.'
                    : 'Your data has been deleted.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.dangerHeaderRow}>
                  <Ionicons name="trash-outline" size={15} color={colors.red} />
                  <Text style={styles.dangerTitle}>
                    {isSv ? 'Radera min data' : 'Delete my data'}
                  </Text>
                </View>
                <Text style={styles.dangerSub}>
                  {isSv
                    ? 'Detta raderar permanent alla dina bokningar och din PIN-kod från våra system. Detta kan inte ångras.'
                    : 'This permanently deletes all your bookings and your PIN code from our systems. This cannot be undone.'}
                </Text>

                {!confirmingDelete ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => setConfirmingDelete(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnTxt}>
                      {isSv ? 'RADERA MIN DATA' : 'DELETE MY DATA'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.confirmCancelBox}>
                    <Text style={styles.confirmCancelTxt}>
                      {isSv
                        ? 'Är du helt säker? All bokningshistorik och din PIN-kod raderas permanent.'
                        : 'Are you absolutely sure? All booking history and your PIN code will be permanently deleted.'}
                    </Text>
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => setConfirmingDelete(false)}
                        disabled={deleting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.editBtnTxt}>{isSv ? 'NEJ' : 'NO'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleDeleteMyData}
                        disabled={deleting}
                        activeOpacity={0.8}
                      >
                        {deleting ? (
                          <ActivityIndicator color={colors.red} size="small" />
                        ) : (
                          <Text style={styles.cancelBtnTxt}>
                            {isSv ? 'JA, RADERA' : 'YES, DELETE'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F2F2F2' },

  /* ── SUBSCRIPTION SUMMARY ── */
  subCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.red,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  subTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  subTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  subOrderNo: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 1 },
  subCycleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  subCycleTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  subUsageBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  subUsageBig: { color: '#fff', fontSize: 40, fontWeight: '900', lineHeight: 42 },
  subUsageTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  subPillsRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  subPill: {
    flex: 1, height: 34, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  subPillUsed: { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.5)' },
  subWarnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subWarnTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 11, flex: 1, lineHeight: 15 },
  subOrderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: 12, marginTop: 4,
  },
  subOrderBtnTxt: { color: colors.red, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  subDoneRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.lg, paddingVertical: 12, marginTop: 4,
  },
  subDoneTxt: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  noWashesYet: { color: colors.gray400, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg },

  /* ── HEADER ── */
  header: { paddingTop: 56, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, overflow: 'hidden' },
  headerBlob: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: colors.red, opacity: 0.06, top: -60, right: -60,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.lg, alignSelf: 'flex-start' },
  backTxt: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerIconBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(232,0,28,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: 2 },
  headerPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  headerPhone: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  statChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
  },
  statChipVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statChipLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2, letterSpacing: 0.5 },

  scroll: { flex: 1 },

  /* ── LOADING / EMPTY ── */
  loadingBox: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  loadingTxt: { color: colors.gray400, fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: spacing.xxl, gap: 6, paddingHorizontal: spacing.lg },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(232,0,28,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.black },
  emptySub: { fontSize: 13, color: colors.gray400, textAlign: 'center', lineHeight: 19, maxWidth: 280 },

  /* ── CARD ── */
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    gap: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIconBox: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center',
  },
  cardIconTxt: { fontSize: 20 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardPkg: { fontSize: 16, fontWeight: '900', color: colors.black },
  orderNoBadge: {
    backgroundColor: '#F4F4F4',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  orderNoTxt: { fontSize: 10, fontWeight: '800', color: colors.gray600, letterSpacing: 0.5 },
  cardPrice: { fontSize: 16, fontWeight: '900', color: colors.red },

  metaBlock: { gap: 8, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: '#F2F2F2' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaIconBox: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(232,0,28,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  metaTxt: { fontSize: 13, color: colors.gray600, flex: 1, fontWeight: '500' },

  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(232,0,28,0.08)',
    borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  statusPillDone: { backgroundColor: 'rgba(23,138,67,0.1)' },
  statusTxt: { fontSize: 11, fontWeight: '800', color: colors.red, letterSpacing: 0.3 },
  statusTxtDone: { color: '#178A43' },

  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: colors.black,
    borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 14,
  },
  editBtnTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.black },
  cancelBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.red,
    borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 14,
    minWidth: 76,
  },
  cancelBtnTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.red },

  confirmCancelBox: {
    backgroundColor: 'rgba(232,0,28,0.05)',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  confirmCancelTxt: { fontSize: 12, color: colors.gray600, lineHeight: 18 },

  /* ── DANGER ZONE ── */
  dangerZone: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,0,28,0.15)',
    gap: spacing.sm,
  },
  dangerHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dangerTitle: { fontSize: 13, fontWeight: '800', color: colors.black },
  dangerSub: { fontSize: 12, color: colors.gray400, lineHeight: 18 },
  deleteBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  deleteBtnTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.red },
  deletedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
  },
  deletedTxt: { fontSize: 13, color: colors.gray800, fontWeight: '600', flex: 1 },
});
