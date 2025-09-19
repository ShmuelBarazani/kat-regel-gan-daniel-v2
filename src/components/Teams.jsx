// src/components/Teams.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useStorage, POS, sum, avg } from "../lib/storage.js";

export default function Teams() {
  const {
    players,
    setPlayers,
    hiddenRatings,
    setHiddenRatings,
  } = useStorage();

  const [teamCount, setTeamCount] = useState(4);
  const [teams, setTeams] = useState(() => emptyTeams(4));

  // שחקנים פעילים
  const activePlayers = useMemo(
    () => players.filter((p) => p.active),
    [players]
  );

  // יצירת כוחות מאוזנים ע"פ ציונים — כל לחיצה יוצרת חלוקה אחרת
  const makeBalancedTeams = useCallback(() => {
    const next = balancedPartition(activePlayers, teamCount);
    setTeams(next.map(sortByRatingDesc));
  }, [activePlayers, teamCount]);

  // מיון יורד לאחר גרירה/שינוי
  const sortTeam = (idx) =>
    setTeams((prev) => {
      const next = [...prev];
      next[idx] = sortByRatingDesc(next[idx]);
      return next;
    });

  // Drag & Drop בסיסי (HTML5)
  const onDragStart = (e, pid, fromIdx) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ pid, fromIdx }));
  };
  const onDrop = (e, toIdx) => {
    e.preventDefault();
    try {
      const { pid, fromIdx } = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (fromIdx === toIdx) return;
      setTeams((prev) => {
        const next = prev.map((g) => g.slice());
        const i = next[fromIdx].findIndex((x) => x.id === pid);
        if (i >= 0) {
          const [pl] = next[fromIdx].splice(i, 1);
          next[toIdx].push(pl);
          next[toIdx] = sortByRatingDesc(next[toIdx]);
          next[fromIdx] = sortByRatingDesc(next[fromIdx]);
        }
        return next;
      });
    } catch {}
  };

  // רנדר קבוצה
  const renderTeam = (team, idx) => {
    const total = sum(team, (p) => p.rating);
    const average = team.length ? total / team.length : 0;

    return (
      <div
        key={idx}
        className="team-card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, idx)}
        data-hide-ratings={hiddenRatings ? "true" : "false"}
        dir="rtl"
      >
        <div className="team-header">
          <div>קבוצה {idx + 1}</div>
          <div className="team-metrics">
            <span>ממוצע {average.toFixed(2)}</span>
            <span> | סה״כ {total.toFixed(2)}</span>
          </div>
        </div>

        <ul className="team-list">
          {team.map((p) => (
            <li
              key={p.id}
              className="team-row"
              draggable
              onDragStart={(e) => onDragStart(e, p.id, idx)}
              title={`${p.name} • ${p.pos} • ${p.rating.toFixed(1)}`}
            >
              {/* שם (מימין) → תפקיד → ציון */}
              <span className="cell name">{p.name}</span>
              <span className="cell pos">{p.pos}</span>
              <span className="cell rating">{p.rating.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // UI עליון – בלי כפילויות "עשה מחזור/קבע מחזור"
  return (
    <div className="teams-page">
      <div className="toolbar" dir="rtl">
        <button className="btn primary" onClick={makeBalancedTeams}>
          עשה כוחות
        </button>

        <label className="toolbar-item">
          מס׳ קבוצות:
          <select
            value={teamCount}
            onChange={(e) => {
              const n = Number(e.target.value || 4);
              setTeamCount(n);
              setTeams(emptyTeams(n));
            }}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="toolbar-item">
          הסתר ציונים
          <input
            type="checkbox"
            checked={hiddenRatings}
            onChange={(e) => setHiddenRatings(e.target.checked)}
          />
        </label>

        <div className="toolbar-note">
          טיפ: כל לחיצה על <b>עשה כוחות</b> תיצור חלוקה חדשה ומאוזנת.
        </div>
      </div>

      <div className="teams-grid">{teams.map(renderTeam)}</div>
    </div>
  );
}

/* ----------------- עזרי חלוקה ומיון ----------------- */

// חלוקה מאוזנת: מסדרים לפי ציון יורד ומכניסים כל פעם לקבוצה עם סכום נמוך ביותר.
// ערבוב קל לפני – כדי שכל לחיצה תיתן קומבינציה אחרת אבל עדיין מאוזנת.
function balancedPartition(players, k) {
  const shuffled = shuffle([...players]);
  shuffled.sort((a, b) => b.rating - a.rating);

  const groups = Array.from({ length: k }, () => []);
  const sums = new Array(k).fill(0);

  for (const p of shuffled) {
    let gi = 0;
    for (let i = 1; i < k; i++) if (sums[i] < sums[gi]) gi = i;
    groups[gi].push(p);
    sums[gi] += Number(p.rating || 0);
  }
  return groups;
}

function sortByRatingDesc(arr) {
  return [...arr].sort((a, b) => Number(b.rating) - Number(a.rating));
}
function emptyTeams(n) {
  return Array.from({ length: n }, () => []);
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
