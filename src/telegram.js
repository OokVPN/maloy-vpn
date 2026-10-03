import * as cheerio from "cheerio";

function channelToPublicUrl(channel) {
  const value = String(channel).trim();

  if (/^https?:\/\/t\.me\/s\//i.test(value)) {
    return value.replace(/\/+$/, "");
  }

  if (/^https?:\/\/t\.me\//i.test(value)) {
    const username = value
      .split("/")
      .filter(Boolean)
      .pop();

    return `https://t.me/s/${username}`;
  }

  return `https://t.me/s/${value
    .replace(/^@/, "")
    .replace(/^\/+|\/+$/g, "")}`;
}

/*
 * Извлекает только настоящую URL-часть.
 *
 * ВАЖНО:
 * Telegram может показать:
 *
 * https://site.com/auto
 * ✈️Телеграм прокси ✅
 *
 * Поэтому нельзя использовать [^\s]+ —
 * он захватит emoji и текст после URL.
 */
function extractUrls(text) {
  const matches =
    text.match(
      /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/gi
    ) || [];

  return matches.map((url) =>
    url
      .replace(/&amp;/gi, "&")
      .replace(/[),.;!?]+$/g, "")
  );
}

function isExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return false;
    }

    const host =
      url.hostname.toLowerCase();

    // Не брать Telegram
    if (
      host === "t.me" ||
      host === "telegram.me" ||
      host === "telegram.dog"
    ) {
      return false;
    }

    // Не брать Telegram proxy
    if (
      url.pathname
        .toLowerCase()
        .startsWith("/proxy")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getLatestPost(channel) {
  const telegramUrl =
    channelToPublicUrl(channel);

  const response = await fetch(
    telegramUrl,
    {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; OokVPN-Sync/2.0)"
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Telegram returned HTTP ${response.status}`
    );
  }

  const html =
    await response.text();

  const $ =
    cheerio.load(html);

  const posts =
    $(".tgme_widget_message");

  if (!posts.length) {
    throw new Error(
      "No public Telegram posts found."
    );
  }

  const post =
    posts.last();

  const postId =
    post.attr("data-post") ?? null;

  /*
   * Берём текст именно текущего поста.
   */
  const text =
    post.text();

  const urls = [];

  /*
   * Сначала берём реальные href,
   * если Telegram их оформил как ссылку.
   */
  post
    .find("a[href]")
    .each((_, element) => {
      const href =
        $(element).attr("href");

      if (
        href &&
        /^https?:\/\//i.test(href)
      ) {
        urls.push(href);
      }
    });

  /*
   * Затем вытаскиваем URL из текста.
   *
   * Новый regex НЕ захватывает emoji
   * и русский текст после ссылки.
   */
  urls.push(
    ...extractUrls(text)
  );

  /*
   * Удаляем дубли.
   */
  const uniqueUrls = [];

  for (const rawUrl of urls) {
    const cleaned =
      String(rawUrl)
        .replace(/&amp;/gi, "&")
        .trim();

    if (
      cleaned &&
      !uniqueUrls.includes(cleaned)
    ) {
      uniqueUrls.push(cleaned);
    }
  }

  /*
   * Оставляем только внешние HTTP(S)-ссылки.
   */
  const externalUrls =
    uniqueUrls.filter(
      isExternalUrl
    );

  if (!externalUrls.length) {
    throw new Error(
      "No external HTTP/HTTPS subscription link found in latest Telegram post."
    );
  }

  /*
   * Берём первую внешнюю ссылку.
   */
  const sourceUrl =
    externalUrls[0];

  console.log("");
  console.log(
    "External subscription links:"
  );

  for (const url of externalUrls) {
    console.log(
      ` - ${url}`
    );
  }

  return {
    postId,
    text,
    sourceUrl,
    links: externalUrls
  };
}
