import fs from "node:fs/promises";
import path from "node:path";

import { getLatestPost } from "./telegram.js";
import { transformSubscription, removeBypassConfigs } from "./transform.js";
import { loadIndependentServers } from "./independent.js";
import { loadSubscription } from "./source.js";
import { readMaintenance, loadMaintenanceConfig } from "./maintenance.js";
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

// Maintenance mode: public/maintenance.json -> { "maintenance": true }.
// The whole list is replaced by one "technical works" server and nothing
// else (Telegram, GeoIP, servers/) is touched until the switch is turned off.
const maintenance = await readMaintenance(root);

if (maintenance.enabled) {
  const maintenanceConfig = await loadMaintenanceConfig(root);
  const maintenancePayload = JSON.stringify([maintenanceConfig], null, 2) + "\n";

  await fs.mkdir(path.join(root, "data"), { recursive: true });
  await fs.mkdir(path.join(root, "public"), { recursive: true });

  await fs.writeFile(path.join(root, "data/subscription.json"), maintenancePayload, "utf8");
  await fs.writeFile(path.join(root, "public/subscription.json"), maintenancePayload, "utf8");
  await fs.writeFile(path.join(root, "public/sub.txt"), maintenancePayload, "utf8");

  console.log("");
  console.log("MAINTENANCE MODE IS ON: the subscription now contains only the maintenance server.");
  console.log("Set \"maintenance\": false in public/maintenance.json to bring the servers back.");
  process.exit(0);
}

const independent = await loadIndependentServers(root);

console.log(
  `Independent servers: ${independent.configs.length} ` +
  `(${independent.files.length} files in servers/)`
);

const post = await getLatestPost(settings.telegram.channel);

console.log(`Latest post: ${post.postId ?? "unknown"}`);
console.log(`HTTP(S) links found: ${post.links.length}`);
console.log(`Selected URL: ${post.sourceUrl}`);

const source = await loadSubscription(post.sourceUrl);

const bypass = removeBypassConfigs(source.data);
let input = bypass.input;

console.log("");
console.log(`Bypass (LTE / обход глушилок) configs removed: ${bypass.removed}`);
console.log("Processing VPN configs...");
console.log("Detecting node countries...");

const geo = await lookupGeoIPCountries(input, {
  cacheFile: path.join(root, "data/geo-cache.json"),
  overridesFile: path.join(root, "geo-overrides.json")
});
input = applyGeoIPCountries(input, geo);

const result = transformSubscription(input);

if (result.configs.length === 0) {
  throw new Error(
    "No configs are left after processing the source; keeping the previous subscription."
  );
}

// Independent servers always go last, exactly as written in servers/*.json.
const finalConfigs = [...result.configs, ...independent.configs];
const output = Array.isArray(input)
  ? finalConfigs
  : {
      ...input,
      configs: finalConfigs,
      ...(Array.isArray(input.servers) ? { servers: finalConfigs } : {})
    };
const serialized = JSON.stringify(output, null, 2) + "\n";

await fs.mkdir(path.join(root, "data"), { recursive: true });
await fs.mkdir(path.join(root, "public"), { recursive: true });

await fs.writeFile(path.join(root, "data/subscription.json"), serialized, "utf8");
await fs.writeFile(path.join(root, "public/subscription.json"), serialized, "utf8");

/*
 * /sub.txt intentionally serves the same JSON payload as /subscription.json.
 * This changes the endpoint URL/headers, not the subscription's data format.
 */
await fs.writeFile(path.join(root, "public/sub.txt"), serialized, "utf8");

await fs.writeFile(
  path.join(root, "data/telegram-state.json"),
  JSON.stringify(
    {
      channel: settings.telegram.channel,
      postId: post.postId,
      telegramUrl: post.sourceUrl,
      actualSourceUrl: source.url,
      finalSourceUrl: source.finalUrl,
      checkedAt: new Date().toISOString(),
      configCount: finalConfigs.length,
      independentServers: independent.configs.length,
      bypassRemoved: bypass.removed,
      geoIPResolved: geo.countries.size,
      geoIPDead: geo.dead.size,
      stats: result.stats
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log("");
console.log(`Configs processed: ${result.configs.length} + ${independent.configs.length} independent`);
console.log("Remarks statistics:", result.stats);
console.log("");
console.log("Files written:");
console.log(" - data/subscription.json");
console.log(" - public/subscription.json");
console.log(" - public/sub.txt");
console.log(" - data/telegram-state.json");
console.log("");
console.log("Done.");
