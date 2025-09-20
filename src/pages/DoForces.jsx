import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  generateTeams,
  checkTeamSizePolicy,
  buildMustUnits,
  violatesAvoidWith,
} from "../logic/balance";

/**
 * DoForces.jsx — v3.4 (KATREGEL GAN DANIEL)
 * • כרטיסי הקבוצות למעלה; טבלת השחקנים למטה (כמו בצילום, רק ההיפוך המבוקש).
 * • בטבלה: משחק? | שם | עמדה | ציון | חייב־עם | לא־עם | עריכה | מחיקה.
 * • Drag&Drop: טבלה ↔ כרטיסי קבוצות.
 * • איזון גדלים: ±1 בלבד (חסימה בגרירה).
 * • חייב־עם: האלגוריתם מכבד; גרירה שמפרקת — אזהרה.
 * • “עשה כוחות” יוצר חלוקה חדשה בכל לחיצה.
 * • “שמור מחזור (טיוטה)” ל-localStorage ('draftCycles').
 */

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const sum = (arr, sel = (x) => x) => arr.reduce((s, x) => s + sel(x), 0);
const avg = (arr, sel = (x) => x) =>
  arr.length ? +(sum(arr, sel) / arr.length).toFixed(2) : 0;

// דמה אם אין מקור players ב-localStorage
const DEFAULT_PLAYERS = [
  { id: "1", name: "אופיר", pos: "MF", rating: 9, playing: true, mustWith: [], avoidWith: [] },
  { id: "2", name: "פייביש", pos: "MF", rating: 9.5, playing: true, mustWith: [], avoidWith: [] },
  { id: "3", name: "מקסים", pos: "DF", rating: 6.5, playing: true, mustWith: [], avoidWith: [] },
  { id: "4", name: "אייטני-סאם", pos: "FW", rating: 8.5, playing: true, mustWith: ["מיכה"], avoidWith: [] },
  { id: "5", name: "עזי עפרני", pos: "MF", rating: 8, playing: true, mustWith: [], avoidWith: [] },
  { id: "6", name: "מיכה", pos: "FW", rating: 8, playing: true, mustWith: ["אייטני-סאם"], avoidWith: [] },
  { id: "7", name: "יוסי תלתלים", pos: "MF", rating: 7.5, playing: true, mustWith: [], avoidWith: [] },
  { id: "8", name: "גילי", pos: "DF", rating: 7, playing: true, mustWith: [], avoidWith: ["אלדד"] },
  { id: "9", name: "עופר", pos: "DF", rating: 6.5, playing: true, mustWith: [], avoidWith: [] },
  { id: "10", name: "אלדד", pos: "FW", rating: 3, playing: true, mustWith: [], avoidWith: ["גילי"] },
];

