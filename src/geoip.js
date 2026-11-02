import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import dns from "node:dns/promises";
import crypto from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DAY = 24 * 60 * 60 * 1000;
const IP_TTL = 14 * DAY;
const CACHE_KEEP = 30 * DAY;
const BAD_CODES = new Set(["XX", "ZZ", "T1", "A1", "A2", "AP", "EU"]);
const PLACEHOLDER_HOSTS = new Set(["", "0", "0000", "0.0.0.0", "localhost", "::", "::1", "example.com"]);
const USER_AGENT = "MaloyVPN-geo/1.0";

const XRAY_RELEASE_API = "https://api.github.com/repos/XTLS/Xray-core/releases/latest";
const XRAY_FALLBACK_VERSION = "26.9.9";

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

/* ------------------------------------------------------------------ */
/* Endpoint helpers                                                    */
/* ------------------------------------------------------------------ */

export function endpointOf(outbound) {
  const s = outbound?.settings;
  if (!s || typeof s !== "object") return null;
  const first = (Array.isArray(s.vnext) && s.vnext[0]) || (Array.isArray(s.servers) && s.servers[0]) || (Array.isArray(s.peers) && s.peers[0]) || s;
  const address = typeof first?.address === "string" ? first.address.trim().replace(/^\[|\]$/g, "") : "";
  const port = Number(first?.port);
  if (!address && !port) return null;
  return { address, port };
}

export function isPlaceholderOutbound(outbound) {
  const ep = endpointOf(outbound);
  if (!ep) return true;
  const host = ep.address.toLowerCase();
  if (PLACEHOLDER_HOSTS.has(host) || host.startsWith("127.")) return true;
  if (!Number.isInteger(ep.port) || ep.port <= 0 || ep.port > 65535) return true;
  return false;
}

function normalizeCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && !BAD_CODES.has(code) ? code : null;
}

export function extractCountryCode(data) {
  if (!data || typeof data !== "object") return null;
  if (data.success === false || data.status === "fail" || data.status === "error") return null;
  for (const key of ["countryCode", "country_code", "country"]) {
    const code = normalizeCode(data[key]);
    if (code) return code;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Small utilities                                                     */
/* ------------------------------------------------------------------ */

function readJsonSafe(file, fallback) {
  try { return file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; }
  catch { return fallback; }
}

function writeJsonSafe(file, value) {
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.renameSync(`${file}.tmp`, file);
  } catch (error) { console.warn(`Geo: не удалось сохранить кэш: ${error.message}`); }
}

async function mapLimit(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  });
  await Promise.all(workers);
}

function fingerprintOf(outbound, deps = []) {
  const { tag, ...rest } = outbound || {};
  const chain = Array.isArray(deps) && deps.length ? deps : undefined;
  return crypto.createHash("sha256").update(JSON.stringify(chain ? [rest, chain] : rest)).digest("hex").slice(0, 24);
}

async function resolveIp(host) {
  if (!host) return null;
  if (net.isIP(host)) return host;
  try { return (await dns.lookup(host, { family: 4 })).address; }
  catch {
    try { return (await dns.lookup(host)).address; } catch { return null; }
  }
}

/* ------------------------------------------------------------------ */
/* Xray binary: use an installed one or download it                    */
/* ------------------------------------------------------------------ */

function canRunXray(command) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, ["version"], { stdio: "ignore", windowsHide: true });
    } catch {
      resolve(false);
      return;
    }
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}

