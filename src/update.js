import fs from "node:fs/promises";
import path from "node:path";

import { getLatestPost } from "./telegram.js";
import { transformSubscription } from "./transform.js";

const root = process.cwd();

const settings = JSON.parse(
  await fs.readFile(
    path.join(root, "sources.json"),
    "utf8"
  )
);

console.log("================================");
console.log(" Telegram VPN Sync");
console.log("================================");

console.log(
  `Channel: ${settings.telegram.channel}`
);

// Получаем последний пост Telegram
const post = await getLatestPost(
  settings.telegram.channel
);

console.log(
  `Latest post: ${post.postId ?? "unknown"}`
);

console.log(
  `HTTP(S) links found: ${post.links.length}`
);

console.log(
  `Selected URL: ${post.sourceUrl}`
);

console.log("Downloading selected URL...");

// Скачиваем файл
const response = await fetch(post.sourceUrl, {
  redirect: "follow",
  headers: {
    "user-agent":
      "Mozilla/5.0 (compatible; Telegram-VPN-Sync/2.0)",
    accept: "*/*"
  }
});

if (!response.ok) {
  throw new Error(
    `Source returned HTTP ${response.status}`
  );
}

const contentType =
  response.headers.get("content-type") ?? "unknown";

const bytes = Buffer.from(
  await response.arrayBuffer()
);

console.log(
  `Content-Type: ${contentType}`
);

console.log(
  `Downloaded: ${bytes.length} bytes`
);

if (!bytes.length) {
  throw new Error(
    "Downloaded file is empty."
  );
}

// Расширение файла не имеет значения.
// Сначала пробуем обычный JSON.
const text = bytes
  .toString("utf8")
  .replace(/^\uFEFF/, "");

let input;

try {
  input = JSON.parse(text);

  console.log(
    "Downloaded file parsed as JSON."
  );
} catch {
  // Если это base64 с JSON внутри
  try {
    const compact = text.replace(/\s+/g, "");

    const decoded = Buffer
      .from(compact, "base64")
      .toString("utf8")
      .replace(/^\uFEFF/, "");

    input = JSON.parse(decoded);

    console.log(
      "Downloaded file parsed as base64-encoded JSON."
    );
  } catch {
    console.log(
      "First 300 characters of downloaded file:"
    );

    console.log(
      text.slice(0, 300)
    );

    throw new Error(
      "Downloaded file does not contain JSON or base64-encoded JSON."
    );
  }
}

console.log("Processing VPN configs...");

// Преобразуем remarks
const result =
  transformSubscription(input);

// Сохраняем структуру исходного JSON
const output = Array.isArray(input)
  ? result.configs
  : {
      ...input,
      configs: result.configs
    };

const serialized =
  JSON.stringify(
    output,
    null,
    2
  ) + "\n";

// Создаём необходимые папки
await fs.mkdir(
  path.join(root, "data"),
  {
    recursive: true
  }
);

await fs.mkdir(
  path.join(root, "public"),
  {
    recursive: true
  }
);

// Сохраняем основную подписку
await fs.writeFile(
  path.join(
    root,
    "data/subscription.json"
  ),
  serialized,
  "utf8"
);

// Копия для Vercel
await fs.writeFile(
  path.join(
    root,
    "public/subscription.json"
  ),
  serialized,
  "utf8"
);

// Сохраняем состояние Telegram
await fs.writeFile(
  path.join(
    root,
    "data/telegram-state.json"
  ),
  JSON.stringify(
    {
      channel:
        settings.telegram.channel,

      postId:
        post.postId,

      sourceUrl:
        post.sourceUrl,

      checkedAt:
        new Date().toISOString(),

      configCount:
        result.configs.length,

      stats:
        result.stats
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log("");
console.log(
  `Configs processed: ${result.configs.length}`
);

console.log(
  "Remarks statistics:",
  result.stats
);

console.log("");
console.log("Files written:");
console.log(
  " - data/subscription.json"
);
console.log(
  " - public/subscription.json"
);
console.log(
  " - data/telegram-state.json"
);

console.log("");
console.log("Done.");
