import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../theme";
import { useLang } from "../i18n/LangContext";
import { useSubscription } from "../context/SubscriptionContext";
import { addReview, fetchReviews, type Review } from "../firebase/subscription";
import { verifyPin } from "../firebase/pin";

const { width } = Dimensions.get("window");

export default function ProfileScreen() {
  const { t, lang } = useLang();
  const { phone, subscription, loading, checkPhone, clearPhone } =
    useSubscription();

  const [phoneInput, setPhoneInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [wrongPin, setWrongPin] = useState(false);

  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      setReviews(await fetchReviews());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  async function handleCheck() {
    if (!phoneInput.trim() || !pinInput.trim()) return;
    setChecking(true);
    setWrongPin(false);
    const pinOk = await verifyPin(phoneInput.trim(), pinInput.trim());
    if (!pinOk) {
      setChecking(false);
      setWrongPin(true);
      return;
    }
    const result = await checkPhone(phoneInput.trim());
    setChecking(false);
    if (!result) {
      Alert.alert(
        lang === "sv" ? "Inget abonnemang hittat" : "No subscription found",
        lang === "sv"
          ? "Inget aktivt månadsabonnemang hittades för det numret."
          : "No active monthly plan found for this number.",
      );
    }
  }

  async function handleSubmitReview() {
    if (!reviewName.trim() || !reviewText.trim()) {
      Alert.alert(
        "",
        lang === "sv"
          ? "Fyll i namn och recension."
          : "Enter your name and review.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await addReview({
        name: reviewName.trim(),
        phone: phone || "anonymous",
        rating,
        text: reviewText.trim(),
      });
      setReviewName("");
      setReviewText("");
      setRating(5);
      setShowReviewForm(false);
      Alert.alert(
        "✓",
        lang === "sv"
          ? "Tack för din recension!"
          : "Thank you for your review!",
      );
      loadReviews();
    } catch {
      Alert.alert(
        "",
        lang === "sv"
          ? "Kunde inte skicka. Försök igen."
          : "Could not submit. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isSv = true; // profile always in Swedish per app design

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.root}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ── */}
        <LinearGradient
          colors={["#0A0A0A", "#150202", "#0A0A0A"]}
          style={styles.header}
        >
          <View style={styles.headerBlob} />
          <Image
            source={require("../../assets/labago.jpeg")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>MIN PROFIL</Text>
          <Text style={styles.headerSub}>Prenumeration & recensioner</Text>
        </LinearGradient>

        {/* ══════════════════
            SUBSCRIPTION BLOCK
        ══════════════════ */}
        <View style={styles.block}>
          <View style={styles.blockLabel}>
            <Ionicons name="infinite" size={14} color={colors.red} />
            <Text style={styles.blockLabelTxt}>MÅNADSABONNEMANG</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.red} size="large" />
              <Text style={styles.loadingTxt}>Hämtar information…</Text>
            </View>
          ) : subscription ? (
            /* ── ACTIVE CARD ── */
            <LinearGradient
              colors={[colors.red, "#7a000e"]}
              style={styles.activeCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.activeTopRow}>
                <View style={styles.activeCheckCircle}>
                  <Ionicons name="checkmark" size={22} color={colors.red} />
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeTxt}>AKTIVT</Text>
                </View>
              </View>
              <Text style={styles.activePlan}>{subscription.packageName}</Text>
              <Text style={styles.activeSub}>4 tvättar per månad</Text>

              <View style={styles.activeWashes}>
                {["Tvätt 1", "Tvätt 2", "Tvätt 3", "Tvätt 4"].map((w) => (
                  <View key={w} style={styles.activeWashPill}>
                    <Ionicons
                      name="water"
                      size={10}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.activeWashTxt}>{w}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.activeDivider} />
              <View style={styles.activePhoneRow}>
                <Ionicons
                  name="call-outline"
                  size={13}
                  color="rgba(255,255,255,0.5)"
                />
                <Text style={styles.activePhone}>{subscription.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={clearPhone}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutTxt}>Logga ut</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            /* ── PHONE LOOKUP ── */
            <View style={styles.lookupCard}>
              <View style={styles.lookupIcon}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={28}
                  color={colors.red}
                />
              </View>
              <Text style={styles.lookupTitle}>Se orderdetaljer</Text>
              <Text style={styles.lookupSub}>
                Ange ditt mobilnummer och PIN-koden du fick vid bokning för
                att se din plan.
              </Text>

              <View style={styles.phoneInputWrap}>
                <View style={styles.phoneFlag}>
                  <Text style={{ fontSize: 18 }}>🇸🇪</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="+46 70 000 00 00"
                  placeholderTextColor={colors.gray400}
                  value={phoneInput}
                  onChangeText={(v) => {
                    setPhoneInput(v);
                    setWrongPin(false);
                  }}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.phoneInputWrap}>
                <View style={styles.phoneFlag}>
                  <Ionicons name="key-outline" size={18} color={colors.gray600} />
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="PIN-kod"
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
                  onSubmitEditing={handleCheck}
                />
              </View>

              {wrongPin && (
                <View style={styles.lookupNote}>
                  <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
                  <Text style={[styles.lookupNoteTxt, { color: colors.red }]}>
                    Fel telefonnummer eller PIN-kod.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.checkBtn}
                onPress={handleCheck}
                disabled={checking}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={[colors.red, "#c4001a"]}
                  style={styles.checkBtnGrad}
                >
                  {checking ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="search" size={16} color="#fff" />
                      <Text style={styles.checkBtnTxt}>SE ORDERDETALJER</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.lookupNote}>
                <Ionicons
                  name="lock-closed-outline"
                  size={11}
                  color={colors.gray400}
                />
                <Text style={styles.lookupNoteTxt}>
                  Inget lösenord krävs · Privat & säkert
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ══════════════════
            REVIEWS BLOCK
        ══════════════════ */}
        <View style={styles.block}>
          <View style={styles.blockLabel}>
            <Ionicons name="star" size={14} color={colors.red} />
            <Text style={styles.blockLabelTxt}>RECENSIONER</Text>
          </View>

          {/* Write review toggle */}
          {!showReviewForm ? (
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => setShowReviewForm(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color={colors.red} />
              <Text style={styles.writeReviewTxt}>Skriv en recension</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.gray400}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.reviewForm}>
              <View style={styles.reviewFormHeader}>
                <Text style={styles.reviewFormTitle}>Din recension</Text>
                <TouchableOpacity onPress={() => setShowReviewForm(false)}>
                  <Ionicons name="close" size={20} color={colors.gray400} />
                </TouchableOpacity>
              </View>

              {/* Stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setRating(s)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={s <= rating ? "star" : "star-outline"}
                      size={34}
                      color={s <= rating ? "#FFB800" : "#DDD"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.formField}>
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={colors.gray400}
                />
                <TextInput
                  style={styles.formInput}
                  placeholder="Ditt namn"
                  placeholderTextColor={colors.gray400}
                  value={reviewName}
                  onChangeText={setReviewName}
                />
              </View>

              <View
                style={[
                  styles.formField,
                  { alignItems: "flex-start", paddingVertical: spacing.sm },
                ]}
              >
                <TextInput
                  style={[styles.formInput, { minHeight: 90, paddingTop: 2 }]}
                  placeholder="Skriv din recension här…"
                  placeholderTextColor={colors.gray400}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitReview}
                disabled={submitting}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#0A0A0A", "#222"]}
                  style={styles.submitGrad}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={14} color="#fff" />
                      <Text style={styles.submitTxt}>SKICKA RECENSION</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Reviews list */}
          <View style={styles.reviewList}>
            {loadingReviews ? (
              <ActivityIndicator
                color={colors.red}
                style={{ marginTop: spacing.lg }}
              />
            ) : reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Text style={styles.emptyEmoji}>⭐</Text>
                <Text style={styles.emptyTxt}>Inga recensioner ännu.</Text>
                <Text style={styles.emptySubTxt}>
                  Bli den första att betygsätta!
                </Text>
              </View>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <LinearGradient
                      colors={[colors.red, "#c4001a"]}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarTxt}>
                        {r.name[0].toUpperCase()}
                      </Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{r.name}</Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= r.rating ? "star" : "star-outline"}
                            size={11}
                            color="#FFB800"
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString("sv-SE")}
                    </Text>
                  </View>
                  <Text style={styles.reviewTxt}>"{r.text}"</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F2F2" },

  /* ── HEADER ── */
  header: {
    paddingTop: 56,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  headerBlob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.red,
    opacity: 0.05,
    top: -60,
    right: -60,
  },
  headerLogo: { width: 140, height: 60, marginBottom: spacing.sm },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
  },
  headerSub: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  /* ── BLOCK ── */
  block: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  blockLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  blockLabelTxt: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: colors.black,
  },

  /* ── LOADING ── */
  loadingBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  loadingTxt: { color: colors.gray400, fontSize: 13 },

  /* ── ACTIVE SUBSCRIPTION ── */
  activeCard: { borderRadius: radius.xl, padding: spacing.lg, gap: 6 },
  activeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  activeCheckCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  activeBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadgeTxt: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },
  activePlan: { color: "#fff", fontSize: 20, fontWeight: "900" },
  activeSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 6 },
  activeWashes: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  activeWashPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeWashTxt: { color: "#fff", fontSize: 11, fontWeight: "600" },
  activeDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 10,
  },
  activePhoneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  activePhone: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  logoutBtn: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginTop: 4,
  },
  logoutTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },

  /* ── PHONE LOOKUP ── */
  lookupCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    gap: spacing.md,
  },
  lookupIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(232,0,28,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lookupTitle: { fontSize: 17, fontWeight: "900", color: colors.black },
  lookupSub: { fontSize: 13, color: colors.gray400, lineHeight: 20 },
  phoneInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  phoneFlag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: "#EFEFEF",
    borderRightWidth: 1,
    borderRightColor: "#E0E0E0",
  },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    color: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  checkBtn: { borderRadius: radius.lg, overflow: "hidden" },
  checkBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
  },
  checkBtnTxt: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1.5,
  },
  lookupNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  lookupNoteTxt: { color: colors.gray400, fontSize: 11 },

  /* ── WRITE REVIEW BUTTON ── */
  writeReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    marginBottom: spacing.md,
  },
  writeReviewTxt: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.black,
  },

  /* ── REVIEW FORM ── */
  reviewForm: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  reviewFormHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewFormTitle: { fontSize: 15, fontWeight: "800", color: colors.black },
  starsRow: { flexDirection: "row", gap: 6 },
  formField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
  },
  formInput: { flex: 1, fontSize: 14, color: colors.black },
  submitBtn: { borderRadius: radius.md, overflow: "hidden" },
  submitGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitTxt: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1.5,
  },

  /* ── REVIEWS LIST ── */
  reviewList: { gap: spacing.sm },
  emptyReviews: { alignItems: "center", paddingVertical: spacing.xl, gap: 6 },
  emptyEmoji: { fontSize: 32 },
  emptyTxt: { fontSize: 15, fontWeight: "700", color: colors.black },
  emptySubTxt: { fontSize: 13, color: colors.gray400 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { color: "#fff", fontWeight: "900", fontSize: 15 },
  reviewName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 2,
  },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewDate: { fontSize: 10, color: colors.gray400 },
  reviewTxt: {
    fontSize: 13,
    color: colors.gray600,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
