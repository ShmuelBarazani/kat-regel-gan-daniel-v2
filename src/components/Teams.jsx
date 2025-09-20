// src/components/Teams.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  getPlayers,
  setPlayers,
  getTeamCount,
  setTeamCount,
  saveTeamsSnapshot,
  getLastTeams,
  countActive,
} from "../lib/storage";

// כותרות עמודה בסיסיות לטבלת השחקנים
const POS = ["GK", "DF", "MF", "FW"];

/** בודק התנגשויות "לא עם" בין קבוצה קיימת לבין יחידה חדשה */
function violatesAvoid(groupIds, unitIds, avoidMap) {
  for (const a of unitIds) {
    const s = avoidMap.get(a);
    if (!s || s.size === 0) continue;
    for (const b of groupIds) {
      if (s.has(b)) return true;
    }
  }
  return false;
}

/** הופך mustWith ליחידות (קומפוננטים מחוברים) */
function buildUnits(active, byId) {
  // גרף על סמך mustWith (חד/דו-כיווני—נבנה רכיב קשיר)
  const idList = active.map((p) => p.id);
  const adj = new Map(); // id -> Set(ids)
  for (const p of active) {
    if (!adj.has(p.id)) adj.set(p.id, new Set());
    const list = Array.isArray(p.mustWith) ? p.mustWith : p.prefer || [];
    for (const q of list) {
      if (!byId[q]) continue;
      if (!adj.has(q)) adj.set(q, new Set());
      adj.get(p.id).add(q);
      adj.get(q).add(p.id);
    }
  }

  const seen = new Set();
  const units = [];

  for (const root of idList) {
    if (seen.has(root)) continue;
    const stack = [root];
    const comp = [];
    seen.add(root);
    while (stack.length) {
      const v = stack.pop();
      comp.push(v);
      const nbrs = adj.get(v);
      if (!nbrs) continue;
      for (const u of nbrs) {
        if (!seen.has(u)) {
          seen.add(u);
          stack.push(u);
        }
      }
    }
    // יחידה בודדת אם אין קשרים
    units.push(comp);
  }
  return units;
}

/** אלגוריתם איזון: שומר מספר שחקנים שווה ככל האפשר (±1 רק אם נדרש), ומנסה לאזן סכומי רייטינג */
function makeBalancedTeams(players, teamCount) {
  const active = players.filter((p) => p.playing);
  const n = active.length;

  // קיבולת לכל קבוצה (שווה, ו־±1 במידה ויש שארית)
  const base = Math.floor(n / teamCount);
  const extra = n % teamCount;
  const caps = Array.from({ length: teamCount }, (_, i) => base + (i < extra ? 1 : 0));

  const byId = Object.fromEntries(active.map((p) => [p.id, p]));
  // לא עם — מיפוי דו־כיווני
  const avoidMap = new Map(); // id -> Set(otherIds)
  for (const p of active) {
    const s = new Set([...(p.avoidWith || []), ...(p.avoid || [])]);
    avoidMap.set(p.id, s);
    for (const q of s) {
      if (!avoidMap.has(q)) avoidMap.set(q, new Set());
      avoidMap.get(q).add(p.id);
    }
  }

  // יחידות "חייב עם"
  const unitIds = buildUnits(active, byId); // מערכים של מזהים
  // דירוג יחידות לפי ממוצע יורד (אפשר גם לפי מקסימום/סכום)
  const units = unitIds
    .map((ids) => {
      const sum = ids.reduce((s, id) => s + (byId[id]?.r ?? 0), 0);
      return { ids, size: ids.length, sum, avg: sum / Math.max(ids.length, 1) };
    })
    .sort((a, b) => b.avg - a.avg);

  // אם יש יחידה גדולה מקיבולת יעד—זה מצב בלתי אפשרי; נחזיר null כדי שה־UI יציג הודעה
  const maxCap = Math.max(...caps);
  if (units.some((u) => u.size > maxCap)) {
    return { groups: Array.from({ length: teamCount }, () => []), totals: Array(teamCount).fill(0) };
  }

  const groups = Array.from({ length: teamCount }, () => []);
  const totals = Array(teamCount).fill(0);
  const sizes = Array(teamCount).fill(0);

  for (const u of units) {
    // קנדידטים: קבוצות עם מקום, ממוין לפי סכום עולה
    const idxs = [...Array(teamCount).keys()].sort((i, j) => totals[i] - totals[j]);
    let placed = false;
    for (const i of idxs) {
      if (sizes[i] + u.size > caps[i]) continue;
      // בדיקת "לא עם"
      if (violatesAvoid(groups[i], u.ids, avoidMap)) continue;
      groups[i].push(...u.ids);
      sizes[i] += u.size;
      totals[i] += u.sum;
      placed = true;
      break;
    }
    if (!placed) {
      // אין אופציה בלי התנגשות—נניח בקבוצה בעלת סכום מינימלי עם מקום (מעדיף איזון סכום על פני "לא עם")
      const idx2 = idxs.find((i) => sizes[i] + u.size <= caps[i]);
      if (idx2 != null) {
        groups[idx2].push(...u.ids);
        sizes[idx2] += u.size;
        totals[idx2] += u.sum;
      }
    }
  }

  return { groups, totals };
}

