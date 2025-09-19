// api/players.js  (CommonJS – עובד תמיד ב-Vercel)
// מחזיר את /data/players.json כ-JSON
const data = require("../data/players.json");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(data);
};
