// src/components/SavedCycles.jsx
import React from "react";
import { useApp } from "../store/playerStorage";

export default function SavedCycles() {
  const { state } = useApp();
  if (!state.cycles.length) return <div className="muted">אין מחזורים שמורים עדיין</div>;

  return (
    <div className="grid gap-3" dir="rtl">
      {state.cycles.map((c) => (
        <div key={c.id} className="card">
          <div className="flex items-center justify-between">
            <div className="font-medium">מחזור #{c.id} · {new Date(c.ts).toLocaleString()}</div>
          </div>
          <div className="grid md:grid-cols-2 gap-2 mt-2">
            {c.teams.map((t) => (
              <div key={t.id} className="p-2 rounded bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <div>{t.name}</div><div className="text-sm">ממוצע {t.avg}</div>
                </div>
                <ul className="text-sm mt-1 list-disc pr-5">
                  {t.players.map((p) => <li key={p.id}>{p.name} ({p.rating})</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
