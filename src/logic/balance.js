// src/logic/balance.js
// איזון קבוצות: שומר על הפרש גודל ≤ ±1, ממזער סכומי דירוג, ומתחשב ב-must/avoid רך.

const clone = (o) => JSON.parse(JSON.stringify(o));

export function makeTeams({ players, teamCount = 4 }) {
  const actives = players.filter((p) => p.active);
  const pool = clone(actives).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const teams = Array.from({ length: teamCount }, () => ({ players: [], sum: 0 }));

  const targetMin = Math.floor(pool.length / teamCount);
  const targetMax = Math.ceil(pool.length / teamCount);

  const canAddTo = (ti) => teams[ti].players.length < targetMax;
  const violatesAvoid = (ti, p) =>
    teams[ti].players.some((x) => x.avoidWith?.includes(p.id) || p.avoidWith?.includes(x.id));
  const satisfiesMust = (ti, p) => {
    if (!p.mustWith?.length) return true;
    const ids = teams[ti].players.map((x) => x.id);
    return p.mustWith.some((id) => ids.includes(id)) || teams[ti].players.length === 0;
  };

  for (const p of pool) {
    let bestIdx = -1,
      bestScore = Infinity;
    for (let i = 0; i < teamCount; i++) {
      if (!canAddTo(i)) continue;
      if (violatesAvoid(i, p)) continue;
      const mustOk = satisfiesMust(i, p);
      const score = teams[i].sum + (mustOk ? 0.001 : 0.5);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) {
      // נפילה רכה: הכי קצרה ואז סכום נמוך
      let candidate = [...teams.keys()]
        .map((i) => ({ i, len: teams[i].players.length, sum: teams[i].sum }))
        .sort((a, b) => a.len - b.len || a.sum - b.sum)[0]?.i ?? 0;
      bestIdx = candidate;
    }
    teams[bestIdx].players.push(p);
    teams[bestIdx].sum += p.rating ?? 0;
  }

  return teams.map((t, idx) => ({
    id: idx + 1,
    name: `קבוצה ${idx + 1}`,
    players: t.players,
    sum: t.sum,
    avg: t.players.length ? +(t.sum / t.players.length).toFixed(2) : 0,
  }));
}
