import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../store";
import { Card, SectionHeader, ToggleRow, Divider } from "../components";
import { colors, fonts, radius } from "../theme";

interface Props {
  onOpenAccount: () => void;
}

export default function SettingsScreen({ onOpenAccount }: Props) {
  const { prefs, updatePref, userEmail, userName, provider, clearAuth, planUpdatedAt, contacts } = useStore();

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", "Your plan is saved on this device and on the server.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: clearAuth },
    ]);
  };

  const providerLabel = provider === "apple" ? "Apple" : provider === "google" ? "Google" : "Email";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.headerRow}>
        <Text style={s.title}>Settings</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Account card — tap to open account management */}
        <TouchableOpacity onPress={onOpenAccount} activeOpacity={0.75} style={s.accountCard}>
          <View style={s.accountAvatar}>
            <Text style={s.accountAvatarText}>{(userName || userEmail || "?")[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.accountName}>{userName || "Account"}</Text>
            <Text style={s.accountEmail}>{userEmail || `Signed in with ${providerLabel}`}</Text>
          </View>
          <Text style={s.accountChevron}>›</Text>
        </TouchableOpacity>

        {/* Notifications */}
        <SectionHeader label="Notifications" />
        <Card style={{ marginBottom: 22 }}>
          <ToggleRow
            label="Auto-alert if signal is lost"
            desc="We'll send your location if your phone goes offline for more than a few minutes"
            value={prefs.autoAlert}
            onChange={v => updatePref("autoAlert", v)}
          />
          <Divider />
          <ToggleRow
            label="Notify contacts when plan changes"
            desc="A brief message when you update your plan"
            value={prefs.notifyOnChange}
            onChange={v => updatePref("notifyOnChange", v)}
          />
          <Divider />
          <ToggleRow
            label="Quiet hours (10pm – 7am)"
            desc="Hold non-emergency notifications until morning"
            value={prefs.quietHours}
            onChange={v => updatePref("quietHours", v)}
          />
        </Card>

        {/* Location */}
        <SectionHeader label="Location" />
        <Card style={{ marginBottom: 22 }}>
          <ToggleRow
            label="Use approximate location"
            desc="Shares your neighbourhood rather than your exact address"
            value={prefs.reduceLocation}
            onChange={v => updatePref("reduceLocation", v)}
          />
          <Divider />
          <ToggleRow
            label="Use satellite if available"
            desc="Tries a satellite connection as a last resort when all signals are down"
            value={prefs.satelliteFallback}
            onChange={v => updatePref("satelliteFallback", v)}
          />
        </Card>

        {/* Safety */}
        <SectionHeader label="Safety" />
        <Card style={{ marginBottom: 22 }}>
          <ToggleRow
            label="Confirm before sending alert"
            desc="Shows a 5-second countdown so you can't alert by accident"
            value={prefs.confirmBeforeAlert}
            onChange={v => updatePref("confirmBeforeAlert", v)}
          />
        </Card>

        {/* App info */}
        <SectionHeader label="About" />
        <Card style={{ marginBottom: 22 }}>
          {[
            { label: "Plan last updated", val: formatDate(planUpdatedAt) },
            { label: "Contacts",          val: `${contacts.length} ${contacts.length === 1 ? "person" : "people"}` },
            { label: "Local plan copy",   val: "Saved · encrypted" },
            { label: "Version",           val: "1.0 · Sprint 3" },
          ].map(({ label, val }, i) => (
            <View key={label} style={[s.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoVal} numberOfLines={1}>{val}</Text>
            </View>
          ))}
        </Card>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  headerRow:   { padding: 20, paddingBottom: 8 },
  title:       { fontSize: 28, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.4 },
  scroll:      { flex: 1 },
  content:     { padding: 20, paddingTop: 8, paddingBottom: 48 },
  accountCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.canvas, borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  accountAvatar:    { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  accountAvatarText:{ fontSize: 20, fontWeight: "700", color: colors.sage },
  accountName: { fontSize: 15, fontWeight: "600", color: colors.ink, marginBottom: 2 },
  accountEmail:{ fontSize: 12, color: colors.inkLight },
  accountChevron:{ fontSize: 22, color: colors.inkGhost },
  infoRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, paddingHorizontal: 18 },
  infoLabel:   { fontSize: 13, color: colors.inkMid },
  infoVal:     { fontSize: 13, color: colors.ink, fontWeight: "500", maxWidth: 180, textAlign: "right" },
  signOutBtn:  { borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, padding: 15, alignItems: "center" },
  signOutText: { color: colors.inkMid, fontSize: 15, fontWeight: "500" },
});
