import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function SharedPlan() {
  const router = useRouter();
  const { token } = router.query;
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/plans/shared?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setPlan(data);
      })
      .catch(() => setError("Could not load plan"))
      .finally(() => setLoading(false));
  }, [token]);

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (loading) return <Page><p style={s.muted}>Loading plan…</p></Page>;
  if (error)   return <Page><p style={s.muted}>Plan not found or expired.</p></Page>;

  const { family, meeting, updatedAt } = plan;
  const meetingEntries = Object.entries({
    Primary: meeting.primary,
    Backup: meeting.secondary,
    "Out of area": meeting.outOfTown,
    Hospital: meeting.shelter,
  }).filter(([, v]) => v);

  return (
    <Page>
      <div style={s.header}>
        <div style={s.badge}>🛡️ Emergency Plan</div>
        <h1 style={s.h1}>{family?.[0]?.name ? `${family[0].name.split(" ").pop()} Family Plan` : "Emergency Plan"}</h1>
        <p style={s.meta}>Last updated {fmt(updatedAt)}</p>
      </div>

      {meetingEntries.length > 0 && (
        <section style={s.section}>
          <h2 style={s.h2}>Meeting places</h2>
          {meetingEntries.map(([label, val]) => (
            <div key={label} style={s.row}>
              <div style={s.dot}/>
              <div>
                <div style={s.rowLabel}>{label}</div>
                <div style={s.rowValue}>{val}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {family?.length > 0 && (
        <section style={s.section}>
          <h2 style={s.h2}>Family members</h2>
          {family.map((m, i) => (
            <div key={i} style={s.memberRow}>
              <div style={s.avatar}>{m.name?.[0] || "?"}</div>
              <div>
                <div style={s.memberName}>{m.name}</div>
                {m.conditions && <div style={s.memberDetail}>Conditions: {m.conditions}</div>}
              </div>
            </div>
          ))}
        </section>
      )}

      <section style={s.section}>
        <h2 style={s.h2}>If you've received this</h2>
        <div style={s.infoCard}>
          <p style={s.infoText}>The person who shared this plan with you may be in an emergency situation. Check the locations above and try to make contact. If you cannot reach them, share this page with local emergency services.</p>
        </div>
      </section>
    </Page>
  );
}

const Page = ({ children }) => (
  <div style={s.page}>
    <div style={s.container}>{children}</div>
  </div>
);

const s = {
  page:       { minHeight:"100vh", background:"#FAF8F5", fontFamily:"'Georgia', serif", padding:"0 0 60px" },
  container:  { maxWidth:540, margin:"0 auto", padding:"0 20px" },
  header:     { padding:"40px 0 32px", borderBottom:"1px solid #E7E5E2" },
  badge:      { display:"inline-flex", alignItems:"center", gap:6, background:"#EEF6F1", color:"#4A7C59", fontSize:13, fontWeight:600, padding:"5px 12px", borderRadius:100, marginBottom:16 },
  h1:         { fontSize:30, fontWeight:400, color:"#1C1917", margin:"0 0 8px", lineHeight:1.2 },
  meta:       { fontSize:13, color:"#A8A29E", margin:0 },
  section:    { padding:"28px 0", borderBottom:"1px solid #E7E5E2" },
  h2:         { fontSize:13, fontWeight:700, color:"#A8A29E", letterSpacing:.6, textTransform:"uppercase", margin:"0 0 16px" },
  row:        { display:"flex", gap:14, alignItems:"flex-start", marginBottom:14 },
  dot:        { width:8, height:8, borderRadius:"50%", background:"#4A7C59", marginTop:6, flexShrink:0 },
  rowLabel:   { fontSize:11, fontWeight:700, color:"#A8A29E", textTransform:"uppercase", letterSpacing:.4, marginBottom:2 },
  rowValue:   { fontSize:16, color:"#1C1917" },
  memberRow:  { display:"flex", gap:12, alignItems:"flex-start", marginBottom:14 },
  avatar:     { width:36, height:36, borderRadius:12, background:"#EEF6F1", color:"#4A7C59", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:16, flexShrink:0 },
  memberName: { fontSize:16, fontWeight:600, color:"#1C1917", marginBottom:3 },
  memberDetail:{ fontSize:13, color:"#57534E" },
  infoCard:   { background:"#FEF3C7", border:"1px solid #F59E0B40", borderRadius:16, padding:18 },
  infoText:   { fontSize:14, color:"#57534E", lineHeight:1.7, margin:0 },
  muted:      { color:"#A8A29E", padding:"60px 0", textAlign:"center" },
};
