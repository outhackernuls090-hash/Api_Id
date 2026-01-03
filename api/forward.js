// ======================= forward.js =======================
import { kv } from "@vercel/kv";

// ---------- UTILS ----------
async function saveWebhook(webhookId, webhookUrl) {
  // persist in KV, never expires
  await kv.set(`wh:${webhookId}`, webhookUrl);
}

async function getWebhook(webhookId) {
  return await kv.get(`wh:${webhookId}`);
}

// ---------- HANDLER ----------
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
        return res.status(400).json({ error: "Missing webhookId or webhook" });
      }

      if (!webhook.startsWith("https://discord.com/api/webhooks/")) {
        return res.status(400).json({ error: "Invalid webhook URL" });
      }

      await saveWebhook(webhookId, webhook);

      return res.status(200).json({ status: "registered", webhookId });
    }

    // ---------- ROBLOX FORWARD ----------
    const { webhookId, content, embeds } = req.body;

    if (!webhookId) {
      return res.status(400).json({ error: "Missing webhookId" });
    }

    const webhook = await getWebhook(webhookId);

    if (!webhook) {
      return res.status(404).json({ error: "Unknown webhookId" });
    }

    // Forward to Discord
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, embeds })
    });

    const text = await response.text();

    // Optional: log for debugging
    console.log("WebhookID:", webhookId, "Discord status:", response.status);

    return res.status(response.status).send(text);

  } catch (err) {
    console.error("Forward error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
