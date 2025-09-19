// src/components/Players.jsx
import React, { useMemo, useState } from "react";
import { useStorage, POS } from "../lib/storage.js";
import PlayerFormModal from "./PlayerFormModal.jsx";

export default function Players() {
  const { players, setPlayers } = useStorage();
  const [showAdd, setShowAdd] = useState(false);

  const idToName = useMemo(() => {
    const m = new Map();
    players.forEach((p) => m.set(String(p.id), p.name));
    return m;
  }, [players]);

  const displayNames = (arr) => {
    if (!Array.isArray(arr) || !arr.length) return "—";
    return arr
      .map((x) => (idToName.get(String(x)) || String(x)))
      .join(", ");
  };

  const updatePlayer = (id, patch) =>
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );

  const removePlayer = (id) =>
    setPlayers((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="players-page" dir="rtl">
      <div className="toolbar">
        <button className="btn primary" onClick={() => setShowAdd(true)}>
          הוסף שחקן
        </button>
      </div>

      <div className="table-wrapper">
        <table className="players-table">
          <thead>
            <tr>
              <th>משחק?</th>
              <th>שם</th>
              <th>עמדה</th>
              <th>ציון</th>
              <th>חייב עם</th>
              <th>לא עם</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!p.active}
                    onChange={(e) =>
                      updatePlayer(p.id, { active: e.target.checked })
                    }
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={p.name}
                    onChange={(e) => updatePlayer(p.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={p.pos}
                    onChange={(e) => updatePlayer(p.id, { pos: e.target.value })}
                  >
                    {POS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    className="input"
                    step="0.1"
                    min="1"
                    max="10"
                    value={p.rating}
                    onChange={(e) =>
                      updatePlayer(p.id, { rating: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="nowrap">{displayNames(p.mustWith)}</td>
                <td className="nowrap">{displayNames(p.avoidWith)}</td>
                <td>
                  <button className="btn danger" onClick={() => removePlayer(p.id)}>
                    מחיקה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <PlayerFormModal
          players={players}
          onClose={() => setShowAdd(false)}
          onSave={(newPlayer) => {
            setPlayers((prev) => [{ ...newPlayer }, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
