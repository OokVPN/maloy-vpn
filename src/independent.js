import fs from "node:fs/promises";
import path from "node:path";

export const SERVERS_DIR = "servers";
export const ORDER_FILE = "other-order.json";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeName(value) {
  return String(value ?? "").trim().toLowerCase();
}

function stripJson(value) {
  return normalizeName(value).replace(/\.json$/, "");
}

function remarkOf(config) {
  const value = config?.remarks ?? config?.remark ?? config?.name;
  return typeof value === "string" ? value.trim() : "";
}

async function readJsonFile(file, label) {
  let text;

  try {
    text = await fs.readFile(file, "utf8");
  } catch (error) {
    throw new Error(`${label}: не удалось прочитать файл (${error.message})`);
  }

  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`${label}: некорректный JSON (${error.message})`);
  }
}

/** A file may hold one config, an array of configs, or { configs: [...] } / { servers: [...] }. */
function configsFromFile(data, label) {
  let list;

  if (Array.isArray(data)) list = data;
  else if (Array.isArray(data?.configs)) list = data.configs;
  else if (Array.isArray(data?.servers)) list = data.servers;
  else if (isPlainObject(data)) list = [data];
  else throw new Error(`${label}: ожидался объект конфига или массив конфигов`);

  list.forEach((item, index) => {
    if (!isPlainObject(item)) {
      throw new Error(`${label}: элемент ${index + 1} не является объектом конфига`);
    }
  });

  return list;
}

async function readOrder(dir) {
  const file = path.join(dir, ORDER_FILE);

  try {
    await fs.access(file);
  } catch {
    return [];
  }

  const data = await readJsonFile(file, `${SERVERS_DIR}/${ORDER_FILE}`);
  const list = Array.isArray(data) ? data : Array.isArray(data?.order) ? data.order : null;

  if (!list || list.some((item) => typeof item !== "string")) {
    throw new Error(`${SERVERS_DIR}/${ORDER_FILE}: ожидался массив строк (имена файлов или remarks)`);
  }

  return list;
}

/**
 * Loads independent servers from <root>/servers/*.json.
 *
 * They are never filtered, renamed or re-geolocated: whatever is in the files
 * ends up at the bottom of the subscription. A broken file stops the update
 * on purpose, so a server can't silently vanish from the published list.
 *
 * Order: entries of servers/other-order.json first (file name with or without
 * ".json", or the remarks of a single config), then everything else by file name.
 */
export async function loadIndependentServers(root) {
  const dir = path.join(root, SERVERS_DIR);

  let names;
  try {
    names = await fs.readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT") return { configs: [], files: [] };
    throw error;
  }

  const files = names
    .filter((name) => name.toLowerCase().endsWith(".json") && name.toLowerCase() !== ORDER_FILE)
    .sort((a, b) => a.localeCompare(b, "en"));

  const items = [];

  for (const name of files) {
    const label = `${SERVERS_DIR}/${name}`;
    const data = await readJsonFile(path.join(dir, name), label);
    const list = configsFromFile(data, label);
    const stem = name.replace(/\.json$/i, "");

    list.forEach((config, index) => {
      const copy = JSON.parse(JSON.stringify(config));

      if (!remarkOf(copy)) {
        copy.remarks = list.length > 1 ? `${stem} #${index + 1}` : stem;
      }

      items.push({ file: name, config: copy, used: false });
    });
  }

  const order = await readOrder(dir);
  const sorted = [];

  for (const entry of order) {
    const wanted = normalizeName(entry);
    const wantedStem = stripJson(entry);
    let matched = 0;

    for (const item of items) {
      if (item.used) continue;
      if (stripJson(item.file) === wantedStem || normalizeName(remarkOf(item.config)) === wanted) {
        item.used = true;
        sorted.push(item);
        matched++;
      }
    }

    if (matched === 0) {
      console.warn(`${SERVERS_DIR}/${ORDER_FILE}: «${entry}» не найден среди серверов`);
    }
  }

  for (const item of items) {
    if (!item.used) sorted.push(item);
  }

  return {
    configs: sorted.map((item) => item.config),
    files
  };
}
