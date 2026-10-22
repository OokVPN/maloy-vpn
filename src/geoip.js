import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GEOIP_API = "https://free.freeipapi.com/api/v1/json/";
const FALLBACK_GEOIP_API = "https://ipwho.is/";
const XRAY_RELEASE_API = "https://api.github.com/repos/XTLS/Xray-core/releases/latest";
const XRAY_FALLBACK_VERSION = "26.9.9";
const IP_CHECK_URLS = [
  "https://api.ipify.org",
  "https://ifconfig.me/ip"
];

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
  const type = net.isIP(address);

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
    ) {
      return false;
    }

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

function getProxyOutbounds(config) {
  const outbounds = Array.isArray(config?.outbounds)
    ? config.outbounds
    : config?.protocol
      ? [config]
      : [];

  return outbounds.filter(outbound =>
    PROXY_PROTOCOLS.has(String(outbound?.protocol ?? "").toLowerCase())
  );
}

function outboundKey(outbound) {
  const copy = JSON.parse(JSON.stringify(outbound));
  delete copy.tag;
  return JSON.stringify(copy);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function canRunXray(command) {
  return new Promise(resolve => {
    let child;

    try {
      child = spawn(command, ["version"], {
        stdio: "ignore",
        windowsHide: true
      });
    } catch {
      resolve(false);
      return;
    }

    child.once("error", () => resolve(false));
    child.once("close", code => resolve(code === 0));
  });
}

async function downloadXray() {
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error(
      "Automatic Xray download supports Linux x64. Install Xray and set XRAY_PATH."
    );
  }

  const directory = path.join(os.tmpdir(), "ookvpn-xray-runtime");
  const binaryPath = path.join(directory, "xray");
  const zipPath = path.join(directory, "xray.zip");

  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(binaryPath);
    if (await canRunXray(binaryPath)) return binaryPath;
  } catch {
  }

  let downloadUrl = null;
  let releaseTag = null;

  try {
    const releaseResponse = await fetch(XRAY_RELEASE_API, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "OokVPN-GeoIP"
      },
      signal: AbortSignal.timeout(12000)
    });

    if (releaseResponse.ok) {
      const release = await releaseResponse.json();
      const asset = release.assets?.find(item => item.name === "Xray-linux-64.zip");

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
    headers: { "user-agent": "OokVPN-GeoIP" },
    signal: AbortSignal.timeout(60000)
  });

  if (!binaryResponse.ok) {
    throw new Error(`Could not download Xray: HTTP ${binaryResponse.status}`);
  }

  await fs.writeFile(zipPath, Buffer.from(await binaryResponse.arrayBuffer()));

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
    await fs.rm(zipPath, { force: true });
  }

  await fs.chmod(binaryPath, 0o755);

  if (!(await canRunXray(binaryPath))) {
    throw new Error("Downloaded Xray executable did not start successfully.");
  }

  return binaryPath;
}

async function ensureXray() {
  if (process.env.XRAY_PATH && await canRunXray(process.env.XRAY_PATH)) {
    return process.env.XRAY_PATH;
  }

  if (await canRunXray("xray")) return "xray";

  return downloadXray();
}

async function getFreePort() {
  const server = net.createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = address.port;

  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForPort(port, processRef, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (processRef.exitCode !== null || processRef.signalCode !== null) {
      throw new Error("Xray exited before its SOCKS inbound became ready.");
    }

    const open = await new Promise(resolve => {
      const socket = net.createConnection({
        host: "127.0.0.1",
        port
      });

      socket.setTimeout(350);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.once("error", () => resolve(false));
    });

    if (open) return;
    await delay(120);
  }

  throw new Error("Timed out waiting for Xray SOCKS inbound.");
}

async function curlThroughXray(port, url) {
  const proxy = `socks5h://127.0.0.1:${port}`;
  const result = await execFileAsync(
    "curl",
    [
      "--fail",
      "--silent",
      "--show-error",
      "--max-time",
      "7",
      "--proxy",
      proxy,
      url
    ],
    {
      timeout: 9000,
      maxBuffer: 4096,
      windowsHide: true
    }
  );

  return String(result.stdout ?? "").trim();
}

async function requestExitIp(port) {
  for (const url of IP_CHECK_URLS) {
    try {
      const output = await curlThroughXray(port, url);
      const ip = output.split(/\s+/)[0].trim();

      if (isPublicIp(ip)) return ip;
    } catch {
    }
  }

  throw new Error("Could not read the public exit IP through the proxy.");
}

async function probeOutbound(xrayPath, outbound, index, tempDirectory) {
  const port = await getFreePort();
  const configPath = path.join(
    tempDirectory,
    `xray-probe-${index}-${port}.json`
  );

  const selectedOutbound = {
    ...JSON.parse(JSON.stringify(outbound)),
    tag: "geoip-proxy"
  };

  const testConfig = {
    log: { loglevel: "none" },
    inbounds: [
      {
        tag: "geoip-socks",
        listen: "127.0.0.1",
        port,
        protocol: "socks",
        settings: {
          auth: "noauth",
          udp: false
        }
      }
    ],
    outbounds: [selectedOutbound]
  };

  await fs.writeFile(configPath, JSON.stringify(testConfig), "utf8");

  let processRef = null;
  let stderr = "";

  try {
    processRef = spawn(xrayPath, ["run", "-c", configPath], {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true
    });

    processRef.stderr?.on("data", chunk => {
      if (stderr.length < 5000) stderr += chunk.toString();
    });

    await waitForPort(port, processRef);
    return await requestExitIp(port);
  } catch (error) {
    const detail = stderr.trim().split("\n").slice(-2).join(" | ");
    console.log(
      `[Xray] Outbound ${index + 1} failed: ${error.message}${detail ? ` (${detail})` : ""}`
    );
    return null;
  } finally {
    if (processRef && processRef.exitCode === null && processRef.signalCode === null) {
      processRef.kill("SIGTERM");
      await delay(150);
      if (processRef.exitCode === null && processRef.signalCode === null) {
        processRef.kill("SIGKILL");
      }
    }

    await fs.rm(configPath, { force: true });
  }
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      () => worker()
    )
  );

  return results;
}

