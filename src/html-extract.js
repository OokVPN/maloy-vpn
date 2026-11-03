// Some subscription hosts answer browsers and servers (like GitHub Actions)
// with an HTML "subscription page" instead of the raw JSON. The configs are
// usually still inside that page (textarea, <script>, data-* attributes),
// possibly HTML-escaped, JS-escaped, URL-encoded or base64-wrapped.
// These helpers dig them out.

const NON_PROXY_PROTOCOLS = new Set(["freedom", "blackhole", "dns", "loopback"]);

export function isHtmlText(text) {
  return /^\s*<(?:!doctype|html|head|body)/i.test(String(text));
}

function decodeEntities(str) {
  const named = { quot: '"', amp: "&", lt: "<", gt: ">", apos: "'", nbsp: " ", sol: "/", colon: ":" };

  return String(str).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, group) => {
    if (group[0] === "#") {
      const code = group[1].toLowerCase() === "x"
        ? parseInt(group.slice(2), 16)
        : parseInt(group.slice(1), 10);

      try { return String.fromCodePoint(code); } catch { return match; }
    }

    return Object.hasOwn(named, group.toLowerCase()) ? named[group.toLowerCase()] : match;
  });
}

function unescapeJs(str) {
  return String(str)
    .replace(/\\u([0-9a-f]{4})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

function tryDecodeUri(str) {
  try { return decodeURIComponent(str); } catch { return str; }
}

function decodeBase64(value) {
  const input = String(value).trim().replace(/-/g, "+").replace(/_/g, "/");

  if (!input || !/^[A-Za-z0-9+/=\s]+$/.test(input)) return "";

  try {
    return Buffer.from(input, "base64").toString("utf8").replace(/^\uFEFF/, "").trim();
  } catch {
    return "";
  }
}

/** Finds balanced {...} / [...] blocks that parse as JSON and look like proxy configs. */
function findJsonBlocks(text, limit = 200) {
  const blocks = [];
  let i = 0;
  let attempts = 0;

  while (i < text.length && attempts < 4000 && blocks.length < limit) {
    const ch = text[i];

    if ((ch === "[" || ch === "{") && /[\s\[{"]/.test(text[i + 1] || "")) {
      attempts++;

      let depth = 0;
      let inString = false;
      let escaped = false;
      let end = -1;

      for (let j = i; j < text.length; j++) {
        const c = text[j];

        if (inString) {
          if (escaped) escaped = false;
          else if (c === "\\") escaped = true;
          else if (c === '"') inString = false;
          continue;
        }

        if (c === '"') inString = true;
        else if (c === "[" || c === "{") depth++;
        else if (c === "]" || c === "}") {
          depth--;
          if (depth === 0) { end = j; break; }
        }
      }

      if (end > i) {
        const chunk = text.slice(i, end + 1);

        if (/outbounds|"vnext"|"protocol"|vless|vmess|trojan/i.test(chunk)) {
          try {
            blocks.push(JSON.parse(chunk));
            i = end + 1;
            continue;
          } catch {}
        }
      }
    }

    i++;
  }

  return blocks;
}

function htmlChunks(html) {
  const chunks = [];
  const push = (text) => {
    const value = String(text || "").trim();
    if (value.length > 20) chunks.push(value);
  };

  for (const m of html.matchAll(/<(textarea|pre|code|script|template|noscript)\b[^>]*>([\s\S]*?)<\/\1>/gi)) push(m[2]);
  for (const m of html.matchAll(/\s[\w:-]+\s*=\s*"([^"]{40,})"/g)) push(m[1]);
  for (const m of html.matchAll(/\s[\w:-]+\s*=\s*'([^']{40,})'/g)) push(m[1]);

  push(html);

  return chunks;
}

/** Every JSON value (arrays / objects) that can be found inside the page. */
export function extractJsonFromHtml(html) {
  const out = [];
  const seen = new Set();

  const consider = (text) => {
    const variants = new Set([
      text,
      decodeEntities(text),
      unescapeJs(text),
      unescapeJs(decodeEntities(text)),
      tryDecodeUri(text),
      tryDecodeUri(unescapeJs(decodeEntities(text)))
    ]);

    for (const variant of variants) {
      if (seen.has(variant)) continue;
      seen.add(variant);

      for (const block of findJsonBlocks(variant)) out.push(block);

      for (const m of variant.matchAll(/[A-Za-z0-9+/_=-]{200,}/g)) {
        const decoded = decodeBase64(m[0]);

        if (decoded && /^[\[{]/.test(decoded)) {
          for (const block of findJsonBlocks(decoded)) out.push(block);
        }
      }
    }
  };

  for (const chunk of htmlChunks(html)) consider(chunk);

  return out;
}

function hasProxyOutbound(config) {
  return Array.isArray(config?.outbounds) && config.outbounds.some(
    (outbound) =>
      outbound &&
      typeof outbound.protocol === "string" &&
      !NON_PROXY_PROTOCOLS.has(outbound.protocol.toLowerCase()) &&
      outbound.settings &&
      typeof outbound.settings === "object"
  );
}

/** Walks the extracted JSON and returns the full Xray configs, without duplicates. */
export function collectConfigs(values) {
  const configs = [];
  const seen = new Set();

  const add = (config) => {
    const key = JSON.stringify(config);
    if (seen.has(key)) return;
    seen.add(key);
    configs.push(config);
  };

  const walk = (value, depth = 0) => {
    if (depth > 12 || value == null) return;

    if (typeof value === "string") {
      const text = value.trim();

      if (text.startsWith("{") || text.startsWith("[")) {
        try { walk(JSON.parse(text), depth + 1); } catch {}
      }

      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }

    if (typeof value !== "object") return;

    if (hasProxyOutbound(value)) {
      add(value);
      return;
    }

    for (const child of Object.values(value)) walk(child, depth + 1);
  };

  for (const value of values) walk(value);

  return configs;
}

/** Short, secret-free description of an HTML answer for the Actions log. */
export function describeHtml(html) {
  const count = (re) => (html.match(re) || []).length;
  const lower = html.toLowerCase();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const flags = [];

  if (/just a moment|cf-chl|challenge-platform|cf-browser-verification/.test(lower)) flags.push("cloudflare-challenge");
  if (/captcha|recaptcha|hcaptcha/.test(lower)) flags.push("captcha");
  if (/access denied|forbidden|blocked/.test(lower)) flags.push("denied-words");
  if (/<script[^>]+src=/.test(lower) && /<div id="root"|<div id="app"|__next|id="__nuxt"/.test(lower)) flags.push("spa-page");

  const decoded = decodeEntities(html);

  return [
    `title=${JSON.stringify((title || "").replace(/\s+/g, " ").trim().slice(0, 120))}`,
    `flags=${flags.join(",") || "-"}`,
    `script=${count(/<script\b/gi)}`,
    `textarea=${count(/<textarea\b/gi)}`,
    `outbounds(raw)=${count(/"outbounds"/g)}`,
    `outbounds(entity)=${count(/&quot;outbounds&quot;/g)}`,
    `outbounds(js-escaped)=${count(/\\"outbounds\\"/g)}`,
    `outbounds(decoded)=${(decoded.match(/"outbounds"/g) || []).length}`,
    `vless-links=${count(/vless(?:%3a|:)(?:%2f|\\?\/){2}/gi)}`
  ].join(", ");
}
