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

const bytes = Buffer.from(
  await response.arrayBuffer()
);

console.log(
  `Content-Type: ${
    response.headers.get("content-type") ?? "unknown"
  }`
);

console.log(
  `Downloaded: ${bytes.length} bytes`
);

if (!bytes.length) {
  throw new Error(
    "Downloaded file is empty."
  );
}

/*
 * Пытаемся получить JSON.
 *
 * Если это уже JSON — сразу используем.
 * Если нет — декодируем Base64.
 * Если после декодирования опять не JSON —
 * декодируем ещё раз.
 */

let current = bytes
  .toString("utf8")
  .replace(/^\uFEFF/, "")
  .trim();

let input = null;

for (let attempt = 0; attempt < 10; attempt++) {
  try {
    input = JSON.parse(current);

    console.log(
      `JSON decoded successfully (attempt ${attempt + 1}).`
    );

    break;
  } catch {
    console.log(
      `Not JSON, decoding Base64 (attempt ${attempt + 1})...`
    );
  }

  const clean = current.replace(/\s+/g, "");

  try {
    current = Buffer
      .from(clean, "base64")
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .trim();
  } catch {
    break;
  }

  if (!current) {
    break;
  }
}

if (input === null) {
  console.log("");
  console.log("Decoded content:");
  console.log(current.slice(0, 1000));
  console.log("");

  throw new Error(
    "Could not decode downloaded file into JSON."
  );
}

console.log(
  "Processing VPN configs..."
);

const result =
  transformSubscription(input);

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

await fs.writeFile(
  path.join(
    root,
    "data/subscription.json"
  ),
  serialized,
  "utf8"
);

await fs.writeFile(
  path.join(
    root,
    "public/subscription.json"
  ),
  serialized,
  "utf8"
);

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
console.log(" - data/subscription.json");
console.log(" - public/subscription.json");
console.log(" - data/telegram-state.json");

console.log("");
console.log("Done.");
