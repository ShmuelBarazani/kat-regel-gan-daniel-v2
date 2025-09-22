import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * PlayerFormModal
 * props:
 * - open: boolean
 * - onClose: () => void
 * - onSubmit: (player) => void
 * - initial: { id?, name, pos, rating, plays, mustWith[], avoidWith[] }
 * - existingPlayers: Array<{id,name}>  ← לרשימות הבחירה
 */
export default function PlayerFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  existingPlayers = [],
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [pos, setPos] = useState(initial?.pos ?? "MF");
  const [rating, setRating] = useState(
    typeof initial?.rating === "number" ? String(initial.rating) : "5"
  );
  const [plays, setPlays] = useState(initial?.plays ?? true);
  const [mustWith, setMustWith] = useState(initial?.mustWith ?? []);
  const [avoidWith, setAvoidWith] = useState(initial?.avoidWith ?? []);
  const firstInputRef = useRef(null);

  useEffect(() => {
    setName(initial?.name ?? "");
    setPos(initial?.pos ?? "MF");
    setRating(typeof initial?.rating === "number" ? String(initial.rating) : "5");
    setPlays(initial?.plays ?? true);
    setMustWith(initial?.mustWith ?? []);
    setAvoidWith(initial?.avoidWith ?? []);
  }, [initial, open]);

  useEffect(() => {
    if (open) setTimeout(() => firstInputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const options = useMemo(() => {
    const cur = (initial?.name ?? "").trim();
    return existingPlayers
      .map(p => p.name)
      .filter(Boolean)
      .filter(n => n.trim() && n.trim() !== cur)
      .sort((a,b) => a.localeCompare(b, "he"));
  }, [existingPlayers, initial]);

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const r = Number(rating);
    const trimmed = name.trim();
    if (!trimmed) return alert("נא להזין שם שחקן.");
    if (r < 0 || r > 10 || Number.isNaN(r)) return alert("ציון חייב להיות בין 0 ל־10.");

    const player = {
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      pos,
      rating: r,
      plays,
      mustWith: mustWith,
      avoidWith: avoidWith,
    };
    onSubmit?.(player);
  };

  // Multi-select helpers
  const onMultiChange = (setter) => (e) => {
    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
    setter(selected);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-[min(680px,96vw)] rounded-2xl bg-[#0f1a2e] text-[#e8eefc] shadow-2xl p-5 border border-[#24324a]"
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl">הוספת/עריכת שחקן</h2>
          <button type="button" onClick={onClose} className="px-3 py-1 rounded-xl border border-[#24324a] hover:bg-white/5">✕</button>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12">
            <label className="block text-sm mb-1">שם</label>
            <input
              ref={firstInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#0b1220] border border-[#24324a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#2575fc]"
              placeholder=""
            />
          </div>

          <div className="col-span-6">
            <label className="block text-sm mb-1">עמדה</label>
            <select
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              className="w-full rounded-xl bg-[#0b1220] border border-[#24324a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#2575fc]"
            >
              <option value="GK">GK — שוער</option>
              <option value="DF">DF — הגנה</option>
              <option value="MF">MF — קישור</option>
              <option value="FW">FW — התקפה</option>
            </select>
          </div>

          <div className="col-span-6">
            <label className="block text-sm mb-1">ציון (0–10)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              max={10}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full rounded-xl bg-[#0b1220] border border-[#24324a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#2575fc]"
            />
          </div>

          <div className="col-span-12 flex items-center gap-2 mt-1">
            <input id="plays" type="checkbox" checked={plays} onChange={(e) => setPlays(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="plays" className="text-sm select-none">משחק במחזור</label>
          </div>

          <div className="col-span-6">
            <label className="block text-sm mb-1">חייב לשחק עם</label>
            <select multiple size={6} value={mustWith} onChange={onMultiChange(setMustWith)}
              className="w-full rounded-xl bg-[#0b1220] border border-[#24324a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#2575fc]">
              {options.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="col-span-6">
            <label className="block text-sm mb-1">לא משחק עם</label>
            <select multiple size={6} value={avoidWith} onChange={onMultiChange(setAvoidWith)}
              className="w-full rounded-xl bg-[#0b1220] border border-[#24324a] px-3 py-2 outline-none focus:ring-2 focus:ring-[#2575fc]">
              {options.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-[#24324a] hover:bg-white/5">ביטול</button>
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#27c463] hover:opacity-90 text-[#0b1220] font-medium">שמירה</button>
        </div>
      </form>
    </div>
  );
}
