import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as api from "../api";

export interface FamilyMember { id: string; name: string; conditions: string; meds: string; }
export interface MeetingPlaces { primary: string; secondary: string; outOfTown: string; shelter: string; }
export interface BagItem { id: string; cat: string; label: string; checked: boolean; }
export interface Contact { id: string; name: string; phone: string; relation: string; outside: boolean; }
export interface Prefs {
  autoAlert: boolean; notifyOnChange: boolean; quietHours: boolean;
  reduceLocation: boolean; satelliteFallback: boolean; confirmBeforeAlert: boolean;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  provider: string | null; // 'email' | 'apple' | 'google'

  // Plan
  planId: string | null;
  shareToken: string | null;
  family: FamilyMember[];
  meeting: MeetingPlaces;
  bag: BagItem[];
  planUpdatedAt: string | null;
  planSynced: boolean;

  // Contacts
  contacts: Contact[];

  // Network
  isOffline: boolean;
  beaconQueued: boolean;
  queuedBeacon: { lat: number; lng: number; queuedAt: string } | null;

  // Prefs
  prefs: Prefs;

  // Actions
  setAuth: (userId: string, email: string | null, name: string | null, provider?: string) => void;
  setOnboardingComplete: () => void;
  clearAuth: () => void;
  loadFromStorage: () => Promise<void>;
  syncPlan: () => Promise<void>;
  savePlanLocally: (updates: Partial<{ family: FamilyMember[]; meeting: MeetingPlaces; bag: BagItem[] }>) => Promise<void>;
  syncContacts: () => Promise<void>;
  addContact: (contact: Omit<Contact, "id">) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  setOffline: (offline: boolean) => void;
  queueBeacon: (lat: number, lng: number) => void;
  sendBeacon: (lat: number, lng: number) => Promise<{ notified: number }>;
  flushQueuedBeacon: () => Promise<void>;
  updatePref: (key: keyof Prefs, value: boolean) => void;
  setPlanSynced: (v: boolean) => void;
  updateProfile: (updates: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}

const DEFAULT_BAG: BagItem[] = [
  { id: "1",  cat: "Water",   label: "1 gallon of water per person, per day",   checked: false },
  { id: "2",  cat: "Food",    label: "3-day supply of non-perishable food",      checked: false },
  { id: "3",  cat: "Comms",   label: "Battery or hand-crank radio",              checked: false },
  { id: "4",  cat: "Light",   label: "Flashlight and extra batteries",           checked: false },
  { id: "5",  cat: "Medical", label: "First aid kit",                            checked: false },
  { id: "6",  cat: "Medical", label: "7-day supply of prescription medications", checked: false },
  { id: "7",  cat: "Docs",    label: "Copies of important documents",            checked: false },
  { id: "8",  cat: "Tools",   label: "Multi-tool or adjustable wrench",          checked: false },
  { id: "9",  cat: "Power",   label: "Portable phone charger — fully charged",   checked: false },
  { id: "10", cat: "Money",   label: "Cash in small bills",                      checked: false },
  { id: "11", cat: "Warmth",  label: "Warm blanket or sleeping bag per person",  checked: false },
];

const DEFAULT_MEETING: MeetingPlaces = { primary: "", secondary: "", outOfTown: "", shelter: "" };
const DEFAULT_PREFS: Prefs = {
  autoAlert: true, notifyOnChange: true, quietHours: true,
  reduceLocation: false, satelliteFallback: true, confirmBeforeAlert: true,
};

const STORAGE_KEY = "prepared_state_v2";

async function persist(state: Partial<AppState>) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  hasSeenOnboarding: false,
  userId: null,
  userEmail: null,
  userName: null,
  provider: null,
  planId: null,
  shareToken: null,
  family: [],
  meeting: DEFAULT_MEETING,
  bag: DEFAULT_BAG,
  planUpdatedAt: null,
  planSynced: false,
  contacts: [],
  isOffline: false,
  beaconQueued: false,
  queuedBeacon: null,
  prefs: DEFAULT_PREFS,

  setAuth: (userId, email, name, provider = "email") => {
    set({ isAuthenticated: true, userId, userEmail: email, userName: name, provider });
  },

