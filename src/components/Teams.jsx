// src/components/Teams.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getPlayers, setPlayers,
  getTeamsState, setTeamsState,
  addRound, countActive
} from "../lib/storage";

const emptyGroups = (n) => Array.from({ length: n }, () => []);

export default function Teams() {
  const [players, setLocalPlayers] = useState(getPlayers([]));
  const [teamCount, setTeamCount]   = useState(getTeamsState().teamCount || 4);
  const [groups, setGroups]         = useState(() => {
    const s = getTeamsState();
    return s.groups?.length ? s.groups : emptyGroups(s.teamCount || 4);
  });

  // אם מישהו עדכן שחקנים במסך “שחקנים” — נטען שוב
  useEffect(() => {
    setLocalPlayers(getPlayers([]));
  }, []);

  const active = useMemo(() => players.filter(p => p.play), [players]);
  const activeCount = active.length;

  // שמור מצב כוחות כדי שלא ייעלם כשחוזרים בין טאבים
  useEffect(() => { setTeamsState({ teamCount, groups }); }, [teamCount, groups]);

  const reshuffle = () => {
    // אלגוריתם פשוט: מיון יורד לפי ציון וחלוקה סיבובית
    const ordered = [...active].sort((a,b) => b.r - a.r);
    const g = emptyGroups(teamCount);
    ordered.forEach((p, i) => g[i % teamCount].push(p.id));
    setGroups(g);
  };

  const saveRound = () => {
    addRound({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      teamCount,
      activeCount,
      groups,
    });
  };

  const move = (fromIdx, toIdx, playerId) => {
    setGroups(prev => {
      const next = prev.map(x => [...x]);
      const i = next[fromIdx].indexOf(playerId);
      if (i > -1) next[fromIdx].splice(i,1);
      next[toIdx].push(playerId);
      return next;
    });
  };

  const readable = (id) => players.find(p => p.id === id)?.name ?? id;

  return (
    <section className="page teams" dir="rtl">
      {/* כותרת ממורכזת מעל הבקרה */}
      <h1 className="page-title center">קטרגל גן-דניאל ⚽</h1>

      <div className="toolbar centered">
        <div className="inline">
          <label>מס’ קבוצות</label>
          <select className="select"
            value={teamCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              setTeamCount(n);
              setGroups(emptyGroups(n));
            }}>
            {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button className="btn primary" onClick={reshuffle}>עשה כוחות</button>
        <button className="btn" onClick={saveRound}>שמור מחזור</button>

        <div className="spacer" />
        <div className="muted">
          מסומנים למשחק: <b>{activeCount}</b> / {players.length}
        </div>
      </div>

      {/* כוחות מעל הטבלה */}
      <div className="groups-grid">
        {groups.map((g, gi) => (
          <div className="group-card" key={gi}>
            <div className="group-title">קבוצה {gi+1}</div>
            <ul className="group-list">
              {g.map(pid => (
                <li key={pid}>
                  <span className="name">{readable(pid)}</span>
                  {/* פעולות גרירה בין קבוצות (חצים קטנים) */}
                  <span className="move">
                    {gi>0 && <button className="icon" onClick={() => move(gi, gi-1, pid)}>◀</button>}
                    {gi<groups.length-1 && <button className="icon" onClick={() => move(gi, gi+1, pid)}>▶</button>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* טבלת שחקנים עם גלילה פנימית */}
      <div className="subbar top-gap">
        <span>שחקנים פעילים: <b>{activeCount}</b> / {players.length}</span>
      </div>

      <div className="table-wrapper players-scroll">
        <table className="table players-table">
          <thead>
            <tr>
              <th style={{width:72}}>משחק?</th>
              <th style={{minWidth:220}}>שם</th>
              <th style={{width:110}}>עמדה</th>
              <th style={{width:110}}>ציון</th>
              <th>חייב עם</th>
              <th>לא עם</th>
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                <td className="center">
                  <input
                    type="checkbox"
                    checked={!!p.play}
                    onChange={e => {
                      const play = e.target.checked;
                      const next = players.map(x => x.id===p.id ? {...x, play} : x);
                      setLocalPlayers(next);
                      setPlayers(next);
                    }}
                  />
                </td>
                <td>{p.name}</td>
                <td className="center">{p.pos}</td>
                <td className="center">{Number(p.r).toFixed(1).replace('.0','')}</td>
                <td className="ellipsis">{(p.prefer||[]).map(id => players.find(x=>x.id===id)?.name).filter(Boolean).join(' · ')}</td>
                <td className="ellipsis">{(p.avoid||[]).map(id => players.find(x=>x.id===id)?.name).filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
