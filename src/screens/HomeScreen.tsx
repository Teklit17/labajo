import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Dimensions,
  Linking,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { colors, spacing, radius } from "../theme";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useLang } from "../i18n/LangContext";
import { useCountry } from "../i18n/CountryContext";
import LangSwitcher from "../components/LangSwitcher";
import {
  fetchReviews,
  addReview,
  findAdminByPhone,
  getSubscriberMonthlyUsage,
  type Review,
} from "../firebase/subscription";
import {
  fetchBookingsByPhone,
  cancelBooking,
  type Booking,
} from "../firebase/bookings";
import { verifyPin } from "../firebase/pin";
import { useSubscription } from "../context/SubscriptionContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get("window");

const PKG_META = [
  { emoji: "⚡", accent: "#E8001C" },
  { emoji: "✦", accent: "#E8001C" },
  { emoji: "👑", accent: "#0A0A0A" },
  { emoji: "♾️", accent: "#1c9ce8" },
];

function PriceCard({
  meta,
  name,
  desc,
  price,
  featured,
  buttonLabel,
  onPress,
  popularLabel,
  basis,
}: {
  meta: (typeof PKG_META)[number];
  name: string;
  desc: string;
  price: string;
  featured?: boolean;
  buttonLabel: string;
  onPress: () => void;
  popularLabel: string;
  basis: string;
}) {
  const features = desc
    .split(/[+,·]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <View
      className={`grow ${basis} max-w-[220px] rounded-2xl bg-white px-4 pt-5 pb-4 flex-col ${
        featured ? "border-2" : "border border-[#EDEDED]"
      }`}
      style={{
        borderColor: featured ? meta.accent : "#EDEDED",
        shadowColor: "#000",
        shadowOpacity: featured ? 0.1 : 0.05,
        shadowRadius: featured ? 16 : 10,
        shadowOffset: { width: 0, height: featured ? 8 : 5 },
        elevation: featured ? 6 : 2,
      }}
    >
      {featured && (
        <View
          className="self-center rounded-full px-2.5 py-1 mb-2.5"
          style={{ backgroundColor: meta.accent }}
        >
          <Text className="text-white text-[9px] font-black tracking-wider">
            {popularLabel}
          </Text>
        </View>
      )}

      <View className="items-center">
        <Text className="text-[22px] mb-1.5">{meta.emoji}</Text>
        <Text className="text-black text-[13px] font-black tracking-tight text-center">
          {name}
        </Text>
        <Text
          className="text-2xl font-black mt-1.5"
          style={{ color: featured ? meta.accent : colors.black }}
        >
          {price}
        </Text>
      </View>

      <View className="w-full gap-1.5 mt-3.5 mb-4 grow">
        {features.map((f, idx) => (
          <View key={idx} className="flex-row items-center gap-1.5">
            <Ionicons name="checkmark" size={13} color={meta.accent} />
            <Text className="text-[10.5px] text-gray-600 flex-1" numberOfLines={2}>
              {f}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        className="w-full web:hover:opacity-90 web:transition-opacity"
      >
        {featured ? (
          <View
            className="rounded-full py-2.5 items-center"
            style={{ backgroundColor: meta.accent }}
          >
            <Text className="text-white text-[10.5px] font-black tracking-wider">
              {buttonLabel}
            </Text>
          </View>
        ) : (
          <View
            className="rounded-full py-2.5 items-center border"
            style={{ borderColor: meta.accent }}
          >
            <Text
              className="text-[10.5px] font-black tracking-wider"
              style={{ color: meta.accent }}
            >
              {buttonLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function SectionLabel({ text, light }: { text: string; light?: boolean }) {
  return (
    <View style={sl.row}>
      <View style={sl.line} />
      <Text style={[sl.txt, light && sl.light]}>{text}</Text>
      <View style={sl.line} />
    </View>
  );
}

function timeAgo(iso: string | undefined, lang: string): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const sv = lang === "sv";
  if (days < 1) return sv ? "Idag" : "Today";
  if (days < 30) return sv ? `${days} dagar sedan` : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return sv ? `${months} mån sedan` : `${months} months ago`;
  const years = Math.floor(months / 12);
  return sv ? `${years} år sedan` : `${years} years ago`;
}

const AVATAR_PALETTES: readonly (readonly [string, string])[] = [
  ["#E8001C", "#c4001a"],
  ["#0072FF", "#0047AB"],
  ["#8A2BE2", "#4B0082"],
  ["#0F9B6E", "#0B6E4F"],
  ["#D9480F", "#A83A0C"],
  ["#B8860B", "#8a640a"],
];

function avatarPalette(name: string): readonly [string, string] {
  const sum = name
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
}

function StarRow({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row gap-[1px]">
      {Array.from({ length: 5 }).map((_, s) => (
        <Ionicons
          key={s}
          name={
            s + 1 <= Math.round(rating) ? "star" : "star-outline"
          }
          size={size}
          color="#FFB800"
        />
      ))}
    </View>
  );
}

function ReviewCard({
  review: r,
  lang,
  last,
}: {
  review: Review | { name: string; text: string };
  lang: string;
  last?: boolean;
}) {
  const rating = "rating" in r ? r.rating : 5;
  const createdAt = "createdAt" in r ? r.createdAt : undefined;
  const palette = avatarPalette(r.name);
  return (
    <View
      className={`py-5 ${last ? "" : "border-b border-[#F0F0F0]"}`}
    >
      <View className="flex-row items-start gap-3">
        <LinearGradient
          colors={palette}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            className="text-white font-black text-[16px]"
            style={{ lineHeight: 19, textAlign: "center" }}
          >
            {r.name.trim()[0]?.toUpperCase()}
          </Text>
        </LinearGradient>
        <View className="flex-1">
          <Text className="text-[14px] font-black text-black">{r.name}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <StarRow rating={rating} />
            <Text className="text-[11px] font-bold text-gray-400">
              {rating.toFixed(1)}
            </Text>
            {createdAt ? (
              <>
                <Text className="text-[11px] text-gray-300">·</Text>
                <Text className="text-[11px] text-gray-400">
                  {timeAgo(createdAt, lang)}
                </Text>
              </>
            ) : null}
          </View>
          <Text className="text-[13.5px] text-gray-700 leading-[21px] mt-2.5">
            {r.text}
          </Text>
          {"reply" in r && r.reply ? (
            <View className="bg-[#FAFAFA] rounded-xl border-l-[3px] border-l-[#E8001C] p-3.5 mt-3.5">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Ionicons
                  name="storefront-outline"
                  size={12}
                  color={colors.red}
                />
                <Text className="text-[10px] font-black text-[#E8001C] tracking-wide uppercase">
                  {lang === "sv" ? "Svar från Labago" : "Reply from Labago"}
                </Text>
              </View>
              <Text className="text-[12.5px] text-gray-600 leading-[19px]">
                {r.reply}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t, lang } = useLang();
  const { config, priceFor, fmt } = useCountry();
  const {
    phone,
    subscription,
    loading: subLoading,
    checkPhone,
    clearPhone,
  } = useSubscription();
  const [liveReviews, setLiveReviews] = useState<Review[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const [emptyInput, setEmptyInput] = useState(false);
  const [wrongPin, setWrongPin] = useState(false);
  const [washUsage, setWashUsage] = useState<{
    used: number;
    remaining: number;
  } | null>(null);
  const [nextWash, setNextWash] = useState<Booking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [lastProfile, setLastProfile] = useState<{
    name: string;
    address: string;
  } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  function loadReviews() {
    fetchReviews()
      .then(setLiveReviews)
      .catch(() => {});
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleSubmitReview() {
    if (!reviewName.trim() || !reviewText.trim()) return;
    setSubmittingReview(true);
    setReviewError(false);
    try {
      await addReview({
        name: reviewName.trim(),
        phone: phone ?? "",
        rating: reviewRating,
        text: reviewText.trim(),
      });
      loadReviews();
      setReviewName("");
      setReviewText("");
      setReviewRating(5);
      setReviewSubmitted(true);
      setShowReviewForm(false);
    } catch (e) {
      setReviewError(true);
    } finally {
      setSubmittingReview(false);
    }
  }

  useEffect(() => {
    if (!subscription) {
      setWashUsage(null);
      return;
    }
    getSubscriberMonthlyUsage(phone)
      .then(setWashUsage)
      .catch(() => setWashUsage(null));
  }, [subscription, phone]);

  useEffect(() => {
    if (phone) {
      loadMyBookings(phone);
    }
  }, [phone]);

  const displayReviews = liveReviews.length > 0 ? liveReviews : t.reviews;
  const avgRating = (
    displayReviews.reduce(
      (sum, r) => sum + ("rating" in r ? (r as Review).rating : 5),
      0,
    ) / Math.max(displayReviews.length, 1)
  ).toFixed(1);

  async function loadMyBookings(p: string): Promise<Booking[]> {
    try {
      const all = await fetchBookingsByPhone(p);
      const active = all.filter((b) => b.status !== "cancelled");
      setNextWash(
        all.find(
          (b) =>
            b.type === "subscription" &&
            b.kind === "scheduled" &&
            b.status === "pending",
        ) ?? null,
      );
      const withAddress = all.find((b) => !!b.address);
      setLastProfile(
        withAddress
          ? { name: withAddress.name, address: withAddress.address }
          : null,
      );
      return active;
    } catch (err) {
      setNextWash(null);
      setLastProfile(null);
      return [];
    }
  }

  async function handleCheckPhone() {
    if (!phoneInput.trim()) {
      setEmptyInput(true);
      return;
    }
    setEmptyInput(false);
    setChecking(true);
    setNotFound(false);
    setLookupError(false);
    setWrongPin(false);
    try {
      const admin = await findAdminByPhone(phoneInput.trim());
      if (admin) {
        navigation.navigate("Admin");
        return;
      }
      if (!pinInput.trim()) {
        setWrongPin(true);
        return;
      }
      const pinOk = await verifyPin(phoneInput.trim(), pinInput.trim());
      if (!pinOk) {
        setWrongPin(true);
        return;
      }
      const result = await checkPhone(phoneInput.trim());
      const active = await loadMyBookings(phoneInput.trim());
      if (result || active.length > 0) {
        navigation.navigate("OrderDetails", { phone: phoneInput.trim() });
        return;
      }
      setNotFound(true);
    } catch (err) {
      setLookupError(true);
    } finally {
      setChecking(false);
    }
  }

  async function handleCancelBooking(id: string) {
    setCancellingId(id);
    try {
      await cancelBooking(id);
      if (nextWash?.id === id) setNextWash(null);
    } catch (err) {
      console.error(err);
    } finally {
      setCancellingId(null);
    }
  }

  function handleForgotPin() {
    const phoneText = phoneInput.trim()
      ? (lang === "sv"
          ? `Mitt telefonnummer är ${phoneInput.trim()}.`
          : `My phone number is ${phoneInput.trim()}.`)
      : "";
    const message =
      (lang === "sv"
        ? "Hej! Jag har glömt min PIN-kod och skulle vilja få den igen. "
        : "Hi! I forgot my PIN code and would like to get it again. ") + phoneText;
    const separator = Platform.OS === "ios" ? "&" : "?";
    Linking.openURL(`sms:+46790292208${separator}body=${encodeURIComponent(message)}`);
  }

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 0 }}
    >
      <StatusBar barStyle="light-content" />

      {/* ══════════════════════════
          HERO
      ══════════════════════════ */}
      <LinearGradient
        colors={["#0A0A0A", "#150202", "#0A0A0A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
        <View style={styles.heroGridLine1} />
        <View style={styles.heroGridLine2} />

        {/* top row — lang switcher left, live badge right */}
        <View style={styles.heroTopRow}>
          <LangSwitcher />
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>TILLGÄNGLIG NU</Text>
          </View>
        </View>


        {/* Eyebrow pill */}
        <View className="self-center flex-row items-center gap-1.5 bg-white/[0.06] border border-white/[0.1] rounded-full px-3.5 py-1.5 mb-4">
          <Ionicons name="sparkles" size={11} color={colors.red} />
          <Text className="text-[#E8001C] text-[10.5px] font-black tracking-[3px] text-center">
            {t.eyebrow}
          </Text>
        </View>

        {/* Headline */}
        <Text className="text-white text-[26px] leading-[32px] font-black text-center mb-3 max-w-[320px] self-center tracking-tight">
          {t.heroSub}
        </Text>

        {/* CTA row */}
        <View className="flex-row gap-2.5 mb-5">
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => navigation.navigate("Booking", {})}
            className="flex-1 rounded-2xl overflow-hidden web:hover:opacity-95 web:hover:scale-[1.015] web:transition-all"
            style={{
              shadowColor: colors.red,
              shadowOpacity: 0.4,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 8,
            }}
          >
            <LinearGradient
              colors={[colors.red, "#ff2d3f", "#c4001a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 18,
                width: "100%",
              }}
            >
              <Text
                className="text-white font-black text-[14px] tracking-[1.5px]"
                style={{ marginRight: 10 }}
              >
                {t.bookNow}
              </Text>
              <View className="bg-white/20 rounded-full p-1">
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Linking.openURL("tel:+46790292208")}
            className="w-[54px] items-center justify-center rounded-2xl bg-white/[0.07] border border-white/[0.12] web:hover:bg-white/[0.12] web:transition-colors"
          >
            <Ionicons name="call" size={19} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Location strip */}
        <View className="w-full flex-row items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3.5 py-2.5 mb-5">
          <Ionicons name="location-sharp" size={13} color={colors.red} />
          <Text
            className="text-white/70 text-[12px] leading-[18px] flex-1 font-semibold tracking-wide"
            numberOfLines={2}
          >
            {config.area}
          </Text>
        </View>

        {/* Stats */}
        <View
          className="bg-white/[0.045] border border-white/[0.1] rounded-2xl overflow-hidden"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <LinearGradient
            colors={[colors.red, "#ff2d3f", colors.red]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 2, opacity: 0.6 }}
          />
          <View className="flex-row py-5">
            {[
              { icon: "🚗", v: "80+", l: t.statCarsWashed },
              { icon: "⭐", v: avgRating, l: "Rating" },
              { icon: "😊", v: "100%", l: t.statSatisfaction },
            ].map((s, i) => (
              <React.Fragment key={s.v}>
                <View className="flex-1 items-center gap-1.5 web:hover:opacity-80 web:transition-opacity">
                  <View className="bg-[#E8001C]/[0.12] rounded-full w-9 h-9 items-center justify-center mb-0.5">
                    <Text className="text-[17px]">{s.icon}</Text>
                  </View>
                  <Text className="text-white text-[22px] font-black tracking-[0.5px]">
                    {s.v}
                  </Text>
                  <Text className="text-white/35 text-[9px] tracking-[1.5px] uppercase font-bold">
                    {s.l}
                  </Text>
                </View>
                {i < 2 && <View className="w-px bg-white/[0.1] my-2" />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </LinearGradient>

      {/* ══════════════════════════
          PACKAGES
      ══════════════════════════ */}
      <View className="px-6 pt-8 pb-8 bg-white">
        <SectionLabel text={t.packagesTitle} />

        <View className="flex-row flex-wrap gap-3 pt-3 justify-center">
          {t.packages.map((pkg, i) => (
            <PriceCard
              key={pkg.id}
              meta={PKG_META[i]}
              name={pkg.name}
              desc={pkg.desc}
              price={fmt(priceFor(pkg.id))}
              featured={i === 1}
              buttonLabel={t.bookNow}
              popularLabel={lang === "sv" ? "MEST POPULÄR" : "MOST POPULAR"}
              basis={width >= 700 ? "basis-[22%]" : "basis-[47%]"}
              onPress={() =>
                navigation.navigate("Booking", { packageId: pkg.id })
              }
            />
          ))}
        </View>
      </View>

      {/* ══════════════════════════
          SUBSCRIPTION LOOKUP
      ══════════════════════════ */}
      <View className="px-6 pt-10">
        <SectionLabel
          text={lang === "sv" ? "ORDERDETALJER" : "ORDER DETAILS"}
        />
        {subLoading ? (
          <ActivityIndicator color={colors.red} />
        ) : (
          <View className="bg-white rounded-[28px] p-7 border border-[#EFEFEF] shadow-[0_8px_28px_rgba(0,0,0,0.07)] gap-5">
            <View className="items-center gap-2">
              <LinearGradient
                colors={[colors.red, "#8f0012"]}
                className="items-center justify-center overflow-hidden"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  shadowColor: colors.red,
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={26}
                  color="#fff"
                  style={{ textAlign: "center", textAlignVertical: "center", marginTop: 10 }}
                />
              </LinearGradient>
              <Text className="text-lg font-black text-black tracking-[0.2px] text-center">
                {lang === "sv" ? "Se orderdetaljer" : "See order details"}
              </Text>
              <Text className="text-[11px] text-gray-400 leading-4 text-center">
                {lang === "sv"
                  ? "Mobilnummer + PIN-kod från bokningen"
                  : "Phone number + PIN from your booking"}
              </Text>
            </View>

            <View className="gap-3">
              <View>
                <Text className="text-[11px] font-bold text-gray-500 tracking-[0.4px] mb-1.5 ml-0.5">
                  {lang === "sv" ? "TELEFONNUMMER" : "PHONE NUMBER"}
                </Text>
                <View className="flex-row items-center bg-[#FAFAFA] rounded-2xl border border-[#E8E8E8] overflow-hidden web:focus-within:border-[#E8001C] web:focus-within:bg-white web:transition-colors">
                  <View className="px-3.5 py-3.5 flex-row items-center gap-1.5 border-r border-[#ECECEC]">
                    <Text style={{ fontSize: 16 }}>🇸🇪</Text>
                  </View>
                  <TextInput
                    className="flex-1 text-[15px] font-medium text-black px-4 py-3.5 web:outline-none"
                    placeholder="+46 70 000 00 00"
                    placeholderTextColor={colors.gray400}
                    value={phoneInput}
                    onChangeText={(v) => {
                      setPhoneInput(v);
                      setNotFound(false);
                      setLookupError(false);
                      setEmptyInput(false);
                      setWrongPin(false);
                    }}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[11px] font-bold text-gray-500 tracking-[0.4px] mb-1.5 ml-0.5">
                  {lang === "sv" ? "PIN-KOD" : "PIN CODE"}
                </Text>
                <View className="flex-row items-center bg-[#FAFAFA] rounded-2xl border border-[#E8E8E8] overflow-hidden web:focus-within:border-[#E8001C] web:focus-within:bg-white web:transition-colors">
                  <View className="px-3.5 py-3.5 border-r border-[#ECECEC]">
                    <Ionicons name="key-outline" size={17} color={colors.gray600} />
                  </View>
                  <TextInput
                    className="flex-1 text-[15px] font-medium text-black px-4 py-3.5 web:outline-none tracking-[3px]"
                    placeholder={lang === "sv" ? "• • • •" : "• • • •"}
                    placeholderTextColor={colors.gray400}
                    value={pinInput}
                    onChangeText={(v) => {
                      setPinInput(v);
                      setWrongPin(false);
                    }}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    returnKeyType="done"
                    onSubmitEditing={handleCheckPhone}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleForgotPin}
              activeOpacity={0.7}
              className="flex-row items-center justify-center gap-1.5 self-center web:hover:opacity-70 web:transition-opacity -mt-1"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.gray600} />
              <Text className="text-gray-600 text-xs font-semibold">
                {lang === "sv" ? "Glömt din PIN-kod?" : "Forgot your PIN?"}
              </Text>
            </TouchableOpacity>

            {wrongPin && (
              <View className="flex-row items-center gap-2 bg-[#E8001C]/[0.08] rounded-2xl py-3 px-3.5">
                <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                <Text className="text-[#E8001C] text-xs font-medium flex-1 leading-4">
                  {lang === "sv"
                    ? "Fel telefonnummer eller PIN-kod."
                    : "Incorrect phone number or PIN code."}
                </Text>
              </View>
            )}
            {emptyInput && (
              <View className="flex-row items-center gap-2 bg-[#E8001C]/[0.08] rounded-2xl py-3 px-3.5">
                <Ionicons name="information-circle-outline" size={16} color={colors.red} />
                <Text className="text-[#E8001C] text-xs font-medium flex-1 leading-4">
                  {lang === "sv"
                    ? "Ange ett telefonnummer."
                    : "Please enter a phone number."}
                </Text>
              </View>
            )}
            {notFound && (
              <View className="flex-row items-center gap-2 bg-[#E8001C]/[0.08] rounded-2xl py-3 px-3.5">
                <Ionicons name="information-circle-outline" size={16} color={colors.red} />
                <Text className="text-[#E8001C] text-xs font-medium flex-1 leading-4">
                  {lang === "sv"
                    ? "Ingen bokning eller abonnemang hittades för detta nummer och PIN-kod."
                    : "No booking or subscription found for this number and PIN code."}
                </Text>
              </View>
            )}
            {lookupError && (
              <View className="flex-row items-center gap-2 bg-[#E8001C]/[0.08] rounded-2xl py-3 px-3.5">
                <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                <Text className="text-[#E8001C] text-xs font-medium flex-1 leading-4">
                  {lang === "sv"
                    ? "Kunde inte söka efter abonnemang. Försök igen."
                    : "Could not check subscription. Please try again."}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleCheckPhone}
              disabled={checking}
              activeOpacity={0.85}
              className="bg-black rounded-2xl overflow-hidden flex-row items-center web:hover:opacity-90 web:transition-opacity"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
              }}
            >
              <View className="flex-1 py-4 pl-5">
                {checking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-black text-[13px] tracking-[1.5px]">
                    {lang === "sv" ? "SE ORDERDETALJER" : "SEE ORDER DETAILS"}
                  </Text>
                )}
              </View>
              <View
                className="items-center justify-center"
                style={{ width: 52, height: 52, backgroundColor: colors.red, margin: 6, borderRadius: 12 }}
              >
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center justify-center gap-1.5">
              <Ionicons name="lock-closed-outline" size={11} color={colors.gray400} />
              <Text className="text-gray-400 text-[11px] font-medium">
                {lang === "sv"
                  ? "Privat & säkert · Inget lösenord"
                  : "Private & secure · No password"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ══════════════════════════
          HOW IT WORKS
      ══════════════════════════ */}
      <View className="mt-10 px-6 py-14 bg-[#0A0A0A] overflow-hidden relative">
        <View className="absolute w-[320px] h-[320px] rounded-full bg-[#E8001C] opacity-[0.05] -top-20 -right-24" />
        <View className="absolute w-[220px] h-[220px] rounded-full bg-[#E8001C] opacity-[0.03] bottom-0 -left-16" />

        <SectionLabel text={t.howTitle} light />
        <Text className="text-white/40 text-[13px] text-center leading-[19px] max-w-[300px] self-center mt-3 mb-10">
          {lang === "sv"
            ? "Fyra enkla steg — från bokning till skinande ren bil."
            : "Four simple steps — from booking to a spotless car."}
        </Text>

        <View className="px-1 relative">
          <View
            className="absolute bg-white/[0.12]"
            style={{ left: 21, top: 22, bottom: 22, width: 2 }}
          />
          {t.steps.map((step, i) => {
            const isLast = i === t.steps.length - 1;
            const icons = [
              "calendar-outline",
              "location-outline",
              "car-sport-outline",
              "card-outline",
            ] as const;
            return (
              <View
                key={i}
                className="flex-row items-start"
                style={{ marginBottom: isLast ? 0 : 14 }}
              >
                <LinearGradient
                  colors={[colors.red, "#c4001a"]}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: colors.red,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                  }}
                >
                  <Ionicons name={icons[i]} size={20} color="#fff" />
                </LinearGradient>

                <View
                  className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl"
                  style={{ padding: 16, marginLeft: 14 }}
                >
                  <Text className="text-[#E8001C] text-[11px] font-black tracking-widest mb-1">
                    {(lang === "sv" ? "STEG " : "STEP ") + String(i + 1).padStart(2, "0")}
                  </Text>
                  <Text className="text-white/90 text-[14px] leading-5 font-semibold">
                    {step}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ══════════════════════════
          WHY LABAGO
      ══════════════════════════ */}
      <View className="px-6 pt-12 pb-14 bg-[#0A0A0A] overflow-hidden relative">
        <View className="absolute w-[380px] h-[380px] rounded-full bg-[#E8001C] opacity-[0.06] -bottom-28 -left-28" />

        <SectionLabel text={t.whyTitle} light />
        <Text className="text-white/40 text-[13px] text-center leading-[19px] max-w-[320px] self-center mt-3 mb-8">
          {lang === "sv"
            ? "Enkelt, snabbt och pålitligt — så vi håller din bil skinande ren."
            : "Simple, fast and reliable — here's how we keep your car spotless."}
        </Text>

        <View className="flex-row flex-wrap gap-3">
          {t.whyItems.map((w, i) => (
            <View
              key={w.icon}
              className="grow basis-[47%] items-center bg-white/[0.035] border border-white/10 rounded-2xl px-4 py-4 web:hover:bg-white/[0.07] web:transition-colors web:cursor-default"
            >
              <Text className="text-[38px] mb-3">{w.icon}</Text>
              <Text className="text-sm font-black text-white mb-0.5 tracking-wide text-center">
                {w.title}
              </Text>
              <Text className="text-[12px] text-white/40 leading-[17px] text-center">
                {w.icon === "⭐"
                  ? lang === "sv"
                    ? `${avgRating} stjärnor från våra kunder.`
                    : `${avgRating} stars from our customers.`
                  : w.sub}
              </Text>
              <Text className="text-[11px] font-black text-white/15 mt-2">
                {String(i + 1).padStart(2, "0")}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ══════════════════════════
          REVIEWS
      ══════════════════════════ */}
      <View style={styles.reviewSection}>
        <SectionLabel text={t.reviewsTitle} />

        <View className="bg-white rounded-3xl p-6 mb-4 border border-[#EEEEEE] shadow-[0_2px_16px_rgba(0,0,0,0.05)] gap-5">
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons name="shield-checkmark" size={14} color="#0F9B6E" />
            <Text className="text-[10.5px] font-black text-[#0F9B6E] uppercase tracking-wider">
              {lang === "sv" ? "Verifierade omdömen" : "Verified reviews"}
            </Text>
          </View>
          <View className="flex-row items-center gap-7">
            <View className="items-center gap-1.5 pr-6 border-r border-[#F0F0F0]">
              <Text className="text-[46px] leading-[48px] font-black text-black">
                {avgRating}
              </Text>
              <View className="flex-row gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Ionicons
                    key={s}
                    name={s < Math.round(Number(avgRating)) ? "star" : "star-outline"}
                    size={14}
                    color="#FFB800"
                  />
                ))}
              </View>
              <Text className="text-[11px] text-gray-400 font-semibold">
                {lang === "sv"
                  ? `${displayReviews.length} betyg`
                  : `${displayReviews.length} ratings`}
              </Text>
            </View>

            <View className="flex-1 gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = displayReviews.filter(
                  (r) => ("rating" in r ? r.rating : 5) === star,
                ).length;
                const pct = displayReviews.length
                  ? (count / displayReviews.length) * 100
                  : 0;
                return (
                  <View key={star} className="flex-row items-center gap-2.5">
                    <Text className="text-[11px] font-bold text-gray-600 w-2">{star}</Text>
                    <View className="flex-1 h-2 rounded-full bg-[#F2F2F2] overflow-hidden">
                      <View
                        className="h-full rounded-full bg-[#E8001C] transition-all duration-500"
                        style={{ width: `${pct}%` as any }}
                      />
                    </View>
                    <Text className="text-[11px] text-gray-400 w-5 text-right font-medium">{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 bg-[#E8001C] rounded-xl px-4 py-3.5 web:hover:bg-[#c4001a] web:cursor-pointer web:transition-colors"
            onPress={() => {
              setShowReviewForm((v) => !v);
              setReviewSubmitted(false);
            }}
            activeOpacity={0.9}
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text className="text-[12px] font-black tracking-wide text-white">
              {lang === "sv" ? "SKRIV OMDÖME" : "WRITE A REVIEW"}
            </Text>
          </TouchableOpacity>
        </View>

        {showReviewForm && (
          <View className="bg-white rounded-3xl p-5 mb-4 border border-[#EEEEEE] shadow-[0_2px_12px_rgba(0,0,0,0.04)] gap-1.5">
            <Text className="text-[15px] font-black text-black mb-1">
              {lang === "sv" ? "Skriv ett omdöme" : "Write a review"}
            </Text>
            <Text className="text-[11px] font-black text-gray-600 tracking-wide mt-2 mb-1">
              {lang === "sv" ? "Ditt betyg" : "Your rating"}
            </Text>
            <View className="flex-row gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setReviewRating(n)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  className="web:cursor-pointer web:hover:opacity-70 web:transition-opacity"
                >
                  <Ionicons
                    name={n <= reviewRating ? "star" : "star-outline"}
                    size={26}
                    color="#FFB800"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-[11px] font-black text-gray-600 tracking-wide mt-2 mb-1">
              {lang === "sv" ? "Ditt namn" : "Your name"}
            </Text>
            <TextInput
              className="bg-[#F5F5F5] rounded-lg border border-[#E8E8E8] px-4 py-3 text-sm text-black web:focus:border-[#E8001C] web:outline-none web:transition-colors"
              placeholder={lang === "sv" ? "Anna Andersson" : "Jane Doe"}
              placeholderTextColor={colors.gray400}
              value={reviewName}
              onChangeText={setReviewName}
            />

            <Text className="text-[11px] font-black text-gray-600 tracking-wide mt-2 mb-1">
              {lang === "sv" ? "Ditt omdöme" : "Your review"}
            </Text>
            <TextInput
              className="bg-[#F5F5F5] rounded-lg border border-[#E8E8E8] px-4 py-3 text-sm text-black min-h-[90px] web:focus:border-[#E8001C] web:outline-none web:transition-colors"
              style={{ textAlignVertical: "top" }}
              placeholder={
                lang === "sv"
                  ? "Berätta om din upplevelse…"
                  : "Tell us about your experience…"
              }
              placeholderTextColor={colors.gray400}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
            />

            {reviewError && (
              <Text className="text-xs text-[#E8001C] mt-2">
                {lang === "sv"
                  ? "Kunde inte skicka omdömet. Försök igen."
                  : "Could not submit your review. Please try again."}
              </Text>
            )}

            <TouchableOpacity
              className="rounded-lg overflow-hidden mt-3 web:hover:opacity-90 web:cursor-pointer web:transition-opacity"
              onPress={handleSubmitReview}
              disabled={submittingReview || !reviewName.trim() || !reviewText.trim()}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[colors.red, "#c4001a"]}
                className="items-center justify-center py-3.5"
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-black text-[13px] tracking-widest">
                    {lang === "sv" ? "SKICKA OMDÖME" : "SUBMIT REVIEW"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {reviewSubmitted && (
          <View className="flex-row items-center gap-2 bg-[#178A43]/10 rounded-lg py-2.5 px-3 mb-4">
            <Ionicons name="checkmark-circle" size={16} color="#178A43" />
            <Text className="text-xs text-[#178A43] font-bold">
              {lang === "sv"
                ? "Tack för ditt omdöme!"
                : "Thanks for your review!"}
            </Text>
          </View>
        )}

        <View className="bg-white rounded-3xl px-5 border border-[#EEEEEE] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          {displayReviews.slice(0, 3).map((r, i) => (
            <ReviewCard
              key={i}
              review={r}
              lang={lang}
              last={i === Math.min(displayReviews.length, 3) - 1}
            />
          ))}
        </View>

        {displayReviews.length > 3 && (
          <TouchableOpacity
            className="flex-row items-center justify-center gap-1.5 py-3.5 mt-3 bg-white rounded-xl border border-[#EEEEEE] web:hover:bg-[#FAFAFA] web:cursor-pointer web:transition-colors"
            onPress={() => setShowAllReviews(true)}
            activeOpacity={0.7}
          >
            <Text className="text-[12.5px] font-black text-[#E8001C] tracking-wide">
              {lang === "sv"
                ? `SE ALLA ${displayReviews.length} OMDÖMEN`
                : `SEE ALL ${displayReviews.length} REVIEWS`}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={colors.red} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showAllReviews}
        animationType="slide"
        onRequestClose={() => setShowAllReviews(false)}
      >
        <View style={styles.reviewModalRoot}>
          <View style={styles.reviewModalHeader}>
            <View>
              <Text style={styles.reviewModalTitle}>
                {lang === "sv" ? "Alla omdömen" : "All reviews"}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1">
                <StarRow rating={Number(avgRating)} size={11} />
                <Text className="text-[11.5px] font-bold text-gray-500">
                  {avgRating} · {displayReviews.length}{" "}
                  {lang === "sv" ? "omdömen" : "reviews"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowAllReviews(false)}
              style={styles.reviewModalCloseBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={colors.black} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.reviewModalContent}
            showsVerticalScrollIndicator={false}
          >
            <View className="bg-white rounded-3xl px-5 border border-[#EEEEEE] shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              {displayReviews.map((r, i) => (
                <ReviewCard
                  key={i}
                  review={r}
                  lang={lang}
                  last={i === displayReviews.length - 1}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ══════════════════════════
          CTA BANNER
      ══════════════════════════ */}
      <LinearGradient
        colors={["#050505", "#1C0508", "#0A0A0A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaBanner}
      >
        <View style={styles.ctaGlow} />
        <View style={styles.ctaIconBadge}>
          <Ionicons name="flash" size={18} color="#FF3D57" />
        </View>
        <Text style={styles.ctaBannerTitle}>{t.ctaBannerTitle}</Text>
        <Text style={styles.ctaBannerSub}>{t.ctaBannerSub}</Text>
        <TouchableOpacity
          style={styles.ctaBannerBtn}
          onPress={() => navigation.navigate("Booking", {})}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#FF3D57", "#E8001C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBannerBtnGrad}
          >
            <Text style={styles.ctaBannerBtnTxt}>{t.bookNow}</Text>
            <Ionicons
              name="arrow-forward"
              size={15}
              color="rgba(255,255,255,0.85)"
            />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* ══════════════════════════
          SERVICE AREAS
      ══════════════════════════ */}
      <View style={styles.section}>
        <SectionLabel text={t.serviceAreasTitle} />
        <View style={styles.areaCard}>
          <View style={styles.areaRow}>
            <View style={styles.areaFlagWrap}>
              <Text style={styles.areaFlag}>🇸🇪</Text>
            </View>
            <View style={styles.areaInfo}>
              <Text style={styles.areaCountry}>{t.swedenLabel}</Text>
              <Text style={styles.areaCities}>{config.area}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color={colors.red} />
          </View>
          <View style={styles.areaExpand}>
            <Ionicons name="trending-up" size={13} color={colors.red} />
            <Text style={styles.areaExpandTxt}>{t.areaExpandText}</Text>
          </View>
        </View>
      </View>

      {/* ══════════════════════════
          CONTACT
      ══════════════════════════ */}
      <LinearGradient
        colors={["#050505", "#1C0508", "#0A0A0A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.contactSection}
      >
        <View style={styles.contactGlow} />
        <SectionLabel text={t.contactTitle} light />

        <View style={styles.contactCard}>
          {(
            [
              {
                icon: <Ionicons name="call" size={18} color={colors.red} />,
                bg: "rgba(232,0,28,0.15)",
                label: t.contactPhone,
                value: "+46790292208",
                sub: t.contactPhoneSub,
                url: "tel:+46790292208",
              },
              {
                icon: <Ionicons name="mail" size={18} color={colors.red} />,
                bg: "rgba(232,0,28,0.15)",
                label: t.contactEmail,
                value: "labagolabago5@gmail.com",
                sub: t.contactEmailSub,
                url: "mailto:labagolabago5@gmail.com",
              },
              {
                icon: (
                  <FontAwesome5 name="whatsapp" size={18} color="#25D366" />
                ),
                bg: "rgba(37,211,102,0.15)",
                label: t.contactWhatsapp,
                value: "+46790292208",
                sub: t.contactWhatsappSub,
                url: "https://wa.me/46739138051",
              },
              {
                icon: (
                  <Ionicons
                    name="location-sharp"
                    size={18}
                    color={colors.red}
                  />
                ),
                bg: "rgba(232,0,28,0.15)",
                label: t.contactLocation,
                value: "Gävle, Sverige",
                sub: t.contactLocationSub,
                url: "https://maps.google.com/?q=Gävle,Sverige",
              },
            ] as const
          ).map((c) => (
            <TouchableOpacity
              key={c.label}
              activeOpacity={0.75}
              onPress={() => Linking.openURL(c.url)}
              style={styles.contactRow}
            >
              <View style={[styles.contactIconBox, { backgroundColor: c.bg }]}>
                {c.icon}
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{c.label}</Text>
                <Text style={styles.contactValue}>{c.value}</Text>
                <Text style={styles.contactSub}>{c.sub}</Text>
              </View>
              <View style={styles.contactChevron}>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="rgba(255,255,255,0.4)"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerTxt}>FÖLJ OSS</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          {[
            {
              colors: ["#F58529", "#DD2A7B", "#8134AF"] as const,
              glow: "#E1306C",
              icon: <FontAwesome5 name="instagram" size={20} color="#fff" />,
              name: "Instagram",
              handle: "@labago2.4",
              url: "https://www.instagram.com/labago2.4",
            },
            {
              colors: ["#1877F2", "#0c5cbf"] as const,
              glow: "#1877F2",
              icon: <FontAwesome5 name="facebook-f" size={18} color="#fff" />,
              name: "Facebook",
              handle: "Labago",
              url: "https://www.facebook.com/people/Labago/100068093281467/",
            },
            {
              colors: ["#2b2b2b", "#010101"] as const,
              glow: "#69C9D0",
              icon: (
                <MaterialCommunityIcons
                  name="music-note-eighth"
                  size={22}
                  color="#fff"
                />
              ),
              name: "TikTok",
              handle: "@labago4",
              url: "https://www.tiktok.com/@labago4",
            },
          ].map((s) => (
            <TouchableOpacity
              key={s.name}
              style={styles.socialCard}
              activeOpacity={0.85}
              onPress={() => s.url && Linking.openURL(s.url)}
              disabled={!s.url}
            >
              <LinearGradient
                colors={s.colors}
                style={[styles.socialBadge, { shadowColor: s.glow }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {s.icon}
              </LinearGradient>
              <Text style={styles.socialName}>{s.name}</Text>
              <Text style={styles.socialHandle} numberOfLines={1}>
                {s.handle}
              </Text>
              <View style={styles.socialFollowPill}>
                <Text style={styles.socialFollowTxt}>
                  {lang === "sv" ? "FÖLJ" : "FOLLOW"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={9}
                  color="rgba(255,255,255,0.8)"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ══════════════════════════
          FOOTER
      ══════════════════════════ */}
      <View style={styles.footer}>
        <Image
          source={require("../../assets/labago.jpeg")}
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={styles.footerSub}>Sverige 🇸🇪 · Gävle / Sandviken</Text>
        <Text style={styles.footerCopy}>
          © 2026 LABAGO · labagolabago5@gmail.com
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("PrivacyPolicy")}
          activeOpacity={0.7}
        >
          <Text style={styles.footerLink}>
            {lang === "sv" ? "Integritetspolicy" : "Privacy Policy"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ── Section label ── */
const sl = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  line: { flex: 1, height: 1, backgroundColor: "#E8E8E8" },
  txt: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    color: colors.black,
  },
  light: { color: "rgba(255,255,255,0.4)" },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F2F2" },

  /* ── HERO ── */
  hero: {
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.red,
    opacity: 0.035,
    top: -100,
    right: -80,
  },
  blob2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.red,
    opacity: 0.04,
    bottom: 20,
    left: -50,
  },
  blob3: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ff2d3f",
    opacity: 0.06,
    top: "38%",
    right: -30,
  },
  heroGridLine1: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroGridLine2: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "55%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(232,0,28,0.12)",
    borderWidth: 1,
    borderColor: "rgba(232,0,28,0.3)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.red,
  },
  liveTxt: {
    color: colors.red,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  heroLogo: { width: "100%", height: 180, marginBottom: spacing.md },
  heroTagline: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  heroDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.xl,
    textAlign: "center",
  },

  ctaBtn: {
    borderRadius: radius.sm,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: spacing.sm,
  },
  ctaTxt: { color: "#fff", fontWeight: "900", fontSize: 15, letterSpacing: 2 },

  locationStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  locationTxt: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statIcon: { fontSize: 18, marginBottom: 2 },
  statV: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  statL: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statSep: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 6,
  },

  /* ── SECTION ── */
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },

  /* ── SUB BANNER ── */
  subBanner: { borderRadius: radius.xl, overflow: "hidden" },
  subBannerGrad: { padding: spacing.md, flexDirection: "row" },
  subLeft: { flex: 1, gap: 4 },
  subBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  subBadgeTxt: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  subName: { color: "#fff", fontSize: 17, fontWeight: "900" },
  subDesc: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  subWashes: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
  subWashPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  subWashTxt: { color: "#fff", fontSize: 10, fontWeight: "700" },
  subRight: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingLeft: spacing.md,
  },
  subSave: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  subPrice: { color: "#fff", fontSize: 26, fontWeight: "900" },
  subPer: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  subArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  /* kept for legacy refs */
  pkgList: { gap: spacing.sm },
  pkgRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: 12,
    gap: spacing.sm,
  },
  pkgMid: { flex: 1 },
  pkgName: { fontSize: 14, fontWeight: "700", color: colors.black },
  pkgDesc: { fontSize: 11, color: colors.gray400 },
  pkgRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  pkgPrice: { fontSize: 14, fontWeight: "900", color: colors.red },

  /* ── HOW IT WORKS ── */
  /* ── REVIEWS ── */
  reviewSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },

  reviewModalRoot: { flex: 1, backgroundColor: "#F2F2F2" },
  reviewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EBEBEB",
  },
  reviewModalTitle: { fontSize: 18, fontWeight: "900", color: colors.black },
  reviewModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewModalContent: { padding: spacing.lg, paddingBottom: spacing.xxl },

  /* ── CTA BANNER ── */
  ctaBanner: {
    marginTop: spacing.xl,
    marginHorizontal: 20,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    overflow: "hidden",
  },
  ctaGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.red,
    opacity: 0.1,
    top: -110,
    right: -70,
  },
  ctaIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(232,0,28,0.12)",
    borderWidth: 1,
    borderColor: "rgba(232,0,28,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaBannerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 6,
  },
  ctaBannerSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
  },
  ctaBannerBtn: {
    borderRadius: 999,
    overflow: "hidden",
    alignSelf: "stretch",
    shadowColor: colors.red,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  ctaBannerBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
  },
  ctaBannerBtnTxt: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 1.5,
  },

  /* ── SERVICE AREAS ── */
  areaCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  areaFlagWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F6F6F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  areaFlag: { fontSize: 24 },
  areaInfo: { flex: 1 },
  areaCountry: {
    color: colors.black,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },
  areaCities: { color: colors.gray600, fontSize: 12, lineHeight: 18 },
  areaExpand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(232,0,28,0.05)",
    borderWidth: 1,
    borderColor: "rgba(232,0,28,0.12)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  areaExpandTxt: {
    flex: 1,
    color: colors.gray600,
    fontSize: 11,
    lineHeight: 16,
  },

  /* ── CONTACT ── */
  contactSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  contactGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.red,
    opacity: 0.07,
    top: -130,
    right: -90,
  },
  contactCard: { gap: 10 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: spacing.md,
  },
  contactIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 3,
  },
  contactValue: { fontSize: 14, fontWeight: "800", color: "#fff" },
  contactSub: { fontSize: 10.5, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  contactChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dividerTxt: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  socialRow: { flexDirection: "row", gap: spacing.sm },
  socialCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    gap: 3,
  },
  socialBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  socialName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  socialHandle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9.5,
    marginBottom: 7,
  },
  socialFollowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 4.5,
  },
  socialFollowTxt: {
    color: "#fff",
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  /* ── FOOTER ── */
  footer: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },
  footerLogo: { width: 160, height: 70, marginBottom: spacing.sm },
  footerSub: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginBottom: spacing.md,
  },
  footerRule: {
    width: "100%",
    height: 1,
    backgroundColor: "#1c1c1c",
    marginBottom: spacing.md,
  },
  footerCopy: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    letterSpacing: 1,
  },
  footerLink: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: spacing.sm,
    textDecorationLine: "underline",
  },
});
