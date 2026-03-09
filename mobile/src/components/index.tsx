import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Switch, ViewStyle, TextStyle,
} from "react-native";
import { colors, radius, shadow, fonts } from "../theme";

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({
  children, style, onPress,
}: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) => {
  const content = (
    <View style={[styles.card, style]}>{children}</View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{content}</TouchableOpacity>;
  return content;
};

// ─── Primary button ───────────────────────────────────────────────────────────
export const PrimaryBtn = ({
  label, onPress, disabled, loading, color = colors.sage,
}: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean; color?: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
    style={[styles.primaryBtn, { backgroundColor: disabled ? colors.inkGhost : color }]}
  >
    {loading
      ? <ActivityIndicator color="white" size="small" />
      : <Text style={styles.primaryBtnText}>{label}</Text>}
  </TouchableOpacity>
);

// ─── Secondary button ─────────────────────────────────────────────────────────
export const SecondaryBtn = ({
  label, onPress,
}: { label: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.secondaryBtn}>
    <Text style={styles.secondaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

// ─── Section header ───────────────────────────────────────────────────────────
export const SectionHeader = ({ label }: { label: string }) => (
  <Text style={styles.sectionHeader}>{label.toUpperCase()}</Text>
);

// ─── Field ────────────────────────────────────────────────────────────────────
export const Field = ({
  label, placeholder, value, onChange, type = "default", hint, multiline,
}: {
  label?: string; placeholder?: string; value: string;
  onChange: (v: string) => void; type?: TextInput["props"]["keyboardType"];
  hint?: string; multiline?: boolean;
}) => (
  <View style={{ marginBottom: 14 }}>
    {label && <Text style={styles.fieldLabel}>{label}</Text>}
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.inkGhost}
      keyboardType={type}
      multiline={multiline}
      style={[styles.field, multiline && { height: 80, textAlignVertical: "top" }]}
    />
    {hint && <Text style={styles.fieldHint}>{hint}</Text>}
  </View>
);

// ─── Row toggle ───────────────────────────────────────────────────────────────
export const ToggleRow = ({
  label, desc, value, onChange,
}: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) => (
  <View style={styles.toggleRow}>
    <View style={{ flex: 1, marginRight: 12 }}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {desc && <Text style={styles.toggleDesc}>{desc}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.inkGhost, true: colors.sage }}
      thumbColor="white"
    />
  </View>
);

// ─── Pill ─────────────────────────────────────────────────────────────────────
export const Pill = ({
  label, bg = colors.sagePale, text = colors.sage,
}: { label: string; bg?: string; text?: string }) => (
  <View style={[styles.pill, { backgroundColor: bg }]}>
    <Text style={[styles.pillText, { color: text }]}>{label}</Text>
  </View>
);

// ─── Offline banner ───────────────────────────────────────────────────────────
export const OfflineBanner = ({ queued }: { queued?: boolean }) => (
  <View style={styles.offlineBanner}>
    <Text style={styles.offlineBannerText}>
      {queued
        ? "Alert queued — will send when signal returns"
        : "No signal — your plan is still here"}
    </Text>
  </View>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
export const Divider = ({ style }: { style?: ViewStyle }) => (
  <View style={[styles.divider, style]} />
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.canvas,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.sm,
  },
  primaryBtn: {
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.inkMid,
    fontSize: 15,
    fontWeight: "500",
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkLight,
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkMid,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  field: {
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 4,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.ink,
    marginBottom: 3,
  },
  toggleDesc: {
    fontSize: 12,
    color: colors.inkLight,
    lineHeight: 17,
  },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  offlineBanner: {
    backgroundColor: colors.amberPale,
    borderWidth: 1,
    borderColor: colors.amberLight + "70",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    fontSize: 13,
    color: colors.inkMid,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
