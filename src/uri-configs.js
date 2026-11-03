// Turns subscription links (vless://, vmess://, trojan://, ss://, hysteria2://)
// into full Xray configs that follow the project's config template, and
// finds such links inside an HTML subscription page.

const SCHEMES = "vless|vmess|trojan|ss|hysteria2|hy2";
const LINK_RE = new RegExp(`(?<![A-Za-z0-9])(?:${SCHEMES})://[^\\s"'<>\\\\]+`, "gi");
const ENCODED_LINK_RE = new RegExp(`(?<![A-Za-z0-9])(?:${SCHEMES})%3A%2F%2F[^\\s"'<>\\\\]+`, "gi");
const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

/* ------------------------------------------------------------------ */
/* Finding links in a page                                             */
/* ------------------------------------------------------------------ */

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
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

function safeDecode(value) {
  try { return decodeURIComponent(value || ""); } catch { return value || ""; }
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

function cleanLink(link) {
  return link.replace(/[),.;]+$/g, "");
}

/** All subscription links that can be found in the text (HTML, JS, base64 blobs). */
export function extractLinks(text) {
  const found = new Set();

  const scan = (chunk) => {
    for (const match of chunk.matchAll(LINK_RE)) found.add(cleanLink(match[0]));

    for (const match of chunk.matchAll(ENCODED_LINK_RE)) {
      const decoded = safeDecode(match[0]);
      if (new RegExp(`^(?:${SCHEMES})://`, "i").test(decoded)) found.add(cleanLink(decoded));
    }
  };

  const entities = decodeEntities(text);
  const variants = new Set([entities, unescapeJs(entities)]);

  for (const variant of variants) {
    scan(variant);

    // Long base64 blobs that hide a list of links.
    for (const match of variant.matchAll(/[A-Za-z0-9+/_=-]{200,}/g)) {
      const decoded = decodeBase64(match[0]);
      if (decoded.includes("://")) scan(decoded);
    }
  }

  // A link cut short by an escape sequence is a prefix of the full one: keep the
  // full one. The order of first appearance on the page is preserved.
  const all = [...found];

  return all.filter(
    (link) => !all.some((other) => other.length > link.length && other.startsWith(link))
  );
}

/* ------------------------------------------------------------------ */
/* Link -> outbound                                                    */
/* ------------------------------------------------------------------ */

function truthy(value) {
  return /^(?:1|true|yes)$/i.test(String(value ?? ""));
}

function parseJsonParam(value) {
  if (!value) return undefined;

  const text = String(value).trim();

  for (const candidate of [text, safeDecode(text)]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }

  return undefined;
}

function makeStream(network, security, p, host) {
  const net = network === "h2" ? "http"
    : network === "splithttp" ? "xhttp"
    : network === "raw" ? "tcp"
    : network;

  const stream = { network: net, security: security === "tls" || security === "reality" ? security : "none" };

  if (security === "tls") {
    stream.tlsSettings = {
      serverName: p.sni || p.host || host,
      fingerprint: p.fp || "chrome",
      show: false
    };

    if (p.alpn) stream.tlsSettings.alpn = String(p.alpn).split(",");
    if (truthy(p.allowInsecure)) stream.tlsSettings.allowInsecure = true;
  }

  if (security === "reality") {
    stream.realitySettings = {
      serverName: p.sni || host,
      fingerprint: p.fp || "chrome",
      show: false,
      publicKey: p.pbk || "",
      shortId: p.sid || ""
    };

    if (p.spx) stream.realitySettings.spiderX = p.spx;
    if (p.pqv) stream.realitySettings.mldsa65Verify = p.pqv;
  }

  if (net === "ws") {
    stream.wsSettings = { path: p.path || "/", headers: { Host: p.host || p.sni || host } };
  }

  if (net === "grpc") {
    stream.grpcSettings = { serviceName: p.serviceName || p.path || "" };
    if (p.authority) stream.grpcSettings.authority = p.authority;
    if (p.mode === "multi") stream.grpcSettings.multiMode = true;
  }

  if (net === "http") {
    stream.httpSettings = { path: p.path || "/" };
    if (p.host) stream.httpSettings.host = String(p.host).split(",");
  }

  if (net === "httpupgrade") {
    stream.httpupgradeSettings = { path: p.path || "/", host: p.host || p.sni || host };
  }

  if (net === "xhttp") {
    const xhttp = { path: p.path || "/" };

    if (p.host) xhttp.host = p.host;
    if (p.mode) xhttp.mode = p.mode;

    const extra = parseJsonParam(p.extra);
    if (extra) xhttp.extra = extra;

    stream.xhttpSettings = xhttp;
  }

  if (net === "kcp") {
    stream.kcpSettings = { header: { type: p.headerType || "none" } };
    if (p.seed) stream.kcpSettings.seed = p.seed;
  }

  if (net === "tcp") {
    if (p.headerType === "http") {
      stream.tcpSettings = {
        header: {
          type: "http",
          request: {
            path: String(p.path || "/").split(","),
            headers: { Host: String(p.host || "").split(",").filter(Boolean) }
          }
        }
      };
    } else if (security === "reality") {
      stream.tcpSettings = { header: { type: "none" } };
    }
  }

  return stream;
}

