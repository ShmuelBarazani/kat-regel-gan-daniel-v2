// src/logic/balance.js

/**
 * חשב סטטיסטיקות לכל קבוצה.
 * @param {Array<{id:string, name:string, playerIds:string[]}>} teams
 * @param {Array<{id:string, rating:number}>} players
 */
export function computeTeamStats(teams, players) {
  const byId = new Map(players.map((p) => [p.id, p]));
  return teams.map((t) => {
    const ps = (t.playerIds ?? []).map((pid) => byId.get(pid)).filter(Boolean);
    const count = ps.length;
    const sum = ps.reduce((acc, p) => acc + (Number(p.rating) || 0), 0);
    const avg = count ? +(sum / count).toFixed(2) : 0;
    return { id: t.id, name: t.name, count, sum, avg };
  });
}

/**
 * בדוק האם כל הפערים בין גדלי הקבוצות עומדים בכלל ±1.
 */
export function isBalanced(teams) {
  const sizes = teams.map((t) => (t.playerIds?.length ?? 0));
  if (sizes.length <= 1) return true;
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  return max - min <= 1;
}

/**
 * בדיקה האם מותר להעביר שחקן מקבוצה A לב'.
 * @returns {boolean}
 */
export function canMovePlayer(teams, fromTeamId, toTeamId) {
  if (fromTeamId === toTeamId) return true;
  const sizes = new Map(teams.map((t) => [t.id, t.playerIds?.length ?? 0]));
  const fromSize = sizes.get(fromTeamId) ?? 0;
  const toSize = sizes.get(toTeamId) ?? 0;

  // לאחר ההעברה: מקור קטן באחד, יעד גדול באחד
  const newMin = Math.min(...teams.map((t) =>
    t.id === fromTeamId ? fromSize - 1 : t.id === toTeamId ? toSize + 1 : (t.playerIds?.length ?? 0)
  ));
  const newMax = Math.max(...teams.map((t) =>
    t.id === fromTeamId ? fromSize - 1 : t.id === toTeamId ? toSize + 1 : (t.playerIds?.length ?? 0)
  ));

  return newMax - newMin <= 1;
}

/**
 * העבר שחקן בפועל בין קבוצות, תוך אכיפת כלל ±1.
 * אם לא חוקי — מחזיר את המערך המקורי ללא שינוי.
 */
export function movePlayerBalanced(teams, playerId, fromTeamId, toTeamId) {
  if (!canMovePlayer(teams, fromTeamId, toTeamId)) return teams;
  const clone = teams.map((t) => ({ ...t, playerIds: [...(t.playerIds ?? [])] }));

  const from = clone.find((t) => t.id === fromTeamId);
  const to = clone.find((t) => t.id === toTeamId);
  if (!to) return teams;

  if (from) {
    from.playerIds = from.playerIds.filter((id) => id !== playerId);
  } else {
    // ייתכן ששחקן לא היה משוייך — זה בסדר
  }
  if (!to.playerIds.includes(playerId)) {
    to.playerIds.push(playerId);
  }
  return clone;
}
