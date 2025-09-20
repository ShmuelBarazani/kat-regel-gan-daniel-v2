// logic/balance.js — יצירת קבוצות עם אילוצים + Rebalance לשוויון ממוצעים

// ===== helpers =====
const sum = (arr, sel = (x) => x) => arr.reduce((s, x) => s + sel(x), 0);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ===== must-with units =====
export function buildMustUnits(players) {
  const idByName = new Map(players.map((p) => [p.name, p.id]));
  const parent = new Map(players.map((p) => [p.id, p.id]));
  const find = (x) => (parent.get(x) === x ? x : parent.set(x, find(parent.get(x))).get(x));
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) parent.set(a, b); };

  for (const p of players) {
    for (const n of p.mustWith || []) {
      const id2 = idByName.get(n);
      if (id2) uni(p.id, id2);
    }
  }
  const groups = new Map();
  for (const p of players) {
    const r = find(p.id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(p);
  }
  return [...groups.values()];
}

// ===== avoid-with (דו-כיווני) =====
export function violatesAvoidWith(dstTeam, player) {
  const names = new Set(dstTeam.map((x) => x.name));
  for (const n of player.avoidWith || []) if (names.has(n)) return true;
  for (const mate of dstTeam) if ((mate.avoidWith || []).includes(player.name)) return true;
  return false;
}

// ===== team size policy =====
export function allowedTeamSizes(totalPlayers, teamCount) {
  const base = Math.floor(totalPlayers / teamCount);
  const remainder = totalPlayers % teamCount; // remainder קבוצות יקבלו base+1
  return { base, remainder };
}
export function checkTeamSizePolicy(teams, activeTotal) {
  const { base, remainder } = allowedTeamSizes(activeTotal, teams.length);
  const minAllowed = base;
  const maxAllowed = base + (remainder > 0 ? 1 : 0);
  for (const t of teams) {
    if (t.length < minAllowed || t.length > maxAllowed) return false;
  }
  return true;
}

// ===== rebalance by moving whole units (לא מפרקים must-with) =====
function rebalanceByUnits(teams, totals, units, quotas) {
  // מיפוי מזהה-שחקן -> מזהה יחידה
  const unitIdMap = new Map();
  units.forEach((u, idx) => u.forEach((p) => unitIdMap.set(p.id, idx)));

  // יחידה -> משקל (סכום ציונים)
  const unitWeight = units.map((u) => sum(u, (x) => x.rating));

  // עזר: בדיקת avoidWith בעת הזזה של יחידה ליעד
  const canPlaceUnit = (team, unit) => {
    for (const p of unit) if (violatesAvoidWith(team, p)) return false;
    return true;
  };

  // הפעלת שיפור עד 50 צעדים או עד שאין שיפור
  for (let step = 0; step < 50; step++) {
    // מצא הכי כבדה והכי קלה
    let maxIdx = 0, minIdx = 0;
    for (let i = 1; i < teams.length; i++) {
      if (totals[i] > totals[maxIdx]) maxIdx = i;
      if (totals[i] < totals[minIdx]) minIdx = i;
    }
    const beforeSpread = totals[maxIdx] - totals[minIdx];
    if (beforeSpread <= 0.01) break; // כבר מאוזן

    // חפש יחידה שנמצאת בקבוצה הכבדה שאפשר להעביר לקלה ומשפרת את הפער
    let bestMove = null; // {unitIdx, weight}
    for (const p of teams[maxIdx]) {
      const uId = unitIdMap.get(p.id);
      // ודא שכל חברי היחידה נמצאים בקבוצה maxIdx
      const unit = units[uId];
      const allHere = unit.every((m) => teams[maxIdx].some((x) => x.id === m.id));
      if (!allHere) continue;

      // בדיקת קווטה ביעד + התנגשויות
      if (teams[minIdx].length + unit.length > quotas[minIdx]) continue;
      if (!canPlaceUnit(teams[minIdx], unit)) continue;

      const w = unitWeight[uId];
      const newMax = totals[maxIdx] - w;
      const newMin = totals[minIdx] + w;
      const newSpread = Math.abs(newMax - newMin);

      if (newSpread < beforeSpread - 0.0001) {
        if (!bestMove || w < bestMove.weight) bestMove = { unitIdx: uId, weight: w }; // נעדיף יחידה קלה
      }
    }

    if (!bestMove) break;

    // בצע הזזה
    const unit = units[bestMove.unitIdx];
    teams[maxIdx] = teams[maxIdx].filter((x) => !unit.some((m) => m.id === x.id));
    teams[minIdx].push(...unit);
    totals[maxIdx] -= bestMove.weight;
    totals[minIdx] += bestMove.weight;
  }

  return teams;
}

// ===== main generator =====
export function generateTeams(players, teamCount) {
  const active = players.filter((p) => p.playing);
  const k = Math.max(2, teamCount);

  const units = buildMustUnits(active);
  const { base, remainder } = allowedTeamSizes(active.length, k);
  const quotas = Array.from({ length: k }, (_, i) => (i < remainder ? base + 1 : base));
  const maxPerTeam = base + (remainder ? 1 : 0);

  // אם קיימת יחידת חייב-עם גדולה מגודל יעד הקבוצה — כשל
  for (const u of units) {
    if (u.length > maxPerTeam) {
      throw new Error("אי אפשר ליצור כוחות חוקיים: קיימת יחידת 'חייב-עם' גדולה מגודל היעד.");
    }
  }

  const teams = Array.from({ length: k }, () => []);
  const totals = Array.from({ length: k }, () => 0);

  // סדר יחידות לפי משקל, עם ערבוב כדי לקבל חלוקות שונות בכל לחיצה
  const weight = (u) => sum(u, (x) => x.rating) + u.length * 0.01;
  const unitsOrder = shuffle(units).sort((a, b) => weight(b) - weight(a));

  // השמה גרידית: כל יחידה לקבוצה בעלת סכום ציונים נמוך ביותר שמתאימה לקווטה + אין התנגשויות
  for (const unit of unitsOrder) {
    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < k; i++) {
      if (teams[i].length + unit.length > quotas[i]) continue;

      // בדיקת avoidWith מול כל שחקן בקבוצה
      let bad = false;
      for (const p of unit) {
        if (violatesAvoidWith(teams[i], p)) { bad = true; break; }
      }
      if (bad) continue;

      const sc = totals[i] + sum(unit, (x) => x.rating);
      if (sc < bestScore) { best = i; bestScore = sc; }
    }

    if (best === -1) {
      throw new Error("אי אפשר ליצור כוחות חוקיים במסגרת ההגבלות (לא־עם / גדלי קבוצות).");
    }

    teams[best].push(...unit);
    totals[best] += sum(unit, (x) => x.rating);
  }

  // ניסיון לאזן ממוצעים ע"י הזזת יחידות שלמות מהקבוצה הכבדה לקלה
  rebalanceByUnits(teams, totals, units, quotas);

  return teams;
}
