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

console.log("=== Telegram VPN Sync ===");
console.log(`Channel: ${settings.telegram.channel}`);

const post = await getLatestPost(
  settings.telegram.channel
);

console.log(`Latest post: ${post.postId ?? "unknown"}`);
console.log(`HTTP(S) links found: ${post.links.length}`);
console.log(`Selected URL: ${post.sourceUrl}`);

console.log("Downloading selected URL...");

const response = await fetch(post.sourceUrl, {
  redirect: "follow",
  headers: {
    "user-agent": "Mozilla/5.0 (compatible; Telegram-VPN-Sync/2.0)",
    "accept": "*/*"
  }
});

if (!response.ok) {
  throw new Error(
    `Subscription URL returned HTTP ${response.status}`
  );
}

const bytes = Buffer.from(
  await response.arrayBuffer()
);

if (!bytes.length) {
  throw new Error("Downloaded subscription is empty.");
}

const text = bytes
  .toString("utf8")
  .replace(/^\uFEFF/, "");

let input;

try {
  input = JSON.parse(text);
} catch {
  // Optional fallback for a base64 encoded JSON response.
  const compact = text.replace(/\s+/g, "");

  try {
    const decoded = Buffer
      .from(compact, "base64")
      .toString("utf8")
      .replace(/^\uFEFF/, "");

    input = JSON.parse(decoded);
  } catch {
    throw new Error(
      "Downloaded file is not JSON or base64-encoded JSON."
    );
  }
}

const result = transformSubscription(input);

const output = Array.isArray(input)
  ? result.configs
  : {
      ...input,
      configs: result.configs
    };

const serialized =
  JSON.stringify(output, null, 2) + "\n";

await fs.mkdir(
  path.join(root, "data"),
  { recursive: true }
);

await fs.mkdir(
  path.join(root, "public"),
  { recursive: true }
);

await fs.writeFile(
  path.join(root, "data/subscription.json"),
  serialized
);

await fs.writeFile(
  path.join(root, "public/subscription.json"),
  serialized
);

await fs.writeFile(
  path.join(root, "data/telegram-state.json"),
  JSON.stringify(
    {
      channel: settings.telegram.channel,
      postId: post.postId,
      sourceUrl: post.sourceUrl,
      checkedAt: new Date().toISOString(),
      configCount: result.configs.length,
      stats: result.stats
    },
    null,
    2
  ) + "\n"
);

console.log("");
console.log(`Configs: ${result.configs.length}`);
console.log("Remarks stats:", result.stats);
console.log("Done.");
