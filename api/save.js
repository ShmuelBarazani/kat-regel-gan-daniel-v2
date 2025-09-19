// api/save.js — מבצע commit לקובץ JSON ב-GitHub (create/update)
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end(JSON.stringify({ error: "Method Not Allowed" }));
    }

    const { path, content, message } = await readJson(req);
    if (!path || !content) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "Missing 'path' or 'content' JSON" }));
    }

    const token  = process.env.GITHUB_TOKEN;
    const repo   = process.env.GITHUB_REPO;           // "owner/repo"
    const branch = process.env.GITHUB_BRANCH || "main";
    if (!token || !repo) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: "Missing server env (GITHUB_TOKEN/GITHUB_REPO)" }));
    }

    const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`;

    // השג sha אם הקובץ קיים
    let sha = null;
    const getResp = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
    });
    if (getResp.ok) {
      const j = await getResp.json();
      if (j && j.sha) sha = j.sha;
    }

    const encoded = Buffer
      .from(typeof content === "string" ? content : JSON.stringify(content, null, 2))
      .toString("base64");

    const putResp = await fetch(apiBase, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message || `chore: update ${path}`,
        content: encoded,
        branch,
        ...(sha ? { sha } : {})
      })
    });

    if (!putResp.ok) {
      const errTxt = await putResp.text();
      res.statusCode = putResp.status;
      return res.end(JSON.stringify({ error: "GitHub update failed", details: errTxt }));
    }

    const result = await putResp.json();
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, result }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "Server error", details: String(err) }));
  }
};

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { return {}; }
}
