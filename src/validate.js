import fs from "node:fs/promises";

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

console.log(`Valid subscription: ${configs.length} configs`);
console.log("Valid /sub.txt: JSON payload matches /subscription.json");