async function downloadXray() {
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("Automatic Xray download supports Linux x64. Install Xray and set XRAY_BIN.");
  }

  const directory = path.join(os.tmpdir(), "maloyvpn-xray-runtime");
  const binaryPath = path.join(directory, "xray");
  const zipPath = path.join(directory, "xray.zip");

  await fsp.mkdir(directory, { recursive: true });

  try {
    await fsp.access(binaryPath);
    if (await canRunXray(binaryPath)) return binaryPath;
  } catch {
  }

  let downloadUrl = null;
  let releaseTag = null;

  try {
    const releaseResponse = await fetch(XRAY_RELEASE_API, {
      headers: { accept: "application/vnd.github+json", "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(12000)
    });

    if (releaseResponse.ok) {
      const release = await releaseResponse.json();
      const asset = release.assets?.find((item) => item.name === "Xray-linux-64.zip");

      if (asset?.browser_download_url) {
        downloadUrl = asset.browser_download_url;
        releaseTag = release.tag_name;
      }
    }
  } catch {
  }

  if (!downloadUrl) {
    releaseTag = `v${XRAY_FALLBACK_VERSION}`;
    downloadUrl = `https://github.com/XTLS/Xray-core/releases/download/${releaseTag}/Xray-linux-64.zip`;
  }

  console.log(`[Xray] Downloading ${releaseTag} for Linux x64`);

  const binaryResponse = await fetch(downloadUrl, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(60000)
  });

  if (!binaryResponse.ok) {
    throw new Error(`Could not download Xray: HTTP ${binaryResponse.status}`);
  }

  await fsp.writeFile(zipPath, Buffer.from(await binaryResponse.arrayBuffer()));

  const extractScript = String.raw`
import os, sys, zipfile
archive, output = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(archive) as z:
    files = [n for n in z.namelist() if not n.endswith('/') and n.rsplit('/', 1)[-1] == 'xray']
    if not files:
        raise SystemExit('Xray executable was not found in the downloaded archive')
    with z.open(files[0]) as src, open(output, 'wb') as dst:
        while True:
            chunk = src.read(1024 * 1024)
            if not chunk:
                break
            dst.write(chunk)
`;

  try {
    await execFileAsync("python3", ["-c", extractScript, zipPath, binaryPath], {
      timeout: 20000,
      maxBuffer: 1024 * 1024
    });
  } catch (error) {
    throw new Error(`Could not extract Xray: ${error.message}`);
  } finally {
    await fsp.rm(zipPath, { force: true });
  }

  await fsp.chmod(binaryPath, 0o755);

  if (!(await canRunXray(binaryPath))) {
    throw new Error("Downloaded Xray executable did not start successfully.");
  }

  return binaryPath;
}

