import fs from "node:fs/promises";

import { loadIndependentServers } from "./independent.js";

const raw = await fs.readFile("public/subscription.json", "utf8");
const subTxt = await fs.readFile("public/sub.txt", "utf8");

const data = JSON.parse(raw);
const txtData = JSON.parse(subTxt);

const configs = Array.isArray(data) ? data : data.configs ?? data.servers;
const txtConfigs = Array.isArray(txtData)
  ? txtData
  : txtData.configs ?? txtData.servers;

if (!Array.isArray(configs)) {
  throw new Error("Subscription does not contain a config array.");
}

if (configs.length === 0) {
  throw new Error("Subscription contains zero configs.");
}

if (!Array.isArray(txtConfigs) || txtConfigs.length === 0) {
  throw new Error("/sub.txt does not contain a config array.");
}

if (JSON.stringify(data) !== JSON.stringify(txtData)) {
  throw new Error("/sub.txt differs from /subscription.json.");
}

// Independent servers from servers/*.json must sit at the very end, unchanged.
const independent = await loadIndependentServers(process.cwd());
const count = independent.configs.length;

if (count > 0) {
  if (configs.length < count) {
    throw new Error("Subscription is shorter than the independent servers list.");
  }

  const tail = configs.slice(configs.length - count);

  if (JSON.stringify(tail) !== JSON.stringify(independent.configs)) {
    throw new Error("Independent servers are missing or not at the end of the subscription.");
  }
}

const leftovers = configs.filter((config) =>
  /(^|[^a-zа-яё0-9])lte($|[^a-zа-яё0-9])|обход|глушил/i.test(String(config?.remarks ?? ""))
);

// Bypass configs are no longer published; only independent servers may keep such names.
const unexpected = leftovers.filter(
  (config) => !independent.configs.some((item) => item.remarks === config.remarks)
);

if (unexpected.length > 0) {
  throw new Error(`Bypass configs found in the subscription: ${unexpected.map((c) => c.remarks).join(", ")}`);
}

console.log(`Valid subscription: ${configs.length} configs (${count} independent at the end)`);
console.log("Valid /sub.txt: JSON payload matches /subscription.json");
