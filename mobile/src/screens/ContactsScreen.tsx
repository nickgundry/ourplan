import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore, Contact } from "../store";
import {
  Card, SectionHeader, Field, PrimaryBtn, SecondaryBtn, Divider, ToggleRow,
} from "../components";
import { colors, radius, shadow, fonts } from "../theme";

const EMPTY_FORM = { name: "", phone: "", relation: "", outside: false };

export default function ContactsScreen() {
  const { contacts, syncContacts, addContact, removeContact, isOffline } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => { syncContacts(); }, []);

  const local   = contacts.filter(c => !c.outside);
  const outside = contacts.filter(c => c.outside);

  const handleAdd = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      await addContact(form);
      setForm({ ...EMPTY_FORM });
      setModalOpen(false);
    } catch (e: any) {
      Alert.alert("Couldn't add contact", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (c: Contact) => {
    Alert.alert(`Remove ${c.name}?`, "They won't receive future alerts.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeContact(c.id) },
    ]);
  };

  const ContactRow = ({ c, last }: { c: Contact; last: boolean }) => (
    <>
      <View style={s.contactRow}>
        <View style={[s.avatar, c.outside && { backgroundColor: colors.purplePale }]}>
          <Text style={[s.avatarText, { color: c.outside ? colors.purple : colors.inkMid }]}>
            {c.name[0] || "?"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.contactName}>{c.name}</Text>
          <Text style={s.contactSub}>{c.phone}{c.relation ? ` · ${c.relation}` : ""}</Text>
        </View>
        <TouchableOpacity onPress={() => handleRemove(c)} style={s.removeBtn}>
          <Text style={s.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      {!last && <Divider />}
    </>
  );

  const EmptySection = ({ text }: { text: string }) => (
    <View style={s.emptyBox}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Who should{"\n"}we call?</Text>
          <Text style={s.subtitle}>
            If you send an alert, these people will be notified with your location and your plan.
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalOpen(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Local contacts */}
        <SectionHeader label="Family & nearby" />
        {local.length === 0
          ? <EmptySection text="Add the people in your household or nearby" />
          : <Card style={s.cardList}>
              {local.map((c, i) => <ContactRow key={c.id} c={c} last={i === local.length - 1} />)}
            </Card>
        }

        {/* Outside contacts */}
        <View style={{ marginTop: 24 }}>
          <SectionHeader label="Outside your area" />

          {/* Recommendation callout */}
          <View style={s.callout}>
            <Text style={s.calloutText}>
              <Text style={{ fontWeight: "700", color: colors.ink }}>We recommend adding someone who lives far away. </Text>
              If local networks go down, an outside contact can still receive your plan and help coordinate with emergency services.
            </Text>
          </View>

          {outside.length === 0
            ? <EmptySection text="A relative or friend in another city works well" />
            : <Card style={s.cardList}>
                {outside.map((c, i) => <ContactRow key={c.id} c={c} last={i === outside.length - 1} />)}
              </Card>
          }
        </View>
      </ScrollView>

      {/* Add contact modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={s.modal} edges={["top", "bottom"]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add contact</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={s.closeBtn}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalScroll} contentContainerStyle={s.modalContent}>
              <Field label="Name" placeholder="Jane Smith" value={form.name}
                onChange={v => setForm({ ...form, name: v })} />
              <Field label="Phone number" placeholder="+1 555 000 0000" value={form.phone}
                onChange={v => setForm({ ...form, phone: v })} type="phone-pad" />
              <Field label="Relationship (optional)" placeholder="Mom, neighbor, colleague…" value={form.relation}
                onChange={v => setForm({ ...form, relation: v })} />

              {/* Outside toggle */}
              <TouchableOpacity
                onPress={() => setForm({ ...form, outside: !form.outside })}
                style={[s.outsideToggle, form.outside && s.outsideToggleActive]}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={s.outsideToggleLabel}>They live outside this area</Text>
                  <Text style={s.outsideToggleDesc}>
                    Good for a relative in another city — they can help even if local networks are down
                  </Text>
                </View>
                <View style={[s.pill, form.outside && s.pillActive]}>
                  {form.outside && <Text style={s.pillCheck}>✓</Text>}
                </View>
              </TouchableOpacity>

              <View style={{ marginTop: 8 }}>
                <PrimaryBtn
                  label="Add contact"
                  onPress={handleAdd}
                  disabled={!form.name || !form.phone}
                  loading={saving}
                />
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, paddingBottom: 12 },
  title:        { fontSize: 28, fontFamily: fonts.display, color: colors.ink, letterSpacing: -0.4, lineHeight: 34, fontWeight: "400", marginBottom: 8 },
  subtitle:     { fontSize: 14, color: colors.inkMid, lineHeight: 20, maxWidth: 260 },
  addBtn:       { backgroundColor: colors.sage, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:   { color: "white", fontSize: 13, fontWeight: "600" },
  scroll:       { flex: 1 },
  content:      { padding: 20, paddingTop: 4, paddingBottom: 40 },
  cardList:     { overflow: "hidden" },
  contactRow:   { flexDirection: "row", alignItems: "center", padding: 14, paddingHorizontal: 18, gap: 12 },
  avatar:       { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center" },
  avatarText:   { fontSize: 17, fontWeight: "600" },
  contactName:  { fontSize: 15, fontWeight: "600", color: colors.ink, marginBottom: 2 },
  contactSub:   { fontSize: 12, color: colors.inkLight },
  removeBtn:    { padding: 6 },
  removeBtnText:{ fontSize: 16, color: colors.inkGhost },
  emptyBox:     { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: 20, alignItems: "center", borderWidth: 1.5, borderColor: colors.borderMid, borderStyle: "dashed" },
  emptyText:    { fontSize: 13, color: colors.inkLight, textAlign: "center" },
  callout:      { backgroundColor: colors.purplePale, borderWidth: 1, borderColor: colors.purpleLight, borderRadius: 16, padding: 14, marginBottom: 12 },
  calloutText:  { fontSize: 13, color: colors.inkMid, lineHeight: 19 },
  modal:        { flex: 1, backgroundColor: colors.bg },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 8 },
  modalTitle:   { fontSize: 24, fontFamily: fonts.display, color: colors.ink, fontWeight: "400", letterSpacing: -0.3 },
  closeBtn:     { padding: 6 },
  closeBtnText: { fontSize: 20, color: colors.inkLight },
  modalScroll:  { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 40 },
  outsideToggle:{ borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 8 },
  outsideToggleActive: { borderColor: colors.purple, backgroundColor: colors.purplePale },
  outsideToggleLabel:  { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 3 },
  outsideToggleDesc:   { fontSize: 12, color: colors.inkLight, lineHeight: 17 },
  pill:         { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  pillActive:   { backgroundColor: colors.purple, borderColor: colors.purple },
  pillCheck:    { color: "white", fontSize: 13, fontWeight: "700" },
});
