// api/players.cjs
const { readFileSync } = require("fs");
const { join } = require("path");

module.exports = (req, res) => {
  try {
    const filePath = join(process.cwd(), "data", "players.json");
    const data = JSON.parse(readFileSync(filePath, "utf8"));
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "failed_to_read_players", message: String(err) });
  }
};
