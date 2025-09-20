// src/components/Players.jsx
// מסך שחקנים: סדר עמודות נכון, הוספה ב-Modal, מיון לפי עמודות,
// "משחק?" ניתן לעריכה, חיפוש, ייבוא/ייצוא ושמירה ב-localStorage.
// נטען מה-storage (שכבר עושה bootstrap מ-/players.json אם קיים).

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
  thSort: { cursor: "pointer", userSelect: "none" },
  td: { textAlign: "right", padding: "8px", borderBottom: "1px solid #1b2941" },
  chip: { display: "inline-block", padding: "2px 10px", borderRadius: 999, border: "1px solid #2a7a52", color: "#8de4b7", cursor: "pointer", userSelect: "none" },
  danger: { padding: "6px 10px", borderRadius: 8, border: "1px solid #ff5c7a", background: "transparent", color: "#ff5c7a", cursor: "pointer" },
  modalBack: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modal: { width: 520, maxWidth: "95vw", background: "#0f1a2e", border: "1px solid #24324a", borderRadius: 14, padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" },
  row: { display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, alignItems: "center", marginBottom: 10 },
  actions: { display: "flex", gap: 8, justifyContent: "flex-start", marginTop: 8 },
};

export default function Players() {
  const [players, setPlayersState] = useState([]);
  const [filter, setFilter] = useState("");
  const [hideRatings, setHideRatings] = useState(false);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const fileRef = useRef(null);

  useEffect(() => {
    const list = getPlayers();
    setPlayersState(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    setPlayers(players);
  }, [players]);

  const activeCount = countActive(players);

  const filtered = useMemo(() => {
    const q = (filter || "").trim();
    let base = !q ? players : players.filter((p) => (p?.name || "").includes(q));
    const dir = sort.dir === "asc" ? 1 : -1;
    const cmp =
      sort.key === "rating"
        ? (a, b) => dir * ((a.rating ?? 0) - (b.rating ?? 0))
        : sort.key === "pos"
        ? (a, b) => {
            const order = { GK: 0, DF: 1, MF: 2, FW: 3 };
            return dir * ((order[a.pos] ?? 99) - (order[b.pos] ?? 99));
          }
        : (a, b) => dir * (a.name || "").localeCompare(b.name || "", "he", { sensitivity: "base" });
    return [...base].sort(cmp);
  }, [players, filter, sort]);

  const update = (idx, patch) => setPlayersState(players.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const remove = (idx) => {
    if (!confirm("למחוק את השחקן?")) return;
    setPlayersState(players.filter((_, i) => i !== idx));
  };

  // Modal הוספה
  const [openAdd, setOpenAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", pos: "MF", rating: 6, mustWith: "", avoidWith: "", active: true });
  const openAddModal = () => {
    setDraft({ name: "", pos: "MF", rating: 6, mustWith: "", avoidWith: "", active: true });
    setOpenAdd(true);
  };
  const saveDraft = () => {
    const name = (draft.name || "").trim();
    if (!name) return alert("יש למלא שם");
    const rating = Number(draft.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) return alert("ציון 1–10");
    const mw = splitList(draft.mustWith);
    const aw = splitList(draft.avoidWith);
    setPlayersState([...players, { name, pos: draft.pos || "MF", rating, mustWith: mw, avoidWith: aw, active: !!draft.active }]);
    setOpenAdd(false);
  };

  // import/export
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
      if (!list.length) return alert("לא נמצאו שחקנים לייבוא.");
      setPlayersState(list);
      setPlayers(list);
      alert(`יובאו ${list.length} שחקנים.`);
    } catch (e) {
      alert("ייבוא נכשל: " + e.message);
    }
  };

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  const sortIcon = (key) => (sort.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : " ⇅");

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <button style={styles.pillBtn} onClick={openAddModal}>הוסף שחקן</button>
        <button style={styles.pillGhost} onClick={() => setHideRatings((v) => !v)}>{hideRatings ? "הצג ציונים" : "הסתר ציונים"}</button>
        <div style={{ flex: 1 }} />
        <input placeholder="חיפוש לפי שם…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...styles.input, minWidth: 260 }} />
        <button style={styles.pillGhost} onClick={exportPlayersFile}>ייצוא</button>
        <button style={styles.pillGhost} onClick={openImport}>ייבוא</button>
        <input ref={fileRef} type="file" accept=".json,.csv,.txt" onChange={onImportFile} hidden />
      </div>

      <div style={{ marginBottom: 10, color: "#9fb0cb" }}>
        <b>שחקנים פעילים:</b> {activeCount} / {players.length}
      </div>

      <div style={styles.tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              {/* סדר עמודות: פעולות | לא עם | חייב עם | ציון | עמדה | שם | משחק? */}
              <th style={{ ...styles.th, width: 110 }}>פעולות</th>
              <th style={styles.th}>לא עם</th>
              <th style={styles.th}>חייב עם</th>
              {!hideRatings && (
                <th style={{ ...styles.th, ...styles.thSort, width: 110 }} onClick={() => toggleSort("rating")}>
                  ציון{sortIcon("rating")}
                </th>
              )}
              <th style={{ ...styles.th, ...styles.thSort, width: 120 }} onClick={() => toggleSort("pos")}>
                עמדה{sortIcon("pos")}
              </th>
              <th style={{ ...styles.th, ...styles.thSort, width: 260 }} onClick={() => toggleSort("name")}>
                שם{sortIcon("name")}
              </th>
              <th style={{ ...styles.th, width: 100 }}>משחק?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={idx}>
                <td style={styles.td}><button style={styles.danger} onClick={() => remove(idx)}>מחק</button></td>
                <td style={styles.td}>
                  <span style={styles.chip} onClick={() => editNamesList("לא עם (avoidWith)", p.avoidWith, (list) => update(idx, { avoidWith: list }))}>
                    {p.avoidWith?.length ? p.avoidWith.join(", ") : "—"} &nbsp; ערוך
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={styles.chip} onClick={() => editNamesList("חייב עם (mustWith)", p.mustWith, (list) => update(idx, { mustWith: list }))}>
                    {p.mustWith?.length ? p.mustWith.join(", ") : "—"} &nbsp; ערוך
                  </span>
                </td>
                {!hideRatings && (
                  <td style={styles.td}>
                    <input type="number" step="0.5" min="1" max="10" value={numOr(p.rating, 6)}
                           onChange={(e) => update(idx, { rating: Number(e.target.value), r: Number(e.target.value) })}
                           style={{ ...styles.input, width: 90, textAlign: "center" }} />
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
                <td style={{ ...styles.td, cursor: "pointer" }}
                    onClick={() => update(idx, { active: !(p.active !== false), selected: !(p.active !== false) })}>
                  <input type="checkbox" checked={p.active !== false}
                         onChange={(e) => update(idx, { active: e.target.checked, selected: e.target.checked })}
                         onClick={(e) => e.stopPropagation()} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...styles.td, textAlign: "center", color: "#9fb0cb" }}>אין שחקנים לתצוגה.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {openAdd && (
        <div style={styles.modalBack} onClick={() => setOpenAdd(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>הוספת שחקן</h3>
            <div style={styles.row}><label>שם</label><input style={styles.input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div style={styles.row}><label>עמדה</label>
              <select style={styles.input} value={draft.pos} onChange={(e) => setDraft({ ...draft, pos: e.target.value })}>
                {POS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
              </select>
            </div>
            <div style={styles.row}><label>ציון</label><input style={styles.input} type="number" step="0.5" min="1" max="10" value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })} /></div>
            <div style={styles.row}><label>חייב עם</label><input style={styles.input} value={draft.mustWith} onChange={(e) => setDraft({ ...draft, mustWith: e.target.value })} placeholder="שמות מופרדים בפסיק" /></div>
            <div style={styles.row}><label>לא עם</label><input style={styles.input} value={draft.avoidWith} onChange={(e) => setDraft({ ...draft, avoidWith: e.target.value })} placeholder="שמות מופרדים בפסיק" /></div>
            <div style={styles.row}><label>משחק?</label><input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /></div>
            <div style={styles.actions}><button style={styles.pillBtn} onClick={saveDraft}>שמור</button><button style={styles.pillGhost} onClick={() => setOpenAdd(false)}>בטל</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function splitList(s){return (s||"").split(",").map(x=>x.trim()).filter(Boolean);}
function numOr(v,d){const n=Number(v);return Number.isFinite(n)?n:d;}
function editNamesList(title,currentList,commit){
  const cur=(currentList||[]).join(", "); const val=prompt(`${title} — שמות מופרדים בפסיק`,cur);
  if(val===null)return; commit(splitList(val));
}
function parseCSVorLines(text){
  const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);const out=[];
  for(const line of lines){const p=line.split(",").map(x=>x.trim());
    if(p.length>=3&&!isNaN(Number(p[2]))){out.push({name:p[0],pos:p[1]||"MF",rating:numOr(p[2],6),mustWith:[],avoidWith:[],active:true});}
    else{out.push({name:line,pos:"MF",rating:6,mustWith:[],avoidWith:[],active:true});}}
  return out;
}
function normalizeImportedList(arr){
  if(!Array.isArray(arr))return[];const idToName=new Map();for(const p of arr)if(p&&p.name&&(typeof p.id==="number"||typeof p.id==="string"))idToName.set(String(p.id),p.name);
  const toNameList=(v)=>!v?[]:Array.isArray(v)?v.map(x=>idToName.get(String(x))||String(x)).filter(Boolean):String(v).split(",").map(s=>s.trim()).filter(Boolean);
  return arr.map(raw=>raw&&raw.name?{name:raw.name,pos:raw.pos||"MF",rating:numOr(raw.r??raw.rating,6),mustWith:Array.isArray(raw.mustWith)?raw.mustWith:toNameList(raw.prefer),avoidWith:Array.isArray(raw.avoidWith)?raw.avoidWith:toNameList(raw.avoid),active:typeof raw.selected==="boolean"?raw.selected:raw.active!==false}:null).filter(Boolean);
}
