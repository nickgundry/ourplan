import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE = Constants.expoConfig?.extra?.apiBase ?? "https://your-app.vercel.app";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("auth_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function storeSession(data: { token: string; userId: string }) {
  await SecureStore.setItemAsync("auth_token", data.token);
  await SecureStore.setItemAsync("user_id", data.userId);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function register(email: string, password: string, name: string) {
  const data = await request<{ token: string; userId: string; email: string; name: string }>(
    "/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }
  );
  await storeSession(data);
  return data;
}

export async function login(email: string, password: string) {
  const data = await request<{ token: string; userId: string; email: string; name: string }>(
    "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }
  );
  await storeSession(data);
  return data;
}

export async function googleSignIn(idToken: string) {
  const data = await request<{ token: string; userId: string; email: string }>(
    "/api/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }
  );
  await storeSession(data);
  return data;
}

export async function appleSignIn(identityToken: string, fullName?: { givenName?: string; familyName?: string } | null) {
  const data = await request<{ token: string; userId: string; email: string }>(
    "/api/auth/apple", { method: "POST", body: JSON.stringify({ identityToken, fullName }) }
  );
  await storeSession(data);
  return data;
}

export async function requestPasswordReset(email: string) {
  return request<{ ok: boolean }>("/api/auth/reset", { method: "POST", body: JSON.stringify({ email }) });
}

export async function logout() {
  await SecureStore.deleteItemAsync("auth_token");
  await SecureStore.deleteItemAsync("user_id");
}

// ── Account management ────────────────────────────────────────────────────────
export interface UserProfile {
  id: string; email: string; name: string; provider: string; createdAt: string;
}

export async function getMe(): Promise<UserProfile> {
  return request<UserProfile>("/api/account/me");
}

export async function changeEmail(email: string, password: string) {
  return request<{ email: string; token: string }>("/api/account/email", {
    method: "PUT", body: JSON.stringify({ email, password })
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return request<{ ok: boolean }>("/api/account/password", {
    method: "PUT", body: JSON.stringify({ currentPassword, newPassword })
  });
}

/**
 * Unified profile update — called by the store.
 * Routes to the right endpoint based on what fields are present.
 */
export async function updateProfile(updates: {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<{ email: string | null; name: string | null }> {
  let email: string | null = null;
  let name: string | null = null;

  if (updates.name) {
    const res = await request<{ name: string }>("/api/account/me", {
      method: "PATCH", body: JSON.stringify({ name: updates.name })
    });
    name = res.name;
  }

  if (updates.email && updates.currentPassword) {
    const res = await changeEmail(updates.email, updates.currentPassword);
    email = res.email;
    // Store the refreshed token
    if (res.token) await SecureStore.setItemAsync("auth_token", res.token);
  }

  if (updates.newPassword && updates.currentPassword) {
    await changePassword(updates.currentPassword, updates.newPassword);
  }

  return { email, name };
}

export async function deleteAccount(password?: string) {
  return request<{ deleted: boolean }>("/api/account/delete", {
    method: "DELETE",
    body: JSON.stringify({ password: password ?? null, confirmation: "DELETE" })
  });
}

// Alias for onboarding screen compatibility
export const signInWithGoogle = googleSignIn;

// ── Plan ──────────────────────────────────────────────────────────────────────
export interface Plan {
  id: string; share_token: string; family: any[]; meeting: any; bag: any[]; updated_at: string;
}

export async function getPlan(): Promise<Plan> {
  return request<Plan>("/api/plans");
}

export async function savePlan(plan: Partial<Plan>): Promise<Plan> {
  return request<Plan>("/api/plans", { method: "PUT", body: JSON.stringify(plan) });
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export interface Contact {
  id: string; name: string; phone: string; relation?: string; outside: boolean;
}

export async function getContacts(): Promise<Contact[]> {
  return request<Contact[]>("/api/contacts");
}

export async function createContact(contact: Omit<Contact, "id">): Promise<Contact> {
  return request<Contact>("/api/contacts", { method: "POST", body: JSON.stringify(contact) });
}

export async function deleteContact(id: string): Promise<void> {
  return request<void>(`/api/contacts?id=${id}`, { method: "DELETE" });
}

// ── Beacon ────────────────────────────────────────────────────────────────────
export interface BeaconPayload {
  lat: number; lng: number; accuracy?: number; queued?: boolean; queuedAt?: string;
}

export async function sendBeacon(payload: BeaconPayload): Promise<{ beaconId: string; notified: number; failed: number }> {
  return request("/api/beacon", { method: "POST", body: JSON.stringify(payload) });
}
