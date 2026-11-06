import fs from "node:fs/promises";
import path from "node:path";

export const MAINTENANCE_FLAG_FILE = "public/maintenance.json";
export const MAINTENANCE_CONFIG_FILE = "data/maintenance-config.json";

async function readJson(root, file) {
  let text;

  try {
    text = await fs.readFile(path.join(root, file), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }

  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`${file}: некорректный JSON (${error.message})`);
  }
}

export async function readMaintenance(root) {
  const data = await readJson(root, MAINTENANCE_FLAG_FILE);

  if (data === undefined) return { enabled: false };

  if (typeof data?.maintenance !== "boolean") {
    throw new Error(`${MAINTENANCE_FLAG_FILE}: поле "maintenance" должно быть true или false (без кавычек)`);
  }

  return { enabled: data.maintenance };
}

export async function loadMaintenanceConfig(root) {
  const config = await readJson(root, MAINTENANCE_CONFIG_FILE);

  if (!config || typeof config !== "object" || Array.isArray(config) || !Array.isArray(config.outbounds)) {
    throw new Error(`${MAINTENANCE_CONFIG_FILE}: не найден конфиг сервера техработ`);
  }

  return config;
}
