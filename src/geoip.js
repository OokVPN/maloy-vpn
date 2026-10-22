import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const API_URL = "https://free.freeipapi.com/api/v1/json/";

const PROXY_PROTOCOLS = new Set([
  "vless",
  "vmess",
  "trojan",
  "shadowsocks",
  "socks",
  "http",
  "hysteria",
  "hysteria2",
  "wireguard"
]);

function getConfigArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.configs)) return data.configs;
  if (Array.isArray(data?.servers)) return data.servers;
  return [];
}

function isPublicIp(address) {
  const type = isIP(address);

  if (type === 4) {
    const [a, b] = address.split(".").map(Number);

    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    ) return false;

    return true;
  }

  if (type === 6) {
    const normalized = address.toLowerCase();
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

    if (mapped) return isPublicIp(mapped[1]);

    const firstPart = normalized.split(":")[0];
    const first = Number.parseInt(firstPart || "0", 16);

    return first >= 0x2000 && first <= 0x3fff;
  }

  return false;
}

function getHost(value) {
  if (typeof value !== "string") return null;

  let host = value.trim();
  if (!host) return null;

  if (host.startsWith("[") && host.includes("]")) {
    host = host.slice(1, host.indexOf("]"));
  } else if (!isIP(host)) {
    const match = host.match(/^(.+):(\d+)$/);

    if (match && !match[1].includes(":")) {
      host = match[1];
    } else if (match && isIP(match[1]) === 6) {
      host = match[1];
    }
  }

  return host.replace(/\.$/, "") || null;
}

function getEndpointHost(config) {
  const outbounds = Array.isArray(config?.outbounds)
    ? config.outbounds
    : config?.protocol
      ? [config]
      : [];

  for (const outbound of outbounds) {
    const protocol = String(outbound?.protocol ?? "").toLowerCase();
    if (!PROXY_PROTOCOLS.has(protocol)) continue;

    const settings = outbound.settings ?? {};
    const candidates = [];

    for (const item of settings.vnext ?? []) candidates.push(item?.address);
    for (const item of settings.servers ?? []) candidates.push(item?.address);
    for (const item of settings.peers ?? []) candidates.push(item?.endpoint);
    candidates.push(settings.server);

    for (const candidate of candidates) {
      const host = getHost(candidate);
      if (host) return host;
    }
  }

  return null;
}

async function resolvePublicIp(host) {
  if (isIP(host)) return isPublicIp(host) ? host : null;

  try {
    const records = await dnsLookup(host, {
      all: true,
      verbatim: true
    });

    return records.find(record => isPublicIp(record.address))?.address ?? null;
  } catch {
    return null;
  }
}

async function lookupCountry(ip) {
  try {
    const response = await fetch(API_URL + encodeURIComponent(ip), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) return null;

    const data = await response.json();
    const countryCode = String(data?.countryCode ?? "").trim().toUpperCase();
    const countryName = String(data?.countryName ?? "").trim();

    if (!/^[A-Z]{2}$/.test(countryCode) || !countryName) return null;

    return { countryCode, countryName };
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function lookupGeoIPCountries(input) {
  const configs = getConfigArray(input);
  const endpoints = [];
  const uniqueIps = new Set();

  for (let index = 0; index < configs.length; index++) {
    const host = getEndpointHost(configs[index]);
    if (!host) continue;

    const ip = await resolvePublicIp(host);

    if (!ip) {
      console.log(`[GeoIP] No public IP for ${host}`);
      continue;
    }

    endpoints.push({ index, host, ip });
    uniqueIps.add(ip);
  }

  const countriesByIp = new Map();
  let requestCount = 0;

  for (const ip of uniqueIps) {
    if (requestCount > 0) await sleep(1250);
    requestCount++;

    const country = await lookupCountry(ip);
    countriesByIp.set(ip, country);

    if (country) {
      console.log(`[GeoIP] ${ip} -> ${country.countryName} [${country.countryCode}]`);
    } else {
      console.log(`[GeoIP] Lookup failed for ${ip}`);
    }
  }

  const result = new Map();

  for (const endpoint of endpoints) {
    const country = countriesByIp.get(endpoint.ip);
    if (country) result.set(endpoint.index, { ...country, ip: endpoint.ip });
  }

  console.log(`[GeoIP] Resolved ${result.size} of ${configs.length} configs`);
  return result;
}

export function applyGeoIPCountries(input, countries) {
  const configs = getConfigArray(input);
  let updated = 0;

  for (const [index, country] of countries) {
    const config = configs[index];
    if (!config || !country?.countryCode) continue;

    config.countryCode = country.countryCode;
    updated++;
  }

  console.log(`[GeoIP] Applied to ${updated} configs`);
  return input;
}
