# Prepared — Disaster Readiness App

Family emergency plan app with offline-first mobile client and a lightweight backend API.

---

## Why a backend?

The app is mobile-only, but it needs a **server** (API) for things the phone can’t do alone:

- **Auth** — Register/login and issue JWTs; keep user/plan/contacts tied to an account.
- **Shared data** — Store plans and contacts in a database so they sync across devices and survive app reinstall.
- **Beacon → SMS** — When someone hits “Send alert”, the server receives the location, looks up contacts, and sends SMS via Twilio. The phone can’t send SMS to arbitrary numbers without the server.
- **Public plan link** — The shared read-only plan page is a URL the server serves; contacts get it in the SMS.

So: **mobile app** talks to **your API**. The API has to run somewhere. This repo uses **Next.js** for the API; **Vercel** is just one way to host that (and works well for Next.js). You could instead deploy the same `server/` to Railway, Fly.io, a VPS, etc. — the mobile app only cares that it has a base URL to call.

---

## Architecture

```
prepared-app/
├── mobile/          Expo (React Native) iOS app
│   ├── app/         Expo Router file-based routes
│   └── src/
│       ├── api/     API client (all server calls)
│       ├── store/   Zustand global state + AsyncStorage persistence
│       ├── screens/ One file per screen
│       ├── hooks/   Network monitor, location
│       ├── components/ Shared UI primitives
│       └── theme/   Colors, fonts, shadows
│
└── server/          Next.js API — deploy to Vercel
    ├── pages/api/
    │   ├── auth/    Register + login → JWT
    │   ├── plans/   Get + update plan; shared read-only link
    │   ├── contacts/ CRUD contacts
    │   └── beacon/  Receive tiny location packet → fan-out SMS
    ├── lib/
    │   ├── auth.js  JWT sign/verify, withErrorHandler
    │   └── notify.js Twilio SMS helpers
    └── scripts/
        └── migrate.js  DB schema setup
```

### How the beacon works

The device sends **~200 bytes**:
```json
{ "lat": 45.52, "lng": -122.67, "accuracy": 12, "queued": false }
```

The server does all the heavy lifting:
1. Saves the location
2. Fetches the user's full plan and contact list
3. Fans out SMS to every contact via Twilio
4. Outside contacts get a link to the public plan page

If the device is offline, the beacon is stored locally in Zustand + AsyncStorage and flushed automatically the next time any signal is detected.

---

## Server setup (Vercel)

### 1. Clone and install

```bash
cd server
npm install
```

### 2. Create a Supabase database

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard go to **Project Settings → Database**.
3. Under **Connection string**, copy:
   - **URI** (Transaction mode) → use as `POSTGRES_URL` (pooled, for serverless).
   - **URI** (Session mode) → use as `POSTGRES_URL_NON_POOLING` (for migrations).
4. Replace the `[YOUR-PASSWORD]` placeholder in each URI with your database password.

```bash
cp .env.example .env.local
# Fill in POSTGRES_URL, POSTGRES_URL_NON_POOLING with the Supabase URIs
```

Optional: connect Supabase via **Vercel Dashboard → Storage → Add Integration → Supabase** so production env vars are set automatically.

### 3. Get a Twilio account

Sign up at [twilio.com](https://twilio.com) (free trial works).
- Copy Account SID and Auth Token
- Buy a phone number (~ $1/month)
- Add to `.env.local`

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Deploy to Vercel

```bash
npx vercel --prod
```

Set these environment variables in the Vercel dashboard (or add the Supabase integration to inject the Postgres vars):
| Variable | Value |
|---|---|
| `POSTGRES_URL` | Supabase connection string (Transaction/pooled) |
| `POSTGRES_URL_NON_POOLING` | Supabase connection string (Session/direct) |
| `JWT_SECRET` | Any long random string |
| `TWILIO_ACCOUNT_SID` | From Twilio dashboard |
| `TWILIO_AUTH_TOKEN` | From Twilio dashboard |
| `TWILIO_PHONE_NUMBER` | Your Twilio number e.g. `+15550001234` |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel URL e.g. `https://prepared.vercel.app` |

### API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth` | — | Register or login |
| GET | `/api/plans` | ✓ | Get user's plan |
| PUT | `/api/plans` | ✓ | Update plan |
| GET | `/api/plans/shared?token=xxx` | — | Public plan view |
| GET | `/api/contacts` | ✓ | List contacts |
| POST | `/api/contacts` | ✓ | Add contact |
| DELETE | `/api/contacts?id=xxx` | ✓ | Remove contact |
| POST | `/api/beacon` | ✓ | Send location beacon → SMS fan-out |

---

## Mobile setup (Expo)

### 1. Install

```bash
cd mobile
npm install
```

### 2. Point at your server

Edit `app.config.ts`:
```ts
extra: {
  apiBase: "https://your-app.vercel.app",  // ← your Vercel URL
}
```

### 3. Run on device

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone.

### 4. Build for App Store

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo account
eas login

# Configure
eas build:configure

# Build iOS
eas build --platform ios
```

You'll need:
- Apple Developer account ($99/year)
- Bundle ID registered in App Store Connect
- EAS project ID in `app.config.ts`

---

## Screens

| Screen | What it does |
|---|---|
| **Plan** | Readiness overview, meeting places, download + share plan |
| **Contacts** | Family & nearby / outside your area — with outside contact recommendation |
| **Alert** | Big send button, 5-second confirm, offline queuing |
| **Settings** | Notification prefs, location precision, satellite fallback |

---

## Offline behaviour

The app is fully functional without internet:

- Plan is stored in AsyncStorage on first sync
- Encrypted with Expo SecureStore for auth token
- Network monitor polls every 8 seconds
- If a beacon was queued, it fires automatically on next connection
- Download Plan button marks the plan as saved to device

---

## Environment variables reference

```bash
# .env.local (server)

POSTGRES_URL=                    # Supabase connection string (Transaction/pooled)
POSTGRES_URL_NON_POOLING=        # Supabase connection string (Session) — for migrations

JWT_SECRET=                      # Long random string — keep secret

TWILIO_ACCOUNT_SID=ACxxxxxxxx    # From twilio.com/console
TWILIO_AUTH_TOKEN=               # From twilio.com/console
TWILIO_PHONE_NUMBER=+1555000000  # Your Twilio SMS number

NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile | Expo 51, React Native, expo-router |
| State | Zustand + AsyncStorage |
| Auth (device) | expo-secure-store |
| Location | expo-location |
| Network | expo-network |
| Server | Next.js 14 on Vercel |
| Database | Supabase (Postgres) |
| SMS | Twilio |
| Auth (server) | JWT (jsonwebtoken) |
| Validation | Zod |
