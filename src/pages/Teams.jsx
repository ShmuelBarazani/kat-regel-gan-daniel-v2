import React, { useMemo, useState, useCallback } from "react";
import PrintView from "../components/PrintView";

const rtl = { direction: "rtl" };

function calcMinMaxSizes(totalPlaying, teamCount) {
  const minSize = Math.floor(totalPlaying / teamCount || 0);
  const maxSize = Math.ceil(totalPlaying / teamCount || 0);
  return { minSize, maxSize };
}

function canMovePlayer({ fromSize, toSize, totalPlaying, teamCount }) {
  const { minSize, maxSize } = calcMinMaxSizes(totalPlaying, teamCount);
  const afterFrom = fromSize - 1;
  const afterTo = toSize + 1;
  return (
    afterFrom >= minSize &&
    afterFrom <= maxSize &&
    afterTo >= minSize &&
    afterTo <= maxSize
  );
}

export default function Teams({
  players = [],          // [{id,name,pos,rating,playing:true}, ...]
  initialTeamsCount = 4, // ברירת מחדל
}) {
  const [teamCount, setTeamCount] = useState(initialTeamsCount);
  const [teams, setTeams] = useState(() =>
    Array.from({ length: initialTeamsCount }, (_, i) => ({
      name: `קבוצה ${i + 1}`,
      players: [],
    }))
  );
  const [showPrint, setShowPrint] = useState(false);

  const playingPlayers = useMemo(
    () => players.filter((p) => p.playing),
    [players]
  );
  const totalPlaying = playingPlayers.length;

  // חלוקה מאוזנת קשיחה
  const makeRound = useCallback(() => {
    const sorted = [...playingPlayers].sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
    );
    const next = Array.from({ length: teamCount }, (_, i) => ({
      name: `קבוצה ${i + 1}`,
      players: [],
    }));
    const { minSize, maxSize } = calcMinMaxSizes(totalPlaying, teamCount);

    let dir = 1;
    let i = 0;
    for (const p of sorted) {
      let spins = 0;
      while (spins < teamCount && next[i].players.length >= maxSize) {
        i = (i + dir + teamCount) % teamCount;
        spins++;
      }
      next[i].players.push(p);
      if (i === teamCount - 1) dir = -1;
      else if (i === 0) dir = 1;
      i = (i + dir + teamCount) % teamCount;
    }

    // תיקון קצה אם צריך
    const over = [], under = [];
    next.forEach((t, idx) => {
      while (t.players.length > maxSize) over.push(idx);
      while (t.players.length < minSize) under.push(idx);
    });
    for (const o of over) {
      for (const u of under) {
        if (next[o].players.length <= maxSize) break;
        if (next[u].players.length >= minSize) continue;
        const moved = next[o].players.pop();
        next[u].players.push(moved);
      }
    }

    setTeams(next);
  }, [playingPlayers, teamCount, totalPlaying]);

  // גרירה/העברה ידנית – אכיפה קשיחה
  const movePlayer = useCallback(
    (player, fromIdx, toIdx) => {
      if (fromIdx === toIdx) return;
      const fromSize = fromIdx >= 0 ? teams[fromIdx].players.length : 0;
      const toSize = teams[toIdx].players.length;

      // אם גרירה מהטבלה (fromIdx === -1) – בודקים שלא תחרוג מהמקסימום בקבוצה יעד
      if (
        fromIdx >= 0 &&
        !canMovePlayer({ fromSize, toSize, totalPlaying, teamCount })
      ) {
        alert("לא ניתן להעביר – חייבים לשמור על פער עד ±1 בין גדלי הקבוצות.");
        return;
      }
      if (fromIdx === -1) {
        const { minSize, maxSize } = calcMinMaxSizes(totalPlaying + 1, teamCount);
        if (toSize + 1 > maxSize) {
          alert("הקבוצה מלאה ביחס לאיזון המותר.");
          return;
        }
      }

      const next = teams.map((t) => ({ ...t, players: [...t.players] }));
      if (fromIdx >= 0) {
        next[fromIdx].players = next[fromIdx].players.filter((p) => p.id !== player.id);
      }
      next[toIdx].players.push(player);
      setTeams(next);
    },
    [teams, totalPlaying, teamCount]
  );

  const removeFromTeam = useCallback(
    (player, fromIdx) => {
      const { minSize } = calcMinMaxSizes(totalPlaying, teamCount);
      if (teams[fromIdx].players.length - 1 < minSize) {
        alert("לא ניתן להסיר – תיווצר חריגה מהאיזון (מתחת למינימום).");
        return;
      }
      const next = teams.map((t) => ({ ...t, players: [...t.players] }));
      next[fromIdx].players = next[fromIdx].players.filter((p) => p.id !== player.id);
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
      <div
        className="team-card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDrop(e, idx)}
      >
        <div className="team-head">
          <span className="team-title">קבוצה {idx + 1}</span>
          <span className="team-meta">
            {avg} ממוצע | {sum.toFixed(0)} סך | {team.players.length} שחקנים
          </span>
        </div>
        <div className="team-body">
          {team.players.map((p) => (
            <div
              key={p.id}
              className="pill"
              draggable
              onDragStart={(e) =>
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
    <div className="page" style={rtl}>
      <div className="toolbar">
        <div className="left">
          <button className="primary" onClick={makeRound}>עשה מחזור</button>
          <label style={{ marginInlineStart: 12 }}>
            מס' קבוצות{" "}
            <select
              value={teamCount}
              onChange={(e) => {
                const n = Number(e.target.value);
                setTeamCount(n);
                setTeams(
                  Array.from({ length: n }, (_, i) => ({
                    name: `קבוצה ${i + 1}`,
                    players: [],
                  }))
                );
              }}
            >
              {[2, 3, 4, 5, 6].map((n) => (
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
          {/* כפתור איפוס הוסר בכוונה */}
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
          {playingPlayers.map((p) => (
            <div
              key={p.id}
              className="row"
              draggable
              onDragStart={(e) =>
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

      <style jsx>{`
        .page { padding: 16px 12px; }
        .toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
        .primary { background:#2e7d32; color:#e8eefc; border:none; padding:10px 14px; border-radius:12px; cursor:pointer; }
        .ghost { background:transparent; border:1px solid #345; color:#e8eefc; padding:8px 12px; border-radius:12px; }
        .teams-grid { display:grid; grid-template-columns: repeat(4,1fr); gap:14px; }
        .team-card { background:#0f1a2e; border:1px solid #24324a; border-radius:16px; padding:10px; min-height:180px; }
        .team-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .team-title { font-weight:600; }
        .team-meta { color:#9fb0cb; font-size:12px; }
        .pill { display:flex; align-items:center; justify-content:space-between; gap:8px; background:#14243c; border:1px solid #22324a; padding:6px 8px; border-radius:12px; margin-bottom:6px; }
        .pill .name { font-weight:500; }
        .pill .meta { color:#9fb0cb; font-size:12px; }
        .pill .remove { background:#2a3448; border:0; color:#e8eefc; border-radius:10px; padding:4px 8px; cursor:pointer; }
        .players-list { margin-top:16px; }
        .players-list .muted { color:#9fb0cb; margin:0 0 8px; }
        .table { max-height:320px; overflow:auto; border:1px solid #24324a; border-radius:12px; }
        .row { display:grid; grid-template-columns: 60px 1fr 100px 80px; gap:8px; padding:8px 10px; border-bottom:1px solid #1c2940; }
        .cell { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        @media (max-width: 1100px) { .teams-grid { grid-template-columns: repeat(2,1fr); } }
      `}</style>
    </div>
  );
}
