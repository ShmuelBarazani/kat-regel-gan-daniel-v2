// src/pages/Ranking.jsx
import React from "react";
import { useApp } from "../store/playerStorage";
import Leaderboards from "../components/Leaderboards";

export default function Ranking() {
  const { state, setSettings } = useApp();
  return (
    <div className="page" dir="rtl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="title">דירוג</h1>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!state.settings.bonus}
            onChange={(e) => setSettings({ bonus: e.target.checked })}
          />
          עם בונוס
        </label>
      </div>
      <Leaderboards />
    </div>
  );
}
