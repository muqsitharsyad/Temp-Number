const axios = require("axios");
const cheerio = require("cheerio");
const {
  countryFromNumber,
  normalizeNumber,
  safeText,
  BROWSER_HEADERS,
} = require("./utils");

const TIMEOUT = 15000;

async function fetchHTML(url, referer) {
  const headers = { ...BROWSER_HEADERS };
  if (referer) headers.Referer = referer;
  const res = await axios.get(url, {
    headers,
    timeout: TIMEOUT,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return res.data;
}

// Map nama negara -> ISO code (untuk source yang pakai title="Canada" dst.)
const COUNTRY_NAME_TO_CODE = {
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  uk: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  england: "GB",
  canada: "CA",
  germany: "DE",
  france: "FR",
  sweden: "SE",
  finland: "FI",
  denmark: "DK",
  netherlands: "NL",
  spain: "ES",
  italy: "IT",
  poland: "PL",
  russia: "RU",
  ukraine: "UA",
  romania: "RO",
  "czech republic": "CZ",
  czechia: "CZ",
  austria: "AT",
  switzerland: "CH",
  ireland: "IE",
  portugal: "PT",
  belgium: "BE",
  norway: "NO",
  estonia: "EE",
  latvia: "LV",
  lithuania: "LT",
  china: "CN",
  "hong kong": "HK",
  taiwan: "TW",
  japan: "JP",
  korea: "KR",
  "south korea": "KR",
  india: "IN",
  indonesia: "ID",
  philippines: "PH",
  malaysia: "MY",
  singapore: "SG",
  thailand: "TH",
  vietnam: "VN",
  australia: "AU",
  "new zealand": "NZ",
  brazil: "BR",
  mexico: "MX",
  argentina: "AR",
  "south africa": "ZA",
  nigeria: "NG",
  egypt: "EG",
  morocco: "MA",
  "saudi arabia": "SA",
  uae: "AE",
  israel: "IL",
  turkey: "TR",
  pakistan: "PK",
  bangladesh: "BD",
  hungary: "HU",
  greece: "GR",
  bulgaria: "BG",
  slovakia: "SK",
  "puerto rico": "PR",
};

function nameToCode(name) {
  if (!name) return null;
  return COUNTRY_NAME_TO_CODE[String(name).toLowerCase().trim()] || null;
}

// =====================================================================
// SOURCE 1: receivesmsonline.net  (primary — paling stabil, format jelas)
// =====================================================================
const RSO_BASE = "https://www.receivesmsonline.net";

async function rso_listNumbers() {
  const html = await fetchHTML(RSO_BASE + "/");
  const $ = cheerio.load(html);
  const out = [];
  // Setiap nomor ada di <tr> dengan <img title="..."> + <a href="receive-sms-online-XXX.html">+XXX</a>
  $("tr").each((_, tr) => {
    const $tr = $(tr);
    const img = $tr.find("img").first();
    const a = $tr.find('a[href*="receive-sms-online-"]').first();
    if (!a.length) return;
    const href = a.attr("href") || "";
    const text = safeText(a.text());
    const m = text.match(/\+?\d{6,}/);
    if (!m) return;
    const number = normalizeNumber(m[0]);
    if (!number) return;
    const countryName = img.attr("title") || img.attr("alt") || "";
    const country = nameToCode(countryName) || countryFromNumber(number);
    const url = href.startsWith("http")
      ? href
      : RSO_BASE + (href.startsWith("/") ? href : "/" + href);
    if (!out.find((x) => x.number === number)) {
      out.push({ provider: "receivesmsonline", number, country, url });
    }
  });
  return out;
}

async function rso_messages(number, url) {
  if (!url) {
    const slug = number.replace(/^\+/, "");
    url = `${RSO_BASE}/receive-sms-online-${slug}.html`;
  }
  const html = await fetchHTML(url, RSO_BASE + "/");
  const $ = cheerio.load(html);
  const msgs = [];
  $("table").each((_, table) => {
    const $tbl = $(table);
    const heads = $tbl
      .find("thead th")
      .map((_, th) => safeText($(th).text()).toLowerCase())
      .get();
    if (!heads.includes("message") || !heads.includes("time")) return;
    $tbl.find("tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 3) return;
      // urutan: From Number | Time | Message
      const from = safeText($(tds[0]).text());
      const time = safeText($(tds[1]).text());
      // konversi <br> jadi newline lalu strip tag lain
      const msgHtml = $(tds[2]).html() || "";
      const message = safeText(
        msgHtml.replace(/<br\s*\/?>(\s*)/gi, "\n").replace(/<[^>]+>/g, ""),
      );
      if (!message) return;
      const key = from + "|" + time + "|" + message;
      if (!msgs.find((x) => x.from + "|" + x.time + "|" + x.message === key)) {
        msgs.push({ from, time, message });
      }
    });
  });
  return msgs;
}

// =====================================================================
// SOURCE 2: receivesms.co  (backup — list works, detail kadang 403)
// =====================================================================
const RC_BASE = "https://www.receivesms.co";

async function rc_listNumbers() {
  const html = await fetchHTML(RC_BASE + "/active-numbers");
  const $ = cheerio.load(html);
  const out = [];
  $("a.card-link").each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href") || "";
    const numText = safeText($a.find("strong").first().text());
    const m = numText.match(/\+?\d[\d\s]{5,}/);
    if (!m) return;
    const number = normalizeNumber(m[0]);
    if (!number) return;
    const flagImg = $a.find("img.flag").first();
    const cc = flagImg.attr("alt") || flagImg.attr("title") || "";
    const country =
      cc && /^[A-Za-z]{2}$/.test(cc)
        ? cc.toUpperCase()
        : countryFromNumber(number);
    const url = href.startsWith("http")
      ? href
      : RC_BASE + (href.startsWith("/") ? href : "/" + href);
    if (!out.find((x) => x.number === number)) {
      out.push({ provider: "receivesms", number, country, url });
    }
  });
  return out;
}

