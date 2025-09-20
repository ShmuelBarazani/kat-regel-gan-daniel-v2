import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  generateTeams,
  checkTeamSizePolicy,
  buildMustUnits,
  violatesAvoidWith,
} from "../logic/balance";

/** DoForces.jsx — v3.5 (KATREGEL GAN DANIEL)
 * • הקבוצות למעלה (בעיצוב כמו בצילום), הטבלה למטה (אותו מבנה כמו מסך “שחקנים”).
 * • Drag&Drop דו־כיווני, איזון גדלים ±1, “חייב־עם” באלגו, אזהרה בפירוק ידני.
 * • “עשה כוחות” => חלוקה חדשה; “שמור מחזור (טיוטה)” => localStorage('draftCycles').
 */

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const sum = (arr, sel = (x) => x) => arr.reduce((s, x) => s + sel(x), 0);
const avg = (arr, sel = (x) => x) =>
  arr.length ? +(sum(arr, sel) / arr.length).toFixed(2) : 0;

function loadPlayers() {
  try {
    const raw = localStorage.getItem("players");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return [];
}
function savePlayers(players) {
  try { localStorage.setItem("players", JSON.stringify(players)); } catch {}
}

export default function DoForces() {
  const [players, setPlayers] = useState(loadPlayers());
  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState(() => Array.from({ length: 4 }, () => []));
  const [hideCardRatings, setHideCardRatings] = useState(false);
  const [toast, setToast] = useState(null); // {type:'ok'|'warn'|'err', msg}

  useEffect(() => { savePlayers(players); }, [players]);

  const activePlayers = useMemo(() => players.filter(p => p.playing), [players]);
  const assignedCount = sum(teams, t => t.length);

  // ===== Toast =====
  function openToast(type, msg) {
    setToast({ type, msg });
    window.clearTimeout(openToast._t);
    openToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  // ===== Drag & Drop =====
  const dragRef = useRef({ playerId: null, fromTeamIdx: null });
  function findPlayerById(id) { return players.find(p => String(p.id) === String(id)); }
  function handleDragStart(e, playerId, fromTeamIdx) { dragRef.current = { playerId, fromTeamIdx }; e.dataTransfer.effectAllowed = "move"; }
  function handleDragOver(e) { e.preventDefault(); }

  function dropToTeam(targetTeamIdx) {
    const { playerId } = dragRef.current; if (!playerId) return;
    const player = findPlayerById(playerId); if (!player) return;

    // לא־עם — חסימה
    if (violatesAvoidWith(teams[targetTeamIdx], player)) {
      openToast("warn", "הגרירה נחסמה: יש התנגשות 'לא־עם' בקבוצה היעד");
      return;
    }

    // בניית Next State ובדיקת איזון גדלים
    const next = teams.map(t => t.slice());
    for (const t of next) {
      const i = t.findIndex(x => x.id === player.id);
      if (i !== -1) t.splice(i, 1);
    }
    next[targetTeamIdx].push(player);

    if (!checkTeamSizePolicy(next, activePlayers.length)) {
      openToast("warn", "איזון גדלים (±1) — הפעולה בוטלה");
      return;
    }

    // אזהרת פירוק חייב־עם
    const unitOf = buildMustUnits(activePlayers).find(u => u.some(x => x.id === player.id));
    if (unitOf) {
      const tIdx = next.findIndex(t => t.some(x => x.id === unitOf[0].id));
      const together = tIdx !== -1 && unitOf.every(m => next[tIdx].some(x => x.id === m.id));
      if (!together) openToast("warn", "זהירות: פירקת יחידת 'חייב־עם'");
    }

    setTeams(next);
  }
  function handleDropOnTeam(e, idx) { e.preventDefault(); dropToTeam(idx); dragRef.current = { playerId: null, fromTeamIdx: null }; }
  function handleDropBackToPool(e) {
    e.preventDefault();
    const { playerId } = dragRef.current; if (!playerId) return;
    const next = teams.map(t => t.filter(x => x.id !== playerId));
    setTeams(next);
    dragRef.current = { playerId: null, fromTeamIdx: null };
  }

  // ===== פעולות =====
  function doMakeTeams() {
    try {
      const newTeams = generateTeams(players, teamCount); // חלוקה חדשה בכל לחיצה
      setTeams(newTeams);
      openToast("ok", "נוצרה חלוקה חדשה");
    } catch (e) {
      openToast("err", e.message || "כשל ביצירת קבוצות");
    }
  }
  function saveDraftCycle() {
    const payload = {
      id: Date.now().toString(36),
      ts: new Date().toISOString(),
      teamCount,
      playersActive: activePlayers.length,
      playersAssigned: assignedCount,
      teams: teams.map(t => t.map(p => ({ id: p.id, name: p.name, pos: p.pos, rating: p.rating }))),
    };
    try {
      const raw = localStorage.getItem("draftCycles");
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(payload);
      localStorage.setItem("draftCycles", JSON.stringify(arr));
      openToast("ok", "הטיוטה נשמרה (מסך מנהל)");
    } catch { openToast("err", "שגיאה בשמירה"); }
  }

  // ===== טבלת שחקנים (כמו “שחקנים”) =====
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [nameFilter, setNameFilter] = useState("");

  const tablePlayers = useMemo(() => {
    const rows = players
      .filter(p => p.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
      .slice();
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let A = a[sortKey], B = b[sortKey];
      if (typeof A === "string") A = A.toLowerCase();
      if (typeof B === "string") B = B.toLowerCase();
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
    return rows;
  }, [players, sortKey, sortDir, nameFilter]);

  function toggleSort(k) { if (k === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc"); } }
  function togglePlaying(id) { setPlayers(ps => ps.map(p => (p.id === id ? { ...p, playing: !p.playing } : p))); }
  function onEditRating(id, v) { const num = clamp(parseFloat(v) || 0, 0, 10); setPlayers(ps => ps.map(p => (p.id === id ? { ...p, rating: num } : p))); }
  function onEditPos(id, pos)   { setPlayers(ps => ps.map(p => (p.id === id ? { ...p, pos } : p))); }
  function onEditLists(id) {
    const pl = players.find(p => p.id === id); if (!pl) return;
    const must  = prompt("חייב־עם (שמות מופרדים בפסיק):", (pl.mustWith || []).join(","));
    const avoid = prompt("לא־עם (שמות מופרדים בפסיק):", (pl.avoidWith || []).join(","));
    setPlayers(ps => ps.map(p => p.id === id ? {
      ...p,
      mustWith: must ? must.split(",").map(s => s.trim()).filter(Boolean) : [],
      avoidWith: avoid ? avoid.split(",").map(s => s.trim()).filter(Boolean) : [],
    } : p));
  }
  function onDelete(id) { setPlayers(ps => ps.filter(p => p.id !== id)); }

  // סטטיסטיקות כרטיסים
  const teamStats = teams.map(t => ({
    avg: avg(t, x => x.rating),
    sum: +sum(t, x => x.rating).toFixed(1),
    count: t.length,
  }));

  return (
    <div className="mx-auto px-3" dir="rtl">
      {/* שורת שליטה: מונים משמאל; כפתורים מימין */}
      <div className="flex items-center justify-between mt-4 mb-3">
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div>פעילים: <b>{activePlayers.length}</b></div>
          <div>משובצים: <b>{assignedCount}</b></div>
          <div className="flex items-center gap-2">
            <label>מס׳ קבוצות</label>
            <input
              type="number" min={2} max={8} value={teamCount}
              onChange={e => setTeamCount(clamp(+e.target.value || 2, 2, 8))}
              className="w-16 rounded-md bg-[#0f1a2e] text-white border border-[#24324a] px-2 py-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideCardRatings(v => !v)}
            className="rounded-xl border border-[#24324a] bg-[#0f1a2e] hover:bg-[#182544] px-3 py-2 text-sm"
          >
            {hideCardRatings ? "הצג ציונים (בכרטיסים)" : "הסתר ציונים (בכרטיסים בלבד)"}
          </button>
          <button
            onClick={doMakeTeams}
            className="rounded-xl bg-green-600 hover:bg-green-700 px-3 py-2 text-sm text-white shadow"
          >
            עשה כוחות
          </button>
          <button
            onClick={saveDraftCycle}
            className="rounded-xl bg-slate-600 hover:bg-slate-700 px-3 py-2 text-sm text-white"
          >
            שמור מחזור (טיוטה)
          </button>
        </div>
      </div>

      {/* ===== קבוצות למחזור – למעלה, כמו בצילום ===== */}
      <div className="rounded-2xl border border-[#24324a] bg-[#0f1a2e] mb-4">
        <div className="px-4 py-2 text-white text-sm bg-[#1e5a3f] rounded-t-2xl">קבוצות למחזור</div>

        <div className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-3 p-3">
          {teams.map((team, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#24324a] bg-[#0f1a2e] p-3"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnTeam(e, idx)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-200 font-medium">קבוצה {idx + 1}</div>
                <div className="text-xs text-slate-300">
                  סכ״כ {teamStats[idx].sum} | ממוצע {teamStats[idx].avg} | {teamStats[idx].count} שחקנים
                </div>
              </div>

              <ul className="space-y-1 min-h-[120px]">
                {team.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg px-3 py-2 bg-[#101b31] border border-[#24324a] cursor-move flex items-center justify-between"
                    draggable
                    onDragStart={(e) => handleDragStart(e, p.id, idx)}
                  >
                    <span className="text-sm">
                      {p.name} — {!hideCardRatings && <b>{p.rating}</b>}{" "}
                      <span className="text-xs text-slate-400">({p.pos})</span>
                    </span>
                    <span className="text-slate-500">⋮⋮</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ===== טבלת השחקנים – למטה, כמו במסך “שחקנים” ===== */}
      <div
        className="rounded-2xl border border-[#24324a] bg-[#0f1a2e] overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDropBackToPool}
      >
        <div className="flex items-center justify-between bg-[#1e5a3f] text-white py-2 px-3 text-sm">
          <div>רשימת השחקנים</div>
          <div className="flex items-center gap-2">
            <input
              placeholder="חפש שם…"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="rounded-md bg-[#0f1a2e] text-white border border-[#24324a] px-2 py-1 text-xs w-40"
            />
          </div>
        </div>

        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-right">
            <thead className="sticky top-0 bg-[#0f1a2e]">
              <tr className="text-slate-300 text-sm">
                <th className="py-2 px-3 w-24">משחק?</th>
                <th className="py-2 px-3">שם</th>
                <th className="py-2 px-3 w-24"><button onClick={() => toggleSort("pos")}>עמדה</button></th>
                <th className="py-2 px-3 w-24"><button onClick={() => toggleSort("rating")}>ציון</button></th>
                <th className="py-2 px-3 w-56">חייב־עם</th>
                <th className="py-2 px-3 w-56">לא־עם</th>
                <th className="py-2 px-3 w-28">עריכה</th>
                <th className="py-2 px-3 w-24">מחיקה</th>
              </tr>
            </thead>
            <tbody>
              {tablePlayers.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[#13213a] hover:bg-[#101b31] cursor-grab"
                  draggable
                  onDragStart={(e) => handleDragStart(e, p.id, null)}
                >
                  <td className="py-2 px-3">
                    <input type="checkbox" checked={!!p.playing} onChange={() => togglePlaying(p.id)} />
                  </td>
                  <td className="py-2 px-3">{p.name}</td>
                  <td className="py-2 px-3">{p.pos}</td>
                  <td className="py-2 px-3">{p.rating}</td>
                  <td className="py-2 px-3 text-xs text-slate-300">
                    {(p.mustWith || []).length ? p.mustWith.join(", ") : "—"}
                  </td>
                  <td className="py-2 px-3 text-xs text-slate-300">
                    {(p.avoidWith || []).length ? p.avoidWith.join(", ") : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => onEditLists(p.id)}
                        className="rounded-full bg-[#1e5a3f] hover:bg-[#23704e] text-white px-3 py-1"
                      >
                        ערוך
                      </button>
                      <select
                        value={p.pos}
                        onChange={(e) => onEditPos(p.id, e.target.value)}
                        className="bg-[#0f1a2e] border border-[#24324a] rounded px-2 py-1"
                      >
                        <option>GK</option><option>DF</option><option>MF</option><option>FW</option>
                      </select>
                      <input
                        type="number" step="0.5" min={0} max={10} defaultValue={p.rating}
                        onBlur={(e) => onEditRating(p.id, e.target.value)}
                        className="w-16 bg-[#0f1a2e] border border-[#24324a] rounded px-2 py-1"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button onClick={() => onDelete(p.id)} className="text-red-400 hover:text-red-300 text-xs">מחק</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-slate-400 px-3 py-2">
          טיפ: גרור שחקן מתוך הטבלה אל אחת הקבוצות, או גרור שחקן מכרטיס קבוצה חזרה לטבלה כדי להסירו.
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-xl shadow text-sm ${
          toast.type==='ok' ? 'bg-green-600 text-white'
          : toast.type==='warn' ? 'bg-yellow-600 text-white'
          : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
