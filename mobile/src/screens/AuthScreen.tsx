import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { useStore } from "../store";
import { Field } from "../components";
import * as api from "../api";
import { colors, fonts, radius } from "../theme";

type Mode = "landing" | "email-login" | "email-register" | "forgot";

export default function AuthScreen() {
  const setAuth = useStore(s => s.setAuth);
  const [mode, setMode]         = useState<Mode>("landing");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const wrap = async (fn: () => Promise<void>) => {
    setLoading(true);
    try { await fn(); }
    catch (e: any) { Alert.alert("Sign-in error", e.message); }
    finally { setLoading(false); }
  };

  const handleApple = () => wrap(async () => {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!cred.identityToken) throw new Error("Apple sign-in failed");
    const data = await api.appleSignIn(cred.identityToken, cred.fullName);
    setAuth(data.userId, data.email);
  });

  // Google: use expo-auth-session. Requires Google client IDs configured in app.config.ts.
  // Since we can't import conditionally, we handle Google via a web redirect approach.
  // In production: use @react-native-google-signin/google-signin for a native prompt.
  const handleGoogle = () => {
    Alert.alert(
      "Google Sign-in",
      "Configure EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in your environment to enable Google sign-in.",
      [{ text: "OK" }]
    );
  };

  const handleEmailLogin = () => wrap(async () => {
    if (!email || !password) return;
    const data = await api.login(email, password);
    setAuth(data.userId, data.email);
  });

  const handleEmailRegister = () => wrap(async () => {
    if (!email || !password || !name) return;
    const data = await api.register(email, password, name);
    setAuth(data.userId, data.email);
  });

  const handleForgot = () => wrap(async () => {
    if (!email) return;
    await api.requestPasswordReset(email);
    setResetSent(true);
  });

  // ── Forgot password ──────────────────────────────────────────────────────────
  if (mode === "forgot") return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.formContent}>
          <TouchableOpacity onPress={() => { setMode("email-login"); setResetSent(false); }} style={s.backRow}>
            <Text style={s.backText}>‹  Back</Text>
          </TouchableOpacity>
          <Text style={s.formTitle}>Reset password</Text>
          <Text style={s.formSub}>Enter your email and we'll send you a reset link.</Text>

          {resetSent ? (
            <View style={s.sentBox}>
              <Text style={s.sentEmoji}>✉️</Text>
              <Text style={s.sentTitle}>Check your email</Text>
              <Text style={s.sentBody}>
                If an account exists for {email}, you'll get a reset link within a minute.
              </Text>
              <TouchableOpacity style={s.fullBtn} onPress={() => { setMode("email-login"); setResetSent(false); }}>
                <Text style={s.fullBtnText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Field label="Email" placeholder="you@example.com" value={email} onChange={setEmail} type="email-address" />
              <TouchableOpacity
                style={[s.fullBtn, { opacity: !email ? 0.5 : 1 }]}
                onPress={handleForgot}
                disabled={!email || loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={s.fullBtnText}>Send reset link</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ── Email form ────────────────────────────────────────────────────────────────
  if (mode === "email-login" || mode === "email-register") {
    const isReg = mode === "email-register";
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => setMode("landing")} style={s.backRow}>
              <Text style={s.backText}>‹  Back</Text>
            </TouchableOpacity>
            <Text style={s.formTitle}>{isReg ? "Create account" : "Welcome back"}</Text>
            <Text style={s.formSub}>
              {isReg ? "Your plan will be encrypted and stored securely." : "Sign in to access your family plan."}
            </Text>

            {isReg && <Field label="Your name" placeholder="Jane Smith" value={name} onChange={setName} />}
            <Field label="Email" placeholder="you@example.com" value={email} onChange={setEmail} type="email-address" />
            <Field label="Password" placeholder={isReg ? "8+ characters" : "••••••••"} value={password} onChange={setPassword} />

            <TouchableOpacity
              style={[s.fullBtn, { opacity: (!email || !password || (isReg && !name)) ? 0.5 : 1 }]}
              onPress={isReg ? handleEmailRegister : handleEmailLogin}
              disabled={loading || !email || !password || (isReg && !name)}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={s.fullBtnText}>{isReg ? "Create account" : "Sign in"}</Text>}
            </TouchableOpacity>

            {!isReg && (
              <TouchableOpacity onPress={() => setMode("forgot")} style={s.forgotBtn}>
                <Text style={s.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.switchMode} onPress={() => setMode(isReg ? "email-login" : "email-register")}>
              <Text style={s.switchText}>
                {isReg ? "Already have an account?  " : "Don't have an account?  "}
                <Text style={{ color: colors.sage, fontWeight: "600" }}>
                  {isReg ? "Sign in" : "Create one"}
                </Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Landing ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.landingContent} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.shieldWrap}>
            <Text style={{ fontSize: 36 }}>🛡</Text>
          </View>
          <Text style={s.appName}>Prepared</Text>
          <Text style={s.tagline}>Your family plan,{"\n"}ready when you need it.</Text>
        </View>

        <View style={s.buttonsArea}>
          {/* Sign in with Apple */}
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.lg}
            style={s.appleBtn}
            onPress={handleApple}
          />

          {/* Sign in with Google */}
          <TouchableOpacity style={s.socialBtn} onPress={handleGoogle} disabled={loading}>
            <Text style={s.googleG}>G</Text>
            <Text style={s.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divRow}>
            <View style={s.divLine} />
            <Text style={s.divText}>or</Text>
            <View style={s.divLine} />
          </View>

          {/* Email options */}
          <TouchableOpacity style={s.socialBtn} onPress={() => setMode("email-register")}>
            <Text style={s.emailIcon}>✉</Text>
            <Text style={s.socialBtnText}>Sign up with email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.textBtn} onPress={() => setMode("email-login")}>
            <Text style={s.textBtnText}>
              Already have an account?{"  "}
              <Text style={{ color: colors.sage, fontWeight: "600" }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.legal}>
          By continuing you agree to our Terms of Service.{"\n"}Your data is encrypted and never sold.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  landingContent: { flexGrow: 1, padding: 24, justifyContent: "space-between", paddingBottom: 32 },
  hero:           { alignItems: "center", paddingTop: 52, paddingBottom: 36 },
  shieldWrap:     { width: 90, height: 90, borderRadius: 30, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  appName:        { fontSize: 34, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.5, marginBottom: 10 },
  tagline:        { fontSize: 17, color: colors.inkMid, textAlign: "center", lineHeight: 25 },
  buttonsArea:    {},
  appleBtn:       { height: 54, width: "100%", marginBottom: 12 },
  socialBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.canvas, marginBottom: 12 },
  socialBtnText:  { fontSize: 15, fontWeight: "600", color: colors.ink },
  emailIcon:      { fontSize: 18, color: colors.ink },
  googleG:        { fontSize: 17, fontWeight: "700", color: "#4285F4" },
  divRow:         { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4, marginBottom: 12 },
  divLine:        { flex: 1, height: 1, backgroundColor: colors.border },
  divText:        { fontSize: 13, color: colors.inkLight },
  textBtn:        { alignItems: "center", padding: 14 },
  textBtnText:    { fontSize: 14, color: colors.inkMid },
  legal:          { fontSize: 11, color: colors.inkLight, textAlign: "center", lineHeight: 17, paddingTop: 16 },

  // Form screens
  formContent:  { flexGrow: 1, padding: 24, paddingBottom: 48 },
  backRow:      { paddingVertical: 8, marginBottom: 20 },
  backText:     { fontSize: 17, color: colors.slateMid, fontWeight: "500" },
  formTitle:    { fontSize: 30, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.4, marginBottom: 8 },
  formSub:      { fontSize: 15, color: colors.inkMid, lineHeight: 22, marginBottom: 28 },
  fullBtn:      { backgroundColor: colors.sage, borderRadius: radius.lg, paddingVertical: 16, alignItems: "center", marginTop: 8, justifyContent: "center" },
  fullBtnText:  { color: "white", fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
  forgotBtn:    { alignItems: "center", padding: 14 },
  forgotText:   { color: colors.slateMid, fontSize: 14 },
  switchMode:   { alignItems: "center", padding: 14 },
  switchText:   { fontSize: 14, color: colors.inkMid },
  sentBox:      { alignItems: "center", paddingVertical: 28 },
  sentEmoji:    { fontSize: 48, marginBottom: 16 },
  sentTitle:    { fontSize: 22, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", marginBottom: 12 },
  sentBody:     { fontSize: 15, color: colors.inkMid, textAlign: "center", lineHeight: 22, marginBottom: 28 },
});
