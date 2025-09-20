// logic/balance.js — v3.3 (KATREGEL GAN DANIEL)

// עזרי חישוב
const sum = (arr, sel = (x) => x) => arr.reduce((s, x) => s + sel(x), 0);

// ערבוב לקבלת חלוקה שונה בכל לחיצה
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// בונה יחידות "חייב-עם" באמצעות Union-Find פשוט
export function buildMustUnits(players) {
  const idByName = new Map(players.map(p => [p.name, p.id]));
  const parent = new Map(players.map(p => [p.id, p.id]));
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

// בדיקת "לא-עם" דו-כיוונית
export function violatesAvoidWith(dstTeam, player) {
  const names = new Set(dstTeam.map(p => p.name));
  for (const n of player.avoidWith || []) if (names.has(n)) return true;
  for (const mate of dstTeam) {
    if ((mate.avoidWith || []).includes(player.name)) return true;
  }
  return false;
}

// איזון גדלים: אם לא מתחלק מספרית—מותר הפרש ±1
export function allowedTeamSizes(totalPlayers, teamCount) {
  const base = Math.floor(totalPlayers / teamCount);
  const remainder = totalPlayers % teamCount; // מספר קבוצות שיקבלו base+1
  return { base, remainder };
}

export function checkTeamSizePolicy(teams, activeTotal) {
  const teamCount = teams.length;
  const { base, remainder } = allowedTeamSizes(activeTotal, teamCount);
  const maxAllowed = base + (remainder > 0 ? 1 : 0);
  const minAllowed = base;
  for (const t of teams) {
    if (t.length < minAllowed || t.length > maxAllowed) return false;
  }
  return true;
}

// האלגוריתם ליצירת קבוצות
export function generateTeams(players, teamCount) {
  const active = players.filter(p => p.playing);
  if (teamCount < 2) teamCount = 2;

  const units = buildMustUnits(active);
  const { base, remainder } = allowedTeamSizes(active.length, teamCount);
  const targetMax = base + (remainder > 0 ? 1 : 0);

  // אם קיים "Cluster" חייב-עם שגדול מהמקסימום — כשל
  for (const u of units) {
    if (u.length > targetMax) {
      throw new Error("אי אפשר ליצור כוחות חוקיים: יש יחידת 'חייב-עם' גדולה מגודל יעד קבוצה.");
    }
  }

  const teams = Array.from({ length: teamCount }, () => []);
  const totals = Array.from({ length: teamCount }, () => 0);
  const sizeQuota = Array.from({ length: teamCount }, (_, i) => (i < remainder ? base + 1 : base));

  // נסדר יחידות לפי "כבדות" (סכום רייטינג וגודל), אחרי ערבוב
  const unitWeight = (u) => sum(u, x => x.rating) + u.length * 0.01;
  const shuffledUnits = shuffle(units).sort((a, b) => unitWeight(b) - unitWeight(a));

  for (const unit of shuffledUnits) {
    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < teamCount; i++) {
      if (teams[i].length + unit.length > sizeQuota[i]) continue;

      // "לא-עם" מול כל שחקן בקבוצה
      let bad = false;
      for (const p of unit) {
        if (violatesAvoidWith(teams[i], p)) { bad = true; break; }
      }
      if (bad) continue;

      const newTotal = totals[i] + sum(unit, x => x.rating);
      if (newTotal < bestScore) { best = i; bestScore = newTotal; }
    }

    if (best === -1) {
      throw new Error("אי אפשר ליצור כוחות חוקיים במסגרת ההגבלות (avoidWith/גדלי קבוצות).");
    }

    teams[best].push(...unit);
    totals[best] += sum(unit, x => x.rating);
  }

  return teams;
}
