// ======================= forward.js =======================
import fs from "fs";
import path from "path";

const BASE_FOLDER = process.env.BASE_FOLDER || path.join(process.cwd(), "generated");
const ROBLOX_SECRET = process.env.ROBLOX_SECRET;

// helper: find webhook by ID
function findWebhookById(webhookId) {
  if (!fs.existsSync(BASE_FOLDER)) return null;

  const users = fs.readdirSync(BASE_FOLDER, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const user of users) {
    const userDir = path.join(BASE_FOLDER, user);
    const idPath = path.join(userDir, "webhookId.txt");
    const hookPath = path.join(userDir, "webhook.txt");

    if (!fs.existsSync(idPath) || !fs.existsSync(hookPath)) continue;

    const storedId = fs.readFileSync(idPath, "utf8").trim();
    if (storedId === webhookId) {
      return fs.readFileSync(hookPath, "utf8").trim();
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🔒 Auth check
    if (req.headers["x-auth"] !== ROBLOX_SECRET) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { webhookId, ...payload } = req.body;

    if (!webhookId) {
      return res.status(400).json({ error: "Missing webhookId" });
    }

    const webhook = findWebhookById(webhookId);
    if (!webhook) {
      return res.status(404).json({ error: "Unknown webhookId" });
    }

    // Forward to Discord
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    return res.status(response.status).send(text);

  } catch (err) {
    console.error("Forward error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
