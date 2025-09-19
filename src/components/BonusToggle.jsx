// src/components/BonusToggle.jsx
import React from "react";
import { useStorage } from "../lib/storage.js";

export default function BonusToggle(){
  const { bonusWeek, bonusMonth, setBonusWeek, setBonusMonth } = useStorage();
  return (
    <div className="bonus">
      <label className={"pill" + (bonusWeek ? " active" : "")}>
        <input type="checkbox" checked={bonusWeek} onChange={e=>setBonusWeek(e.target.checked)} />
        בונוס שבועי (+5)
      </label>
      <label className={"pill" + (bonusMonth ? " active" : "")}>
        <input type="checkbox" checked={bonusMonth} onChange={e=>setBonusMonth(e.target.checked)} />
        בונוס חודשי (+10)
      </label>
    </div>
  );
}
