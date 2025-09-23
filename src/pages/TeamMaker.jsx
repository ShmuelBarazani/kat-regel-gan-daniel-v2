// src/pages/TeamMaker.jsx
import React, { useState } from "react";
import { useApp } from "../store/playerStorage";
import { makeTeams } from "../logic/balance";
import PrintPreview from "../components/PrintPreview";

export default function TeamMaker() {
  const { state, addCycle } = useApp();
  const [teams, setTeams] = useState(() => makeTeams({ players: state.players }));
  const [hideRatings, setHideRatings] = useState(false);
  const [printMode, setPrintMode] = useState(false);

  const regenerate = () => setTeams(makeTeams({ players: state.players }));

  const saveCycle = () => {
    const cycle = {
      id: (state.cycles.at(-1)?.id || 0) + 1,
      ts: Date.now(),
      teams: teams.map((t) => ({ ...t })),
      goals: [],
    };
    addCycle(cycle);
    alert("נוצר מחזור חדש ונשמר במסך המנהל");
  };

  const onDragStart = (e, pid, from) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ pid, from }));
  };
  const onDrop = (e, to) => {
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (data) {
      setTeams((prev) => {
        const next = prev.map((t) => ({ ...t, players: [...t.players] }));
        // אם from===0 זה מהרשימה התחתונה
        let p;
        if (data.from === 0) {
          // מצא את השחקן ב-state.players (רשימה מלאה)
          p = state.players.find((x) => x.id === data.pid);
        } else {
          const fromI = next.findIndex((t) => t.id === data.from);
          const idx = next[fromI].players.findIndex((x) => x.id === data.pid);
          [p] = next[fromI].players.splice(idx, 1);
        }
        if (!p) return prev;

        const toI = next.findIndex((t) => t.id === to);
        next[toI].players.push(p);

        // עדכון סכומים וממוצעים
        for (const t of next) {
          t.sum = t.players.reduce((s, x) => s + (x.rating || x.r || 0), 0);
          const len = t.players.length || 1;
          t.avg = +(t.sum / len).toFixed(2);
        }
        return next;
      });
    }
  };
  const allowDrop = (e) => e.preventDefault();

  if (printMode) return <PrintPreview teams={teams} />;

  return (
    <div className="page" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="title">קבוצות</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setHideRatings((v) => !v)}>{hideRatings ? "הצג ציונים" : "הסתר ציונים"}</button>
          <button className="btn" onClick={() => setPrintMode(true)}>הדפסה</button>
          <button className="btn" onClick={regenerate}>עשה כוחות</button>
          <button className="btn btn-primary" onClick={saveCycle}>קבע מחזור</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {teams.map((t) => (
          <div key={t.id} className="card" onDragOver={allowDrop} onDrop={(e) => onDrop(e, t.id)}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm">ממוצע: {t.avg}</div>
            </div>
            <ul className="list">
              {t.players.map((p) => (
                <li key={p.id} draggable onDragStart={(e) => onDragStart(e, p.id, t.id)} className="row">
                  <span className="n">{p.name}</span>
                  {!hideRatings && <span className="r">{p.rating ?? p.r}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* רשימת שחקנים בתחתית המסך */}
      <div className="card mt-6">
        <div className="card-title">רשימת שחקנים</div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {state.players.map((p) => (
            <div
              key={p.id}
              className="p-2 rounded bg-slate-800/40 flex items-center justify-between"
              draggable
              onDragStart={(e) => onDragStart(e, p.id, 0)}
            >
              <span>{p.name} — {p.pos}</span>
              {!hideRatings && <span className="text-sm opacity-80">{p.rating ?? p.r}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
