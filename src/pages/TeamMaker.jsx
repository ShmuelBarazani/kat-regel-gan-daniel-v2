// src/pages/TeamMaker.jsx
import React, { useMemo, useState, useCallback } from "react";
import PrintView from "../components/PrintView";
import { calcMinMaxSizes, canMovePlayer, distributeBalanced } from "../logic/balance";

export default function TeamMaker({ players = [], initialTeamsCount = 4 }) {
  const [teamCount, setTeamCount] = useState(initialTeamsCount);
  const [teams, setTeams] = useState(
    Array.from({ length: initialTeamsCount }, (_, i) => ({ name: `קבוצה ${i + 1}`, players: [] }))
  );
  const [showPrint, setShowPrint] = useState(false);

  const playingPlayers = useMemo(() => players.filter(p => p.playing), [players]);
  const totalPlaying = playingPlayers.length;

  const makeRound = useCallback(() => {
    setTeams(distributeBalanced(playingPlayers, teamCount));
  }, [playingPlayers, teamCount]);

  const movePlayer = useCallback(
    (player, fromIdx, toIdx) => {
      if (fromIdx === toIdx) return;
      const next = teams.map(t => ({ ...t, players: [...t.players] }));

      const fromSize = fromIdx >= 0 ? next[fromIdx].players.length : 0;
      const toSize = next[toIdx].players.length;

      if (fromIdx >= 0) {
        if (!canMovePlayer({ fromSize, toSize, totalPlaying, teamCount })) {
          alert("לא ניתן להעביר — פער גדלים בין קבוצות חייב להיות עד ±1.");
          return;
        }
        next[fromIdx].players = next[fromIdx].players.filter(p => p.id !== player.id);
        next[toIdx].players.push(player);
      } else {
        // הוספה חדשה מהטבלה
        const { maxSize } = calcMinMaxSizes(totalPlaying + 1, teamCount);
        if (toSize + 1 > maxSize) {
          alert("הקבוצה מלאה ביחס לאיזון המותר.");
          return;
        }
        next[toIdx].players.push(player);
      }
      setTeams(next);
    },
    [teams, totalPlaying, teamCount]
  );

  const removeFromTeam = useCallback(
    (player, fromIdx) => {
      const { minSize } = calcMinMaxSizes(totalPlaying, teamCount);
      if (teams[fromIdx].players.length - 1 < minSize) {
        alert("לא ניתן להסיר — תשבור את האיזון (מתחת למינימום).");
        return;
      }
      const next = teams.map(t => ({ ...t, players: [...t.players] }));
      next[fromIdx].players = next[fromIdx].players.filter(p => p.id !== player.id);
      setTeams(next);
    },
    [teams, totalPlaying, teamCount]
  );

  const onDrop = (e, toIdx) => {
    const payload = JSON.parse(e.dataTransfer.getData("application/json"));
    movePlayer(payload.player, payload.fromIdx, toIdx);
  };

  const TeamCard = ({ team, idx }) => {
    const sum = team.players.reduce((s, p) => s + (p.rating ?? 0), 0);
    const avg = team.players.length ? (sum / team.players.length).toFixed(1) : "0.0";
    return (
      <div className="team-card" onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, idx)}>
        <div className="team-head">
          <span className="team-title">קבוצה {idx + 1}</span>
          <span className="team-meta">{avg} ממוצע | {sum.toFixed(0)} סך | {team.players.length} שחקנים</span>
        </div>
        <div className="team-body">
          {team.players.map(p => (
            <div
              key={p.id ?? p.name}
              className="pill"
              draggable
              onDragStart={e =>
                e.dataTransfer.setData("application/json", JSON.stringify({ player: p, fromIdx: idx }))
              }
            >
              <span className="name">{p.name}</span>
              <span className="meta">{p.pos} · {p.rating ?? "-"}</span>
              <button className="remove" onClick={() => removeFromTeam(p, idx)}>הסר</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page" style={{ direction: "rtl" }}>
      <div className="toolbar">
        <div className="left">
          <button className="primary" onClick={makeRound}>עשה מחזור</button>
          <label style={{ marginInlineStart: 12 }}>
            מס' קבוצות{" "}
            <select
              value={teamCount}
              onChange={e => {
                const n = Number(e.target.value);
                setTeamCount(n);
                setTeams(Array.from({ length: n }, (_, i) => ({ name: `קבוצה ${i + 1}`, players: [] })));
              }}
            >
              {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="right">
          <button className="ghost" onClick={() => setShowPrint(true)}>PRINT PREVIEW</button>
          {/* כפתור איפוס — הוסר בכוונה */}
        </div>
      </div>

      <div className="teams-grid">
        {teams.map((t, i) => <TeamCard key={i} team={t} idx={i} />)}
      </div>

      <div className="players-list">
        <h3>רשימת השחקנים</h3>
        <p className="muted">גרור שחקן לכרטיס קבוצה, או חזרה לכאן להסרה.</p>
        <div className="table">
          {playingPlayers.map(p => (
            <div
              key={p.id ?? p.name}
              className="row"
              draggable
              onDragStart={e =>
                e.dataTransfer.setData("application/json", JSON.stringify({ player: p, fromIdx: -1 }))
              }
            >
              <div className="cell">✓</div>
              <div className="cell">{p.name}</div>
              <div className="cell">{p.pos}</div>
              <div className="cell">{p.rating ?? "-"}</div>
            </div>
          ))}
        </div>
      </div>

      {showPrint && <PrintView teams={teams} onClose={() => setShowPrint(false)} />}

      {/* סטייל בסיסי לכרטיסי הקבוצות/טבלה — אם יש לך styles.css משלך, זה יכול להישען עליו */}
      <style>{`
        :root{ --bg:#0b1220; --card:#0f1a2e; --ink:#e8eefc; --muted:#9fb0cb; --edge:#24324a; }
        .page { padding: 16px 12px; color: var(--ink); }
        .toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
        .primary { background:#2e7d32; color:#e8eefc; border:none; padding:10px 14px; border-radius:12px; cursor:pointer; }
        .ghost { background:transparent; border:1px solid #345; color:#e8eefc; padding:8px 12px; border-radius:12px; }
        .teams-grid { display:grid; grid-template-columns: repeat(4,1fr); gap:14px; }
        .team-card { background:var(--card); border:1px solid var(--edge); border-radius:16px; padding:10px; min-height:180px; }
        .team-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .team-title { font-weight:600; }
        .team-meta { color:var(--muted); font-size:12px; }
        .pill { display:flex; align-items:center; justify-content:space-between; gap:8px; background:#14243c; border:1px solid #22324a; padding:6px 8px; border-radius:12px; margin-bottom:6px; }
        .pill .name { font-weight:500; }
        .pill .meta { color:var(--muted); font-size:12px; }
        .pill .remove { background:#2a3448; border:0; color:#e8eefc; border-radius:10px; padding:4px 8px; cursor:pointer; }
        .players-list { margin-top:16px; }
        .players-list .muted { color:var(--muted); margin:0 0 8px; }
        .table { max-height:320px; overflow:auto; border:1px solid var(--edge); border-radius:12px; }
        .row { display:grid; grid-template-columns: 60px 1fr 100px 80px; gap:8px; padding:8px 10px; border-bottom:1px solid #1c2940; }
        .cell { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        @media (max-width: 1100px) { .teams-grid { grid-template-columns: repeat(2,1fr); } }
      `}</style>
    </div>
  );
}
