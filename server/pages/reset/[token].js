import { useState } from "react";
import { useRouter } from "next/router";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");

  const valid = password.length >= 8 && password === confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || !token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.brand}>
          <span style={{ fontSize: 24 }}>🛡</span>
          <span style={s.brandName}>Prepared</span>
        </div>

        {done ? (
          <>
            <div style={s.successIcon}>✓</div>
            <h1 style={s.h1}>Password updated</h1>
            <p style={s.body}>Your password has been changed. Open the Prepared app to sign in.</p>
            <a href="prepared://" style={s.openBtn}>Open app</a>
          </>
        ) : (
          <>
            <h1 style={s.h1}>Choose a new password</h1>
            <p style={s.body}>Pick something strong — at least 8 characters.</p>

            <form onSubmit={handleSubmit}>
              <div style={s.fieldWrap}>
                <label style={s.label}>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8+ characters"
                  style={s.input}
                  required
                  minLength={8}
                />
              </div>

              <div style={s.fieldWrap}>
                <label style={s.label}>Confirm new password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Same as above"
                  style={s.input}
                  required
                />
                {confirm && password !== confirm && (
                  <p style={s.mismatch}>Passwords don't match</p>
                )}
              </div>

              {error && <p style={s.errorMsg}>{error}</p>}

              <button type="submit" disabled={!valid || loading} style={{
                ...s.btn,
                opacity: (!valid || loading) ? 0.5 : 1,
                cursor: (!valid || loading) ? "not-allowed" : "pointer",
              }}>
                {loading ? "Saving…" : "Set new password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page:        { minHeight: "100vh", background: "#FAF8F5", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Georgia, serif" },
  card:        { width: "100%", maxWidth: 420, background: "white", border: "1px solid #E7E5E2", borderRadius: 20, padding: "40px 32px" },
  brand:       { display: "flex", alignItems: "center", gap: 10, marginBottom: 32 },
  brandName:   { fontSize: 18, color: "#4A7C59", fontWeight: "400" },
  h1:          { fontSize: 28, fontWeight: "400", color: "#1C1917", margin: "0 0 12px", letterSpacing: -0.4 },
  body:        { fontSize: 14, color: "#57534E", lineHeight: 1.6, margin: "0 0 28px" },
  fieldWrap:   { marginBottom: 16 },
  label:       { display: "block", fontSize: 12, fontWeight: "600", color: "#57534E", marginBottom: 6, letterSpacing: 0.3 },
  input:       { width: "100%", boxSizing: "border-box", border: "1.5px solid #E7E5E2", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#1C1917", background: "#FAF8F5", outline: "none", fontFamily: "inherit" },
  mismatch:    { fontSize: 12, color: "#DC2626", margin: "6px 0 0" },
  errorMsg:    { fontSize: 13, color: "#DC2626", marginBottom: 16 },
  btn:         { width: "100%", background: "#4A7C59", color: "white", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: "600", fontFamily: "inherit" },
  successIcon: { width: 60, height: 60, borderRadius: 20, background: "#EEF6F1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#4A7C59", margin: "0 0 20px", textAlign: "center", lineHeight: "60px" },
  openBtn:     { display: "block", textAlign: "center", background: "#4A7C59", color: "white", textDecoration: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: "600", marginTop: 24 },
};