  setOnboardingComplete: () => {
    set({ hasSeenOnboarding: true });
    const s = get();
    persist({ hasSeenOnboarding: true, userId: s.userId, userEmail: s.userEmail, userName: s.userName, provider: s.provider });
  },

  clearAuth: async () => {
    await api.logout();
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({
      isAuthenticated: false, userId: null, userEmail: null, userName: null,
      provider: null, planId: null, shareToken: null, contacts: [],
      hasSeenOnboarding: false,
    });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        set({
          isAuthenticated: !!token,
          hasSeenOnboarding: saved.hasSeenOnboarding ?? false,
          userId: saved.userId ?? null,
          userEmail: saved.userEmail ?? null,
          userName: saved.userName ?? null,
          provider: saved.provider ?? "email",
          family: saved.family ?? [],
          meeting: saved.meeting ?? DEFAULT_MEETING,
          bag: saved.bag ?? DEFAULT_BAG,
          planId: saved.planId ?? null,
          shareToken: saved.shareToken ?? null,
          planUpdatedAt: saved.planUpdatedAt ?? null,
          planSynced: saved.planSynced ?? false,
          contacts: saved.contacts ?? [],
          prefs: { ...DEFAULT_PREFS, ...(saved.prefs ?? {}) },
        });
      } else if (token) {
        set({ isAuthenticated: true });
      }
    } catch {}
  },

  syncPlan: async () => {
    try {
      const plan = await api.getPlan();
      const update = {
        planId: plan.id, shareToken: plan.share_token,
        family: plan.family || [], meeting: plan.meeting || DEFAULT_MEETING,
        bag: plan.bag?.length ? plan.bag : DEFAULT_BAG,
        planUpdatedAt: plan.updated_at, planSynced: true,
      };
      set(update);
      await persist({ ...get(), ...update });
    } catch {}
  },

  savePlanLocally: async (updates) => {
    set(updates);
    const s = get();
    await persist(s);
    api.savePlan({ family: s.family, meeting: s.meeting, bag: s.bag }).catch(() => {});
  },

  syncContacts: async () => {
    try {
      const contacts = await api.getContacts();
      set({ contacts });
      await persist({ ...get(), contacts });
    } catch {}
  },

  addContact: async (contact) => {
    const created = await api.createContact(contact);
    const contacts = [...get().contacts, created as any];
    set({ contacts });
    await persist({ ...get(), contacts });
  },

  removeContact: async (id) => {
    await api.deleteContact(id);
    const contacts = get().contacts.filter(c => c.id !== id);
    set({ contacts });
    await persist({ ...get(), contacts });
  },

  setOffline: (isOffline) => set({ isOffline }),

  queueBeacon: (lat, lng) =>
    set({ beaconQueued: true, queuedBeacon: { lat, lng, queuedAt: new Date().toISOString() } }),

  sendBeacon: async (lat, lng) => {
    const result = await api.sendBeacon({ lat, lng });
    set({ beaconQueued: false, queuedBeacon: null });
    return { notified: result.notified };
  },

  flushQueuedBeacon: async () => {
    const { queuedBeacon, isOffline } = get();
    if (!queuedBeacon || isOffline) return;
    try {
      await api.sendBeacon({ lat: queuedBeacon.lat, lng: queuedBeacon.lng, queued: true, queuedAt: queuedBeacon.queuedAt });
      set({ beaconQueued: false, queuedBeacon: null });
    } catch {}
  },

  updatePref: (key, value) => {
    const prefs = { ...get().prefs, [key]: value };
    set({ prefs });
    persist({ ...get(), prefs }).catch(() => {});
  },

  setPlanSynced: (planSynced) => set({ planSynced }),

  updateProfile: async (updates) => {
    const data = await api.updateProfile(updates);
    set({ userEmail: data.email, userName: data.name });
    await persist({ ...get(), userEmail: data.email, userName: data.name });
  },

  deleteAccount: async (password?: string) => {
    await api.deleteAccount(password);
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({
      isAuthenticated: false, userId: null, userEmail: null, userName: null,
      provider: null, hasSeenOnboarding: false,
    });
  },
}));
