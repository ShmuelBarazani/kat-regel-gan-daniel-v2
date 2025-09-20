import React, { useEffect, useMemo, useState } from "react";
import { loadPlayers } from "../store/playerStorage";

export default function DoForces() {
  const [players, setPlayers] = useState([]);
  const [teamsCount, setTeamsCount] = useState(4);
  const [teams, setTeams] = useState([]);

  // טען פעם אחת את רשימת השחקנים מה־storage (אותו מקור כמו מסך "שחקנים")
  useEffect(() => {
    const list = loadPlayers();
    setPlayers(Array.isArray(list) ? list : []);
  }, []);

  // חישובי מצב
  const active = useMemo(() => players.filter((p) => !!p.active), [players]);
  const inactive = useMemo(() => players.filter((p) => !p.active), [players]);

  // יצירת קבוצות (Snake distribution מאזן לפי ציון)
  function makeTeams() {
    // הגנה: אם אין פעילים – נודיע
    if (active.length === 0) {
      alert("אין שחקנים פעילים.");
      return;
    }

    const n = Math.max(2, Math.min(12, Number(teamsCount) || 4));
    const pool = [...active].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const buckets = Array.from({ length: n }, (_, i) => ({
      name: `קבוצה ${i + 1}`,
      players: [],
      sum: 0,
    }));

    let i = 0;
    let forward = true; // Snake: הולך קדימה ואז אחורה
    while (pool.length) {
      const p = pool.shift();
      buckets[i].players.push(p);
      buckets[i].sum += Number(p.rating) || 0;

      if (forward) {
        if (i === n - 1) forward = false;
        else i++;
      } else {
        if (i === 0) forward = true;
        else i--;
      }
    }

    setTeams(
      buckets.map((b) => ({
        ...b,
        avg: b.players.length ? b.sum / b.players.length : 0,
      }))
    );
  }

  return (
    <div dir="rtl" style={{ maxWidth: 1180, margin: "24px auto", padding: "0 12px" }}>
      {/* סטטוסים + שליטה */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div className="chip">פעילים: <b>{active.length}</b></div>
        <div className="chip">לא פעילים: <b>{inactive.length}</b></div>
        <div className="chip">סה״כ: <b>{players.length}</b></div>
        <div style={{ flex: 1 }} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          מס׳ קבוצות
          <input
            type="number"
            min="2"
            max="12"
            value={teamsCount}
            onChange={(e) => setTeamsCount(e.target.value)}
            style={{ width: 64 }}
          />
        </label>
        <button className="btn primary" onClick={makeTeams}>עשה כוחות</button>
      </div>

      {/* טבלת השחקנים הפעילים */}
      <div className="card" style={{ background: "#0f1a2e", border: "1px solid #24324a", borderRadius: 16, padding: 12, marginBottom: 14 }}>
        <div style={{ maxHeight: "40vh", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: "#105340", color: "#e8eefc" }}>
                <th style={th}>שם</th>
                <th style={th}>עמדה</th>
                <th style={th}>ציון</th>
              </tr>
            </thead>
            <tbody>
              {active.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #24324a" }}>
                  <td style={td}>{p.name}</td>
                  <td style={td}>{p.pos}</td>
                  <td style={td}>{p.rating}</td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 18, textAlign: "center", color: "#9fb0cb" }}>
                    אין שחקנים פעילים.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* תצוגת הקבוצות שנוצרו */}
      {teams.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 8px" }}>קבוצות למחזור</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
            {teams.map((t, idx) => (
              <div key={idx} style={{ background: "#0f1a2e", border: "1px solid #24324a", borderRadius: 16, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <b>{t.name}</b>
                  <span style={{ color: "#9fb0cb" }}>
                    {t.players.length} שחקנים | סכ״ר {t.sum.toFixed(1)} | ממוצע {t.avg.toFixed(2)}
                  </span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {t.players.map((p) => (
                    <li key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: "1px dashed #24324a" }}>
                      <span>{p.name} ({p.pos})</span>
                      <span>{p.rating}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {/* סגנון הכפתורים הכהה-ירוק (כמו בתמונה שלך) */}
      <style>{`
        .btn{padding:7px 12px;border-radius:999px;border:1px solid #1e3b2f;background:#0e201a;color:#e8eefc;cursor:pointer}
        .btn:hover{filter:brightness(1.08)}
        .btn.primary{background:#1f6f43;border-color:#1f6f43}
        .chip{background:#0f1a2e;border:1px solid #24324a;color:#e8eefc;border-radius:999px;padding:6px 10px}
        input{background:#0b1220;color:#e8eefc;border:1px solid #24324a;border-radius:10px;padding:6px}
      `}</style>
    </div>
  );
}

const th = { padding: "10px 12px", textAlign: "right" };
const td = { padding: "10px 12px", color: "#e8eefc" };
