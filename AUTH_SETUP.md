# Auth Setup Guide

Prepared supports three sign-in methods. Here's exactly how to configure each.

---

## 1. Email + Password

Works out of the box. No external accounts needed.

**Password reset flow:**
1. User taps "Forgot password?" → enters email
2. Server generates a 1-hour reset token and emails a link via Resend
3. User clicks link → lands on `/reset/[token]` web page → enters new password
4. Token is invalidated; user can sign back in

**Setup:**
1. Sign up at [resend.com](https://resend.com) (free — 100 emails/day)
2. Add a sending domain (or use the test email for dev)
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in your env

---

## 2. Sign in with Apple

Required by Apple for any app that offers third-party sign-in. Apple's token is verified server-side.

### Mobile (Expo)
`expo-apple-authentication` is already included and configured. It renders Apple's native button automatically.

Apple only provides the user's name and email on the **first** sign-in. We store this in the DB so subsequent logins still have the name.

### Server
Uses `apple-signin-auth` to verify the JWT identity token.

### Setup steps:
1. In [Apple Developer Portal](https://developer.apple.com):
   - Go to Certificates, Identifiers & Profiles → Identifiers
   - Select your App ID (`com.prepared.app`)
   - Enable **Sign in with Apple**
   - Save

2. Set `APPLE_BUNDLE_ID=com.prepared.app` in your Vercel env

3. Build with EAS (`eas build --platform ios`) — Apple Sign In requires a real device build. It does **not** work in Expo Go.

---

## 3. Sign in with Google

Uses Google's ID token flow: the app gets a token from Google, sends it to your server, server verifies it and finds/creates the user.

### Google Cloud Console setup:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → **iOS**
   - Bundle ID: `com.prepared.app`
4. Copy the client ID (looks like `xxxx.apps.googleusercontent.com`)

### Mobile:
Set in `app.config.ts`:
```ts
extra: {
  googleClientId: "xxxx.apps.googleusercontent.com",
}
```

The app uses `expo-auth-session` for the OAuth flow. Google sign-in works in Expo Go during development.

### Server:
Set `GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com` in your Vercel env.

The server uses `google-auth-library` to verify the token.

---

## Account management screens

| Screen | How to access |
|---|---|
| Account | Settings tab → tap your name at the top |
| Change name | Account → Name row |
| Change email | Account → Email row (email accounts only) |
| Change password | Account → Password row (email accounts only) |
| Sign out | Account → Sign out, or Settings → Sign out |
| Delete account | Account → Danger zone → Delete account |

**OAuth accounts (Apple/Google)** show their sign-in provider and cannot change email or password through the app (managed by Apple/Google).

**Email accounts** can change name, email (requires current password), and password (requires current password).

**Delete account** requires:
- For email: current password + type "DELETE"
- For OAuth: just type "DELETE"

Deletion is permanent and cascades: all plans, contacts, beacons, and notifications are erased from the server. The device local copy is also cleared.

---

## Onboarding flow

New users see a 4-step flow:

| Step | What happens |
|---|---|
| Slides (3) | App value proposition — skippable |
| Account | Sign up or sign in (Apple / Google / Email) |
| Family setup | Add family members with medical info |
| Meeting places | Set primary, backup, out-of-town locations |
| Done | Summary + nudge to add an outside contact |

Returning users who've already completed onboarding skip straight to the main tabs.

The `hasSeenOnboarding` flag is persisted in AsyncStorage. If someone deletes the app and reinstalls, they'll see onboarding again (by design — they'll need to re-authenticate anyway).

---

## Security notes

- JWT tokens expire after **90 days**
- Passwords are hashed with bcrypt (12 rounds)
- Reset tokens expire after **1 hour** and are single-use
- OAuth provider IDs are stored but no OAuth tokens are persisted server-side
- Account deletion cascades at the database level — nothing is soft-deleted
- The public plan share link (`/plan/[token]`) strips medication data before serving