async function rc_messages(number, url) {
  if (!url) throw new Error("URL diperlukan untuk receivesms.co");
  const html = await fetchHTML(url, RC_BASE + "/");
  const $ = cheerio.load(html);
  const msgs = [];
  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 2) return;
    const from = safeText($(tds[0]).text());
    const message = safeText($(tds[1]).text());
    const time = tds.length >= 3 ? safeText($(tds[2]).text()) : "";
    if (
      message &&
      message.toLowerCase() !== "message" &&
      from.toLowerCase() !== "from"
    ) {
      msgs.push({ from, time, message });
    }
  });
  return msgs;
}

// =====================================================================
// SOURCE 3: sms-online.co  (number-boxes-item; bbrp link out ke domain sister, di-skip)
// =====================================================================
const SO_BASE = "https://sms-online.co";

async function so_listNumbers() {
  const html = await fetchHTML(SO_BASE + "/receive-free-sms");
  const $ = cheerio.load(html);
  const out = [];
  $(".number-boxes-item").each((_, el) => {
    const $el = $(el);
    const a = $el.find("a").first();
    const href = a.attr("href") || "";
    if (!href.includes("sms-online.co")) return;
    const m = href.match(/receive-free-sms\/(\d+)/);
    if (!m) return;
    const number = normalizeNumber(m[1]);
    if (!number) return;
    const numText = safeText($el.find(".number-boxes-item-number").text());
    const countryName = safeText($el.find(".number-boxes-item-country").text());
    const flagImg = $el.find("img.number-boxes-item-ico").attr("src") || "";
    const flagMatch = flagImg.match(/flags\/4x3\/([a-z]{2})\.svg/i);
    const country =
      (flagMatch ? flagMatch[1].toUpperCase() : null) ||
      nameToCode(countryName) ||
      countryFromNumber(number);
    if (!out.find((x) => x.number === number)) {
      out.push({
        provider: "smsonline",
        number,
        country,
        url: href,
        displayNumber: numText,
      });
    }
  });
  return out;
}

async function so_messages(number, url) {
  if (!url) {
    const slug = number.replace(/^\+/, "");
    url = `${SO_BASE}/receive-free-sms/${slug}`;
  }
  const html = await fetchHTML(url, SO_BASE + "/receive-free-sms");
  const $ = cheerio.load(html);
  const msgs = [];
  $(".list-item").each((_, el) => {
    const $el = $(el);
    const from = safeText($el.find(".list-item-title").text());
    const time = safeText($el.find(".list-item-meta").text());
    const message = safeText($el.find(".list-item-content").text());
    if (!message) return;
    msgs.push({ from, time, message });
  });
  return msgs;
}

// =====================================================================
// SOURCE 4: freephonenum.com  (US + CA; format tabel sederhana)
// =====================================================================
const FPN_BASE = "https://www.freephonenum.com";

async function fpn_listOne(countryPath, countryCode) {
  const html = await fetchHTML(`${FPN_BASE}/${countryPath}`);
  const $ = cheerio.load(html);
  const out = [];
  $('a.numbers-btn, a[href*="/receive-sms/"]').each((_, a) => {
    const $a = $(a);
    if ($a.hasClass("disabled")) return;
    const href = $a.attr("href") || "";
    const m = href.match(/\/receive-sms\/(\d+)/);
    if (!m) return;
    const number = normalizeNumber(m[1]);
    if (!number) return;
    const url = href.startsWith("http")
      ? href
      : FPN_BASE + (href.startsWith("/") ? href : "/" + href);
    if (!out.find((x) => x.number === number)) {
      out.push({ provider: "freephonenum", number, country: countryCode, url });
    }
  });
  return out;
}

async function fpn_listNumbers() {
  const [us, ca] = await Promise.all([
    fpn_listOne("us", "US").catch(() => []),
    fpn_listOne("ca", "CA").catch(() => []),
  ]);
  return [...us, ...ca];
}

async function fpn_messages(number, url) {
  if (!url) {
    const slug = number.replace(/^\+1/, "").replace(/^\+/, "");
    url = `${FPN_BASE}/us/receive-sms/${slug}`;
  }
  const html = await fetchHTML(url, FPN_BASE + "/");
  const $ = cheerio.load(html);
  const msgs = [];
  $("table tbody tr, table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;
    const time = safeText($(tds[0]).text());
    const from = safeText($(tds[1]).text());
    const message = safeText($(tds[2]).text());
    if (!message || time.toLowerCase() === "timestamp") return;
    if (message.length > 500 && /adsbygoogle|ezoic/i.test(message)) return;
    msgs.push({ from, time, message });
  });
  return msgs;
}

const PROVIDERS = {
  receivesmsonline: {
    name: "receivesmsonline.net",
    listNumbers: rso_listNumbers,
    getMessages: rso_messages,
  },
  smsonline: {
    name: "sms-online.co",
    listNumbers: so_listNumbers,
    getMessages: so_messages,
  },
  freephonenum: {
    name: "freephonenum.com",
    listNumbers: fpn_listNumbers,
    getMessages: fpn_messages,
  },
  // receivesms.co di-disable: detail page diblok Cloudflare (403)
  // 'receivesms': { name: 'receivesms.co', listNumbers: rc_listNumbers, getMessages: rc_messages },
};

module.exports = { PROVIDERS };
