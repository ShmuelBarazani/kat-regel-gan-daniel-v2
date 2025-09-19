import React from "react";

export default function BonusToggle({ value, onToggle }){
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-2 rounded-2xl text-sm border transition
        ${value ? "border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                 : "border-slate-700 hover:bg-slate-800"}`}
      title="הפעל/בטל בונוס"
    >
      {value ? "בונוס: פעיל" : "בונוס: כבוי"}
    </button>
  );
}