async function ensureXray() {
  if (process.env.GEO_XRAY === "off") return null;

  const preferred = process.env.XRAY_BIN || process.env.XRAY_PATH;
  if (preferred && (await canRunXray(preferred))) return preferred;
  if (await canRunXray("xray")) return "xray";

  try {
    return await downloadXray();
  } catch (error) {
    console.log(`[Xray] Could not start Xray: ${error.message}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Exit-country check through a real Xray tunnel                       */
/* ------------------------------------------------------------------ */

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => { const { port } = server.address(); server.close(() => resolve(port)); });
  });
}

async function waitForPort(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const socket = net.connect({ host: "127.0.0.1", port }, () => { socket.destroy(); resolve(true); });
      socket.on("error", () => resolve(false));
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

export function getViaHttpProxy(proxyPort, urlString, { timeoutMs = 10000, tlsOptions = {} } = {}) {
  const url = new URL(urlString);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => finish(new Error("таймаут")), timeoutMs);
    const collect = (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => finish(null, { status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", finish);
    };
    if (url.protocol === "http:") {
      const req = http.request({ host: "127.0.0.1", port: proxyPort, method: "GET", path: urlString, headers: { Host: url.host, "User-Agent": USER_AGENT, Accept: "application/json" } }, collect);
      req.on("error", finish); req.end(); return;
    }
    const connect = http.request({ host: "127.0.0.1", port: proxyPort, method: "CONNECT", path: `${url.hostname}:${url.port || 443}` });
    connect.on("error", finish);
    connect.on("connect", (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); finish(new Error(`CONNECT ${res.statusCode}`)); return; }
      const secure = tls.connect({ socket, servername: url.hostname, ...tlsOptions });
      secure.on("error", finish);
      const req = http.request({ createConnection: () => secure, host: url.hostname, method: "GET", path: `${url.pathname}${url.search}`, headers: { Host: url.host, "User-Agent": USER_AGENT, Accept: "application/json", Connection: "close" } }, (r) => { collect(r); });
      req.on("error", finish); req.end();
    });
    connect.end();
  });
}

export async function checkViaXray(bin, outbound, { urls, tlsOptions, deps = [] } = {}) {
  const exitUrls = urls || String(process.env.GEO_EXIT_URLS || "https://api.country.is/,https://ipwho.is/?fields=success,country_code,ip,https://ipinfo.io/json").split(",").map((x) => x.trim()).filter(Boolean);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "maloy-geo-"));
  let child = null;
  try {
    const port = await freePort();
    const config = {
      log: { loglevel: "none" },
      inbounds: [{ tag: "in", listen: "127.0.0.1", port, protocol: "http", settings: {} }],
      outbounds: [{ ...structuredClone(outbound), tag: "proxy" }, ...structuredClone(deps), { tag: "direct", protocol: "freedom" }],
      routing: { rules: [{ type: "field", inboundTag: ["in"], outboundTag: "proxy" }] }
    };
    const file = path.join(dir, "config.json");
    fs.writeFileSync(file, JSON.stringify(config), { mode: 0o600 });
    child = spawn(bin, ["run", "-c", file], { stdio: "ignore" });
    let exited = false; child.on("exit", () => { exited = true; });
    if (!(await waitForPort(port, 6000)) || exited) return { ok: false, code: null, reason: "xray не стартовал" };
    let reached = false;
    for (const url of exitUrls) {
      try {
        const res = await getViaHttpProxy(port, url, { timeoutMs: 10000, tlsOptions });
        if (res.status < 200 || res.status >= 300) continue;
        reached = true;
        let data = null; try { data = JSON.parse(res.body); } catch {}
        const code = extractCountryCode(data);
        if (code) return { ok: true, code };
      } catch {}
    }
    return { ok: reached, code: null, reason: reached ? "страна не определена" : "нет ответа через узел" };
  } finally {
    if (child) { try { child.kill("SIGKILL"); } catch {} }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

/* ------------------------------------------------------------------ */
/* Fallback: country of the endpoint IP                                */
/* ------------------------------------------------------------------ */

async function fetchJson(url, init = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000), headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function lookupIps(ips, budgetMs = 45000) {
  const result = new Map();
  const deadline = Date.now() + budgetMs;
  const unique = [...new Set(ips)];
  const batchUrl = process.env.GEO_BATCH_URL || "http://ip-api.com/batch?fields=status,countryCode,query";
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    if (Date.now() > deadline) break;
    try {
      const rows = await fetchJson(batchUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(chunk) });
      if (Array.isArray(rows)) for (const row of rows) { const code = extractCountryCode(row); if (code && row.query) result.set(row.query, code); }
    } catch (error) { console.warn(`Geo: пакетный запрос не удался: ${error.message}`); }
  }
  const templates = String(process.env.GEO_IP_URLS || "https://api.country.is/{ip},https://ipwho.is/{ip}?fields=success,country_code,ip,https://ipinfo.io/{ip}/json").split(",").map((x) => x.trim()).filter(Boolean);
  await mapLimit(unique.filter((ip) => !result.has(ip)), 4, async (ip) => {
    for (const template of templates) {
      if (Date.now() > deadline) return;
      try {
        const code = extractCountryCode(await fetchJson(template.replace("{ip}", encodeURIComponent(ip))));
        if (code) { result.set(ip, code); return; }
      } catch {}
    }
  });
  return result;
}

/* ------------------------------------------------------------------ */
/* resolveGeo: override -> real exit country -> cache -> endpoint IP   */
/* ------------------------------------------------------------------ */

export async function resolveGeo(nodes, { cacheFile, overridesFile, tlsOptions } = {}) {
  const now = Date.now();
  const cache = readJsonSafe(cacheFile, {});
  const overrides = readJsonSafe(overridesFile, {});
  const deadAfter = Math.max(1, Number(process.env.GEO_DEAD_AFTER || 2));
  const fresh = (entry, ttl) => entry && normalizeCode(entry.code) && now - Number(entry.at || 0) < ttl;
  const results = nodes.map(() => ({ code: null, source: null, ip: null, host: null, reachable: null, failCount: 0, dead: false, drop: false, reason: null }));
  const stats = { override: 0, exit: 0, ip: 0, cache: 0, none: 0, xrayUsed: false, xrayOk: 0, xrayFail: 0, grace: 0, dead: 0, unknown: 0 };
  const nodeKey = (i) => `node:${fingerprintOf(nodes[i].outbound, nodes[i].deps)}`;
  const failKey = (i) => `fail:${fingerprintOf(nodes[i].outbound, nodes[i].deps)}`;

  await mapLimit(nodes, 8, async (node, i) => {
    const ep = endpointOf(node.outbound);
    if (!ep) return;
    results[i].host = ep.address;
    results[i].ip = await resolveIp(ep.address);
  });

  nodes.forEach((node, i) => {
    const r = results[i];
    const code = normalizeCode(overrides[r.ip] ?? overrides[r.host] ?? "");
    if (code) { r.code = code; r.source = "override"; stats.override++; }
  });

  const bin = await ensureXray();
  stats.xrayUsed = Boolean(bin);
  if (bin) {
    const xrayDeadline = Date.now() + Number(process.env.GEO_XRAY_BUDGET_MS || 150000);
    await mapLimit(nodes.map((_, i) => i), 4, async (i) => {
      const r = results[i];
      if (Date.now() > xrayDeadline) return;
      let check;
      try { check = await checkViaXray(bin, nodes[i].outbound, { tlsOptions, deps: nodes[i].deps }); }
      catch (error) { check = { ok: false, code: null, reason: error.message }; }
      r.reachable = check.ok;
      if (check.ok) {
        stats.xrayOk++; delete cache[failKey(i)];
        if (check.code) {
          cache[nodeKey(i)] = { code: check.code, at: Date.now() };
          if (!r.code) { r.code = check.code; r.source = "exit"; stats.exit++; }
        }
      } else {
        stats.xrayFail++;
        const n = Number(cache[failKey(i)]?.n || 0) + 1;
        cache[failKey(i)] = { n, at: Date.now() };
        r.failCount = n;
      }
    });
  }

  const needIp = [];
  nodes.forEach((node, i) => {
    const r = results[i];
    if (r.code) return;
    const known = normalizeCode(cache[nodeKey(i)]?.code) ? cache[nodeKey(i)] : (r.ip && normalizeCode(cache[`ip:${r.ip}`]?.code) ? cache[`ip:${r.ip}`] : null);
    if (r.reachable === false) {
      if (known && r.failCount < deadAfter) { r.code = known.code; r.source = "cache"; stats.cache++; stats.grace++; }
      else r.dead = true;
      return;
    }
    if (fresh(cache[nodeKey(i)], IP_TTL)) { r.code = cache[nodeKey(i)].code; r.source = "cache"; stats.cache++; return; }
    if (!r.ip) return;
    if (fresh(cache[`ip:${r.ip}`], IP_TTL)) { r.code = cache[`ip:${r.ip}`].code; r.source = "ip"; stats.ip++; return; }
    needIp.push(i);
  });
  if (needIp.length) {
    const found = await lookupIps(needIp.map((i) => results[i].ip));
    for (const i of needIp) {
      const code = found.get(results[i].ip);
      if (code) { results[i].code = code; results[i].source = "ip"; stats.ip++; cache[`ip:${results[i].ip}`] = { code, at: Date.now() }; }
    }
  }

  for (const r of results) {
    if (r.code || r.reachable === true) continue;
    r.drop = true;
    r.reason = r.dead ? "dead" : "unknown";
    if (r.dead) stats.dead++; else stats.unknown++;
  }
  stats.none = results.filter((r) => !r.code).length;
  for (const key of Object.keys(cache)) if (now - Number(cache[key]?.at || 0) > CACHE_KEEP) delete cache[key];
  writeJsonSafe(cacheFile, cache);
  return { results, stats };
}

/* ------------------------------------------------------------------ */
/* Glue for the subscription pipeline (update.js)                      */
/* ------------------------------------------------------------------ */

const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

function getConfigArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.configs)) return data.configs;
  if (Array.isArray(data?.servers)) return data.servers;
  return [];
}

function dialerOf(outbound) {
  const tag = outbound?.streamSettings?.sockopt?.dialerProxy;
  return typeof tag === "string" && tag ? tag : null;
}

/**
 * Proxy nodes of one config. An outbound that is only used as somebody's
 * dialerProxy is not a node of its own: it travels as a dependency.
 */
function nodesOfConfig(config) {
  const outbounds = Array.isArray(config?.outbounds)
    ? config.outbounds
    : config?.protocol
      ? [config]
      : [];

  const byTag = new Map();
  for (const outbound of outbounds) {
    if (outbound && typeof outbound.tag === "string") byTag.set(outbound.tag, outbound);
  }

  const chained = new Set();
  const nodes = outbounds
    .filter((outbound) => PROXY_PROTOCOLS.has(String(outbound?.protocol ?? "").toLowerCase()))
    .map((outbound) => {
      const deps = [];
      const seen = new Set();
      let tag = dialerOf(outbound);

      while (tag && byTag.has(tag) && !seen.has(tag)) {
        seen.add(tag);
        const dep = byTag.get(tag);
        deps.push(dep);
        chained.add(tag);
        tag = dialerOf(dep);
      }

      return { outbound, deps };
    });

  return nodes.filter((node) => !chained.has(node.outbound.tag));
}

function sameNodeKey(node) {
  const { tag, ...rest } = node.outbound;
  return JSON.stringify([rest, node.deps]);
}

/**
 * Detects the country of every config.
 * Returns { countries: Map<configIndex, {code, source}>, dead: Set<configIndex> }.
 */
export async function lookupGeoIPCountries(input, { cacheFile, overridesFile } = {}) {
  const configs = getConfigArray(input);
  const nodes = [];
  const indexByKey = new Map();

  const configNodeIndexes = configs.map((config) =>
    nodesOfConfig(config).map((node) => {
      const key = sameNodeKey(node);
      if (!indexByKey.has(key)) {
        indexByKey.set(key, nodes.length);
        nodes.push(node);
      }
      return indexByKey.get(key);
    })
  );

  const countries = new Map();
  const dead = new Set();

  if (nodes.length === 0) {
    console.log("[Geo] No proxy outbounds found; keeping the existing country labels.");
    return { countries, dead };
  }

  console.log(`[Geo] Checking ${nodes.length} unique nodes from ${configs.length} configs.`);

  const { results, stats } = await resolveGeo(nodes, { cacheFile, overridesFile });

  console.log(
    `[Geo] override=${stats.override} exit=${stats.exit} cache=${stats.cache} ip=${stats.ip} ` +
    `none=${stats.none} | xray ${stats.xrayUsed ? `ok=${stats.xrayOk} fail=${stats.xrayFail}` : "off"}`
  );

  // A node is removed only after several failed checks in a row (kept in the
  // cache between runs) and never when most nodes fail at once — that looks
  // like a problem with the runner's network, not with the servers.
  const deadAfter = Math.max(1, Number(process.env.GEO_DEAD_AFTER || 2));
  const checked = stats.xrayOk + stats.xrayFail;
  const massFailure = checked >= 4 && stats.xrayFail / checked > 0.6;

  if (massFailure) {
    console.log("[Geo] Most nodes failed the Xray check at once; not removing anything this run.");
  }

  configNodeIndexes.forEach((indexes, configIndex) => {
    if (indexes.length === 0) return;

    const found = indexes.map((i) => results[i]).filter((r) => r.code);
    const codes = new Set(found.map((r) => r.code));

    if (codes.size === 1) {
      const strongest = found.find((r) => r.source !== "ip") ?? found[0];
      countries.set(configIndex, { code: strongest.code, source: strongest.source });
    } else if (codes.size > 1) {
      console.log(`[Geo] Config ${configIndex + 1} has mixed exit countries (${[...codes].join(", ")}); keeping its original label.`);
    }

    const allDead = indexes.every((i) => results[i].dead && results[i].failCount >= deadAfter);
    if (allDead && !massFailure) dead.add(configIndex);
  });

  console.log(`[Geo] Countries resolved for ${countries.size} of ${configs.length} configs; ${dead.size} dead.`);

  return { countries, dead };
}

function hasOwnCountry(config) {
  if (typeof config?.countryCode === "string" && /^[A-Za-z]{2}$/.test(config.countryCode.trim())) return true;

  const remark = String(config?.remarks ?? config?.remark ?? config?.name ?? "");
  return FLAG_RE.test(remark);
}

/**
 * Writes detected country codes into the configs and drops dead ones.
 * A code that only comes from the endpoint IP (not from a real exit check)
 * never overrides a country the config already states about itself.
 * Returns the input with the dead configs removed.
 */
export function applyGeoIPCountries(input, geo) {
  const configs = getConfigArray(input);
  let applied = 0;

  configs.forEach((config, index) => {
    const found = geo.countries.get(index);
    if (!config || !found) return;
    if (found.source === "ip" && hasOwnCountry(config)) return;

    config.countryCode = found.code;
    applied++;
  });

  const kept = configs.filter((_, index) => !geo.dead.has(index));

  console.log(`[Geo] Applied country codes to ${applied} configs; removed ${configs.length - kept.length} dead.`);

  if (Array.isArray(input)) return kept;

  const key = Array.isArray(input?.configs) ? "configs" : "servers";
  return { ...input, [key]: kept };
                                                                                                                }
