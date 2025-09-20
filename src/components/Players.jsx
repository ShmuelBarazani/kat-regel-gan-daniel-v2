// src/components/Players.jsx
// מסך שחקנים מלא: טעינה אוטומטית מ-public/players.json (אם קיים),
// נרמול מהמבנה שלך (id/name/r/pos/selected/prefer/avoid) לשדות התצוגה,
// כולל "חייב עם" / "לא עם", ציונים, חיפוש, מיון, ייבוא/ייצוא ושמירה ב-localStorage.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getPlayers, setPlayers, countActive } from "../lib/storage";

const POS_OPTIONS = [
  { v: "GK", t: "שוער" },
  { v: "DF", t: "הגנה" },
  { v: "MF", t: "קישור" },
  { v: "FW", t: "התקפה" },
];

const styles = {
  page: { direction: "rtl", maxWidth: 1200, margin: "20px auto", padding: "0 12px", color: "#E8EEFC" },
  toolbar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  pillBtn: { padding: "6px 12px", borderRadius: 999, background: "#27c463", border: "none", color: "#0b1220", fontWeight: 700, cursor: "pointer" },
  pillGhost: { padding: "4px 10px", borderRadius: 999, border: "1px solid #2a7a52", background: "transparent", color: "#8de4b7", fontWeight: 600, cursor: "pointer" },
  input: { padding: "6px 10px", borderRadius: 8, border: "1px solid #24324a", background: "#0f1a2e", color: "#E8EEFC" },
  tableWrap: { overflow: "auto", borderRadius: 12, border: "1px solid #24324a" },
  th: { position: "sticky", top: 0, background: "#0f1a2e", color: "#9fb0cb", textAlign: "right", padding: "10px 8px", borderBottom: "1px solid #24324a", fontWeight: 700, whiteSpace: "nowrap" },
  td: { textAlign: "right", padding: "8px", borderBottom: "1px solid #1b2941" },
  chip: { display: "inline-block", padding: "2px 10px", borderRadius: 999, border: "1px solid #2a7a52", color: "#8de4b7", cursor: "pointer", userSelect: "none" },
  danger: { padding: "6px 10px", borderRadius: 8, border: "1px solid #ff5c7a", background: "transparent", color: "#ff5c7a", cursor: "pointer" },
};

