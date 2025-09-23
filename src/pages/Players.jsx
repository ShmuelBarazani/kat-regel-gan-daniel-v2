// src/pages/Players.jsx
import React, { useMemo, useState } from "react";
import { useAppStore as useApp } from "@/store/playerStorage.jsx"; // נשאר תואם ליבוא הישן
import PlayerFormModal from "@/components/PlayerFormModal.jsx";

const DEFAULT_SORT_BY = "name";
const DEFAULT_SORT_DIR = "asc";

export default function Players() {
  const { state, updatePlayer, deletePlayer } = useApp();

  // ברירות מחדל קשיחות במקרה ש-state/settings טרם זמינים מסיבה כלשהי
  const safeSettings = {
    sortBy: (state && state.settings && state.settings.sortBy) || DEFAULT_SORT_BY,
    sortDir: (state && state.settings && state.settings.sortDir) || DEFAULT_SORT_DIR,
  };

  const [sortKey, setSortKey] = useState(safeSettings.sortBy);
  const [sortDir, setSortDir] = useState(safeSettings.sortDir);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const toggleSort = (k) => {
    setSortDir((d) => (sortKey === k ? (d === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(k);
  };

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const accessor = (p) => {
      if (sortKey === "prefer" || sortKey === "avoid" || sortKey === "mustWith" || sortKey === "avoidWith") {
        const arr =
          p.prefer ?? p.mustWith ?? [] || [];
        // אם יש גם avoid/avoidWith
        const arr2 = p.avoid ?? p.avoidWith ?? [];
        return (Array.isArray(arr) ? arr.length : 0) + (Array.isArray(arr2) ? arr2.length : 0) / 1000;
      }
      // התאמות לשדות שלך: name/pos/r/selected
      if (sortKey === "r" || sortKey === "rating") return p.r ?? p.rating ?? 0;
      if (sortKey === "selected" || sortKey === "active") return p.selected ? 1 : 0;
      return (p[sortKey] ?? "").toString();
    };
    const list = Array.isArray(state?.players) ? state.players : [];
    return [...list].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av > bv) return dir;
      if (av < bv) return -dir;
      return 0;
    });
  }, [state?.players, sortKey, sortDir]);

  const edit = (id) => {
    setEditId(id);
    setModalOpen(true);
  };

  // אם משום מה state לא קיים עדיין — מציגים שלד במקום קריסה
  if (!state) {
    return (
      <div className="page" dir="rtl">
        <div className="card">טוען שחקנים…</div>
      </div>
    );
  }

  return (
    <div className="page" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="title">שחקנים</h1>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModalOpen(true); }}>
          הוסף שחקן
        </button>
      </div>

      <div className="card overflow-auto max-h-[70vh]">
        <table className="table">
          <thead>
            <tr>
              {[
                ["selected", "משחק?"],
                ["name", "שם"],
                ["pos", "עמדה"],
                ["r", "ציון"],
                ["prefer", "חייב עם"],
                ["avoid", "לא עם"],
                ["actions", "פעולות"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => key !== "actions" && toggleSort(key)}
                  className={key !== "actions" ? "sortable" : undefined}
                >
                  {label}
                  {sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!p.selected}
                    onChange={(e) => updatePlayer?.(p.id, { active: e.target.checked, selected: e.target.checked })}
                  />
                </td>
                <td contentEditable suppressContentEditableWarning onBlur={(e) => updatePlayer?.(p.id, { name: e.currentTarget.textContent.trim() })}>
                  {p.name}
                </td>
                <td>
                  <select
                    className="input"
                    value={p.pos}
                    onChange={(e) => updatePlayer?.(p.id, { pos: e.target.value })}
                  >
                    <option>GK</option><option>DF</option><option>MF</option><option>FW</option>
                  </select>
                </td>
                <td>
                  <input
                    className="input w-24"
                    type="number"
                    step="0.5"
                    value={p.r ?? 0}
                    onChange={(e) => updatePlayer?.(p.id, { rating: +e.target.value, r: +e.target.value })}
                  />
                </td>
                <td>
                  {/* הצגה בלבד כדי לא לשנות את ה־UX שלך; אם יש לך רכיב בחירה – תשאיר אותו */}
                  {Array.isArray(p.prefer) ? p.prefer.length : 0}
                </td>
                <td>{Array.isArray(p.avoid) ? p.avoid.length : 0}</td>
                <td className="whitespace-nowrap">
                  <button className="btn" onClick={() => edit(p.id)}>ערוך</button>
                  <button className="btn btn-danger ml-2" onClick={() => deletePlayer?.(p.id)}>מחק</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlayerFormModal open={modalOpen} onClose={() => setModalOpen(false)} editId={editId} />
    </div>
  );
}
