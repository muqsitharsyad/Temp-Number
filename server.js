const express = require("express");
const cache = require("./cache");
const { PROVIDERS } = require("./scrapers");
const { flagFor, countryNameFor } = require("./utils");
const { INDEX_HTML, APP_JS } = require("./frontend");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.type("html").send(INDEX_HTML);
});
app.get("/app.js", (_req, res) => {
  res.type("application/javascript").send(APP_JS);
});

// List provider yang tersedia
app.get("/api/providers", (req, res) => {
  res.json(Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name })));
});

// Daftar nomor (gabungan semua / per provider)
app.get("/api/numbers", async (req, res) => {
  const wanted = req.query.provider;
  const ids = wanted && PROVIDERS[wanted] ? [wanted] : Object.keys(PROVIDERS);
  const results = await Promise.allSettled(
    ids.map((id) =>
      cache.wrap(`numbers:${id}`, 60_000, () => PROVIDERS[id].listNumbers()),
    ),
  );
  const merged = [];
  const errors = [];
  results.forEach((r, idx) => {
    const id = ids[idx];
    if (r.status === "fulfilled") {
      r.value.forEach((n) =>
        merged.push({
          ...n,
          flag: flagFor(n.country),
          countryName: countryNameFor(n.country),
        }),
      );
    } else {
      const errMsg = String((r.reason && r.reason.message) || r.reason);
      console.error(`[${id}] scrape FAILED:`, errMsg);
      errors.push({ provider: id, error: errMsg });
    }
  });
  // dedupe by number, keep first
  const seen = new Set();
  const unique = merged.filter((n) => {
    if (seen.has(n.number)) return false;
    seen.add(n.number);
    return true;
  });
  res.json({ count: unique.length, numbers: unique, errors });
});

// Inbox SMS
app.get("/api/messages", async (req, res) => {
  const { provider, number, url } = req.query;
  if (!provider || !number || !PROVIDERS[provider]) {
    return res.status(400).json({ error: "provider & number required" });
  }
  try {
    const key = `msg:${provider}:${number}`;
    const msgs = await cache.wrap(key, 10_000, () =>
      PROVIDERS[provider].getMessages(number, url),
    );
    res.json({ provider, number, count: msgs.length, messages: msgs });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

// Debug endpoint: raw scrape test
app.get("/api/debug", async (req, res) => {
  const axios = require("axios");
  const result = {};
  const testUrls = [
    "https://www.receivesmsonline.net/",
    "https://sms-online.co/receive-free-sms",
    "https://www.freephonenum.com/us",
  ];
  await Promise.all(testUrls.map(async (url) => {
    const t = Date.now();
    try {
      const r = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
      });
      result[url] = { status: r.status, bytes: String(r.data).length, ms: Date.now() - t };
    } catch (e) {
      result[url] = { error: e.message, ms: Date.now() - t };
    }
  }));
  res.json(result);
});

// Health check tiap source
app.get("/api/health", async (req, res) => {
  const ids = Object.keys(PROVIDERS);
  const out = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const list = await PROVIDERS[id].listNumbers();
        out[id] = { ok: true, count: list.length };
      } catch (e) {
        out[id] = { ok: false, error: String(e.message || e) };
      }
    }),
  );
  res.json(out);
});

app.listen(PORT, () => {
  console.log(`✅ Temp-Number app running at http://localhost:${PORT}`);
  console.log(`   Providers: ${Object.keys(PROVIDERS).join(", ")}`);
});
