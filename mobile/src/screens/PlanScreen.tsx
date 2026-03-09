import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Share, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../store";
import { Card, SectionHeader, OfflineBanner, Divider, SecondaryBtn } from "../components";
import { colors, fonts, radius, shadow } from "../theme";
import Constants from "expo-constants";

export default function PlanScreen() {
  const {
    family, meeting, bag, planSynced, shareToken,
    isOffline, beaconQueued, syncPlan, setPlanSynced,
  } = useStore();

  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    syncPlan();
  }, []);

  const members   = family.filter(m => m.name);
  const locs      = Object.values(meeting).filter(Boolean).length;
  const bagPct    = bag.length ? Math.round((bag.filter(i => i.checked).length / bag.length) * 100) : 0;
  const readiness = Math.min(99, Math.round((members.length > 0 ? 34 : 0) + (locs > 0 ? 33 : 0) + bagPct / 3));

  const meetingRows = [
    { key: "primary",   label: "Primary",    dot: colors.sage },
    { key: "secondary", label: "Backup",     dot: colors.amber },
    { key: "outOfTown", label: "Out of area",dot: colors.terracotta },
  ].filter(r => meeting[r.key as keyof typeof meeting]);

  const handleDownload = async () => {
    if (isOffline) return;
    setDownloading(true);
    // Simulate a download delay then mark synced
    await new Promise(r => setTimeout(r, 900));
    setPlanSynced(true);
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!shareToken) return;
    const base = Constants.expoConfig?.extra?.apiBase ?? "https://your-app.vercel.app";
    await Share.share({ message: `${base}/plan/${shareToken}` });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroSub}>Your family plan</Text>
              <Text style={s.heroTitle}>Ready when{"\n"}you need it.</Text>
            </View>
            <View style={s.shieldIcon}>
              <Text style={{ fontSize: 24 }}>🛡</Text>
            </View>
          </View>
          <View style={s.readinessCard}>
            <View style={s.readinessRow}>
              <Text style={s.readinessLabel}>Overall readiness</Text>
              <Text style={s.readinessPct}>{readiness}%</Text>
            </View>
            <View style={s.readinessBar}>
              <View style={[s.readinessFill, { width: `${readiness}%` as any }]} />
            </View>
          </View>
        </View>

        {/* Offline banner */}
        {isOffline && <OfflineBanner queued={beaconQueued} />}

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: "Members",   val: String(members.length), color: colors.sage },
            { label: "Locations", val: String(locs),           color: colors.amber },
            { label: "Bag",       val: `${bagPct}%`,           color: colors.terracotta },
          ].map(({ label, val, color }) => (
            <Card key={label} style={s.statCard}>
              <Text style={[s.statVal, { color }]}>{val}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </Card>
          ))}
        </View>

        {/* Meeting places */}
        {meetingRows.length > 0 && (
          <View style={s.section}>
            <SectionHeader label="Meeting places" />
            <Card>
              {meetingRows.map(({ key, label, dot }, i) => (
                <React.Fragment key={key}>
                  {i > 0 && <Divider />}
                  <View style={s.meetingRow}>
                    <View style={[s.meetingDot, { backgroundColor: dot }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.meetingLabel}>{label}</Text>
                      <Text style={s.meetingVal}>{meeting[key as keyof typeof meeting]}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </Card>
          </View>
        )}

        {/* Actions */}
        <View style={s.section}>
          <Card>
            {/* Download plan */}
            <TouchableOpacity style={s.actionRow} onPress={handleDownload} disabled={isOffline || downloading}>
              <View style={[s.actionIcon, planSynced && { backgroundColor: colors.sagePale }]}>
                <Text style={{ fontSize: 18 }}>{planSynced ? "✓" : downloading ? "⏳" : "⬇"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle}>{planSynced ? "Plan synced" : "Download plan"}</Text>
                <Text style={s.actionDesc}>
                  {planSynced
                    ? "Up to date · saved to this device"
                    : isOffline
                    ? "Can't download — no signal"
                    : "Save a copy to this device"}
                </Text>
              </View>
              {planSynced && <Text style={{ color: colors.sage, fontSize: 18, fontWeight: "700" }}>✓</Text>}
            </TouchableOpacity>

            <Divider />

            {/* Share plan */}
            <TouchableOpacity style={s.actionRow} onPress={handleShare}>
              <View style={s.actionIcon}>
                <Text style={{ fontSize: 18 }}>↑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle}>Share plan</Text>
                <Text style={s.actionDesc}>Send to family and outside contacts</Text>
              </View>
              <Text style={{ color: colors.inkGhost, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Edit button */}
        <SecondaryBtn label="Edit plan" onPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  scroll:       { flex: 1 },
  content:      { padding: 20, paddingBottom: 40 },
  hero:         { backgroundColor: "#2D4A35", borderRadius: radius.xl, padding: 20, marginBottom: 16, ...shadow.md },
  heroTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  heroSub:      { fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 4 },
  heroTitle:    { fontSize: 28, color: "white", fontFamily: fonts.display, lineHeight: 34, fontWeight: "400" },
  shieldIcon:   { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" },
  readinessCard:{ backgroundColor: "rgba(255,255,255,.09)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,.07)" },
  readinessRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  readinessLabel:{ fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: "500" },
  readinessPct: { fontSize: 22, color: "white", fontFamily: fonts.display, fontWeight: "400" },
  readinessBar: { height: 5, backgroundColor: "rgba(255,255,255,.15)", borderRadius: 3, overflow: "hidden" },
  readinessFill:{ height: "100%", backgroundColor: "rgba(255,255,255,.8)", borderRadius: 3 },
  statsRow:     { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard:     { flex: 1, padding: 14, alignItems: "center" },
  statVal:      { fontSize: 24, fontFamily: fonts.display, fontWeight: "400", marginBottom: 4 },
  statLabel:    { fontSize: 11, color: colors.inkLight },
  section:      { marginBottom: 16 },
  meetingRow:   { flexDirection: "row", alignItems: "flex-start", padding: 14, paddingHorizontal: 18, gap: 12 },
  meetingDot:   { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  meetingLabel: { fontSize: 10, fontWeight: "700", color: colors.inkLight, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  meetingVal:   { fontSize: 13, color: colors.ink, lineHeight: 18 },
  actionRow:    { flexDirection: "row", alignItems: "center", padding: 15, paddingHorizontal: 18, gap: 14 },
  actionIcon:   { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center" },
  actionTitle:  { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 2 },
  actionDesc:   { fontSize: 12, color: colors.inkLight },
});