function loadPlayers() {
  try {
    const raw = localStorage.getItem("players");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  return DEFAULT_PLAYERS;
}
function savePlayers(players) {
  try {
    localStorage.setItem("players", JSON.stringify(players));
  } catch {}
}

export default function DoForces() {
  const [players, setPlayers] = useState(loadPlayers());
  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState(() => Array.from({ length: 4 }, () => []));
  const [hideCardRatings, setHideCardRatings] = useState(false);
  const [toast, setToast] = useState(null); // {type:'ok'|'warn'|'err', msg}

  useEffect(() => {
    savePlayers(players);
  }, [players]);

  const activePlayers = useMemo(() => players.filter((p) => p.playing), [players]);
  const assignedCount = sum(teams, (t) => t.length);

  // === Toast קטן ===
  function openToast(type, msg) {
    setToast({ type, msg });
    window.clearTimeout(openToast._t);
    openToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  // === Drag & Drop ===
  const dragRef = useRef({ playerId: null, fromTeamIdx: null });
  function findPlayerById(id) {
    return players.find((p) => String(p.id) === String(id));
  }
  function handleDragStart(e, playerId, fromTeamIdx) {
    dragRef.current = { playerId, fromTeamIdx };
    e.dataTransfer.effectAllowed = "move";
  }
  function handleDragOver(e) {
    e.preventDefault();
  }

  function dropToTeam(targetTeamIdx) {
    const { playerId } = dragRef.current;
    if (!playerId) return;
    const player = findPlayerById(playerId);
    if (!player) return;

    // "לא־עם" — חסימה
    if (violatesAvoidWith(teams[targetTeamIdx], player)) {
      openToast("warn", "הגרירה נחסמה: יש התנגשות 'לא־עם' בקבוצה היעד");
      return;
    }

    // סטייט בדיקה
    const nextTeams = teams.map((t) => t.slice());
    for (const t of nextTeams) {
      const idx = t.findIndex((x) => x.id === player.id);
      if (idx !== -1) t.splice(idx, 1);
    }
    nextTeams[targetTeamIdx].push(player);

    // מדיניות ±1
    if (!checkTeamSizePolicy(nextTeams, activePlayers.length)) {
      openToast("warn", "איזון גדלים (±1) — הפעולה בוטלה");
      return;
    }

    // אזהרת פירוק "חייב־עם" (לא חסימה)
    const unitOf = buildMustUnits(activePlayers).find((u) => u.some((x) => x.id === player.id));
    if (unitOf) {
      const teamIdx = nextTeams.findIndex((t) => t.some((x) => x.id === unitOf[0].id));
      const stillTogether =
        teamIdx !== -1 && unitOf.every((m) => nextTeams[teamIdx].some((x) => x.id === m.id));
      if (!stillTogether) openToast("warn", "זהירות: פירקת יחידת 'חייב־עם'");
    }

    setTeams(nextTeams);
  }
  function handleDropOnTeam(e, idx) {
    e.preventDefault();
    dropToTeam(idx);
    dragRef.current = { playerId: null, fromTeamIdx: null };
  }
  function handleDropBackToPool(e) {
    e.preventDefault();
    const { playerId } = dragRef.current;
    if (!playerId) return;
    const next = teams.map((t) => t.filter((x) => x.id !== playerId));
    setTeams(next);
    dragRef.current = { playerId: null, fromTeamIdx: null };
  }

  // === פעולות ראשיות ===
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
      teams: teams.map((t) =>
        t.map((p) => ({ id: p.id, name: p.name, pos: p.pos, rating: p.rating }))
      ),
    };
    try {
      const raw = localStorage.getItem("draftCycles");
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(payload);
      localStorage.setItem("draftCycles", JSON.stringify(arr));
      openToast("ok", "הטיוטה נשמרה (מסך מנהל)");
    } catch {
      openToast("err", "שגיאה בשמירה");
    }
  }

  // === טבלת שחקנים (כמו במסך “שחקנים”) ===
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [nameFilter, setNameFilter] = useState("");

  const tablePlayers = useMemo(() => {
    const rows = players
      .filter((p) => p.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
      .slice();
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let A = a[sortKey];
      let B = b[sortKey];
      if (typeof A === "string") A = A.toLowerCase();
      if (typeof B === "string") B = B.toLowerCase();
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
    return rows;
  }, [players, sortKey, sortDir, nameFilter]);

  function toggleSort(k) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }
  function togglePlaying(id) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, playing: !p.playing } : p)));
  }
  function onEditRating(id, v) {
    const num = clamp(parseFloat(v) || 0, 0, 10);
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, rating: num } : p)));
  }
  function onEditPos(id, pos) {
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, pos } : p)));
  }
  function onEditLists(id) {
    // פותח prompt פשוט לעריכת חייב־עם/לא־עם (הטמעה מהירה)
    const player = players.find((p) => p.id === id);
    if (!player) return;
    const must = prompt(
      "חייב־עם (שמות מופרדים בפסיק):",
      (player.mustWith || []).join(",")
    );
    const avoid = prompt(
      "לא־עם (שמות מופרדים בפסיק):",
      (player.avoidWith || []).join(",")
    );
    setPlayers((ps) =>
      ps.map((p) =>
        p.id === id
          ? {
              ...p,
              mustWith: must ? must.split(",").map((s) => s.trim()).filter(Boolean) : [],
              avoidWith: avoid ? avoid.split(",").map((s) => s.trim()).filter(Boolean) : [],
            }
          : p
      )
    );
  }
  function onDelete(id) {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
  }

  // סטטיסטיקות כרטיסים
  const teamStats = teams.map((t) => ({
    avg: avg(t, (x) => x.rating),
    sum: +sum(t, (x) => x.rating).toFixed(1),
    count: t.length,
  }));

  return (
    <div className="page mx-auto px-3" dir="rtl">
      {/* פס עליון: מונים משמאל; כפתורים מימין */}
      <div className="flex items-center justify-between mt-4 mb-3">
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div>פעילים: <b>{activePlayers.length}</b></div>
          <div>משובצים: <b>{assignedCount}</b></div>
          <div className="flex items-center gap-2">
            <label>מס׳ קבוצות</label>
            <input
              type="number"
              min={2}
              max={8}
              value={teamCount}
              onChange={(e) => setTeamCount(clamp(+e.target.value || 2, 2, 8))}
              className="w-16 rounded-md bg-[#0f1a2e] text-white border border-[#24324a] px-2 py-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideCardRatings((v) => !v)}
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

      {/* כרטיסי הקבוצות — למעלה */}
      <div className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-3 mb-4">
        {teams.map((team, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#24324a] bg-[#0f1a2e] p-3"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnTeam(e, idx)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-200 font-medium">קבוצה {idx + 1}</div>
              <div className="text-xs text-slate-300">
                ממוצע {teamStats[idx].avg} | סכ״כ {teamStats[idx].sum} | {teamStats[idx].count} שחקנים
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
                  <span>
                    {p.name} <span className="text-xs text-slate-400">({p.pos})</span>
                  </span>
                  {!hideCardRatings && <span className="text-sm text-slate-300">{p.rating}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* טבלת השחקנים — למטה (כמו מסך השחקנים) */}
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

        <div className="max-h-[440px] overflow-auto">
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
                        <option>GK</option>
                        <option>DF</option>
                        <option>MF</option>
                        <option>FW</option>
                      </select>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={10}
                        defaultValue={p.rating}
                        onBlur={(e) => onEditRating(p.id, e.target.value)}
                        className="w-16 bg-[#0f1a2e] border border-[#24324a] rounded px-2 py-1"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      מחק
                    </button>
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
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-xl shadow text-sm ${
            toast.type === "ok"
              ? "bg-green-600 text-white"
              : toast.type === "warn"
              ? "bg-yellow-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
