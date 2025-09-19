// api/read.js — קורא קובץ JSON מה-GitHub ומחזיר את התוכן
module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.searchParams.get("path"); // למשל: data/players.json
    if (!path) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "missing ?path=" }));
    }

    const token  = process.env.GITHUB_TOKEN;
    const repo   = process.env.GITHUB_REPO;        // "owner/repo"
    const branch = process.env.GITHUB_BRANCH || "main";
    if (!token || !repo) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Server env missing (GITHUB_TOKEN/REPO)" }));
    }

    const gh = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );

    if (!gh.ok) {
      const txt = await gh.text();
      res.statusCode = gh.status;
      return res.end(JSON.stringify({ error: "github fetch failed", details: txt }));
    }

    const json = await gh.json(); // { content: base64, ... }
    const buf = Buffer.from(json.content || "", "base64").toString("utf8");
    try {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.statusCode = 200;
      return res.end(buf); // כבר JSON טקסטואלי
    } catch {
      res.statusCode = 200;
      return res.end(JSON.stringify(buf));
    }
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Server error", details: String(e) }));
  }
};