const MUX = { enabled: false, concurrency: -1, xudpConcurrency: 8, xudpProxyUDP443: "" };

function paramsOf(url) {
  return Object.fromEntries(url.searchParams.entries());
}

function bareHost(url) {
  return url.hostname.replace(/^\[|\]$/g, "");
}

/** One link -> { name, outbound } (the outbound without its tag). */
export function parseLink(line) {
  const scheme = line.slice(0, line.indexOf("://")).toLowerCase();

  if (scheme === "vmess") {
    const encoded = line.split("#")[0].slice("vmess://".length);
    const data = JSON.parse(decodeBase64(encoded));

    if (!data.add || !data.port || !data.id) throw new Error("incomplete vmess link");

    const tls = data.tls === "tls";
    const params = {
      sni: data.sni || data.host,
      host: data.host,
      path: data.path,
      fp: data.fp,
      serviceName: data.path,
      alpn: data.alpn,
      headerType: data.type,
      allowInsecure: data.allowInsecure
    };

    return {
      name: safeDecode(line.split("#").slice(1).join("#")) || data.ps || data.add,
      outbound: {
        protocol: "vmess",
        mux: MUX,
        settings: {
          vnext: [{
            address: data.add,
            port: Number(data.port),
            users: [{ id: data.id, alterId: Number(data.aid || 0), security: data.scy || "auto", level: 8 }]
          }]
        },
        streamSettings: makeStream(data.net || "tcp", tls ? "tls" : "none", params, data.add)
      }
    };
  }

  if (scheme === "ss") {
    const [beforeHash, ...hash] = line.split("#");
    let body = beforeHash.slice("ss://".length);

    if (!body.includes("@")) {
      const decoded = decodeBase64(body.split("?")[0]);
      if (decoded.includes("@")) body = decoded;
    }

    const url = new URL(`ss://${body}`);
    let user = safeDecode(url.username);

    if (!user.includes(":")) user = decodeBase64(user);

    const separator = user.indexOf(":");
    if (separator <= 0) throw new Error("incomplete shadowsocks link");

    return {
      name: safeDecode(hash.join("#")) || url.hostname,
      outbound: {
        protocol: "shadowsocks",
        mux: MUX,
        settings: {
          servers: [{
            address: bareHost(url),
            port: Number(url.port),
            method: user.slice(0, separator),
            password: user.slice(separator + 1),
            level: 8
          }]
        },
        streamSettings: { network: "tcp", security: "none" }
      }
    };
  }

  if (!["vless", "trojan", "hysteria2", "hy2"].includes(scheme)) {
    throw new Error(`unsupported link type: ${scheme}`);
  }

  const url = new URL(line);
  const p = paramsOf(url);
  const host = bareHost(url);
  const port = Number(url.port || 443);
  const name = safeDecode(url.hash.slice(1)) || host;

  if (!host || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("link without a valid address or port");
  }

  if (scheme === "vless") {
    const flow = p.flow || "";
    const security = p.security || "none";
    const settings = {
      vnext: [{
        address: host,
        port,
        users: [{
          id: safeDecode(url.username),
          encryption: p.encryption || "none",
          flow,
          level: 8,
          security: "auto"
        }]
      }]
    };

    if (p.packetEncoding) settings.packetEncoding = p.packetEncoding;

    const outbound = { protocol: "vless" };

    // xtls-rprx-vision does not work together with mux.
    if (!/vision/i.test(flow)) outbound.mux = MUX;

    outbound.settings = settings;
    outbound.streamSettings = makeStream(p.type || "tcp", security, p, host);

    return { name, outbound };
  }

  if (scheme === "trojan") {
    return {
      name,
      outbound: {
        protocol: "trojan",
        mux: MUX,
        settings: { servers: [{ address: host, port, password: safeDecode(url.username), level: 8 }] },
        streamSettings: makeStream(p.type || "tcp", p.security || "tls", p, host)
      }
    };
  }

  // hysteria2 / hy2
  const tlsSettings = { serverName: p.sni || host, show: false };

  if (truthy(p.insecure) || truthy(p.allowInsecure)) tlsSettings.allowInsecure = true;
  if (p.alpn) tlsSettings.alpn = String(p.alpn).split(",");

  return {
    name,
    outbound: {
      protocol: "hysteria",
      settings: { address: host, port, version: 2 },
      streamSettings: {
        network: "hysteria",
        security: "tls",
        hysteriaSettings: { version: 2, auth: safeDecode(url.username) },
        tlsSettings
      }
    }
  };
}

