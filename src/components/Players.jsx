// src/components/Players.jsx
// מסך שחקנים מלא + ייבוא/ייצוא + עיצוב כבתמונה
// תלוי ב: ../lib/storage  (getPlayers, setPlayers, countActive)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getPlayers, setPlayers, countActive } from "../lib/storage";

const POS_OPTIONS = [
  { v: "GK", t: "שוער" },
  { v: "DF", t: "הגנה" },
  { v: "MF", t: "קישור" },
  { v: "FW", t: "התקפה" },
];

// עוזר לעיצוב
const styles = {
  page: { direction: "rtl", maxWidth: 1200, margin: "20px auto", padding: "0 12px", color: "#E8EEFC" },
  toolbar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  pillBtn: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "#27c463",
    border: "none",
    color: "#0b1220",
    fontWeight: 700,
    cursor: "pointer",
  },
  pillGhost: {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #2a7a52",
    background: "transparent",
    color: "#8de4b7",
    fontWeight: 600,
    cursor: "pointer",
  },
  input: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #24324a",
    background: "#0f1a2e",
    color: "#E8EEFC",
  },
  tableWrap: { overflow: "auto", borderRadius: 12, border: "1px solid #24324a" },
  th: {
    position: "sticky",
    top: 0,
    background: "#0f1a2e",
    color: "#9fb0cb",
    textAlign: "right",
    padding: "10px 8px",
    borderBottom: "1px solid #24324a",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  td: { textAlign: "right", padding: "8px", borderBottom: "1px solid #1b2941" },
  chip: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    border: "1px solid #2a7a52",
    color: "#8de4b7",
    cursor: "pointer",
    userSelect: "none",
  },
  danger: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #ff5c7a",
    background: "transparent",
    color: "#ff5c7a",
    cursor: "pointer",
  },
};

