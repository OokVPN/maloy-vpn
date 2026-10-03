import * as cheerio from "cheerio";

function channelToPublicUrl(channel) {
  const value = String(channel).trim();

  if (/^https?:\/\/t\.me\/s\//i.test(value)) {
    return value.replace(/\/+$/, "");
  }

  if (/^https?:\/\/t\.me\//i.test(value)) {
    const username = value.split("/").filter(Boolean).pop();
    return `https://t.me/s/${username}`;
  }

  return `https://t.me/s/${value
    .replace(/^@/, "")
    .replace(/^\/+|\/+$/g, "")}`;
}

function isExternalSubscriptionUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    const host = url.hostname.toLowerCase();

    // Не брать Telegram-ссылки
    if (
      host === "t.me" ||
      host === "telegram.me" ||
      host === "telegram.dog"
    ) {
      return false;
    }

    // Не брать Telegram proxy
    if (url.pathname.toLowerCase().startsWith("/proxy")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getLatestPost(channel) {
  const telegramUrl = channelToPublicUrl(channel);

  const response = await fetch(telegramUrl, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; Telegram-VPN-Sync/2.0)"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Telegram returned HTTP ${response.status}`
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const posts = $(".tgme_widget_message");

  if (!posts.length) {
    throw new Error(
      "No public Telegram posts found."
    );
  }

  const post = posts.last();

  const postId =
    post.attr("data-post") ?? null;

  const text = post.text();

  const urls = [];

  // Ссылки из HTML
  post.find("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (href && /^https?:\/\//i.test(href)) {
      urls.push(href);
    }
  });

  // Ссылки, написанные обычным текстом
  const plainUrls =
    text.match(/https?:\/\/[^\s<>"']+/gi) || [];

  urls.push(...plainUrls);

  // Очистка + удаление дублей
  const uniqueUrls = [];

  for (const rawUrl of urls) {
    const url = rawUrl
      .replace(/&amp;/gi, "&")
      .replace(/[),.;!?]+$/g, "");

    if (!uniqueUrls.includes(url)) {
      uniqueUrls.push(url);
    }
  }

  // Берём первую внешнюю HTTP(S)-ссылку.
  // t.me / Telegram proxy сюда не попадут.
  const sourceUrl =
    uniqueUrls.find(isExternalSubscriptionUrl);

  if (!sourceUrl) {
    throw new Error(
      "No external HTTP/HTTPS subscription link found in latest Telegram post."
    );
  }

  return {
    postId,
    text,
    sourceUrl,
    links: uniqueUrls
  };
}
