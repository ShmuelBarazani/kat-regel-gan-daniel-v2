// src/components/Teams.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { loadJSON, saveJSON, useStorage, STORAGE_KEYS } from "../lib/storage";

// עוזר קטן לפורמט
const posNames = { GK: "GK", DF: "DF", MF: "MF", FW: "FW" };

function average(sum, n) {
  return n === 0 ? 0 : +(sum / n).toFixed(2);
}

// אלגוריתם פשוט לאיזון: ממיינים ציון יורד,
// ומשבצים כל פעם לקבוצה שהסכום שלה הכי נמוך.
function buildBalancedTeams(players, teamCount) {
  const teams = Array.from({ length: teamCount }, () => ({
    players: [],
    sum: 0,
  }));

  const sorted = [...players].sort((a, b) => b.r - a.r);
  for (const p of sorted) {
    const idx = teams.reduce(
      (best, t, i) => (t.sum < teams[best].sum ? i : best),
      0
    );
    teams[idx].players.push(p);
    teams[idx].sum += p.r;
  }
  return teams;
}

export default function Teams() {
  const [players, setPlayers] = useState([]);
  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState([]);              // תצוגת הקבוצות
  const [saved, setSaved] = useStorage(STORAGE_KEYS.LAST_TEAMS, null);
  const [loading, setLoading] = useState(false);

  // טעינת שחקנים מקובץ public/players.json
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch("/players.json?ts=" + Date.now());
      const data = await res.json();
      if (!mounted) return;
      // נשמור "משחק?" ברירת מחדל מהקובץ (selected) – אם קיים
      setPlayers(
        data.map((p) => ({
          id: p.id,
          name: p.name,
          pos: p.pos,
          r: Number(p.r),
          selected: Boolean(p.selected ?? true),
        }))
      );
    })();
    return () => (mounted = false);
  }, []);

  // אם יש מחזור שמור – נטען אותו (כולל מספר קבוצות)
  useEffect(() => {
    if (!saved || !players.length) return;
    if (saved.teamCount) setTeamCount(saved.teamCount);

    if (Array.isArray(saved.groups) && saved.groups.length) {
      const id2player = new Map(players.map((p) => [p.id, p]));
      const restored = saved.groups.map((groupIds) => {
        const ps = groupIds
          .map((id) => id2player.get(id))
          .filter(Boolean);
        return { players: ps, sum: ps.reduce((s, x) => s + x.r, 0) };
      });
      setTeams(restored);
    }
  }, [saved, players]);

  const playing = useMemo(
    () => players.filter((p) => p.selected),
    [players]
  );

  const selectedCount = playing.length;

  // הפקת קבוצות – חישוב מלא ואז סט יחיד (אין ריצוד)
  const makeTeams = useCallback(() => {
    setLoading(true);
    // חישוב
    const next = buildBalancedTeams(playing, teamCount);
    // שמירה
    const groupsForSave = next.map((t) => t.players.map((p) => p.id));
    saveJSON(STORAGE_KEYS.LAST_TEAMS, {
      teamCount,
      groups: groupsForSave,
      savedAt: Date.now(),
    });
    setSaved({
      teamCount,
      groups: groupsForSave,
      savedAt: Date.now(),
    });
    // הצבה בסטייט – ברגע אחד (ללא מחיקות ביניים)
    setTeams(next);
    setLoading(false);
  }, [playing, teamCount, setSaved]);

  // החלפת "משחק?" – נשמרת במצב המחזור (LocalStorage)
  const togglePlaying = (id) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  // סדר תצוגת הטבלה – שם/תפקיד/ציון
  const [sort, setSort] = useState({ by: "name", dir: "asc" });
  const sortedPlayers = useMemo(() => {
    const data = [...players];
    const { by, dir } = sort;
    data.sort((a, b) => {
      const mult = dir === "asc" ? 1 : -1;
      if (by === "name") return a.name.localeCompare(b.name) * mult;
      if (by === "pos") return a.pos.localeCompare(b.pos) * mult;
      if (by === "r") return (a.r - b.r) * mult;
      return 0;
    });
    return data;
  }, [players, sort]);

  return (
    <div className="page-teams">
      {/* שורת שליטה עליונה */}
      <div className="topbar">
        <div className="title">קטרגל גן-דניאל</div>

        <div className="controls">
          <label className="ctrl">
            <span>מס’ קבוצות</span>
            <select
              value={teamCount}
              onChange={(e) => setTeamCount(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button className="btn primary" onClick={makeTeams} disabled={loading}>
            {loading ? "מחשב…" : "עשה כוחות"}
          </button>

          <div className="chip muted">
            שחקנים פעילים: <b>{selectedCount}</b>
          </div>
        </div>
      </div>

      {/* קבוצות למחזור – מעל הטבלה */}
      <div className="teams-grid">
        {teams.map((t, i) => {
          const avg = average(t.sum, t.players.length);
          return (
            <div key={i} className="team-card">
              <div className="team-head">
                <div>קבוצה {i + 1}</div>
                <div className="avg">ממוצע {avg}</div>
              </div>
              <ul className="team-list">
                {t.players.map((p) => (
                  <li key={p.id} className="team-item">
                    <span className="pos">{posNames[p.pos] || p.pos}</span>
                    <span className="name">{p.name}</span>
                    <span className="rate">{p.r}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {!teams.length && (
          <div className="hint">לחץ “עשה כוחות” ליצירת חלוקה חדשה ומאוזנת.</div>
        )}
      </div>

      {/* טבלת שחקנים – גלילה פנימית בלבד */}
      <div className="players-block">
        <div className="table-head">
          <div className="th w-80">משחק?</div>
          <div
            className="th grow clickable"
            onClick={() =>
              setSort((s) => ({
                by: "name",
                dir: s.by === "name" && s.dir === "asc" ? "desc" : "asc",
              }))
            }
          >
            שם
          </div>
          <div
            className="th w-120 clickable"
            onClick={() =>
              setSort((s) => ({
                by: "pos",
                dir: s.by === "pos" && s.dir === "asc" ? "desc" : "asc",
              }))
            }
          >
            עמדה
          </div>
          <div
            className="th w-120 clickable"
            onClick={() =>
              setSort((s) => ({
                by: "r",
                dir: s.by === "r" && s.dir === "asc" ? "desc" : "asc",
              }))
            }
          >
            ציון
          </div>
        </div>

        <div className="players-scroll">
          {sortedPlayers.map((p) => (
            <div key={p.id} className="tr">
              <div className="td w-80">
                <input
                  type="checkbox"
                  checked={p.selected}
                  onChange={() => togglePlaying(p.id)}
                />
              </div>
              <div className="td grow">{p.name}</div>
              <div className="td w-120">{posNames[p.pos] || p.pos}</div>
              <div className="td w-120">{p.r}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
