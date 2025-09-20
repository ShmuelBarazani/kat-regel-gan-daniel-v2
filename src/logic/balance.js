// logic/balance.js — חלוקת כוחות עם אילוצים

// helpers
const sum = (arr, sel = (x) => x) => arr.reduce((s, x) => s + sel(x), 0);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// מאחד "חייב-עם" ליחידות (Union-Find פשוט)
export function buildMustUnits(players) {
  const idByName = new Map(players.map((p) => [p.name, p.id]));
  const parent = new Map(players.map((p) => [p.id, p.id]));
  const find = (x) =>
    parent.get(x) === x ? x : parent.set(x, find(parent.get(x))).get(x);
  const uni = (a, b) => {
    a = find(a);
    b = find(b);
    if (a !== b) parent.set(a, b);
  };
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
  const names = new Set(dstTeam.map((x) => x.name));
  for (const n of player.avoidWith || []) if (names.has(n)) return true;
  for (const mate of dstTeam) {
    if ((mate.avoidWith || []).includes(player.name)) return true;
  }
  return false;
}

// allowed sizes: ±1 בלבד
export function allowedTeamSizes(totalPlayers, teamCount) {
  const base = Math.floor(totalPlayers / teamCount);
  const remainder = totalPlayers % teamCount; // remainder קבוצות יקבלו base+1
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

// אלגוריתם יצירת קבוצות (מאזן סכום ציונים, מכבד חייב-עם/לא-עם וגדלים)
export function generateTeams(players, teamCount) {
  const active = players.filter((p) => p.playing);
  if (teamCount < 2) teamCount = 2;

  const units = buildMustUnits(active);
  const { base, remainder } = allowedTeamSizes(active.length, teamCount);
  const maxPerTeam = base + (remainder ? 1 : 0);

  // יחידת חייב-עם גדולה מהמותר => כשל
  for (const u of units) {
    if (u.length > maxPerTeam) {
      throw new Error(
        "אי אפשר ליצור כוחות חוקיים: קיימת יחידת 'חייב-עם' גדולה מגודל היעד."
      );
    }
  }

  const teams = Array.from({ length: teamCount }, () => []);
  const totals = Array.from({ length: teamCount }, () => 0);
  const quota = Array.from({ length: teamCount }, (_, i) =>
    i < remainder ? base + 1 : base
  );

  // יחידות לפי משקל (סכום ציונים + גודל), עם ערבוב כדי לקבל חלוקות שונות בכל לחיצה
  const weight = (u) => sum(u, (x) => x.rating) + u.length * 0.01;
  const unitsOrder = shuffle(units).sort((a, b) => weight(b) - weight(a));

  for (const unit of unitsOrder) {
    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < teamCount; i++) {
      if (teams[i].length + unit.length > quota[i]) continue;

      // לא-עם דו-כיווני
      let bad = false;
      for (const p of unit) {
        if (violatesAvoidWith(teams[i], p)) {
          bad = true;
          break;
        }
      }
      if (bad) continue;

      const score = totals[i] + sum(unit, (x) => x.rating);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      throw new Error(
        "אי אפשר ליצור כוחות חוקיים במסגרת ההגבלות (לא-עם / גדלי קבוצות)."
      );
    }

    teams[bestIdx].push(...unit);
    totals[bestIdx] += sum(unit, (x) => x.rating);
  }

  return teams;
}
