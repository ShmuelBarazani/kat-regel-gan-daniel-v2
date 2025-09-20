import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  generateTeams,
  checkTeamSizePolicy,
  buildMustUnits,
  violatesAvoidWith,
} from "../logic/balance";

// ===== helpers =====
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const sum = (arr, sel = (x) => x) => arr.reduce((s, x) => s + sel(x), 0);
const avg = (arr, sel = (x) => x) =>
  arr.length ? +(sum(arr, sel) / arr.length).toFixed(2) : 0;

// load/save players (from your existing storage)
function loadPlayers() {
  try {
    const raw = localStorage.getItem("players");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return []; // אין דיפולטים—נשען על הנתונים הקיימים אצלך
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

  useEffect(() => savePlayers(players), [players]);

  const activePlayers = useMemo(() => players.filter((p) => p.playing), [players]);
  const assignedCount = sum(teams, (t) => t.length);

  // ===== toast =====
  function openToast(type, msg) {
    setToast({ type, msg });
    window.clearTimeout(openToast._t);
    openToast._t = window.setTimeout(() => setToast(null), 2200);
  }

  // ===== drag & drop =====
  const dragRef = useRef({ playerId: null, fromTeamIdx: null });
  const findPlayerById = (id) => players.find((p) => String(p.id) === String(id));
  const handleDragStart = (e, playerId, fromTeamIdx) => {
    dragRef.current = { playerId, fromTeamIdx };
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => e.preventDefault();

  function dropToTeam(targetTeamIdx) {
    const { playerId } = dragRef.current;
    if (!playerId) return;
    const player = findPlayerById(playerId);
    if (!player) return;

    // לא-עם => חסימה
    if (violatesAvoidWith(teams[targetTeamIdx], player)) {
      openToast("warn", "הגרירה נחסמה: התנגשות 'לא־עם' בקבוצה היעד");
      return;
    }

    // state ניסוי
    const nextTeams = teams.map((t) => t.slice());
    for (const t of nextTeams) {
      const i = t.findIndex((x) => x.id === player.id);
      if (i !== -1) t.splice(i, 1);
    }
    nextTeams[targetTeamIdx].push(player);

    // איזון גדלים ±1
    if (!checkTeamSizePolicy(nextTeams, activePlayers.length)) {
      openToast("warn", "איזון גדלים (±1) — הפעולה בוטלה");
      return;
    }

    // אזהרת פירוק חייב-עם (לא חוסם)
    const unit = buildMustUnits(activePlayers).find((u) => u.some((x) => x.id === player.id));
    if (unit) {
      const at = nextTeams.findIndex((t) => t.some((x) => x.id === unit[0].id));
      const stillTogether =
        at !== -1 && unit.every((m) => nextTeams[at].some((x) => x.id === m.id));
      if (!stillTogether) openToast("warn", "זהירות: פירקת יחידת 'חייב־עם'");
    }

    setTeams(nextTeams);
  }
  const handleDropOnTeam = (e, idx) => {
    e.preventDefault();
    dropToTeam(idx);
    dragRef.current = { playerId: null, fromTeamIdx: null };
  };
  const handleDropBackToPool = (e) => {
    e.preventDefault();
    const { playerId } = dragRef.current;
    if (!playerId) return;
    setTeams((ts) => ts.map((t) => t.filter((x) => x.id !== playerId)));
    dragRef.current = { playerId: null, fromTeamIdx: null };
  };

  // ===== actions =====
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

  // ===== players table =====
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [nameFilter, setNameFilter] = useState("");

  const tablePlayers = useMemo(() => {
    const rows = players
      .filter((p) => p.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
      .slice();
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let A = a[sortKey],
        B = b[sortKey];
      if (typeof A === "string") A = A.toLowerCase();
      if (typeof B === "string") B = B.toLowerCase();
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
    return rows;
  }, [players, sortKey, sortDir, nameFilter]);

  const toggleSort = (k) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };
  const togglePlaying = (id) =>
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, playing: !p.playing } : p)));
  const onEditRating = (id, v) => {
    const num = clamp(parseFloat(v) || 0, 0, 10);
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, rating: num } : p)));
  };
  const onEditPos = (id, pos) =>
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, pos } : p)));
  const onEditLists = (id) => {
    const pl = players.find((p) => p.id === id);
    if (!pl) return;
    const must = prompt("חייב־עם (שמות מופרדים בפסיק):", (pl.mustWith || []).join(","));
    const avoid = prompt("לא־עם (שמות מופרדים בפסיק):", (pl.avoidWith || []).join(","));
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
  };
  const onDelete = (id) => setPlayers((ps) => ps.filter((p) => p.id !== id));

  // ===== team card stats =====
  const teamStats = teams.map((t) => ({
    avg: t.length ? +(avg(t, (x) => x.rating).toFixed?.(2) || avg(t, (x) => x.rating)) : 0,
    sum: +sum(t, (x) => x.rating).toFixed(1),
    count: t.length,
  }));

  return (
    <div className="mx-auto px-3" dir="rtl">
      {/* top bar: counters (left) & actions (right) */}
      <div className="flex items-center justify-between mt-4 mb-3">
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <div>
            פעילים: <b>{activePlayers.length}</b>
          </div>
          <div>
            משובצים: <b>{assignedCount}</b>
          </div>
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

      {/* ===== teams (top) ===== */}
      <div className="rounded-2xl border border-[#24324a] bg-[#0f1a2e] mb-4">
        <div className="px-4 py-2 text-white text-sm bg-[#1e5a3f] rounded-t-2xl">
          קבוצות למחזור
        </div>

        <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 p-3">
          {teams.map((team, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#24324a] bg-[#0f1a2e]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnTeam(e, idx)}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-slate-200 font-medium">קבוצה {idx + 1}</div>
                <div className="text-[11px] text-slate-300">
                  סכ״כ {teamStats[idx].sum} | ממוצע {teamStats[idx].avg} | {teamStats[idx].count}{" "}
                  שחקנים
                </div>
              </div>
              <div className="h-px bg-[#24324a]" />
              <div className="p-2">
                {team.length === 0 && (
                  <div className="text-[12px] text-slate-500 px-1 py-1">— אין שחקנים —</div>
                )}
                {team.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p.id, idx)}
                    className="flex items-center justify-between px-2 py-1 rounded-md border border-transparent hover:border-[#24324a] hover:bg-[#101b31] cursor-move"
                  >
                    <div className="text-[13px] text-slate-200">
                      {p.name} <span className="text-[11px] text-slate-400">({p.pos})</span>
                    </div>
                    {!hideCardRatings && (
                      <div className="text-[13px] text-slate-200">{p.rating}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== players table (bottom) ===== */}
      <div
        className="rounded-2xl border border-[#24324a] bg-[#0f1a2e] overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDropBackToPool}
      >
        <div className="flex items-center justify-between bg-[#1e5a3f] text-white py-2 px-3 text-sm">
          <div>רשימת השחקנים</div>
          <input
            placeholder="חפש שם…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="rounded-md bg-[#0f1a2e] text-white border border-[#24324a] px-2 py-1 text-xs w-40"
          />
        </div>

        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-right">
            <thead className="sticky top-0 bg-[#0f1a2e]">
              <tr className="text-slate-300 text-sm">
                <th className="py-2 px-3 w-24">משחק?</th>
                <th className="py-2 px-3">שם</th>
                <th className="py-2 px-3 w-24">
                  <button onClick={() => toggleSort("pos")}>עמדה</button>
                </th>
                <th className="py-2 px-3 w-24">
                  <button onClick={() => toggleSort("rating")}>ציון</button>
                </th>
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
                    <input
                      type="checkbox"
                      checked={!!p.playing}
                      onChange={() => togglePlaying(p.id)}
                    />
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
          טיפ: גרור שחקן מהטבלה לאחת הקבוצות, או גרור מכרטיס קבוצה חזרה לטבלה.
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
