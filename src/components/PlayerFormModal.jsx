// src/components/PlayerFormModal.jsx
import React, { useMemo, useState } from "react";
import { POS } from "../lib/storage.js";

export default function PlayerFormModal({ players, onSave, onClose }) {
  const [form, setForm] = useState({
    name: "",
    pos: "MF",
    rating: 6.5,
    active: false,
    mustWith: [],
    avoidWith: [],
  });

  const options = useMemo(
    () =>
      players.map((p) => ({
        id: String(p.id),
        name: p.name,
      })),
    [players]
  );

  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      id: crypto.randomUUID(),
      ...form,
      rating: Number(form.rating),
      mustWith: form.mustWith.map(String),
      avoidWith: form.avoidWith.map(String),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} dir="rtl">
        <h3>שחקן חדש</h3>
        <form onSubmit={submit} className="modal-form">
          <label>
            שם
            <input
              className="input"
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
              required
            />
          </label>

          <label>
            עמדה
            <select
              value={form.pos}
              onChange={(e) => change("pos", e.target.value)}
            >
              {POS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </label>

          <label>
            ציון
            <input
              type="number"
              className="input"
              min="1"
              max="10"
              step="0.1"
              value={form.rating}
              onChange={(e) => change("rating", e.target.value)}
            />
          </label>

          <label className="row">
            <span>משחק?</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => change("active", e.target.checked)}
            />
          </label>

          <label>
            חייב עם
            <select
              multiple
              value={form.mustWith}
              onChange={(e) =>
                change(
                  "mustWith",
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            לא עם
            <select
              multiple
              value={form.avoidWith}
              onChange={(e) =>
                change(
                  "avoidWith",
                  Array.from(e.target.selectedOptions, (o) => o.value)
                )
              }
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="btn primary">
              שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
