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

  return `https://t.me/s/${value.replace(/^@/, "").replace(/^\/+|\/+$/g, "")}`;
}

/**
 * Returns the newest public post and the first ordinary HTTP(S) URL.
 *
 * Deliberately accepts ANY HTTP(S) host:
 * - chyra.ru
 * - another domain
 * - an IP address
 * - another port
 * - any future URL used by the channel
 *
 * Does NOT accept:
 * - happ://
 * - tg://
 * - happvpn://
 * etc.
 */
export async function getLatestPost(channel) {
  const url = channelToPublicUrl(channel);

  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Telegram-VPN-Sync/2.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`Telegram page returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const posts = $(".tgme_widget_message");

  if (!posts.length) {
    throw new Error("No public Telegram posts were found.");
  }

  const post = posts.last();
  const postId = post.attr("data-post") ?? null;

  // We inspect the actual post only.
  const htmlPost = $.html(post);
  const textPost = post.text();

  const urls = [];

  // Links Telegram rendered as <a href="...">
  post.find("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (href && /^https?:\/\//i.test(href)) {
      urls.push(href);
    }
  });

  // Plain URLs present directly in post text/HTML.
  const plainUrlMatches =
    `${htmlPost}\n${textPost}`.match(/https?:\/\/[^\s<>"'<>]+/gi) ?? [];

  urls.push(...plainUrlMatches);

  // Clean punctuation and remove duplicates while preserving order.
  const uniqueUrls = [];

  for (const raw of urls) {
    const cleaned = raw
      .replace(/&amp;/gi, "&")
      .replace(/[),.;!?]+$/g, "");

    if (!uniqueUrls.includes(cleaned)) {
      uniqueUrls.push(cleaned);
    }
  }

  if (!uniqueUrls.length) {
    throw new Error("Latest post contains no HTTP(S) subscription URL.");
  }

  return {
    postId,
    text: textPost,
    sourceUrl: uniqueUrls[0],
    links: uniqueUrls
  };
}
