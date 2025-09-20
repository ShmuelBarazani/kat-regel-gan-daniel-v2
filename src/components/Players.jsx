// src/components/Players.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getPlayers, setPlayers, countActive } from "../lib/storage";

const POS = ["GK", "DF", "MF", "FW"];

export default function Players() {
  const [players, setLocal] = useState([]);

  // טען מלוקאל־סטוראז' או מקובץ public/players.json
  useEffect(() => {
    const fromStore = getPlayers(null);
    if (fromStore) {
      setLocal(fromStore);
    } else {
      fetch("/players.json?ts=" + Date.now())
        .then(r => r.json())
        .then(list => {
          // ודא שדות מינימום
          const norm = list.map(p => ({
            id: p.id ?? crypto.randomUUID(),
            name: p.name ?? "",
            pos: p.pos ?? "MF",
            r: Number(p.r ?? 6.5),
            play: !!p.selected,      // selected => play
            prefer: p.prefer ?? [],
            avoid: p.avoid ?? [],
          }));
          setLocal(norm);
          setPlayers(norm);
        })
        .catch(() => setLocal([]));
    }
  }, []);

  // שמירה אוטומטית
  useEffect(() => { setPlayers(players); }, [players]);

  const activeCount = useMemo(() => countActive(players), [players]);

  const update = (id, patch) =>
    setLocal(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));

  const remove = (id) =>
    setLocal(prev => prev.filter(p => p.id !== id));

  const addPlayer = () =>
    setLocal(prev => [
      {
        id: crypto.randomUUID(),
        name: "",
        pos: "MF",
        r: 6.5,
        play: false,
        prefer: [],
        avoid: [],
      },
      ...prev,
    ]);

  return (
    <section className="page players" dir="rtl">
      <div className="toolbar">
        <h1 className="page-title">קטרגל גן-דניאל ⚽</h1>
        <div className="spacer" />
        <button className="btn add" onClick={addPlayer}>הוסף שחקן</button>
      </div>

      <div className="subbar">
        <span>מסומנים למשחק: <b>{activeCount}</b> / {players.length}</span>
      </div>

      <div className="table-wrapper players-scroll">
        <table className="table players-table">
          <thead>
            <tr>
              <th style={{width: 72}}>משחק?</th>
              <th style={{minWidth: 240}}>שם</th>
              <th style={{width: 120}}>עמדה</th>
              <th style={{width: 120}}>ציון</th>
              <th>חייב עם</th>
              <th>לא עם</th>
              <th style={{width: 100}}>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                {/* משחק? ראשונה */}
                <td className="center">
                  <input
                    type="checkbox"
                    checked={!!p.play}
                    onChange={e => update(p.id, { play: e.target.checked })}
                  />
                </td>

                {/* שם */}
                <td>
                  <input
                    className="input"
                    value={p.name}
                    onChange={e => update(p.id, { name: e.target.value })}
                    placeholder="שם שחקן"
                  />
                </td>

                {/* עמדה */}
                <td>
                  <select
                    className="select"
                    value={p.pos}
                    onChange={e => update(p.id, { pos: e.target.value })}
                  >
                    {POS.map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </td>

                {/* ציון */}
                <td>
                  <input
                    className="input center"
                    type="number" step="0.5" min="1" max="10"
                    value={p.r}
                    onChange={e => update(p.id, { r: Number(e.target.value) })}
                  />
                </td>

                {/* חייב עם / לא עם – שבבי תצוגה + עריכה בלחיצה */}
                <td className="chips-cell">
                  <Chips editable list={p.prefer} all={players} onChange={(list) => update(p.id, { prefer: list })} />
                </td>
                <td className="chips-cell">
                  <Chips editable list={p.avoid} all={players} onChange={(list) => update(p.id, { avoid: list })} />
                </td>

                <td className="center">
                  <button className="btn danger" onClick={() => remove(p.id)}>מחיקה</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** בחירה קומפקטית לשדות "חייב עם / לא עם" */
function Chips({ list, all, editable, onChange }) {
  const [open, setOpen] = useState(false);
  const names = new Map(all.map(p => [p.id, p.name]));
  const ids = new Map(all.map(p => [p.name, p.id])); // תמיכה בשמות ישנים

  const normalized = (list ?? []).map(x => (ids.get(x) || x));

  const toggle = (id) => {
    const exists = normalized.includes(id);
    const next = exists ? normalized.filter(x => x !== id) : [...normalized, id];
    onChange?.(next);
  };

  return (
    <div className="chips">
      {(normalized.length ? normalized : []).map(id => (
        <span key={id} className="chip">{names.get(id) ?? id}</span>
      ))}
      {editable && (
        <button className="btn tiny" onClick={() => setOpen(v => !v)}>ערוך</button>
      )}
      {open && (
        <div className="picker">
          <div className="picker-list">
            {all.map(p => (
              <label key={p.id} className="pick-row">
                <input
                  type="checkbox"
                  checked={normalized.includes(p.id)}
                  onChange={() => toggle(p.id)}
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
          <div className="picker-actions">
            <button className="btn" onClick={() => setOpen(false)}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}
