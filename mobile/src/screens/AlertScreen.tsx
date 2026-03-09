import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Animated, Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../store";
import { useLocation } from "../hooks/useLocation";
import { Card, SectionHeader, PrimaryBtn, SecondaryBtn, OfflineBanner, Divider } from "../components";
import { colors, fonts, radius, shadow } from "../theme";

type Phase = "idle" | "confirm" | "sending" | "sent";

export default function AlertScreen() {
  const { contacts, isOffline, sendBeacon, queueBeacon, beaconQueued, prefs } = useStore();
  const { getLocation, loading: locLoading } = useLocation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(5);
  const [notified, setNotified] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown
  useEffect(() => {
    if (phase !== "confirm") return;
    if (countdown === 0) { handleSend(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  // Pulse animation for sending state
  useEffect(() => {
    if (phase !== "sending") return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 2800, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start();
  }, [phase]);

  const reset = () => { setPhase("idle"); setCountdown(5); progressAnim.setValue(0); };

  const handleSend = async () => {
    setPhase("sending");
    try {
      const loc = await getLocation();
      if (isOffline || !loc) {
        // Queue for later
        queueBeacon(loc?.lat ?? 0, loc?.lng ?? 0);
        await new Promise(r => setTimeout(r, 1500));
        setNotified(0);
      } else {
        const result = await sendBeacon(loc);
        setNotified(result.notified);
      }
      setPhase("sent");
    } catch {
      setPhase("sent");
      setNotified(0);
    }
  };

  // ── Sent ──
  if (phase === "sent") return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.centeredFull}>
        <View style={s.successIcon}>
          <Text style={{ fontSize: 36 }}>✓</Text>
        </View>
        <Text style={s.sentTitle}>{isOffline || beaconQueued ? "Alert queued." : "Alert sent."}</Text>
        <Text style={s.sentBody}>
          {isOffline || beaconQueued
            ? "We'll send it the moment you're back online — even a brief connection is enough."
            : `${notified} ${notified === 1 ? "person has" : "people have"} been notified with your location and your plan.`}
        </Text>

        {contacts.length > 0 && (
          <Card style={s.sentContacts}>
            <Text style={s.sentContactsHeader}>{isOffline ? "Will notify" : "Notified"}</Text>
            {contacts.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <View style={s.miniDivider} />}
                <View style={s.sentContactRow}>
                  <View style={[s.dot, { backgroundColor: isOffline ? colors.amber : colors.sage }]} />
                  <Text style={s.sentContactName}>{c.name}</Text>
                  <Text style={s.sentContactStatus}>{isOffline ? "Queued" : "Notified"}</Text>
                </View>
              </React.Fragment>
            ))}
          </Card>
        )}

        <PrimaryBtn label="Done" onPress={reset} />
      </View>
    </SafeAreaView>
  );

  // ── Sending ──
  if (phase === "sending") return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.centeredFull}>
        <Animated.View style={[s.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={s.pulseIcon}>
          <Text style={{ fontSize: 32 }}>🔔</Text>
        </View>
        <Text style={s.sendingTitle}>Sending alert…</Text>
        <View style={s.progressBar}>
          <Animated.View style={[s.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          }]} />
        </View>
      </View>
    </SafeAreaView>
  );

  // ── Confirm ──
  if (phase === "confirm") return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={reset} style={s.backBtn}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Confirm alert</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={s.confirmContent}>
        {/* Countdown ring */}
        <View style={s.countdownWrap}>
          <View style={s.countdownCircle}>
            <Text style={s.countdownNum}>{countdown}</Text>
          </View>
          <Text style={s.countdownTitle}>Sending in {countdown}s…</Text>
          <Text style={s.countdownSub}>
            Your location and plan will go to {contacts.length} {contacts.length === 1 ? "person" : "people"}.
          </Text>
        </View>

        {contacts.length > 0 && (
          <View style={s.section}>
            <SectionHeader label="Who's being notified" />
            <Card>
              {contacts.map((c, i) => (
                <React.Fragment key={c.id}>
                  {i > 0 && <View style={s.miniDivider} />}
                  <View style={s.confirmContactRow}>
                    <View style={s.greenDot} />
                    <Text style={s.confirmContactName}>{c.name}{c.relation ? ` · ${c.relation}` : ""}</Text>
                  </View>
                </React.Fragment>
              ))}
            </Card>
          </View>
        )}

        {isOffline && (
          <View style={s.offlineNote}>
            <Text style={s.offlineNoteText}>You're offline. Your alert will queue and send as soon as signal returns.</Text>
          </View>
        )}

        <View style={s.confirmButtons}>
          <View style={{ flex: 1 }}><SecondaryBtn label="Cancel" onPress={reset} /></View>
          <View style={{ flex: 1 }}><PrimaryBtn label="Send now" onPress={handleSend} color={colors.slate} /></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // ── Idle ──
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.idleContent} showsVerticalScrollIndicator={false}>
        {isOffline && <OfflineBanner />}

        {/* Big send button — the hero */}
        <TouchableOpacity
          onPress={() => {
            if (contacts.length === 0) {
              Alert.alert("No contacts yet", "Add contacts in the Contacts tab so they're notified when you send an alert.");
              return;
            }
            if (prefs.confirmBeforeAlert) {
              setPhase("confirm");
            } else {
              handleSend();
            }
          }}
          activeOpacity={0.85}
          style={s.sendBtn}
        >
          <View style={s.sendBtnIcon}>
            <Text style={{ fontSize: 30 }}>🔔</Text>
          </View>
          <Text style={s.sendBtnTitle}>Send alert</Text>
          <Text style={s.sendBtnSub}>
            {contacts.length === 0
              ? "Add contacts first"
              : `Notifies ${contacts.length} ${contacts.length === 1 ? "person" : "people"} with your location`}
          </Text>
        </TouchableOpacity>

        {/* What happens */}
        <View style={s.section}>
          <SectionHeader label="What happens" />
          <Card>
            {[
              { text: "We note where you are right now." },
              { text: "Everyone on your contacts list gets your plan and your location." },
              { text: "If you're offline, it sends the moment any signal is available." },
            ].map(({ text }, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={s.miniDivider} />}
                <View style={s.whatRow}>
                  <View style={s.whatNum}><Text style={s.whatNumText}>{i + 1}</Text></View>
                  <Text style={s.whatText}>{text}</Text>
                </View>
              </React.Fragment>
            ))}
          </Card>
        </View>

        {/* Contact preview */}
        {contacts.length > 0 && (
          <View style={s.section}>
            <SectionHeader label="Will notify" />
            <Card>
              {contacts.map((c, i) => (
                <React.Fragment key={c.id}>
                  {i > 0 && <View style={s.miniDivider} />}
                  <View style={s.confirmContactRow}>
                    <View style={s.greenDot} />
                    <Text style={s.confirmContactName}>{c.name}</Text>
                    {c.relation ? <Text style={s.confirmContactSub}>{c.relation}</Text> : null}
                  </View>
                </React.Fragment>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 8 },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center" },
  backBtnText:  { fontSize: 22, color: colors.inkMid, lineHeight: 26 },
  navTitle:     { flex: 1, textAlign: "center", fontSize: 17, fontFamily: fonts.display, color: colors.inkMid, fontWeight: "400" },
  idleContent:  { padding: 20, paddingBottom: 40 },
  confirmContent:{ padding: 20, paddingBottom: 40 },
  section:      { marginBottom: 16 },
  sendBtn:      { backgroundColor: colors.slate, borderRadius: 24, padding: 24, alignItems: "center", marginBottom: 28, ...shadow.md },
  sendBtnIcon:  { width: 56, height: 56, borderRadius: 20, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  sendBtnTitle: { fontSize: 28, color: "white", fontFamily: fonts.display, fontWeight: "400", letterSpacing: -0.3, marginBottom: 6 },
  sendBtnSub:   { fontSize: 14, color: "rgba(255,255,255,.65)", textAlign: "center" },
  miniDivider:  { height: 1, backgroundColor: colors.border },
  whatRow:      { flexDirection: "row", alignItems: "flex-start", padding: 14, paddingHorizontal: 18, gap: 12 },
  whatNum:      { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  whatNumText:  { fontSize: 12, fontWeight: "700", color: colors.slateMid },
  whatText:     { fontSize: 14, color: colors.inkMid, lineHeight: 20, flex: 1, paddingTop: 2 },
  confirmContactRow: { flexDirection: "row", alignItems: "center", padding: 12, paddingHorizontal: 18, gap: 10 },
  greenDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sage },
  confirmContactName:{ fontSize: 14, color: colors.ink, fontWeight: "500", flex: 1 },
  confirmContactSub: { fontSize: 12, color: colors.inkLight },
  offlineNote:  { backgroundColor: colors.amberPale, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.amberLight + "60" },
  offlineNoteText:{ fontSize: 13, color: colors.inkMid, lineHeight: 19 },
  confirmButtons:{ flexDirection: "row", gap: 10, marginTop: 8 },
  countdownWrap:{ alignItems: "center", paddingVertical: 28 },
  countdownCircle:{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.slate, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  countdownNum: { fontSize: 28, fontFamily: fonts.display, color: colors.slate, fontWeight: "400" },
  countdownTitle:{ fontSize: 24, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.4, marginBottom: 6 },
  countdownSub: { fontSize: 14, color: colors.inkMid, textAlign: "center" },
  // sending/sent
  centeredFull: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  pulseRing:    { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: colors.sageLight, opacity: 0.5 },
  pulseIcon:    { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  sendingTitle: { fontSize: 24, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.4, marginBottom: 24, textAlign: "center" },
  progressBar:  { width: "100%", height: 4, backgroundColor: colors.bgDeep, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.sage, borderRadius: 2 },
  successIcon:  { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  sentTitle:    { fontSize: 32, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.5, textAlign: "center", marginBottom: 12 },
  sentBody:     { fontSize: 15, color: colors.inkMid, lineHeight: 22, textAlign: "center", marginBottom: 28, maxWidth: 280 },
  sentContacts: { width: "100%", marginBottom: 24 },
  sentContactsHeader:{ fontSize: 11, fontWeight: "700", color: colors.inkLight, letterSpacing: 0.5, textTransform: "uppercase", padding: 12, paddingHorizontal: 18 },
  sentContactRow:{ flexDirection: "row", alignItems: "center", padding: 11, paddingHorizontal: 18, gap: 12 },
  dot:          { width: 7, height: 7, borderRadius: 4 },
  sentContactName:{ flex: 1, fontSize: 14, color: colors.ink },
  sentContactStatus:{ fontSize: 12, color: colors.inkLight, fontWeight: "500" },
});
