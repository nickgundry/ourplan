import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Platform, Alert, KeyboardAvoidingView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useStore } from "../../store";
import { Field, PrimaryBtn } from "../../components";
import * as api from "../../api";
import { colors, fonts, radius, shadow } from "../../theme";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const { width: W } = Dimensions.get("window");

const SLIDES = [
  {
    bg:    "#2D4A35",
    title: "Your plan,\nwhen it matters.",
    body:  "Disasters don't wait. Having a clear plan — and making sure everyone can access it — changes outcomes.",
    icon:  "🛡",
  },
  {
    bg:    "#334155",
    title: "Works when\nnetworks don't.",
    body:  "Your plan is saved to this device and works completely offline. The moment signal returns, we sync everything.",
    icon:  "📵",
  },
  {
    bg:    "#5B3E8A",
    title: "Everyone\nstays informed.",
    body:  "One tap sends your location and plan to your whole family — and to contacts outside the affected area who can help coordinate.",
    icon:  "📡",
  },
];

type Step = "slides" | "account" | "setup_family" | "setup_meeting" | "done";

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]           = useState<Step>("slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goSlide = (i: number) => {
    setSlideIndex(i);
    scrollRef.current?.scrollTo({ x: W * i, animated: true });
  };

  const nextSlide = () => {
    if (slideIndex < SLIDES.length - 1) goSlide(slideIndex + 1);
    else setStep("account");
  };

  if (step === "slides")        return <Slides slideIndex={slideIndex} goSlide={goSlide} nextSlide={nextSlide} scrollRef={scrollRef} onSkip={() => setStep("account")} />;
  if (step === "account")       return <AccountStep onCreated={() => setStep("setup_family")} onLogin={onComplete} />;
  if (step === "setup_family")  return <FamilyStep onNext={() => setStep("setup_meeting")} />;
  if (step === "setup_meeting") return <MeetingStep onNext={() => setStep("done")} />;
  return <DoneStep onComplete={onComplete} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDES
