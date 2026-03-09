import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../store";
import { Card, Field, PrimaryBtn, SecondaryBtn, SectionHeader, Divider } from "../components";
import { colors, fonts, radius } from "../theme";

// ─── Sub-section types ────────────────────────────────────────────────────────
type Section = null | "name" | "email" | "password" | "delete";

export default function AccountScreen({ onBack }: { onBack: () => void }) {
  const { userEmail, userName, provider, updateProfile, clearAuth, deleteAccount } = useStore();
  const [section, setSection] = useState<Section>(null);
  const [loading, setLoading]  = useState(false);

  // Form state
  const [newName, setNewName]                 = useState(userName ?? "");
  const [newEmail, setNewEmail]               = useState(userEmail ?? "");
  const [currentPass, setCurrentPass]         = useState("");
  const [newPass, setNewPass]                 = useState("");
  const [confirmPass, setConfirmPass]         = useState("");
  const [deleteInput, setDeleteInput]         = useState("");
  const [deletePassInput, setDeletePassInput] = useState("");

  const isOAuth = provider === "apple" || provider === "google";
  const providerLabel = provider === "apple" ? "Apple" : provider === "google" ? "Google" : "email";

  const reset = () => {
    setSection(null);
    setCurrentPass(""); setNewPass(""); setConfirmPass(""); setDeleteInput(""); setDeletePassInput("");
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await updateProfile({ name: newName.trim() });
      reset();
      Alert.alert("Updated", "Your name has been changed.");
    } catch (e: any) {
      Alert.alert("Couldn't update", e.message);
    } finally { setLoading(false); }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim() || !currentPass) return;
    setLoading(true);
    try {
      await updateProfile({ email: newEmail.trim(), currentPassword: currentPass });
      reset();
      Alert.alert("Updated", "Your email has been changed.");
    } catch (e: any) {
      Alert.alert("Couldn't update", e.message);
    } finally { setLoading(false); }
  };

  const handleUpdatePassword = async () => {
    if (!currentPass || !newPass || newPass !== confirmPass) {
      Alert.alert("Check your passwords", newPass !== confirmPass ? "New passwords don't match." : "All fields are required.");
      return;
    }
    if (newPass.length < 8) { Alert.alert("Password too short", "Use at least 8 characters."); return; }
    setLoading(true);
    try {
      await updateProfile({ currentPassword: currentPass, newPassword: newPass });
      reset();
      Alert.alert("Updated", "Your password has been changed.");
    } catch (e: any) {
      Alert.alert("Couldn't update", e.message);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (deleteInput !== "DELETE") {
      Alert.alert("Type DELETE to confirm"); return;
    }
    setLoading(true);
    try {
      await deleteAccount(isOAuth ? undefined : deletePassInput || undefined);
      // clearAuth is called inside deleteAccount action
    } catch (e: any) {
      Alert.alert("Couldn't delete account", e.message);
    } finally { setLoading(false); }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", "Your plan is saved on this device and on the server.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: clearAuth },
    ]);
  };

  // ── Section modals ──────────────────────────────────────────────────────────
  const renderModal = () => {
    const modalProps = { visible: section !== null, animationType: "slide" as const, presentationStyle: "pageSheet" as const };

    if (section === "name") return (
      <Modal {...modalProps}>
        <ModalShell title="Change name" onClose={reset}>
          <Field label="Name" value={newName} onChange={setNewName} placeholder="Your full name" />
          <PrimaryBtn label="Save name" onPress={handleUpdateName} loading={loading} disabled={!newName.trim()} />
        </ModalShell>
      </Modal>
    );

    if (section === "email") return (
      <Modal {...modalProps}>
        <ModalShell title="Change email" onClose={reset}>
          <Field label="New email" value={newEmail} onChange={setNewEmail} placeholder="you@example.com" type="email-address" />
          <Field label="Current password" value={currentPass} onChange={setCurrentPass} placeholder="Confirm your password" />
          <PrimaryBtn label="Save email" onPress={handleUpdateEmail} loading={loading} disabled={!newEmail || !currentPass} />
          <Text style={s.modalNote}>We'll verify your new email address before making the change.</Text>
        </ModalShell>
      </Modal>
    );

    if (section === "password") return (
      <Modal {...modalProps}>
        <ModalShell title="Change password" onClose={reset}>
          <Field label="Current password" value={currentPass} onChange={setCurrentPass} placeholder="Your current password" />
          <Field label="New password" value={newPass} onChange={setNewPass} placeholder="8+ characters" />
          <Field label="Confirm new password" value={confirmPass} onChange={setConfirmPass} placeholder="Same as above" />
          {newPass && confirmPass && newPass !== confirmPass && (
            <Text style={s.matchError}>Passwords don't match</Text>
          )}
          <PrimaryBtn label="Save password" onPress={handleUpdatePassword} loading={loading} disabled={!currentPass || !newPass || !confirmPass} />
        </ModalShell>
      </Modal>
    );

    if (section === "delete") return (
      <Modal {...modalProps}>
        <ModalShell title="Delete account" onClose={reset}>
          <View style={s.deleteWarning}>
            <Text style={s.deleteWarningTitle}>This cannot be undone.</Text>
            <Text style={s.deleteWarningBody}>
              Deleting your account will permanently erase your plan, contacts, and all your data from our servers. Your local device copy will also be cleared.
            </Text>
          </View>
          {!isOAuth && (
            <Field label="Your password" value={deletePassInput} onChange={setDeletePassInput} placeholder="Confirm your password" />
          )}
          <Field
            label='Type "DELETE" to confirm'
            value={deleteInput}
            onChange={setDeleteInput}
            placeholder="DELETE"
            hint="All caps, exactly as shown"
          />
          <PrimaryBtn
            label="Delete my account"
            onPress={handleDelete}
            loading={loading}
            disabled={deleteInput !== "DELETE" || (!isOAuth && !deletePassInput)}
            color={colors.alert}
          />
        </ModalShell>
      </Modal>
    );

    return null;
  };

  // ── Main screen ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.navRow}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Account</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={s.profileHero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(userName || userEmail || "?")[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.profileName}>{userName || "—"}</Text>
            <Text style={s.profileEmail}>{userEmail || "No email on file"}</Text>
            <View style={s.providerBadge}>
              <Text style={s.providerBadgeText}>
                {provider === "apple" ? " Apple" : provider === "google" ? "G Google" : "✉ Email"} account
              </Text>
            </View>
          </View>
        </View>

        {/* Profile details */}
        <SectionHeader label="Profile" />
        <Card style={s.cardList}>
          <ActionRow label="Name" value={userName || "Not set"} onPress={() => setSection("name")} />
          {!isOAuth && (
            <>
              <Divider />
              <ActionRow label="Email" value={userEmail || "Not set"} onPress={() => setSection("email")} />
            </>
          )}
          {isOAuth && (
            <>
              <Divider />
              <View style={s.oauthRow}>
                <Text style={s.oauthLabel}>Signed in with</Text>
                <Text style={s.oauthValue}>{providerLabel}</Text>
              </View>
            </>
          )}
        </Card>

        {/* Security — only for email users */}
        {!isOAuth && (
          <>
            <SectionHeader label="Security" />
            <Card style={[s.cardList, { marginBottom: 24 }]}>
              <ActionRow label="Password" value="••••••••" onPress={() => setSection("password")} />
            </Card>
          </>
        )}

        {/* Sign out */}
        <SectionHeader label="Session" />
        <Card style={[s.cardList, { marginBottom: 24 }]}>
          <TouchableOpacity style={s.signOutRow} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </Card>

        {/* Danger zone */}
        <SectionHeader label="Danger zone" />
        <Card style={s.cardList}>
          <TouchableOpacity style={s.deleteRow} onPress={() => setSection("delete")}>
            <View>
              <Text style={s.deleteRowTitle}>Delete account</Text>
              <Text style={s.deleteRowSub}>Permanently delete all your data</Text>
            </View>
            <Text style={s.deleteRowChevron}>›</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {renderModal()}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <SafeAreaView style={m.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={m.header}>
          <Text style={m.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <Text style={m.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={m.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActionRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.actionRow} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={s.actionLabel}>{label}</Text>
        <Text style={s.actionValue}>{value}</Text>
      </View>
      <Text style={s.actionChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  navRow:       { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 4 },
  backBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center" },
  backBtnText:  { fontSize: 22, color: colors.inkMid, lineHeight: 26 },
  navTitle:     { flex: 1, textAlign: "center", fontSize: 17, fontFamily: fonts.display, color: colors.inkMid, fontWeight: "400" },
  scroll:       { flex: 1 },
  content:      { padding: 20, paddingBottom: 48 },
  profileHero:  { flexDirection: "row", gap: 16, alignItems: "center", paddingVertical: 20, marginBottom: 8 },
  avatar:       { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.sagePale, alignItems: "center", justifyContent: "center" },
  avatarText:   { fontSize: 26, fontWeight: "700", color: colors.sage },
  profileName:  { fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 2 },
  profileEmail: { fontSize: 13, color: colors.inkMid, marginBottom: 6 },
  providerBadge:{ backgroundColor: colors.bgDeep, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  providerBadgeText:{ fontSize: 11, color: colors.inkLight, fontWeight: "600" },
  cardList:     { overflow: "hidden", marginBottom: 20 },
  actionRow:    { flexDirection: "row", alignItems: "center", padding: 15, paddingHorizontal: 18 },
  actionLabel:  { fontSize: 12, fontWeight: "600", color: colors.inkLight, marginBottom: 2 },
  actionValue:  { fontSize: 14, color: colors.ink },
  actionChevron:{ fontSize: 20, color: colors.inkGhost, marginLeft: 8 },
  oauthRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, paddingHorizontal: 18 },
  oauthLabel:   { fontSize: 14, color: colors.inkMid },
  oauthValue:   { fontSize: 14, color: colors.ink, fontWeight: "500" },
  signOutRow:   { padding: 15, paddingHorizontal: 18 },
  signOutText:  { fontSize: 14, fontWeight: "500", color: colors.alert },
  deleteRow:    { flexDirection: "row", alignItems: "center", padding: 15, paddingHorizontal: 18 },
  deleteRowTitle:{ fontSize: 14, fontWeight: "500", color: colors.alert, marginBottom: 2 },
  deleteRowSub: { fontSize: 12, color: colors.inkLight },
  deleteRowChevron:{ fontSize: 20, color: colors.inkGhost, marginLeft: "auto" },
  deleteWarning:{ backgroundColor: colors.alertPale, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.alertLight },
  deleteWarningTitle:{ fontSize: 14, fontWeight: "700", color: colors.alert, marginBottom: 6 },
  deleteWarningBody:{ fontSize: 13, color: colors.inkMid, lineHeight: 19 },
  matchError:   { fontSize: 12, color: colors.alert, marginBottom: 10, marginTop: -8 },
  modalNote:    { fontSize: 12, color: colors.inkLight, textAlign: "center", marginTop: 12, lineHeight: 18 },
});

const m = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 8 },
  title:     { fontSize: 24, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.3 },
  closeBtn:  { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center" },
  closeBtnText:{ fontSize: 16, color: colors.inkLight },
  content:   { padding: 20, paddingBottom: 48, gap: 0 },
});