export default function Teams() {
  const [players, setPlayersState] = useState([]);
  const [teamCount, setTeamCountState] = useState(4);
  const [groups, setGroups] = useState([]);        // [[ids]]
  const [totals, setTotals] = useState([]);        // סכומים גולמיים
  const [hideRatings, setHideRatings] = useState(false);
  const activeCount = useMemo(() => countActive(players), [players]);

  // טוען שחקנים והגדרות
  useEffect(() => {
    (async () => {
      const list = await getPlayers();
      setPlayersState(list);
      setTeamCountState(getTeamCount());
      // שיחזור כוחות אחרונים אם קיימים
      const last = getLastTeams();
      if (last?.groups?.length) {
        setGroups(last.groups);
        setTotals(last.totals || []);
      }
    })();
  }, []);

  // עדכון הגדרת מס' קבוצות
  const onTeamCountChange = (e) => {
    const n = Number(e.target.value || 4);
    setTeamCountState(n);
    setTeamCount(n);
  };

  // עדכון שדה שחקן (עמדה/ציון/משחק?)
  const patchPlayer = useCallback(
    (id, patch) => {
      const next = players.map((p) => (p.id === id ? { ...p, ...patch } : p));
      setPlayersState(next);
      setPlayers(next);
    },
    [players]
  );

  // חישוב כוחות
  const handleMakeTeams = useCallback(() => {
    const { groups: g, totals: t } = makeBalancedTeams(players, teamCount);
    setGroups(g);
    setTotals(t);

    // שמירת סנאפשוט (לשחזור בין טאבים + ארכיון למחזור)
    saveTeamsSnapshot(g, players);
  }, [players, teamCount]);

  // חישובי ממוצע לקלפי הקבוצות
  const avgs = useMemo(() => {
    if (!groups.length) return [];
    return groups.map((ids, i) => {
      if (!ids.length) return 0;
      const sum = ids.reduce((s, id) => s + (players.find((p) => p.id === id)?.r ?? 0), 0);
      return Number((sum / ids.length).toFixed(2));
    });
  }, [groups, players]);

  // מציג שם שחקן + (pos / ציון אם לא מסתירים)
  const playerLabel = useCallback(
    (id) => {
      const p = players.find((x) => x.id === id);
      if (!p) return "";
      return hideRatings ? `${p.name} (${p.pos})` : `${p.name} — ${p.r} (${p.pos})`;
    },
    [players, hideRatings]
  );

  return (
    <div className="page teams">
      {/* פס פקדים עליון */}
      <div className="toolbar" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={handleMakeTeams}>
          עשה כוחות
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          מס’ קבוצות:
          <select value={teamCount} onChange={onTeamCountChange}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={hideRatings} onChange={(e) => setHideRatings(e.target.checked)} />
          הסתר ציונים
        </label>

        <div style={{ marginInlineStart: "auto", opacity: 0.8 }}>שחקנים פעילים: {activeCount}</div>
      </div>

      {/* כרטיסי הקבוצות */}
      {groups?.length > 0 && (
        <div className="teams-cards" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", marginBottom: 18 }}>
          {groups.map((ids, idx) => {
            const sum = ids.reduce((s, id) => s + (players.find((p) => p.id === id)?.r ?? 0), 0);
            const avg = avgs[idx] ?? 0;
            return (
              <div key={idx} className="card team">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong>קבוצה {idx + 1}</strong>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    ממוצע {avg.toFixed(2)} | סה״כ {sum.toFixed(2)}
                  </div>
                </div>
                <div className="card-body">
                  {ids.length === 0 ? (
                    <div style={{ opacity: 0.6 }}>—</div>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {ids.map((id) => (
                        <li key={id} style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          {playerLabel(id)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* טבלת שחקנים (בסיסית; “משחק?” + עמדה + ציון + שם) */}
      <div className="players-table card">
        <div className="card-header">
          <strong>שחקנים</strong>
        </div>
        <div className="card-body" style={{ overflow: "auto", maxHeight: 520 }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>משחק?</th>
                <th style={{ width: 220 }}>שם</th>
                <th style={{ width: 110 }}>עמדה</th>
                <th style={{ width: 110 }}>ציון</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={!!p.playing} onChange={(e) => patchPlayer(p.id, { playing: e.target.checked })} />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => patchPlayer(p.id, { name: e.target.value })}
                      style={{ width: "100%" }}
                    />
                  </td>
                  <td>
                    <select value={p.pos} onChange={(e) => patchPlayer(p.id, { pos: e.target.value })} style={{ width: "100%" }}>
                      {POS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={p.r}
                      onChange={(e) => patchPlayer(p.id, { r: Number(e.target.value) })}
                      style={{ width: "100%" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