// ─────────────────────────────────────────────────────────────────────────────
function Slides({ slideIndex, goSlide, nextSlide, scrollRef, onSkip }: any) {
  const slide = SLIDES[slideIndex];
  return (
    <View style={[ss.root, { backgroundColor: slide.bg }]}>
      <SafeAreaView edges={["top"]} style={ss.skipWrap}>
        <TouchableOpacity onPress={onSkip} style={ss.skipBtn}>
          <Text style={ss.skipText}>Skip</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView ref={scrollRef} horizontal pagingEnabled scrollEnabled={false} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        {SLIDES.map((s, i) => (
          <View key={i} style={[ss.slide, { width: W }]}>
            <View style={ss.iconWrap}><Text style={ss.icon}>{s.icon}</Text></View>
            <Text style={ss.slideTitle}>{s.title}</Text>
            <Text style={ss.slideBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={ss.footer}>
        <View style={ss.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goSlide(i)}>
              <View style={[ss.dot, i === slideIndex && ss.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={ss.nextBtn} onPress={nextSlide}>
          <Text style={ss.nextBtnText}>{slideIndex < SLIDES.length - 1 ? "Next →" : "Get started"}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT — sign in / create account with Apple, Google, or email
// ─────────────────────────────────────────────────────────────────────────────
function AccountStep({ onCreated, onLogin }: { onCreated: () => void; onLogin: () => void }) {
  const { setAuth } = useStore();
  const [mode, setMode]         = useState<"register" | "login">("register");
  const [showEmail, setShowEmail] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState<null | "apple" | "google" | "email" | "forgot">(null);

  // Google OAuth via expo-auth-session
  const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId ?? "";
  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri: AuthSession.makeRedirectUri({ scheme: "prepared" }),
    },
    { authorizationEndpoint: "https://accounts.google.com/o/oauth2/auth" }
  );

  // Handle Google response
  React.useEffect(() => {
    if (googleResponse?.type === "success" && googleResponse.params.id_token) {
      handleGoogleToken(googleResponse.params.id_token);
    } else if (googleResponse?.type === "error") {
      Alert.alert("Google sign-in failed", googleResponse.error?.message ?? "Try again.");
      setLoading(null);
    }
  }, [googleResponse]);

  const handleGoogleToken = async (idToken: string) => {
    try {
      const data = await api.signInWithGoogle(idToken);
      setAuth(data.userId, data.email, data.name, "google");
      data.isNew ? onCreated() : onLogin();
    } catch (e: any) {
      Alert.alert("Google sign-in failed", e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    setLoading("apple");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const data = await api.signInWithApple(credential.identityToken!, credential.fullName ?? undefined);
      setAuth(data.userId, data.email, data.name, "apple");
      data.isNew ? onCreated() : onLogin();
    } catch (e: any) {
      if (e.code !== "ERR_CANCELED") Alert.alert("Apple sign-in failed", e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = () => {
    setLoading("google");
    googlePromptAsync();
  };

  const handleEmail = async () => {
    if (!email || !password || (mode === "register" && !name)) return;
    setLoading("email");
    try {
      const data = mode === "register"
        ? await api.register(email.trim(), password, name.trim())
        : await api.login(email.trim(), password);
      setAuth(data.userId, data.email, data.name, "email");
      data.isNew || mode === "register" ? onCreated() : onLogin();
    } catch (e: any) {
      Alert.alert(mode === "register" ? "Couldn't create account" : "Couldn't sign in", e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleForgot = async () => {
    if (!email) { Alert.alert("Enter your email first"); return; }
    setLoading("forgot");
    try {
      await api.forgotPassword(email.trim());
      setForgotSent(true);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(null);
    }
  };

  // Forgot password sub-screen
  if (forgotMode) return (
    <SafeAreaView style={as.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={as.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={as.backBtn} onPress={() => { setForgotMode(false); setForgotSent(false); }}>
            <Text style={as.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={as.pageTitle}>Reset password</Text>
          <Text style={as.pageSubtitle}>Enter your email and we'll send you a reset link.</Text>
          {forgotSent ? (
            <View style={as.sentBox}>
              <Text style={as.sentTitle}>Check your email ✓</Text>
              <Text style={as.sentBody}>If {email} is registered, you'll get a link within a few minutes. Check spam if you don't see it.</Text>
              <PrimaryBtn label="Back to sign in" onPress={() => { setForgotMode(false); setForgotSent(false); setMode("login"); setShowEmail(true); }} />
            </View>
          ) : (
            <>
              <Field label="Email" placeholder="you@example.com" value={email} onChange={setEmail} type="email-address" />
              <PrimaryBtn label="Send reset link" onPress={handleForgot} loading={loading === "forgot"} disabled={!email} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={as.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={as.content} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={as.hero}>
            <View style={as.shieldWrap}><Text style={{ fontSize: 28 }}>🛡</Text></View>
            <Text style={as.appName}>Prepared</Text>
          </View>

          {/* Tabs */}
          <View style={as.tabs}>
            {(["register", "login"] as const).map(m => (
              <TouchableOpacity key={m} onPress={() => { setMode(m); setShowEmail(false); }} style={[as.tab, mode === m && as.tabActive]}>
                <Text style={[as.tabText, mode === m && as.tabTextActive]}>
                  {m === "register" ? "Create account" : "Sign in"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Social buttons ── */}
          <View style={as.socialStack}>
            {/* Sign in with Apple — always shown on iOS */}
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={mode === "register"
                ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={as.appleBtn}
              onPress={handleApple}
            />

            {/* Google */}
            <TouchableOpacity
              style={as.googleBtn}
              onPress={handleGoogle}
              disabled={loading === "google" || !googleRequest}
              activeOpacity={0.8}
            >
              {loading === "google"
                ? <ActivityIndicator color={colors.inkMid} />
                : <>
                    <Text style={as.googleLogo}>G</Text>
                    <Text style={as.googleBtnText}>
                      {mode === "register" ? "Sign up with Google" : "Sign in with Google"}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={as.dividerRow}>
            <View style={as.dividerLine} />
            <Text style={as.dividerText}>or</Text>
            <View style={as.dividerLine} />
          </View>

          {/* Email toggle / form */}
          {!showEmail ? (
            <TouchableOpacity style={as.emailToggleBtn} onPress={() => setShowEmail(true)}>
              <Text style={as.emailToggleText}>
                {mode === "register" ? "Sign up with email" : "Sign in with email"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={as.emailForm}>
              {mode === "register" && (
                <Field label="Your name" placeholder="Jane Smith" value={name} onChange={setName} />
              )}
              <Field label="Email" placeholder="you@example.com" value={email} onChange={setEmail} type="email-address" />
              <Field label="Password" placeholder={mode === "register" ? "8+ characters" : "Your password"} value={password} onChange={setPassword} />

              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <PrimaryBtn
                  label={mode === "register" ? "Create account" : "Sign in"}
                  onPress={handleEmail}
                  loading={loading === "email"}
                  disabled={!email || !password || (mode === "register" && !name)}
                />
              </View>

              {mode === "login" && (
                <TouchableOpacity onPress={() => setForgotMode(true)} style={as.forgotBtn}>
                  <Text style={as.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={as.legal}>
            {mode === "register"
              ? "Your plan is encrypted on your device. We never sell your data."
              : "Your plan and contacts are waiting for you."}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY SETUP
// ─────────────────────────────────────────────────────────────────────────────
function FamilyStep({ onNext }: { onNext: () => void }) {
  const { savePlanLocally } = useStore();
  const [members, setMembers] = useState([{ name: "", conditions: "", meds: "" }]);

  const addMember = () => setMembers(m => [...m, { name: "", conditions: "", meds: "" }]);
  const update    = (i: number, field: string, v: string) => {
    const next = [...members]; next[i] = { ...next[i], [field]: v }; setMembers(next);
  };
  const remove = (i: number) => setMembers(m => m.filter((_, idx) => idx !== i));

  const handleNext = async () => {
    const filled = members.filter(m => m.name.trim());
    if (filled.length > 0) await savePlanLocally({ family: filled.map((m, i) => ({ ...m, id: String(i + 1) })) });
    onNext();
  };

  return (
    <SafeAreaView style={fs.safe}>
      <ScrollView contentContainerStyle={fs.content} keyboardShouldPersistTaps="handled">
        <Text style={fs.step}>Step 1 of 2</Text>
        <Text style={fs.title}>Who's in{"\n"}your household?</Text>
        <Text style={fs.subtitle}>Add everyone who will be following this plan. Include medical info that first responders should know about.</Text>

        {members.map((m, i) => (
          <View key={i} style={fs.card}>
            <View style={fs.cardHeader}>
              <Text style={fs.cardTitle}>Person {i + 1}</Text>
              {members.length > 1 && (
                <TouchableOpacity onPress={() => remove(i)}><Text style={fs.removeText}>Remove</Text></TouchableOpacity>
              )}
            </View>
            <Field placeholder="Full name" value={m.name} onChange={v => update(i, "name", v)} />
            <Field placeholder="Medical conditions (optional)" value={m.conditions} onChange={v => update(i, "conditions", v)} hint="e.g. asthma, diabetes, penicillin allergy" />
            <Field placeholder="Medications (optional)" value={m.meds} onChange={v => update(i, "meds", v)} hint="Include dosage if relevant" />
          </View>
        ))}

        <TouchableOpacity style={fs.addBtn} onPress={addMember}>
          <Text style={fs.addBtnText}>+ Add another person</Text>
        </TouchableOpacity>

        <View style={fs.footer}>
          <PrimaryBtn label="Next →" onPress={handleNext} />
          <TouchableOpacity style={fs.skipBtn} onPress={onNext}>
            <Text style={fs.skipText}>Set up later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEETING PLACES SETUP
// ─────────────────────────────────────────────────────────────────────────────
function MeetingStep({ onNext }: { onNext: () => void }) {
  const { savePlanLocally } = useStore();
  const [places, setPlaces] = useState({ primary: "", secondary: "", outOfTown: "", shelter: "" });

  const handleNext = async () => {
    if (Object.values(places).some(v => v.trim())) await savePlanLocally({ meeting: places });
    onNext();
  };

  const FIELDS = [
    { key: "primary",   label: "Primary meeting place",  placeholder: "e.g. Lincoln Elementary School, 450 Oak Ave",  dot: colors.sage,        hint: "Somewhere familiar, central, and easy to find" },
    { key: "secondary", label: "Backup location",        placeholder: "e.g. Riverside Park — main entrance",           dot: colors.amber,       hint: "In case the primary location isn't accessible" },
    { key: "outOfTown", label: "Out-of-area location",   placeholder: "e.g. Grandma's — 82 Elm St, Portland OR",       dot: colors.terracotta,  hint: "Somewhere to go if you need to leave the area entirely" },
    { key: "shelter",   label: "Nearest hospital",       placeholder: "e.g. St. Mary's Hospital, 3rd & Main",          dot: colors.slateMid,    hint: "Your closest emergency medical facility" },
  ];

  return (
    <SafeAreaView style={ms.safe}>
      <ScrollView contentContainerStyle={ms.content} keyboardShouldPersistTaps="handled">
        <Text style={ms.step}>Step 2 of 2</Text>
        <Text style={ms.title}>Where will{"\n"}you meet?</Text>
        <Text style={ms.subtitle}>If you're separated, everyone needs to know where to go. Set a primary spot and backups for different scenarios.</Text>

        {FIELDS.map(({ key, label, placeholder, dot, hint }) => (
          <View key={key} style={ms.fieldRow}>
            <View style={[ms.dot, { backgroundColor: dot }]} />
            <View style={{ flex: 1 }}>
              <Text style={ms.fieldLabel}>{label}</Text>
              <Field
                placeholder={placeholder}
                value={places[key as keyof typeof places]}
                onChange={v => setPlaces({ ...places, [key]: v })}
                hint={hint}
              />
            </View>
          </View>
        ))}

        <View style={ms.footer}>
          <PrimaryBtn label="Finish setup" onPress={handleNext} />
          <TouchableOpacity style={ms.skipBtn} onPress={onNext}>
            <Text style={ms.skipText}>Set up later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DONE
// ─────────────────────────────────────────────────────────────────────────────
function DoneStep({ onComplete }: { onComplete: () => void }) {
  const { family, meeting } = useStore();
  const memberCount  = family.filter(m => m.name).length;
  const locationCount = Object.values(meeting).filter(Boolean).length;

  return (
    <SafeAreaView style={ds.safe}>
      <View style={ds.content}>
        <View style={ds.iconWrap}><Text style={{ fontSize: 48 }}>✓</Text></View>
        <Text style={ds.title}>You're set up.</Text>
        <Text style={ds.subtitle}>
          Your plan is saved to this device and will work even without an internet connection.
        </Text>

        <View style={ds.card}>
          {[
            { label: "Family members",    val: memberCount > 0 ? `${memberCount} added` : "Not yet set",               ok: memberCount > 0 },
            { label: "Meeting places",    val: locationCount > 0 ? `${locationCount} set` : "Not yet set",             ok: locationCount > 0 },
            { label: "Go bag checklist",  val: "11 items ready to check off",                                          ok: true },
          ].map(({ label, val, ok }, i, arr) => (
            <View key={label} style={[ds.row, i < arr.length - 1 && ds.rowBorder]}>
              <Text style={[ds.check, { color: ok ? colors.sage : colors.inkGhost }]}>{ok ? "✓" : "○"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={ds.rowLabel}>{label}</Text>
                <Text style={ds.rowVal}>{val}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={ds.tipBox}>
          <Text style={ds.tipText}>
            💡 Next: add at least one contact outside your area — they're crucial if local networks go down.
          </Text>
        </View>

        <PrimaryBtn label="Go to my plan" onPress={onComplete} />
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root:      { flex: 1 },
  skipWrap:  { alignItems: "flex-end", paddingHorizontal: 24, paddingTop: 8 },
  skipBtn:   { padding: 8 },
  skipText:  { color: "rgba(255,255,255,.5)", fontSize: 14 },
  slide:     { alignItems: "center", justifyContent: "center", padding: 32, paddingTop: 40 },
  iconWrap:  { width: 90, height: 90, borderRadius: 32, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center", marginBottom: 32 },
  icon:      { fontSize: 40 },
  slideTitle:{ fontFamily: fonts.display, fontSize: 36, color: "white", fontWeight: "400", letterSpacing: -0.6, lineHeight: 42, textAlign: "center", marginBottom: 20 },
  slideBody: { fontSize: 16, color: "rgba(255,255,255,.7)", textAlign: "center", lineHeight: 24, maxWidth: 300 },
  footer:    { padding: 32, alignItems: "center", gap: 24 },
  dots:      { flexDirection: "row", gap: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,.3)" },
  dotActive: { backgroundColor: "white", width: 24 },
  nextBtn:   { backgroundColor: "rgba(255,255,255,.15)", borderRadius: 18, paddingVertical: 16, paddingHorizontal: 48, borderWidth: 1, borderColor: "rgba(255,255,255,.25)" },
  nextBtnText:{ color: "white", fontSize: 16, fontWeight: "600" },
});

const as = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  content:     { padding: 24, paddingBottom: 48 },
  hero:        { alignItems: "center", paddingTop: 32, paddingBottom: 24 },
  shieldWrap:  { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  appName:     { fontSize: 28, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.5 },
  tabs:        { flexDirection: "row", backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: 4, marginBottom: 24 },
  tab:         { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radius.md - 2 },
  tabActive:   { backgroundColor: colors.canvas, ...shadow.sm },
  tabText:     { fontSize: 14, fontWeight: "500", color: colors.inkLight },
  tabTextActive:{ color: colors.ink, fontWeight: "600" },
  socialStack: { gap: 10, marginBottom: 20 },
  appleBtn:    { width: "100%", height: 52 },
  googleBtn:   { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.canvas, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  googleLogo:  { fontSize: 18, fontWeight: "700", color: "#4285F4" },
  googleBtnText:{ fontSize: 15, fontWeight: "600", color: colors.ink },
  dividerRow:  { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.inkLight },
  emailToggleBtn:{ borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, paddingVertical: 14, alignItems: "center" },
  emailToggleText:{ fontSize: 15, fontWeight: "500", color: colors.inkMid },
  emailForm:   { gap: 0 },
  forgotBtn:   { alignItems: "center", paddingVertical: 10 },
  forgotText:  { fontSize: 13, color: colors.slateMid, fontWeight: "500" },
  legal:       { fontSize: 12, color: colors.inkLight, textAlign: "center", marginTop: 20, lineHeight: 18 },
  backBtn:     { paddingBottom: 20 },
  backText:    { fontSize: 16, color: colors.slateMid, fontWeight: "500" },
  pageTitle:   { fontSize: 28, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.4, marginBottom: 8 },
  pageSubtitle:{ fontSize: 14, color: colors.inkMid, lineHeight: 21, marginBottom: 24 },
  sentBox:     { backgroundColor: colors.sagePale, borderRadius: radius.lg, padding: 20, marginBottom: 20 },
  sentTitle:   { fontSize: 16, fontWeight: "600", color: colors.sage, marginBottom: 8 },
  sentBody:    { fontSize: 14, color: colors.inkMid, lineHeight: 20, marginBottom: 16 },
});

const fs = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 24, paddingBottom: 48 },
  step:      { fontSize: 12, fontWeight: "700", color: colors.inkLight, letterSpacing: 0.4, marginBottom: 8 },
  title:     { fontSize: 32, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.5, lineHeight: 38, marginBottom: 10 },
  subtitle:  { fontSize: 14, color: colors.inkMid, lineHeight: 21, marginBottom: 24 },
  card:      { backgroundColor: colors.canvas, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 12, ...shadow.sm },
  cardHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: "700", color: colors.inkLight, letterSpacing: 0.5, textTransform: "uppercase" },
  removeText:{ fontSize: 13, color: colors.alert },
  addBtn:    { borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", padding: 15, alignItems: "center", marginBottom: 24 },
  addBtnText:{ fontSize: 14, color: colors.inkMid, fontWeight: "500" },
  footer:    { gap: 12 },
  skipBtn:   { alignItems: "center", paddingVertical: 12 },
  skipText:  { fontSize: 13, color: colors.inkLight },
});

const ms = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 24, paddingBottom: 48 },
  step:      { fontSize: 12, fontWeight: "700", color: colors.inkLight, letterSpacing: 0.4, marginBottom: 8 },
  title:     { fontSize: 32, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.5, lineHeight: 38, marginBottom: 10 },
  subtitle:  { fontSize: 14, color: colors.inkMid, lineHeight: 21, marginBottom: 24 },
  fieldRow:  { flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 4 },
  dot:       { width: 10, height: 10, borderRadius: 5, marginTop: 36, flexShrink: 0 },
  fieldLabel:{ fontSize: 12, fontWeight: "700", color: colors.inkMid, letterSpacing: 0.3, marginBottom: 6 },
  footer:    { gap: 12, marginTop: 12 },
  skipBtn:   { alignItems: "center", paddingVertical: 12 },
  skipText:  { fontSize: 13, color: colors.inkLight },
});

const ds = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  content:   { flex: 1, padding: 32, justifyContent: "center" },
  iconWrap:  { width: 80, height: 80, borderRadius: 28, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:     { fontSize: 36, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.6, marginBottom: 10 },
  subtitle:  { fontSize: 15, color: colors.inkMid, lineHeight: 22, marginBottom: 24 },
  card:      { backgroundColor: colors.canvas, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 20, overflow: "hidden", ...shadow.sm },
  row:       { flexDirection: "row", alignItems: "flex-start", padding: 16, paddingHorizontal: 18, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  check:     { fontSize: 18, fontWeight: "700", marginTop: 2, width: 22 },
  rowLabel:  { fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 2 },
  rowVal:    { fontSize: 12, color: colors.inkLight },
  tipBox:    { backgroundColor: colors.amberPale, borderRadius: radius.md, padding: 14, marginBottom: 20 },
  tipText:   { fontSize: 13, color: colors.inkMid, lineHeight: 19 },
});
