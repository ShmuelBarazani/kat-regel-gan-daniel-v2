// src/logic/balance.js
export function calcMinMaxSizes(totalPlaying, teamCount) {
  const minSize = Math.floor((totalPlaying || 0) / teamCount);
  const maxSize = Math.ceil((totalPlaying || 0) / teamCount);
  return { minSize, maxSize };
}

export function canMovePlayer({ fromSize, toSize, totalPlaying, teamCount }) {
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

export function distributeBalanced(players, teamCount) {
  const sorted = [...players].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    name: `קבוצה ${i + 1}`,
    players: [],
  }));
  const totalPlaying = players.length;
  const { minSize, maxSize } = calcMinMaxSizes(totalPlaying, teamCount);

  let dir = 1, i = 0;
  for (const p of sorted) {
    let spins = 0;
    while (spins < teamCount && teams[i].players.length >= maxSize) {
      i = (i + dir + teamCount) % teamCount;
      spins++;
    }
    teams[i].players.push(p);
    if (i === teamCount - 1) dir = -1;
    else if (i === 0) dir = 1;
    i = (i + dir + teamCount) % teamCount;
  }

  // תיקון קצה: מעבירים עודפים לחוסרים
  const over = [], under = [];
  teams.forEach((t, idx) => {
    while (t.players.length > maxSize) over.push(idx);
    while (t.players.length < minSize) under.push(idx);
  });
  for (const o of over) {
    for (const u of under) {
      if (teams[o].players.length <= maxSize) break;
      if (teams[u].players.length >= minSize) continue;
      const moved = teams[o].players.pop();
      teams[u].players.push(moved);
    }
  }
  return teams;
}