/* ------------------------------------------------------------------ */
/* outbound -> full config (the project's template)                    */
/* ------------------------------------------------------------------ */

function flagCountryCode(text) {
  const match = String(text ?? "").match(FLAG_RE);
  if (!match) return null;

  const [first, second] = [...match[0]].map((ch) => String.fromCharCode(ch.codePointAt(0) - 0x1F1E6 + 65));
  return `${first}${second}`;
}

function sniffing() {
  return { enabled: true, destOverride: ["http", "tls"], routeOnly: false };
}

export function buildConfig(name, outbound) {
  const { protocol, mux, settings, streamSettings } = outbound;

  const proxy = { tag: "proxy", protocol };
  if (mux) proxy.mux = mux;
  proxy.settings = settings;
  proxy.streamSettings = streamSettings;

  const config = {
    log: { access: "", error: "", loglevel: "warning" },
    remarks: name,
    inbounds: [
      {
        listen: "0.0.0.0",
        port: 10808,
        protocol: "socks",
        settings: { auth: "noauth", udp: true, allowTransparent: false },
        sniffing: sniffing(),
        tag: "socks"
      },
      {
        listen: "0.0.0.0",
        port: 10809,
        protocol: "http",
        settings: { auth: "noauth", udp: true, allowTransparent: false },
        sniffing: sniffing(),
        tag: "http"
      }
    ],
    outbounds: [proxy],
    dns: { servers: ["1.1.1.1", "8.8.8.8"] },
    routing: { domainStrategy: "AsIs", rules: [] }
  };

  const code = flagCountryCode(name);
  if (code) config.countryCode = code;

  return config;
}

/** Links -> configs. Returns { configs, stats } and never throws on a bad link. */
export function configsFromLinks(links) {
  const configs = [];
  const seen = new Set();
  const stats = { links: links.length, converted: 0, failed: 0, duplicates: 0, schemes: {} };

  for (const link of links) {
    const scheme = link.slice(0, link.indexOf("://")).toLowerCase();
    stats.schemes[scheme] = (stats.schemes[scheme] || 0) + 1;

    try {
      const { name, outbound } = parseLink(link);
      const config = buildConfig(name, outbound);
      const key = JSON.stringify(config.outbounds);

      if (seen.has(key)) {
        stats.duplicates++;
        continue;
      }

      seen.add(key);
      configs.push(config);
      stats.converted++;
    } catch (error) {
      stats.failed++;
      console.log(`Skipped a ${scheme} link: ${error.message}`);
    }
  }

  return { configs, stats };
}
