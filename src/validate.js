import fs from "node:fs/promises";

const raw = await fs.readFile(
  "public/subscription.json",
  "utf8"
);

const data = JSON.parse(raw);

const configs =
  Array.isArray(data)
    ? data
    : data.configs ?? data.servers;

if (!Array.isArray(configs)) {
  throw new Error("Subscription does not contain a config array.");
}

if (configs.length === 0) {
  throw new Error("Subscription contains zero configs.");
}

console.log(`Valid subscription: ${configs.length} configs`);
