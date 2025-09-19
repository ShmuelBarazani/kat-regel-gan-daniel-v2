// api/read.js — משיב JSON מקובץ ב-GitHub (branch + repo מה-ENV)
export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.searchParams.get("path"); // למשל: data/players.json
    if (!path) return res.status(400).json({ error: "missing ?path=" });

    const token  = process.env.GITHUB_TOKEN;
    const repo   = process.env.GITHUB_REPO;        // "owner/repo"
    const branch = process.env.GITHUB_BRANCH || "main";
    if (!token || !repo) {
      return res.status(500).json({ error: "Server env missing (GITHUB_TOKEN/REPO)" });
    }

    // קבל את תוכן הקובץ מה-GitHub API
    const gh = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
    });

    if (!gh.ok) {
      const txt = await gh.text();
      return res.status(gh.status).json({ error: "github fetch failed", details: txt });
    }

    const json = await gh.json();
    // כשיוצא מ-GitHub contents ה-content הוא Base64
    const buf = Buffer.from(json.content || "", "base64").toString("utf8");
    let data;
    try { data = JSON.parse(buf); } catch { data = buf; }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(JSON.stringify(data));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error", details: String(e) });
  }
}
