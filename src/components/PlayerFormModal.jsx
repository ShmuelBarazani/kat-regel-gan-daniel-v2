// src/components/PlayerFormModal.jsx
// מודאל תקין (לא "מסך שחור"), כולל סגירה ב-ESC. עובד ישירות מול הסכמה הפנימית שלנו.
// *נשאר כאן למקרה שתרצה כן לערוך/להוסיף שחקנים דרך מודאל; אם אין צורך - אפשר להשאיר מבלי לקרוא לו.
import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../store/playerStorage";

export default function PlayerFormModal({ open, onClose, editId }) {
  const { state, addPlayer, updatePlayer } = useApp();
  const edit = useMemo(() => state.players.find((p) => p.id === editId), [state.players, editId]);

  const [name, setName] = useState("");
  const [pos, setPos] = useState("MF");
  const [rating, setRating] = useState(5);
  const [mustWith, setMustWith] = useState([]);
  const [avoidWith, setAvoidWith] = useState([]);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (edit) {
      setName(edit.name || "");
      setPos(edit.pos || "MF");
      setRating(edit.rating ?? 5);
      setMustWith(edit.mustWith || []);
      setAvoidWith(edit.avoidWith || []);
      setActive(!!edit.active);
    } else {
      setName("");
      setPos("MF");
      setRating(5);
      setMustWith([]);
      setAvoidWith([]);
      setActive(true);
    }
  }, [edit, open]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && open) onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const allPlayers = state.players;

  const save = () => {
    const payload = {
      id: edit?.id || Date.now(),
      name,
      pos,
      rating: +rating,
      mustWith,
      avoidWith,
      active,
    };
    if (edit) updatePlayer(edit.id, payload);
    else addPlayer(payload);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[min(96vw,560px)] max-h-[90vh] overflow-auto rounded-2xl bg-white text-gray-900 p-5 shadow-xl" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{edit ? "עריכת שחקן" : "הוספת שחקן"}</h2>
          <button className="px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300" onClick={onClose}>סגור</button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1">שם<input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="grid gap-1">עמדה
            <select className="input" value={pos} onChange={(e) => setPos(e.target.value)}>
              <option>GK</option><option>DF</option><option>MF</option><option>FW</option>
            </select>
          </label>
          <label className="grid gap-1">ציון<input className="input" type="number" step="0.5" min="0" max="10" value={rating} onChange={(e) => setRating(e.target.value)} /></label>
          <label className="grid gap-1">חייב עם<MultiSelect value={mustWith} setValue={setMustWith} options={allPlayers} excludeId={edit?.id} /></label>
          <label className="grid gap-1">לא עם<MultiSelect value={avoidWith} setValue={setAvoidWith} options={allPlayers} excludeId={edit?.id} /></label>
          <label className="inline-flex items-center gap-2 mt-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> משחק?</label>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={save}>שמירה</button>
        </div>
      </div>
    </div>
  );
}

function MultiSelect({ value, setValue, options, excludeId }) {
  const selectable = options.filter((o) => o.id !== excludeId);
  const toggle = (id) => setValue(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="border rounded p-2 max-h-32 overflow-auto bg-white text-gray-800">
      {selectable.map((o) => (
        <label key={o.id} className="flex items-center gap-2 py-0.5">
          <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} />
          <span>{o.name}</span>
        </label>
      ))}
    </div>
  );
}
