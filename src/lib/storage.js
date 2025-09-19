export async function loadPlayers() {
  // קודם כל נטען מ-API שקורא מ-GitHub
  try {
    const r = await fetch(`/api/read?path=${encodeURIComponent("data/players.json")}`, { cache: "no-store" });
    if (r.ok) {
      const json = await r.json();
      return (Array.isArray(json) ? json : []).map(p => ({
        ...p,
        rating: typeof p.rating === "number" ? p.rating : Number(p.r) || 0
      }));
    }
  } catch {}
  // אם נכשל – ננסה קובץ סטטי
  try {
    const r2 = await fetch(`/data/players.json`, { cache: "no-store" });
    if (r2.ok) {
      const json = await r2.json();
      return (Array.isArray(json) ? json : []);
    }
  } catch {}
  // נפילה ל-localStorage
  try {
    const raw = localStorage.getItem("krgd_v2_players");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export async function loadCycles() {
  try {
    const r = await fetch(`/api/read?path=${encodeURIComponent("data/cycles.json")}`, { cache: "no-store" });
    if (r.ok) {
      const json = await r.json();
      return Array.isArray(json) ? json : [];
    }
  } catch {}
  try {
    const r2 = await fetch(`/data/cycles.json`, { cache: "no-store" });
    if (r2.ok) {
      const json = await r2.json();
      return Array.isArray(json) ? json : [];
    }
  } catch {}
  try {
    const raw = localStorage.getItem("krgd_v2_cycles");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
