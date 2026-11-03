import {
  collectConfigs,
  describeHtml,
  extractJsonFromHtml,
  isHtmlText
} from "./html-extract.js";

const REQUEST_TIMEOUT_MS = 30000;

function cleanUrl(value) {
  return String(value)
    .trim()
    .replace(/&amp;/gi, "&")
    .replace(/[),.;!?]+$/g, "");
}

/** The link itself plus every URL nested inside it (proxy/wrapper links). */
export function candidateUrls(sourceUrl) {
  const urls = [sourceUrl];
  const add = (value) => {
    const cleaned = cleanUrl(value);
    if (/^https?:\/\//i.test(cleaned) && !urls.includes(cleaned)) urls.push(cleaned);
  };

  try {
    const url = new URL(sourceUrl);
    for (const [, value] of url.searchParams) add(value);
  } catch {
    return urls;
  }

  let decoded = sourceUrl;
  try { decoded = decodeURIComponent(sourceUrl); } catch {}

  // Every "http(s)://" occurrence starts a candidate, including nested ones.
  for (const match of decoded.matchAll(/https?:\/\//gi)) {
    const rest = decoded.slice(match.index);
    const end = rest.search(/[\s"'<>]/);
    add(end === -1 ? rest : rest.slice(0, end));
  }

  return urls.filter(Boolean);
}

async function download(url) {
  console.log("");
  console.log(`Downloading: ${url}`);

  const response = await fetch(url, {
    redirect: "follow",
    headers: { accept: "*/*" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentType = response.headers.get("content-type") ?? "unknown";
  const finalUrl = response.url || url;
  const bytes = Buffer.from(await response.arrayBuffer());

  console.log(`Final URL: ${finalUrl}`);
  console.log(`Content-Type: ${contentType}`);
  console.log(`Downloaded: ${bytes.length} bytes`);

  return { url, finalUrl, contentType, bytes };
}

function looksLikeBase64(value) {
  const clean = value.replace(/\s+/g, "").trim();
  if (!clean || clean.length < 8) return false;
  return /^[A-Za-z0-9+/]*={0,2}$/.test(clean);
}

function decodeBase64(value) {
  const clean = value.replace(/\s+/g, "").trim();
  return Buffer.from(clean, "base64").toString("utf8").replace(/^\uFEFF/, "").trim();
}

export function parseJson(bytes) {
  let current = bytes.toString("utf8").replace(/^\uFEFF/, "").trim();

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return {
        data: JSON.parse(current),
        method: attempt === 0 ? "JSON" : `Base64 x${attempt} -> JSON`
      };
    } catch {}

    try {
      const decodedUrl = decodeURIComponent(current);

      if (decodedUrl !== current) {
        current = decodedUrl.trim();

        try {
          return { data: JSON.parse(current), method: "URL encoded -> JSON" };
        } catch {}
      }
    } catch {}

    if (!looksLikeBase64(current)) break;

    const decoded = decodeBase64(current);
    if (!decoded || decoded === current) break;
    current = decoded;
  }

  return null;
}

/**
 * Downloads the subscription and returns { data, method, url, finalUrl }.
 *
 * 1. For every candidate URL, looks for a plain JSON answer.
 * 2. If the host only answers with an HTML page, takes the configs embedded
 *    in that page.
 */
export async function loadSubscription(sourceUrl) {
  const candidates = candidateUrls(sourceUrl);

  console.log("");
  console.log("Candidate URLs:");
  for (const candidate of candidates) console.log(` - ${candidate}`);

  const htmlPages = [];

  for (const candidate of candidates) {
    try {
      const downloaded = await download(candidate);
      const result = parseJson(downloaded.bytes);

      if (result) {
        console.log("");
        console.log(`Successfully decoded JSON from: ${candidate}`);
        console.log(`Decode method: ${result.method}`);

        return { ...result, url: downloaded.url, finalUrl: downloaded.finalUrl };
      }

      const text = downloaded.bytes.toString("utf8");

      if (isHtmlText(text)) {
        console.log(`Got an HTML page instead of JSON (${describeHtml(text)})`);
        htmlPages.push({ ...downloaded, text });
      } else {
        console.log(`Not JSON from: ${candidate}`);
      }
    } catch (error) {
      console.log(`Failed: ${candidate}`);
      console.log(`Reason: ${error.message}`);
    }
  }

  // Fallback: the page answers servers with HTML, but the configs are inside it.
  for (const page of htmlPages) {
    const configs = collectConfigs(extractJsonFromHtml(page.text));

    if (configs.length > 0) {
      console.log("");
      console.log(`Found ${configs.length} configs inside the HTML page: ${page.url}`);

      return {
        data: configs,
        method: `HTML page -> ${configs.length} embedded configs`,
        url: page.url,
        finalUrl: page.finalUrl
      };
    }
  }

  if (htmlPages.length > 0) {
    throw new Error(
      "The source answered with an HTML page and no configs could be found in it. " +
      `Page summary: ${describeHtml(htmlPages[0].text)}`
    );
  }

  throw new Error("Could not find a downloadable source containing valid JSON.");
}
