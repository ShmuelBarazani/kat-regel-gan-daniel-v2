// api/players.js  — גרסת ESM עבור Vercel + Vite ("type": "module")
import data from "../data/players.json" assert { type: "json" };

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(data);
}
