// src/pages/Admin.jsx
import React, { useState } from "react";
import { useApp } from "../store/playerStorage";
import SavedCycles from "../components/SavedCycles";
import MatchdayResults from "../components/MatchdayResults";

export default function Admin() {
  const { state, setCycles } = useApp();
  const [openId, setOpenId] = useState(null);
  const cycle = state.cycles.find((c) => c.id === openId) || state.cycles.at(-1);

  const onChange = (patch) => {
    const next = state.cycles.map((c) => (c.id === patch.id ? patch : c));
    setCycles(next);
  };

  return (
    <div className="page" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="title">מנהל</h1>
        <div className="flex gap-2 items-center">
          <label>
            פתח מחזור:
            <select className="input ml-2" value={openId || ""} onChange={(e) => setOpenId(+e.target.value || null)}>
              <option value="">(אחרון)</option>
              {state.cycles.map((c) => (
                <option key={c.id} value={c.id}>#{c.id}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {cycle ? (
        <div className="grid gap-4">
          <MatchdayResults cycle={cycle} onChange={onChange} />
        </div>
      ) : (
        <div className="muted">אין מחזורים לפתיחה. צור מחזור במסך "קבוצות" באמצעות "קבע מחזור".</div>
      )}

      <div className="divider" />
      <SavedCycles />
    </div>
  );
}
