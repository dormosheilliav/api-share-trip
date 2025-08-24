// api/share-trip.js — Vercel Serverless Function (Node.js, CommonJS)
const { Resend } = require("resend");

// ----- helpers -----
function isAllowedOrigin(origin) {
  const list = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.length) return true;
  if (!origin) return false;
  return list.includes(origin);
}

function parseRecipients(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  return String(input)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildTripLink(tripLink, tripId) {
  if (tripLink) return tripLink;
  if (tripId && process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/trip/${tripId}`;
  }
}

function toText(parts) { return parts.filter(Boolean).join("\n"); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
}
function toHtml(parts) {
  return `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5;">
  <h2>Trip Share</h2>
  <div style="border:1px solid #eee;border-radius:12px;padding:16px;">
    ${parts.filter(Boolean).join("")}
  </div>
  <p style="color:#666;font-size:12px">Sent via Trip AI</p>
</body>`;
}
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ----- handler -----
module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-API-KEY");
    if (isAllowedOrigin(origin)) res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return res.status(204).end();
  }

  // ✅ Health check (GET)
  if (req.method === "GET") {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
    return res.status(200).json({ ok: true, endpoint: "share-trip", time: new Date().toISOString() });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "Forbidden origin" });
  }

  const apiKey = req.headers["x-api-key"] || req.headers["X-API-KEY"];
  if (process.env.API_SECRET && apiKey !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Body (parsed or raw)
  let body = req.body;
  if (!body || typeof body === "string") {
    try {
      const raw = typeof body === "string" ? body : await readRawBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
  }

  const {
    to, cc, bcc, subject, appName, tripTitle, tripId, tripLink,
    message, summary, dates, travelers, imageUrl,
  } = body || {};

  if (!to) return res.status(400).json({ error: "Missing 'to' field" });
  if (!tripTitle) return res.status(400).json({ error: "Missing 'tripTitle' field" });

  const recipients = parseRecipients(to);
  const ccList = parseRecipients(cc);
  const bccList = parseRecipients(bcc);
  const link = buildTripLink(tripLink, tripId);
  const subj = subject || `${appName || "Trip AI"} • ${tripTitle}`;

  const text = toText([
    `Trip: ${tripTitle}`,
    dates ? `Dates: ${dates}` : undefined,
    travelers ? `Travelers: ${travelers}` : undefined,
    summary ? `Summary: ${summary}` : undefined,
    message ? `Message: ${message}` : undefined,
    link ? `Open Trip: ${link}` : undefined,
  ]);
  const html = toHtml([
    `<h3 style="margin-top:0">${escapeHtml(tripTitle)}</h3>`,
    dates ? `<p><strong>Dates:</strong> ${escapeHtml(dates)}</p>` : undefined,
    travelers ? `<p><strong>Travelers:</strong> ${escapeHtml(travelers)}</p>` : undefined,
    summary ? `<p><strong>Summary:</strong> ${escapeHtml(summary)}</p>` : undefined,
    message ? `<p style="white-space:pre-wrap">💬 ${escapeHtml(message)}</p>` : undefined,
    imageUrl ? `<p><img src="${escapeHtml(imageUrl)}" alt="Trip" width="600" style="max-width:100%;border-radius:8px"/></p>` : undefined,
    link ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;border-radius:10px;text-decoration:none;background:#111;color:#fff;font-weight:600" target="_blank" rel="noreferrer">Open Trip</a></p>` : undefined,
  ]);

  const resend = new Resend(process.env.RESEND_API_KEY || "");
  const FROM = process.env.FROM_EMAIL || "Trip AI <onboarding@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: recipients,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject: subj,
      text,
      html,
    });

    if (error) return res.status(500).json({ error: error.message || String(error) });
    return res.status(200).json({ id: data?.id });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
