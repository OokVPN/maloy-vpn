import fs from "node:fs/promises";
import path from "node:path";

import { getLatestPost } from "./telegram.js";
import { transformSubscription } from "./transform.js";
import {
  lookupGeoIPCountries,
  applyGeoIPCountries
} from "./geoip.js";

const root = process.cwd();
const settings = JSON.parse(
  await fs.readFile(path.join(root, "sources.json"), "utf8")
);

console.log("================================");
console.log(" Telegram VPN Sync");
console.log("================================");
console.log(`Channel: ${settings.telegram.channel}`);

const post = await getLatestPost(settings.telegram.channel);

console.log(`Latest post: ${post.postId ?? "unknown"}`);
console.log(`HTTP(S) links found: ${post.links.length}`);
console.log(`Selected URL: ${post.sourceUrl}`);

function cleanUrl(value) {
  return String(value)
    .trim()
    .replace(/&amp;/gi, "&")
    .replace(/[),.;!?]+$/g, "");
}

function extractNestedUrls(sourceUrl) {
  const urls = [];

  try {
    const url = new URL(sourceUrl);

    for (const [, value] of url.searchParams) {
      const decoded = cleanUrl(value);
      if (/^https?:\/\//i.test(decoded) && !urls.includes(decoded)) {
        urls.push(decoded);
      }
    }

    const decodedFull = decodeURIComponent(sourceUrl);
    const matches = decodedFull.match(/https?:\/\/[^\s"'<>]+/gi) || [];

    for (const match of matches) {
      const cleaned = cleanUrl(match);
      if (!urls.includes(cleaned)) urls.push(cleaned);
    }
  } catch {
    return urls;
  }

  return urls;
}

async function download(url) {
  console.log("");
  console.log(`Downloading: ${url}`);

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; OokVPN-Sync/2.0)",
      accept: "*/*"
    }
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
  return Buffer.from(clean, "base64")
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trim();
}

function parseJson(bytes) {
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

const candidates = [post.sourceUrl, ...extractNestedUrls(post.sourceUrl)]
  .filter((value, index, array) => value && array.indexOf(value) === index);

console.log("");
console.log("Candidate URLs:");
for (const candidate of candidates) console.log(` - ${candidate}`);

let parsed = null;
let selectedDownload = null;

for (const candidate of candidates) {
  try {
    const downloaded = await download(candidate);
    const result = parseJson(downloaded.bytes);

    if (result) {
      parsed = result;
      selectedDownload = downloaded;
      console.log("");
      console.log(`Successfully decoded JSON from: ${candidate}`);
      console.log(`Decode method: ${result.method}`);
      break;
    }

    console.log(`Not JSON from: ${candidate}`);
  } catch (error) {
    console.log(`Failed: ${candidate}`);
    console.log(`Reason: ${error.message}`);
  }
}

if (!parsed) {
  throw new Error("Could not find a downloadable source containing valid JSON.");
}

const input = parsed.data;
console.log("");
console.log("Processing VPN configs...");
console.log("Looking up node locations with GeoIP...");

const geoIPCountries = await lookupGeoIPCountries(input);
applyGeoIPCountries(input, geoIPCountries);

const result = transformSubscription(input);
const output = Array.isArray(input)
  ? result.configs
  : { ...input, configs: result.configs };
const serialized = JSON.stringify(output, null, 2) + "\n";

await fs.mkdir(path.join(root, "data"), { recursive: true });
await fs.mkdir(path.join(root, "public"), { recursive: true });

await fs.writeFile(path.join(root, "data/subscription.json"), serialized, "utf8");
await fs.writeFile(path.join(root, "public/subscription.json"), serialized, "utf8");

await fs.writeFile(
  path.join(root, "data/telegram-state.json"),
  JSON.stringify(
    {
      channel: settings.telegram.channel,
      postId: post.postId,
      telegramUrl: post.sourceUrl,
      actualSourceUrl: selectedDownload.url,
      finalSourceUrl: selectedDownload.finalUrl,
      checkedAt: new Date().toISOString(),
      configCount: result.configs.length,
      geoIPResolved: geoIPCountries.size,
      stats: result.stats
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log("");
console.log(`Configs processed: ${result.configs.length}`);
console.log("Remarks statistics:", result.stats);
console.log("");
console.log("Files written:");
console.log(" - data/subscription.json");
console.log(" - public/subscription.json");
console.log(" - data/telegram-state.json");
console.log("");
console.log("Done.");
