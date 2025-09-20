// src/components/TeamMaker.jsx
// מסך "עשה כוחות": בחירת מספר קבוצות, יצירת כוחות מאוזנים לפי ציונים,
// כיבוד mustWith/avoidWith, עריכת "משחק?" ו"ציון" לפני יצירה, ותצוגת קבוצות עם סטטיסטיקות.

import React, { useEffect, useMemo, useState } from "react";
import { getPlayers, setPlayers, getTeamCount, setTeamCount, saveTeamsSnapshot } from "../lib/storage";

const styles = {
  page: { direction: "rtl", maxWidth: 1200, margin: "20px auto", padding: "0 12px", color: "#E8EEFC" },
  toolbar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  pillBtn: { padding: "6px 12px", borderRadius: 999, background: "#27c463", border: "none", color: "#0b1220", fontWeight: 700, cursor: "pointer" },
  input: { padding: "6px 10px", borderRadius: 8, border: "1px solid #24324a", background: "#0f1a2e", color: "#E8EEFC" },
  tableWrap: { overflow: "auto", borderRadius: 12, border: "1px solid #24324a", marginTop: 10 },
  th: { position: "sticky", top: 0, background: "#0f1a2e", color: "#9fb0cb", textAlign: "right", padding: "10px 8px", borderBottom: "1px solid #24324a", fontWeight: 700, whiteSpace: "nowrap" },
  td: { textAlign: "right", padding: "8px", borderBottom: "1px solid #1b2941" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginTop: 14 },
  card: { border: "1px solid #24324a", borderRadius: 12, padding: 12, background: "#0f1a2e" },
  teamTitle: { marginTop: 0, marginBottom: 8 },
  listItem: { display: "flex", justifyContent: "space-between", padding: "6px 8px", borderBottom: "1px solid #1b2941" },
  stat: { color: "#9fb0cb", fontSize: 13 },
};

export default function TeamMaker() {
  const [players, setPlayersState] = useState([]);
  const [teamCount, setTeamCountState] = useState(4);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const list = getPlayers();
    setPlayersState(Array.isArray(list) ? list : []);
    setTeamCountState(getTeamCount());
  }, []);

  useEffect(() => setPlayers(players), [players]);

  const actives = useMemo(() => players.filter((p) => p.active !== false), [players]);

  const setActive = (idx, val) =>
    setPlayersState(players.map((p, i) => (i === idx ? { ...p, active: val, selected: val } : p)));
  const setRating = (idx, val) =>
    setPlayersState(players.map((p, i) => (i === idx ? { ...p, rating: val, r: val } : p)));

  const generate = () => {
    const n = Math.max(2, Math.min(10, Number(teamCount) || 4));
    setTeamCount(n);
    setTeamCountState(n);

    const sorted = [...actives].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    const teamArr = Array.from({ length: n }, () => ({ players: [], sum: 0 }));
    const nameToTeam = new Map();

    const scoreTeam = (i, player) => {
      const t = teamArr[i];
      let score = t.sum; // מאזנים לפי סכום ציונים
      const avoid = (player.avoidWith || []).filter(Boolean);
      for (const x of t.players) if (avoid.includes(x.name)) score += 100; // ענישה חזקה על "לא עם"
      const must = (player.mustWith || []).filter(Boolean);
      let hasMust = 0;
      for (const x of t.players) if (must.includes(x.name)) hasMust++;
      score -= hasMust * 5; // בונוס על "חייב עם"
      if (player.pos === "GK" && t.players.some((x) => x.pos === "GK")) score += 10; // שוער אחד לקבוצה
      return score;
    };

    for (const p of sorted) {
      const must = (p.mustWith || []).filter(Boolean);
      let preferredIdx = -1;
      for (const m of must) if (nameToTeam.has(m)) { preferredIdx = nameToTeam.get(m); break; }
      const candidates = preferredIdx >= 0
        ? [preferredIdx, ...Array.from({ length: n }, (_, i) => i).filter((i) => i !== preferredIdx)]
        : Array.from({ length: n }, (_, i) => i);

      let bestI = 0, best = Infinity;
      for (const i of candidates) {
        const s = scoreTeam(i, p);
        if (s < best) { best = s; bestI = i; }
      }
      teamArr[bestI].players.push(p);
      teamArr[bestI].sum += Number(p.rating ?? 0);
      nameToTeam.set(p.name, bestI);
    }

    setTeams(teamArr);
    saveTeamsSnapshot({ teams: teamArr.map((t) => t.players.map((p) => p.name)), meta: { teamCount: n } });
  };

  const totals = teams.map((t) => t.sum);
  const avg = totals.length ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(2) : "0.00";

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span>מס׳ קבוצות:</span>
          <select value={teamCount} onChange={(e) => setTeamCountState(Number(e.target.value))} style={styles.input}>
            {Array.from({ length: 10 }, (_, i) => i + 2).map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </label>
        <button style={styles.pillBtn} onClick={generate}>עשה כוחות</button>
      </div>

      {/* טבלת הכנה לפני יצירה */}
      <div style={styles.tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 90 }}>משחק?</th>
              <th style={{ ...styles.th, width: 240 }}>שם</th>
              <th style={{ ...styles.th, width: 100 }}>עמדה</th>
              <th style={{ ...styles.th, width: 100 }}>ציון</th>
              <th style={styles.th}>חייב עם</th>
              <th style={styles.th}>לא עם</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, idx) => (
              <tr key={idx}>
                <td style={styles.td}>
                  <input type="checkbox" checked={p.active !== false}
                         onChange={(e) => setActive(idx, e.target.checked)} />
                </td>
                <td style={styles.td}>{p.name}</td>
                <td style={styles.td}>{labelPos(p.pos)}</td>
                <td style={styles.td}>
                  <input type="number" step="0.5" min="1" max="10" value={Number(p.rating ?? 6)}
                         onChange={(e) => setRating(idx, Number(e.target.value))}
                         style={{ ...styles.input, width: 90, textAlign: "center" }} />
                </td>
                <td style={styles.td}>{p.mustWith?.length ? p.mustWith.join(", ") : "—"}</td>
                <td style={styles.td}>{p.avoidWith?.length ? p.avoidWith.join(", ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* תצוגת כוחות */}
      {teams.length > 0 && (
        <>
          <div style={{ marginTop: 14, color: "#9fb0cb" }}>
            ממוצע סה״כ: {avg} | טווח: {totals.length ? Math.min(...totals).toFixed(2) : "0"}–{totals.length ? Math.max(...totals).toFixed(2) : "0"}
          </div>
          <div style={styles.grid}>
            {teams.map((t, i) => (
              <div key={i} style={styles.card}>
                <h3 style={styles.teamTitle}>קבוצה {i + 1} <span style={styles.stat}>| סה״כ: {t.sum.toFixed(2)}</span></h3>
                <div>
                  {t.players.map((p) => (
                    <div key={p.name} style={styles.listItem}>
                      <span>{p.name}</span>
                      <span className="muted">{Number(p.rating ?? 0).toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function labelPos(pos) {
  return pos === "GK" ? "שוער" : pos === "DF" ? "הגנה" : pos === "MF" ? "קישור" : pos === "FW" ? "התקפה" : pos || "—";
}
