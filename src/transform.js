const FLAGS = {
  "🇦🇱": "Албания",
  "🇦🇷": "Аргентина",
  "🇦🇺": "Австралия",
  "🇦🇹": "Австрия",
  "🇧🇪": "Бельгия",
  "🇧🇷": "Бразилия",
  "🇨🇦": "Канада",
  "🇨🇭": "Швейцария",
  "🇨🇳": "Китай",
  "🇨🇿": "Чехия",
  "🇩🇪": "Германия",
  "🇩🇰": "Дания",
  "🇪🇸": "Испания",
  "🇫🇮": "Финляндия",
  "🇫🇷": "Франция",
  "🇬🇧": "Великобритания",
  "🇬🇷": "Греция",
  "🇭🇰": "Гонконг",
  "🇭🇺": "Венгрия",
  "🇮🇩": "Индонезия",
  "🇮🇪": "Ирландия",
  "🇮🇱": "Израиль",
  "🇮🇳": "Индия",
  "🇮🇹": "Италия",
  "🇯🇵": "Япония",
  "🇰🇷": "Южная Корея",
  "🇱🇺": "Люксембург",
  "🇲🇽": "Мексика",
  "🇲🇾": "Малайзия",
  "🇳🇱": "Нидерланды",
  "🇳🇴": "Норвегия",
  "🇳🇿": "Новая Зеландия",
  "🇵🇱": "Польша",
  "🇵🇹": "Португалия",
  "🇷🇴": "Румыния",
  "🇷🇸": "Сербия",
  "🇸🇬": "Сингапур",
  "🇸🇰": "Словакия",
  "🇸🇮": "Словения",
  "🇹🇭": "Таиланд",
  "🇹🇷": "Турция",
  "🇺🇦": "Украина",
  "🇺🇸": "США",
  "🇻🇳": "Вьетнам",
  "🇿🇦": "ЮАР"
};

function isObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function getRemarksKey(config) {
  if (!isObject(config)) return null;

  return Object.keys(config).find(
    key => key.toLowerCase() === "remarks"
  ) ?? null;
}

function detectFlag(remarks) {
  if (typeof remarks !== "string") return null;

  for (const flag of Object.keys(FLAGS)) {
    if (remarks.includes(flag)) {
      return flag;
    }
  }

  return null;
}

function detectLTE(remarks) {
  if (typeof remarks !== "string") return false;

  // LTE can be anywhere in the name:
  // "LTE"
  // "🇩🇪 LTE Обход глушилок"
  // "Germany LTE #1"
  return /lte/i.test(remarks);
}

export function transformSubscription(input) {
  const configs =
    Array.isArray(input)
      ? input
      : Array.isArray(input.configs)
        ? input.configs
        : Array.isArray(input.servers)
          ? input.servers
          : null;

  if (!configs) {
    throw new Error(
      "Unsupported downloaded format: expected array, configs[] or servers[]."
    );
  }

  const counters = new Map();

  const transformed = configs.map(config => {
    if (!isObject(config)) {
      return config;
    }

    const key = getRemarksKey(config);

    if (!key) {
      return config;
    }

    const oldRemarks = String(config[key] ?? "");
    const flag = detectFlag(oldRemarks);

    // No flag = don't invent a country.
    if (!flag) {
      return config;
    }

    // EU is always the automatic server.
    if (flag === "🇪🇺") {
      config[key] = "🇪🇺 АВТО ⚡";
      return config;
    }

    const lte = detectLTE(oldRemarks);
    const type = lte ? "lte" : "normal";
    const counterKey = `${flag}:${type}`;

    const number = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, number);

    config[key] =
      `${flag} ${lte ? "🏳 " : ""}${FLAGS[flag]} #${number}`;

    return config;
  });

  return {
    configs: transformed,
    stats: Object.fromEntries(counters)
  };
      }
