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
