// src/pages/Players.jsx
import React, { useMemo, useState } from "react";
// אם יש לך alias '@', אפשר להחזיר ל "@/store/playerStorage.jsx"
// הגרסה היחסית הזו עובדת בכל מקרה:
import { useAppStore as useApp } from "../store/playerStorage.jsx";
import PlayerFormModal from "../components/PlayerFormModal.jsx";

const DEFAULT_SORT_BY = "name";
const DEFAULT_SORT_DIR = "asc";

export default function Players() {
  const { state, updatePlayer, deletePlayer } = useApp();

  // ברירות מחדל קשיחות כדי לא לקרוס אם settings עוד לא מוכנים
  const safeSortBy =
    (state && state.settings && state.settings.sortBy) || DEFAULT_SORT_BY;
  const safeSortDir =
    (state && state.settings && state.settings.sortDir) || DEFAULT_SORT_DIR;

  const [sortKey, setSortKey] = useState(safeSortBy);
  const [sortDir, setSortDir] = useState(safeSortDir);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const toggleSort = (k) => {
    setSortDir((d) => (sortKey === k ? (d === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(k);
  };

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const list = Array.isArray(state?.players) ? state.players : [];

    const accessor = (p) => {
      // מיון לפי "חייב עם/לא עם" – נספר אורכים (תומך גם בשדות הפנימיים אם קיימים)
      if (
        sortKey === "prefer" ||
        sortKey === "avoid" ||
        sortKey === "mustWith" ||
        sortKey === "avoidWith"
      ) {
        const arr1 = Array.isArray(p.prefer)
          ? p.prefer
          : Array.isArray(p.mustWith)
          ? p.mustWith
          : [];
        const arr2 = Array.isArray(p.avoid)
          ? p.avoid
          : Array.isArray(p.avoidWith)
          ? p.avoidWith
          : [];
        // עדיפות לאורך prefer; הוספת "שבר" קטן מ-avoid למניעת שוויון
        return arr1.length + arr2.length / 1000;
      }

      // שדות ציונים/בוליאני/טקסט
      if (sortKey === "r" || sortKey === "rating") return p.r ?? p.rating ?? 0;
      if (sortKey === "selected" || sortKey === "active")
        return p.selected ? 1 : 0;

      const v = p[sortKey];
      // מספרים נשמרים כמספרים, טקסטים כמחרוזות
      return typeof v === "number" ? v : (v ?? "").toString();
    };

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

  // שלד טעינה בטוח במקום קריסה
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
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditId(null);
            setModalOpen(true);
          }}
        >
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
                    onChange={(e) =>
                      updatePlayer?.(p.id, {
                        active: e.target.checked,
                        selected: e.target.checked,
                      })
                    }
                  />
                </td>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    updatePlayer?.(p.id, {
                      name: e.currentTarget.textContent.trim(),
                    })
                  }
                >
                  {p.name}
                </td>
                <td>
                  <select
                    className="input"
                    value={p.pos}
                    onChange={(e) => updatePlayer?.(p.id, { pos: e.target.value })}
                  >
                    <option>GK</option>
                    <option>DF</option>
                    <option>MF</option>
                    <option>FW</option>
                  </select>
                </td>
                <td>
                  <input
                    className="input w-24"
                    type="number"
                    step="0.5"
                    value={p.r ?? 0}
                    onChange={(e) =>
                      updatePlayer?.(p.id, {
                        rating: +e.target.value,
                        r: +e.target.value,
                      })
                    }
                  />
                </td>
                <td>{Array.isArray(p.prefer) ? p.prefer.length : 0}</td>
                <td>{Array.isArray(p.avoid) ? p.avoid.length : 0}</td>
                <td className="whitespace-nowrap">
                  <button className="btn" onClick={() => edit(p.id)}>
                    ערוך
                  </button>
                  <button
                    className="btn btn-danger ml-2"
                    onClick={() => deletePlayer?.(p.id)}
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlayerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editId={editId}
      />
    </div>
  );
}
