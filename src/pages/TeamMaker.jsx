// src/pages/TeamMaker.jsx
import React, { useMemo, useState, useCallback } from "react";
import PrintView from "../components/PrintView";
import { calcMinMaxSizes, canMovePlayer, distributeBalanced } from "../logic/balance";

export default function TeamMaker({ players = [], initialTeamsCount = 4 }) {
  const [teamCount, setTeamCount] = useState(initialTeamsCount);
  const [teams, setTeams] = useState(
    Array.from({ length: initialTeamsCount }, (_, i) => ({
      name: `קבוצה ${i + 1}`,
      players: []
    }))
  );
  const [showPrint, setShowPrint] = useState(false);

  const playingPlayers = useMemo(() => players.filter(p => p.playing), [players]);
  const totalPlaying = playingPlayers.length;

  const makeRound = useCallback(() => {
    const next = distributeBalanced(playingPlayers, teamCount);
    setTeams(next);
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
          <span className="team-meta">
            {avg} ממוצע | {sum.toFixed(0)} סך | {team.players.length} שחקנים
          </span>
        </div>
        <div className="team-body">
          {team.players.map(p => (
            <div
              key={p.id ?? p.name}
              className="pill"
              draggable
              onDragStart={e =>
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ player: p, fromIdx: idx })
                )
              }
            >
              <span className="name">{p.name}</span>
              <span className="meta">
                {p.pos} · {p.rating ?? "-"}
              </span>
              <button className="remove" onClick={() => removeFromTeam(p, idx)}>
                הסר
              </button>
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
          {/* כאן שיניתי את הטקסט בלבד */}
          <button className="primary" onClick={makeRound}>
            עשה כוחות
          </button>
          <label style={{ marginInlineStart: 12 }}>
            מס' קבוצות{" "}
            <select
              value={teamCount}
              onChange={e => {
                const n = Number(e.target.value);
                setTeamCount(n);
                setTeams(
                  Array.from({ length: n }, (_, i) => ({
                    name: `קבוצה ${i + 1}`,
                    players: []
                  }))
                );
              }}
            >
              {[2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="right">
          <button className="ghost" onClick={() => setShowPrint(true)}>
            PRINT PREVIEW
          </button>
        </div>
      </div>

      <div className="teams-grid">
        {teams.map((t, i) => (
          <TeamCard key={i} team={t} idx={i} />
        ))}
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
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ player: p, fromIdx: -1 })
                )
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
    </div>
  );
}
