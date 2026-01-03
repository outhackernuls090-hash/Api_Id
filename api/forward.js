// ======================= forward.js =======================
let WEBHOOKS = {}; // in-memory store

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const mode = req.query.mode;

    // ---------- BOT REGISTRATION ----------
    if (mode === "register") {
      const { webhookId, webhook } = req.body;

      if (!webhookId || !webhook) {
        return res.status(400).json({ error: "Missing data" });
      }

      if (!webhook.startsWith("https://discord.com/api/webhooks/")) {
        return res.status(400).json({ error: "Invalid webhook" });
      }

      WEBHOOKS[webhookId] = webhook;
      return res.status(200).json({ status: "registered" });
    }

    // ---------- ROBLOX FORWARD ----------
    const { webhookId, ...payload } = req.body;

    if (!webhookId) {
      return res.status(400).json({ error: "Missing webhookId" });
    }

    const webhook = WEBHOOKS[webhookId];
    if (!webhook) {
      return res.status(404).json({ error: "Unknown webhookId" });
    }

    const result = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await result.text();
    return res.status(result.status).send(text);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
}