export default function Players() {
  const [players, setPlayersState] = useState([]);
  const [filter, setFilter] = useState("");
  const [hideRatings, setHideRatings] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const fileRef = useRef(null);

  // 1) טען מ-/players.json אם קיים; 2) אחרת מה-localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/players.json", { cache: "no-store" });
        if (res.ok) {
          const raw = await res.json();
          const normalized = normalizeImportedList(raw);
          if (!cancelled && normalized.length) {
            setPlayersState(normalized);
            setPlayers(normalized);
            return;
          }
        }
      } catch {}
      try {
        const list = getPlayers();
        if (!cancelled) setPlayersState(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setPlayersState([]);
      }
    })();
    return () => (cancelled = true);
  }, []);

  // שמירה קבועה ל-storage
  useEffect(() => {
    setPlayers(players);
  }, [players]);

  const activeCount = countActive(players);

  const filtered = useMemo(() => {
    const q = (filter || "").trim();
    const base = !q ? players : players.filter((p) => (p?.name || "").includes(q));
    const sorted = [...base].sort((a, b) => (a.name || "").localeCompare(b.name || "", "he", { sensitivity: "base" }));
    return sortAsc ? sorted : sorted.reverse();
  }, [players, filter, sortAsc]);

  // פעולות
  const update = (idx, patch) => setPlayersState(players.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const remove = (idx) => {
    if (!confirm("למחוק את השחקן?")) return;
    setPlayersState(players.filter((_, i) => i !== idx));
  };
  const addPlayer = () => setPlayersState([...players, { name: "", pos: "MF", rating: 6, mustWith: [], avoidWith: [], active: true }]);

  // עריכת רשימות שמות
  const editNamesList = (label, list, idx, key) => {
    const cur = (list || []).join(", ");
    const val = prompt(`${label} — רשום שמות מופרדים בפסיק`, cur);
    if (val === null) return;
    const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
    update(idx, { [key]: arr });
  };

  // ייבוא/ייצוא
  const exportPlayersFile = () => {
    const blob = new Blob([JSON.stringify(players, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "players.export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const openImport = () => fileRef.current?.click();
  const onImportFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const text = await f.text();
    importFromText(text);
  };
  const importFromText = (text) => {
    try {
      let list = [];
      try {
        const j = JSON.parse(text);
        list = normalizeImportedList(j);
      } catch {
        list = parseCSVorLines(text);
      }
      if (!list.length) return alert("לא זוהו שחקנים לייבוא.");
      setPlayersState(list);
      setPlayers(list);
      alert(`יובאו ${list.length} שחקנים.`);
    } catch (e) {
      alert("ייבוא נכשל: " + e.message);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <button style={styles.pillBtn} onClick={addPlayer}>הוסף שחקן</button>
        <button style={styles.pillGhost} onClick={() => setHideRatings((v) => !v)}>{hideRatings ? "הצג ציונים" : "הסתר ציונים"}</button>
        <button style={styles.pillGhost} onClick={() => setSortAsc((v) => !v)}>מיון לפי שם {sortAsc ? "▲" : "▼"}</button>
        <div style={{ flex: 1 }} />
        <input placeholder="חיפוש לפי שם…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...styles.input, minWidth: 220 }} />
        <button style={styles.pillGhost} onClick={exportPlayersFile}>ייצוא</button>
        <button style={styles.pillGhost} onClick={openImport}>ייבוא</button>
        <input ref={fileRef} type="file" accept=".json,.csv,.txt" onChange={onImportFile} hidden />
      </div>

      <div style={{ marginBottom: 10, color: "#9fb0cb" }}>
        <b>שחקנים פעילים:</b> {activeCount} / {players.length}
      </div>

      <div style={styles.tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 100 }}>פעולות</th>
              <th style={styles.th}>לא עם</th>
              <th style={styles.th}>חייב עם</th>
              {!hideRatings && <th style={{ ...styles.th, width: 110 }}>ציון</th>}
              <th style={{ ...styles.th, width: 120 }}>עמדה</th>
              <th style={{ ...styles.th, width: 260 }}>שם</th>
              <th style={{ ...styles.th, width: 90 }}>משחק?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={idx}>
                <td style={styles.td}><button style={styles.danger} onClick={() => remove(idx)}>מחק</button></td>
                <td style={styles.td}>
                  <span style={styles.chip} onClick={() => editNamesList("לא עם (avoidWith)", p.avoidWith, idx, "avoidWith")}>
                    {p.avoidWith?.length ? p.avoidWith.join(", ") : "—"} &nbsp; ערוך
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={styles.chip} onClick={() => editNamesList("חייב עם (mustWith)", p.mustWith, idx, "mustWith")}>
                    {p.mustWith?.length ? p.mustWith.join(", ") : "—"} &nbsp; ערוך
                  </span>
                </td>
                {!hideRatings && (
                  <td style={styles.td}>
                    <input type="number" step="0.5" min="1" max="10" value={toNumberOr(p.rating, 6)} onChange={(e) => update(idx, { rating: Number(e.target.value) })} style={{ ...styles.input, width: 90, textAlign: "center" }} />
                  </td>
                )}
                <td style={styles.td}>
                  <select value={p.pos || "MF"} onChange={(e) => update(idx, { pos: e.target.value })} style={{ ...styles.input, width: 110 }}>
                    {POS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
                  </select>
                </td>
                <td style={styles.td}>
                  <input value={p.name || ""} onChange={(e) => update(idx, { name: e.target.value })} style={{ ...styles.input, width: "100%" }} placeholder="שם השחקן" />
                </td>
                <td style={styles.td}>
                  <input type="checkbox" checked={p.active !== false} onChange={(e) => update(idx, { active: e.target.checked })} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "#9fb0cb" }}>אין שחקנים לתצוגה.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== עוזרים =====
function toNumberOr(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }

// נרמול מהרשימה שלך: ממפה prefer/avoid של מזהים → לשמות, וממפה r→rating, selected→active
function normalizeImportedList(arr) {
  if (!Array.isArray(arr)) return [];
  // מיפוי מזהה→שם
  const idToName = new Map();
  for (const p of arr) {
    if (p && (typeof p.id === "number" || typeof p.id === "string") && p.name) {
      idToName.set(String(p.id), p.name);
    }
  }
  return arr.map((raw) => {
    if (!raw || !raw.name) return null;
    const prefNames = toNameList(raw.prefer, idToName);
    const avoidNames = toNameList(raw.avoid, idToName);
    return {
      name: raw.name,
      pos: raw.pos || "MF",
      rating: toNumberOr(raw.r ?? raw.rating, 6),
      mustWith: prefNames,
      avoidWith: avoidNames,
      active: (typeof raw.selected === "boolean") ? raw.selected : (raw.active !== false),
    };
  }).filter(Boolean);
}

function toNameList(val, idToName) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x) => {
      if (typeof x === "number" || (typeof x === "string" && idToName.has(String(x)))) {
        return idToName.get(String(x)) ?? String(x);
      }
      return String(x);
    }).filter(Boolean);
  }
  // אם הגיע כמחרוזת "שם1, שם2"
  return String(val).split(",").map((s) => s.trim()).filter(Boolean);
}

// תמיכה בייבוא טקסט/CSV (name,pos,rating) או שורה=שם בלבד
function parseCSVorLines(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const parts = line.split(",").map((x) => x.trim());
    if (parts.length >= 3 && !isNaN(Number(parts[2]))) {
      out.push({ name: parts[0], pos: parts[1] || "MF", rating: toNumberOr(parts[2], 6), mustWith: [], avoidWith: [], active: true });
    } else {
      out.push({ name: line, pos: "MF", rating: 6, mustWith: [], avoidWith: [], active: true });
    }
  }
  return out;
}