export default function Players() {
  const [players, setPlayersState] = useState([]);
  const [filter, setFilter] = useState("");
  const [hideRatings, setHideRatings] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const fileRef = useRef(null);

  // טעינה ראשונית: 1) נסה להביא מקובץ public/players.json (אם קיים)
  // 2) אחרת – מה-localStorage (getPlayers)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // קודם ננסה קובץ חיצוני אם נוסף לפרויקט (להחזרת "הרשימה שהייתה לנו")
        const res = await fetch("/players.json", { cache: "no-store" });
        if (res.ok) {
          const fromFile = await res.json();
          const normalized = normalizeImportedList(fromFile);
          if (!cancelled && normalized.length) {
            setPlayersState(normalized);
            setPlayers(normalized);
            return;
          }
        }
      } catch (e) {
        // אין קובץ – לא נורא, נמשיך ל-localStorage
      }
      try {
        const list = getPlayers();
        if (!cancelled) setPlayersState(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setPlayersState([]);
      }
    })();

    return () => (cancelled = true);
  }, []);

  // שמירה ל-storage בכל שינוי
  useEffect(() => {
    setPlayers(players);
  }, [players]);

  const activeCount = countActive(players);

  const filtered = useMemo(() => {
    const q = (filter || "").trim();
    const base = !q ? players : players.filter((p) => (p?.name || "").includes(q));
    const sorted = [...base].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "he", { sensitivity: "base" })
    );
    return sortAsc ? sorted : sorted.reverse();
  }, [players, filter, sortAsc]);

  // פעולות שורה
  const update = (idx, patch) => {
    const next = players.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    setPlayersState(next);
  };
  const remove = (idx) => {
    if (!confirm("למחוק את השחקן?")) return;
    const next = players.filter((_, i) => i !== idx);
    setPlayersState(next);
  };
  const addPlayer = () => {
    const next = [
      ...players,
      { name: "", pos: "MF", rating: 6, mustWith: [], avoidWith: [], active: true },
    ];
    setPlayersState(next);
  };

  // עריכת רשימות "חייב עם" / "לא עם" בחלון prompt פשוט (זריז)
  const editNamesList = (label, currentList, idxKey) => {
    const cur = (currentList || []).join(", ");
    const val = prompt(`${label} — רשום שמות מופרדים בפסיק`, cur);
    if (val === null) return;
    const arr = splitList(val);
    update(idxKey, arr.key === "mustWith" ? { mustWith: arr.list } : { avoidWith: arr.list });
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
      // נסה JSON
      try {
        const j = JSON.parse(text);
        list = normalizeImportedList(j);
      } catch {
        // נסה CSV/טקסט: name,pos,rating  או שורה = שם בלבד
        list = parseCSVorLines(text);
      }
      if (!list.length) {
        alert("לא זוהו שחקנים תקינים לייבוא.");
        return;
      }
      setPlayersState(list);
      setPlayers(list);
      alert(`יובאו ${list.length} שחקנים.`);
    } catch (e) {
      alert("נכשל ייבוא: " + e.message);
    }
  };

  return (
    <div style={styles.page}>
      {/* סרגל עליון כמו בצילום */}
      <div style={styles.toolbar}>
        <button style={styles.pillBtn} onClick={addPlayer}>הוסף שחקן</button>
        <button style={styles.pillGhost} onClick={() => setHideRatings((v) => !v)}>
          {hideRatings ? "הצג ציונים" : "הסתר ציונים"}
        </button>
        <button style={styles.pillGhost} onClick={() => setSortAsc((v) => !v)}>
          מיון לפי שם {sortAsc ? "▲" : "▼"}
        </button>
        <div style={{ flex: 1 }} />
        <input
          placeholder="חיפוש לפי שם…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...styles.input, minWidth: 220 }}
        />
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
                <td style={styles.td}>
                  <button style={styles.danger} onClick={() => remove(idx)}>מחק</button>
                </td>

                <td style={styles.td}>
                  <span
                    style={styles.chip}
                    onClick={() =>
                      editNamesList("לא עם (avoidWith)", p.avoidWith, idx)
                    }
                  >
                    {p.avoidWith?.length ? p.avoidWith.join(", ") : "—"} &nbsp; ערוך
                  </span>
                </td>

                <td style={styles.td}>
                  <span
                    style={styles.chip}
                    onClick={() =>
                      editNamesList("חייב עם (mustWith)", p.mustWith, idx)
                    }
                  >
                    {p.mustWith?.length ? p.mustWith.join(", ") : "—"} &nbsp; ערוך
                  </span>
                </td>

                {!hideRatings && (
                  <td style={styles.td}>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={toNumberOr(p.rating, 6)}
                      onChange={(e) => update(idx, { rating: Number(e.target.value) })}
                      style={{ ...styles.input, width: 90, textAlign: "center" }}
                    />
                  </td>
                )}

                <td style={styles.td}>
                  <select
                    value={p.pos || "MF"}
                    onChange={(e) => update(idx, { pos: e.target.value })}
                    style={{ ...styles.input, width: 110 }}
                  >
                    {POS_OPTIONS.map((o) => (
                      <option key={o.v} value={o.v}>{o.t}</option>
                    ))}
                  </select>
                </td>

                <td style={styles.td}>
                  <input
                    value={p.name || ""}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    style={{ ...styles.input, width: "100%" }}
                    placeholder="שם השחקן"
                  />
                </td>

                <td style={styles.td}>
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
                <td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "#9fb0cb" }}>
                  אין שחקנים לתצוגה.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== עוזרים =====
function splitList(s) {
  const list = (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return { key: s?.includes("avoid") ? "avoidWith" : "mustWith", list };
}

function toNumberOr(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// נרמול כללי של רשימת ייבוא – תומך במבנים שונים
function normalizeImportedList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((raw) => {
      if (!raw) return null;
      // תמיכה בשם יחיד (string)
      if (typeof raw === "string") {
        return { name: raw, pos: "MF", rating: 6, mustWith: [], avoidWith: [], active: true };
      }
      const name = raw.name ?? raw.שם ?? "";
      if (!name) return null;
      const pos = raw.pos ?? raw.position ?? raw.עמדה ?? "MF";
      const rating = toNumberOr(raw.rating ?? raw.ציון, 6);
      const mustWith = Array.isArray(raw.mustWith) ? raw.mustWith : splitMaybe(raw.חייב_עם || raw.must_with);
      const avoidWith = Array.isArray(raw.avoidWith) ? raw.avoidWith : splitMaybe(raw.לא_עם || raw.avoid_with);
      const active = raw.active !== false;
      return { name, pos, rating, mustWith, avoidWith, active };
    })
    .filter(Boolean);
}

function splitMaybe(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseCSVorLines(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    // פורמט CSV: name,pos,rating
    const parts = line.split(",").map((x) => x.trim());
    if (parts.length >= 3 && !isNaN(Number(parts[2]))) {
      out.push({
        name: parts[0],
        pos: parts[1] || "MF",
        rating: toNumberOr(parts[2], 6),
        mustWith: [],
        avoidWith: [],
        active: true,
      });
    } else {
      // שורה = שם בלבד
      out.push({ name: line, pos: "MF", rating: 6, mustWith: [], avoidWith: [], active: true });
    }
  }
  return out;
}
