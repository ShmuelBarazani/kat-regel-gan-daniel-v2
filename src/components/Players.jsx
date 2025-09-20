// src/components/Players.jsx

import React, { useEffect, useMemo, useState } from "react";
import { getPlayers, setPlayers, countActive } from "../lib/storage";

const POS_OPTIONS = [
  { v: "GK", t: "שוער" },
  { v: "DF", t: "הגנה" },
  { v: "MF", t: "קישור" },
  { v: "FW", t: "התקפה" },
];

export default function Players() {
  const [players, setPlayersState] = useState([]);
  const [filter, setFilter] = useState("");

  // טעינה ראשונה + זריעת ברירת מחדל תיעשה ע"י storage.getPlayers()
  useEffect(() => {
    try {
      const list = getPlayers();
      setPlayersState(Array.isArray(list) ? list : []);
    } catch {
      setPlayersState([]);
    }
  }, []);

  // שמירה ל-storage בכל שינוי
  useEffect(() => {
    setPlayers(players);
  }, [players]);

  const addPlayer = () => {
    const next = [
      ...players,
      { name: "", pos: "MF", rating: 6, mustWith: [], avoidWith: [], active: true },
    ];
    setPlayersState(next);
  };

  const update = (idx, patch) => {
    const next = players.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    setPlayersState(next);
  };

  const remove = (idx) => {
    const next = players.filter((_, i) => i !== idx);
    setPlayersState(next);
  };

  const filtered = useMemo(() => {
    const q = (filter || "").trim();
    if (!q) return players;
    return players.filter((p) => (p?.name || "").includes(q));
  }, [players, filter]);

  const activeCount = countActive(players);

  return (
    <div style={{ direction: "rtl", maxWidth: 1100, margin: "20px auto", padding: "0 12px", color: "#E8EEFC" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 18 }}>
          <b>שחקנים</b> &nbsp;—&nbsp; פעילים: {activeCount} / {players.length}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="חפש לפי שם…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #24324a", background: "#0f1a2e", color: "#E8EEFC" }}
          />
          <button onClick={addPlayer} style={{ padding: "8px 12px", borderRadius: 8, background: "#27c463", border: "none", color: "#0b1220", fontWeight: 600 }}>
            הוסף שחקן
          </button>
        </div>
      </header>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ background: "#0f1a2e" }}>
              <th style={th}>פעולות</th>
              <th style={th}>לא עם</th>
              <th style={th}>חייב עם</th>
              <th style={th}>ציון</th>
              <th style={th}>עמדה</th>
              <th style={th}>שם</th>
              <th style={th}>משחק?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={idx} style={{ borderTop: "1px solid #24324a" }}>
                <td style={td}>
                  <button onClick={() => remove(idx)} style={btnDanger}>מחק</button>
                </td>
                <td style={td}>
                  <input
                    value={(p.avoidWith || []).join(", ")}
                    onChange={(e) => update(idx, { avoidWith: splitList(e.target.value) })}
                    style={inp}
                    placeholder="שמות מופרדים בפסיק"
                  />
                </td>
                <td style={td}>
                  <input
                    value={(p.mustWith || []).join(", ")}
                    onChange={(e) => update(idx, { mustWith: splitList(e.target.value) })}
                    style={inp}
                    placeholder="שמות מופרדים בפסיק"
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={p.rating ?? 6}
                    onChange={(e) => update(idx, { rating: Number(e.target.value) })}
                    style={{ ...inp, width: 80 }}
                  />
                </td>
                <td style={td}>
                  <select
                    value={p.pos || "MF"}
                    onChange={(e) => update(idx, { pos: e.target.value })}
                    style={{ ...inp, width: 120 }}
                  >
                    {POS_OPTIONS.map(o => (
                      <option key={o.v} value={o.v}>{o.t}</option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <input
                    value={p.name || ""}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    style={inp}
                    placeholder="שם השחקן"
                  />
                </td>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={p.active !== false}
                    onChange={(e) => update(idx, { active: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: "center", color: "#9fb0cb" }}>
                  אין שחקנים תואמים. נסה לאפס את החיפוש או להוסיף שחקן חדש.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { textAlign: "right", padding: "10px 8px", borderBottom: "1px solid #24324a", fontWeight: 600 };
const td = { textAlign: "right", padding: "8px" };
const inp = { padding: "6px 10px", borderRadius: 8, border: "1px solid #24324a", background: "#0f1a2e", color: "#E8EEFC", width: "100%" };
const btnDanger = { padding: "6px 10px", borderRadius: 8, border: "1px solid #ff5c7a", background: "transparent", color: "#ff5c7a", cursor: "pointer" };

function splitList(s) {
  return (s || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}