async function lookupCountry(ip) {
  try {
    const response = await fetch(
      GEOIP_API + encodeURIComponent(ip),
      {
        headers: {
          accept: "application/json",
          "user-agent": "OokVPN-GeoIP"
        },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (response.ok) {
      const data = await response.json();
      const countryCode = String(data?.countryCode ?? "").trim().toUpperCase();
      const countryName = String(data?.countryName ?? "").trim();

      if (/^[A-Z]{2}$/.test(countryCode) && countryName) {
        return { countryCode, countryName, source: "freeipapi" };
      }
    }
  } catch {
  }

  try {
    const response = await fetch(
      FALLBACK_GEOIP_API + encodeURIComponent(ip),
      {
        headers: {
          accept: "application/json",
          "user-agent": "OokVPN-GeoIP"
        },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const countryCode = String(data?.country_code ?? "").trim().toUpperCase();
    const countryName = String(data?.country ?? "").trim();

    if (data?.success !== true || !/^[A-Z]{2}$/.test(countryCode) || !countryName) {
      return null;
    }

    return { countryCode, countryName, source: "ipwho.is" };
  } catch {
    return null;
  }
}

export async function lookupGeoIPCountries(input) {
  const configs = getConfigArray(input);
  const configOutboundKeys = new Map();
  const uniqueOutbounds = new Map();

  for (let configIndex = 0; configIndex < configs.length; configIndex++) {
    const outbounds = getProxyOutbounds(configs[configIndex]);
    const keys = [];

    for (const outbound of outbounds) {
      const key = outboundKey(outbound);
      keys.push(key);

      if (!uniqueOutbounds.has(key)) {
        uniqueOutbounds.set(key, outbound);
      }
    }

    configOutboundKeys.set(configIndex, keys);
  }

  if (uniqueOutbounds.size === 0) {
    console.log("[Xray] No proxy outbounds found; using the existing country labels.");
    return new Map();
  }

  let xrayPath;

  try {
    xrayPath = await ensureXray();
  } catch (error) {
    console.log(`[Xray] Could not start Xray: ${error.message}`);
    console.log("[GeoIP] Keeping existing country labels instead of guessing from endpoint IPs.");
    return new Map();
  }

  console.log(`[Xray] Checking ${uniqueOutbounds.size} unique outbound configurations for their real exit IPs.`);

  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "ookvpn-geoip-probe-")
  );

  const outboundEntries = [...uniqueOutbounds.entries()];
  const exitIpByOutbound = new Map();

  try {
    const probed = await mapLimit(outboundEntries, 3, async ([key, outbound], index) => {
      const exitIp = await probeOutbound(xrayPath, outbound, index, tempDirectory);

      if (exitIp) {
        console.log(`[Xray] Outbound ${index + 1}/${outboundEntries.length}: exit IP ${exitIp}`);
      }

      return { key, exitIp };
    });

    for (const item of probed) {
      exitIpByOutbound.set(item.key, item.exitIp);
    }
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }

  const uniqueExitIps = [...new Set(
    [...exitIpByOutbound.values()].filter(Boolean)
  )];

  const countryByExitIp = new Map();

  for (let index = 0; index < uniqueExitIps.length; index++) {
    const ip = uniqueExitIps[index];

    if (index > 0) await delay(1300);

    const country = await lookupCountry(ip);
    countryByExitIp.set(ip, country);

    if (country) {
      console.log(
        `[GeoIP] Exit ${ip} -> ${country.countryName} [${country.countryCode}] via ${country.source}`
      );
    } else {
      console.log(`[GeoIP] Lookup failed for exit IP ${ip}`);
    }
  }

  const result = new Map();
  let ambiguousConfigs = 0;

  for (const [configIndex, keys] of configOutboundKeys) {
    const countries = [];

    for (const key of keys) {
      const exitIp = exitIpByOutbound.get(key);
      if (!exitIp) continue;

      const country = countryByExitIp.get(exitIp);
      if (country?.countryCode) countries.push(country);
    }

    if (countries.length === 0) continue;

    const codes = new Set(countries.map(country => country.countryCode));

    if (codes.size !== 1) {
      ambiguousConfigs++;
      const summary = [...codes].join(", ");
      console.log(
        `[GeoIP] Config ${configIndex + 1} has mixed exit countries (${summary}); keeping its original label.`
      );
      continue;
    }

    result.set(configIndex, countries[0]);
  }

  console.log(
    `[GeoIP] Verified ${result.size} of ${configs.length} configs; ${uniqueExitIps.length} distinct exit IPs; ${ambiguousConfigs} ambiguous configs.`
  );

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

  console.log(`[GeoIP] Applied verified country codes to ${updated} configs.`);
  return input;
  }
