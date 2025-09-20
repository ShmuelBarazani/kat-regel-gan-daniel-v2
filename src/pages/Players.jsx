import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadPlayers, savePlayers, seedIfEmpty, reloadFromFile } from "../store/playerStorage";

// אפשרויות לעמדות
const POS_OPTIONS = ["GK", "DF", "MF", "FW"];

// עמודות: משחק? | שם | עמדה | ציון | חייב עם | לא עם | פעולות
export default function Players() {
  const [players, setPlayers] = useState([]);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });

  // מודל הוספה/עריכה
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState(blankForm());
  const firstFocusRef = useRef(null);

  // טעינה ראשונית – מזריע מהקובץ אם ריק
  useEffect(() => {
    (async () => {
      const seeded = await seedIfEmpty();
      setPlayers(seeded.length ? seeded : loadPlayers());
    })();
  }, []);

  useEffect(() => {
    if (modalOpen && firstFocusRef.current) firstFocusRef.current.focus();
  }, [modalOpen]);

  const activeCount = useMemo(
    () => players.filter((p) => !!p.active).length,
    [players]
  );

  const data = useMemo(() => {
    const out = [...players];
    out.sort((a, b) => {
      const { key, dir } = sort;
      const va = norm(a[key]);
      const vb = norm(b[key]);
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [players, sort]);

  // ---- helpers ----
  function norm(v) {
    if (v === undefined || v === null) return "";
    return typeof v === "string" ? v.toLowerCase() : v;
  }
  function blankForm() {
    return { active: false, name: "", pos: "MF", rating: 5, mustWith: [], avoidWith: [] };
  }
  function splitCsv(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    return String(v).split(",").map((s) => s.trim()).filter(Boolean);
  }
  function joinNames(arr) {
    return (arr || []).join(", ");
  }
  function cryptoId() {
    return (
      window.crypto?.randomUUID?.() ||
      "id_" + Math.random().toString(36).slice(2)
    );
  }

  // ---- פעולות טבלה ----
  function setSortCol(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  function toggleActive(id) {
    const next = players.map((p) => (p.id === id ? { ...p, active: !p.active } : p));
    setPlayers(next);
    savePlayers(next);
  }

  function removeById(id) {
    if (!confirm("למחוק את השחקן?")) return;
    const next = players.filter((p) => p.id !== id);
    setPlayers(next);
    savePlayers(next);
  }

  // ---- מודל ----
  function openAdd() {
    setEditIdx(null);
    setForm(blankForm());
    setModalOpen(true);
  }

  function openEdit(rowIdxInView) {
    const p = data[rowIdxInView];
    const origIndex = players.findIndex((x) => x.id === p.id);
    setEditIdx(origIndex);
    setForm({
      active: !!p.active,
      name: p.name || "",
      pos: p.pos || "MF",
      rating: typeof p.rating === "number" ? p.rating : Number(p.rating) || 0,
      mustWith: Array.isArray(p.mustWith) ? p.mustWith : splitCsv(p.mustWith),
      avoidWith: Array.isArray(p.avoidWith) ? p.avoidWith : splitCsv(p.avoidWith),
    });
    setModalOpen(true);
  }

  function onSaveForm(e) {
    e?.preventDefault?.();
    if (!form.name.trim()) return alert("שם שחקן נדרש");
    if (!POS_OPTIONS.includes(form.pos)) return alert("עמדה לא תקפה");

    const record = {
      id: editIdx === null ? cryptoId() : players[editIdx].id,
      active: !!form.active,
      name: form.name.trim(),
      pos: form.pos,
      rating: Number(form.rating) || 0,
      mustWith: Array.isArray(form.mustWith) ? form.mustWith : splitCsv(form.mustWith),
      avoidWith: Array.isArray(form.avoidWith) ? form.avoidWith : splitCsv(form.avoidWith),
    };

    const next = [...players];
    if (editIdx === null) next.push(record);
    else next[editIdx] = record;

    setPlayers(next);
    savePlayers(next);
    setModalOpen(false);
  }

  // רשימות בחירה במודל – כל השמות חוץ מהשם של השחקן עצמו
  const selectableNames = useMemo(() => {
    const curr = form.name?.trim?.() || "";
    return players.map((p) => p.name).filter((n) => n && n !== curr);
  }, [players, form.name]);

  // ---- UI ----
  return (
    <div className="page" dir="rtl" style={{ maxWidth: 1180, margin: "24px auto", padding: "0 12px" }}>
      <HeaderBar
        activeCount={activeCount}
        onAdd={openAdd}
        onReload={async () => {
          const fresh = await reloadFromFile();
          setPlayers(fresh);
        }}
      />

      <div className="card" style={{ background: "#0f1a2e", border: "1px solid #24324a", borderRadius: 16, padding: 12 }}>
        <div style={{ maxHeight: "64vh", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, direction: "rtl" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <Th onClick={() => setSortCol("active")}>משחק?</Th>
                <Th onClick={() => setSortCol("name")} sorted={sort.key === "name"} dir={sort.dir}>שם</Th>
                <Th onClick={() => setSortCol("pos")} sorted={sort.key === "pos"} dir={sort.dir}>עמדה</Th>
                <Th onClick={() => setSortCol("rating")} sorted={sort.key === "rating"} dir={sort.dir}>ציון</Th>
                <Th onClick={() => setSortCol("mustWith")} sorted={sort.key === "mustWith"} dir={sort.dir}>חייב עם</Th>
                <Th onClick={() => setSortCol("avoidWith")} sorted={sort.key === "avoidWith"} dir={sort.dir}>לא עם</Th>
                <Th>פעולות</Th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "28px 12px", textAlign: "center", color: "#9fb0cb" }}>
                    אין שחקנים לתצוגה.
                  </td>
                </tr>
              )}
              {data.map((p, idx) => (
                <tr key={p.id} style={{ borderTop: "1px solid #24324a" }}>
                  <td style={cellStyle}>
                    <input type="checkbox" checked={!!p.active} onChange={() => toggleActive(p.id)} />
                  </td>
                  <td style={cellStyle}>{p.name}</td>
                  <td style={cellStyle}>{p.pos}</td>
                  <td style={cellStyle}>{p.rating}</td>
                  <td style={cellStyle}>{joinNames(p.mustWith)}</td>
                  <td style={cellStyle}>{joinNames(p.avoidWith)}</td>
                  <td style={cellStyle}>
                    <button onClick={() => openEdit(idx)} className="btn ghost">ערוך</button>{" "}
                    <button onClick={() => removeById(p.id)} className="btn danger">מחק</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div role="dialog" aria-modal="true" style={modalWrap}>
          <div style={modalCard}>
            <h3 style={{ margin: "0 0 12px" }}>{editIdx === null ? "הוסף שחקן" : "ערוך שחקן"}</h3>

            {/* שורה קומפקטית: משחק? | V | שם | עמדה | ציון */}
            <form onSubmit={onSaveForm}>
              <div
                className="row-compact"
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 24px 1fr 110px 90px",
                  columnGap: 8,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <label style={{ margin: 0, whiteSpace: "nowrap" }}>משחק?</label>
                <input
                  ref={firstFocusRef}
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  style={{ margin: 0, justifySelf: "start" }}
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="שם שחקן"
                />
                <select
                  value={form.pos}
                  onChange={(e) => setForm((f) => ({ ...f, pos: e.target.value }))}
                >
                  {POS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                />
              </div>

              {/* מתחת: רשימות בחירה מרובות */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ marginBottom: 6 }}>לא עם</div>
                  <select
                    multiple
                    size={8}
                    value={Array.isArray(form.avoidWith) ? form.avoidWith : []}
                    onChange={(e) => {
                      const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setForm((f) => ({ ...f, avoidWith: vals }));
                    }}
                  >
                    {selectableNames.map((n) => (
                      <option key={"aw_" + n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ marginBottom: 6 }}>חייב עם</div>
                  <select
                    multiple
                    size={8}
                    value={Array.isArray(form.mustWith) ? form.mustWith : []}
                    onChange={(e) => {
                      const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setForm((f) => ({ ...f, mustWith: vals }));
                    }}
                  >
                    {selectableNames.map((n) => (
                      <option key={"mw_" + n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button type="submit" className="btn primary">שמור</button>
                <button type="button" className="btn ghost" onClick={() => setModalOpen(false)}>בטל</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* סגנון כפתורים וטבלה */}
      <style>{`
        .btn{padding:6px 10px;border-radius:10px;border:1px solid #24324a;background:#0b1220;color:#e8eefc;cursor:pointer}
        .btn:hover{filter:brightness(1.1)}
        .btn.primary{background:#2575fc;border-color:#2575fc}
        .btn.danger{background:#ff5c7a;border-color:#ff5c7a}
        .btn.ghost{background:transparent}
        thead tr{background:#105340;color:#e8eefc}
        th, td{font-size:14px}
        input, select{background:#0b1220;color:#e8eefc;border:1px solid #24324a;border-radius:10px;padding:6px}
        select[multiple]{width:100%;min-height:200px}
      `}</style>
    </div>
  );
}

// סרגל עליון
function HeaderBar({ activeCount, onAdd, onReload }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
        margin: "0 0 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn primary" onClick={onAdd}>הוסף שחקן</button>
        <button className="btn" onClick={onReload} title="טען מחדש מ-players.json">רענן מקובץ</button>
      </div>
      <div style={{ color: "#9fb0cb" }}>שחקנים פעילים: {activeCount}</div>
    </div>
  );
}

// תא כותרת עם חץ מיון
function Th({ children, onClick, sorted, dir }) {
  return (
    <th
      onClick={onClick}
      style={{
        position: "sticky",
        top: 0,
        background: "#105340",
        color: "#e8eefc",
        padding: "10px 12px",
        textAlign: "right",
        cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid #24324a",
      }}
    >
      <span>{children}</span>
      {sorted ? (dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

const cellStyle = { padding: "10px 12px", verticalAlign: "middle", color: "#e8eefc" };
const modalWrap = { position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", zIndex: 1000 };
const modalCard = { width: 760, maxWidth: "95vw", background: "#0f1a2e", border: "1px solid #24324a", borderRadius: 16, padding: 16, color: "#e8eefc" };
