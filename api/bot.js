// Telegram webhook for Vercel: https://sub.maloyvpn.devs.surf/api/bot
//
// Environment variables (Vercel -> Settings -> Environment Variables):
//   BOT_TOKEN       token from @BotFather
//   WEBHOOK_SECRET  any random string (A-Z, a-z, 0-9, _ and -), the same one
//                   that is passed as secret_token to setWebhook

const SUB_URL =
  "https://sub.maloyvpn.devs.surf/sub/TWF0dmV5X2ZyaWVuZF8yLDE3Nzc0NTIyMzUxW0vSCkGyP";
// Put your direct image link here (e.g. https://files.catbox.moe/xxxxxx.png)
const QR_URL = "https://files.catbox.moe/ВСТАВЬТЕ_СВОЮ_ССЫЛКУ.png";

// Maintenance mode is switched in the repo: public/maintenance.json.
const MAINTENANCE_URL = "https://sub.maloyvpn.devs.surf/maintenance.json";

// These Telegram users always get the normal reply, even during maintenance.
const IMMUNE_USER_IDS = new Set([5188800998]);

const EXPIRE = { year: 2067, month: 1, day: 1 };
const EXPIRE_TEXT = "01.01.2067";
const TIME_ZONE = "Europe/Moscow";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today (in TIME_ZONE) to 01.01.2067. */
export function daysLeft(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const today = Date.UTC(get("year"), get("month") - 1, get("day"));
  const target = Date.UTC(EXPIRE.year, EXPIRE.month - 1, EXPIRE.day);

  return Math.max(0, Math.round((target - today) / DAY_MS));
}

export function buildSubscriptionMessage(now = new Date()) {
  return [
    "<b>👤 Твоя подписка</b>",
    "",
    "🟢 Активен",
    "📥 Использовано: 0 B",
    "📦 Лимит: ♾ Безлимит",
    `📅 ${EXPIRE_TEXT} (осталось ${daysLeft(now)} дн.)`,
    "",
    "<b>🔗 Ссылка подписки:</b>",
    `<code>${SUB_URL}</code>`
  ].join("\n");
}

async function telegram(method, payload) {
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.ok) {
    throw new Error(
      `${method} failed: HTTP ${response.status} ${data?.description ?? ""}`.trim()
    );
  }

  return data.result;
}

function isStartCommand(message) {
  const text = message?.text;
  if (typeof text !== "string") return false;

  // "/start", "/start payload", "/start@MyBot"
  return /^\/start(@\w+)?(\s|$)/i.test(text.trim());
}

async function isMaintenance() {
  try {
    const response = await fetch(`${MAINTENANCE_URL}?t=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data?.maintenance === true;
  } catch (error) {
    // If the switch can't be read, answer normally rather than blocking everyone.
    console.error(`maintenance.json: ${error.message}`);
    return false;
  }
}

async function handleMaintenance(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: [
      "<b>🛠 Ведутся технические работы</b>",
      "",
      "Подписка временно недоступна. Мы уже работаем над этим, загляните сюда чуть позже."
    ].join("\n"),
    parse_mode: "HTML"
  });
}

async function handleStart(chatId) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: buildSubscriptionMessage(),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true }
  });

  await telegram("sendPhoto", {
    chat_id: chatId,
    photo: QR_URL,
    caption: "📱 QR-код для быстрого подключения"
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).setHeader("Allow", "POST").send("Method Not Allowed");
    return;
  }

  if (!process.env.BOT_TOKEN || !process.env.WEBHOOK_SECRET) {
    console.error("BOT_TOKEN or WEBHOOK_SECRET is not set");
    res.status(500).send("Server is not configured");
    return;
  }

  if (req.headers["x-telegram-bot-api-secret-token"] !== process.env.WEBHOOK_SECRET) {
    res.status(401).send("Unauthorized");
    return;
  }

  const message = req.body?.message;

  try {
    if (message?.chat?.id && isStartCommand(message)) {
      const immune = IMMUNE_USER_IDS.has(message.from?.id);

      if (!immune && (await isMaintenance())) {
        await handleMaintenance(message.chat.id);
      } else {
        await handleStart(message.chat.id);
      }
    }
  } catch (error) {
    // Answer 200 anyway: a non-2xx would make Telegram resend the update
    // and the user could get a duplicate first message.
    console.error(error.message);
  }

  res.status(200).json({ ok: true });
}
