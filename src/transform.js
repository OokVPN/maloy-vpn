import fs from "node:fs/promises";

const COUNTRY_OVERRIDES = {
  "🇦🇫": "Афганистан",
  "🇦🇱": "Албания",
  "🇩🇿": "Алжир",
  "🇦🇸": "Американское Самоа",
  "🇦🇩": "Андорра",
  "🇦🇴": "Ангола",
  "🇦🇮": "Ангилья",
  "🇦🇶": "Антарктида",
  "🇦🇬": "Антигуа и Барбуда",
  "🇦🇷": "Аргентина",
  "🇦🇲": "Армения",
  "🇦🇼": "Аруба",
  "🇦🇺": "Австралия",
  "🇦🇹": "Австрия",
  "🇦🇿": "Азербайджан",
  "🇧🇸": "Багамы",
  "🇧🇭": "Бахрейн",
  "🇧🇩": "Бангладеш",
  "🇧🇧": "Барбадос",
  "🇧🇾": "Беларусь",
  "🇧🇪": "Бельгия",
  "🇧🇿": "Белиз",
  "🇧🇯": "Бенин",
  "🇧🇲": "Бермуды",
  "🇧🇹": "Бутан",
  "🇧🇴": "Боливия",
  "🇧🇦": "Босния и Герцеговина",
  "🇧🇼": "Ботсвана",
  "🇧🇷": "Бразилия",
  "🇻🇬": "Британские Виргинские острова",
  "🇧🇳": "Бруней",
  "🇧🇬": "Болгария",
  "🇧🇫": "Буркина-Фасо",
  "🇧🇮": "Бурунди",
  "🇰🇭": "Камбоджа",
  "🇨🇲": "Камерун",
  "🇨🇦": "Канада",
  "🇨🇻": "Кабо-Верде",
  "🇰🇾": "Каймановы острова",
  "🇨🇫": "Центральноафриканская Республика",
  "🇹🇩": "Чад",
  "🇨🇱": "Чили",
  "🇨🇳": "Китай",
  "🇨🇴": "Колумбия",
  "🇰🇲": "Коморы",
  "🇨🇬": "Республика Конго",
  "🇨🇩": "Демократическая Республика Конго",
  "🇨🇷": "Коста-Рика",
  "🇨🇮": "Кот-д’Ивуар",
  "🇭🇷": "Хорватия",
  "🇨🇺": "Куба",
  "🇨🇾": "Кипр",
  "🇨🇿": "Чехия",
  "🇩🇰": "Дания",
  "🇩🇯": "Джибути",
  "🇩🇲": "Доминика",
  "🇩🇴": "Доминиканская Республика",
  "🇪🇨": "Эквадор",
  "🇪🇬": "Египет",
  "🇸🇻": "Сальвадор",
  "🇬🇶": "Экваториальная Гвинея",
  "🇪🇷": "Эритрея",
  "🇪🇪": "Эстония",
  "🇸🇿": "Эсватини",
  "🇪🇹": "Эфиопия",
  "🇫🇯": "Фиджи",
  "🇫🇮": "Финляндия",
  "🇫🇷": "Франция",
  "🇬🇦": "Габон",
  "🇬🇲": "Гамбия",
  "🇬🇪": "Грузия",
  "🇩🇪": "Германия",
  "🇬🇭": "Гана",
  "🇬🇷": "Греция",
  "🇬🇩": "Гренада",
  "🇬🇹": "Гватемала",
  "🇬🇳": "Гвинея",
  "🇬🇼": "Гвинея-Бисау",
  "🇬🇾": "Гайана",
  "🇭🇹": "Гаити",
  "🇭🇳": "Гондурас",
  "🇭🇰": "Гонконг",
  "🇭🇺": "Венгрия",
  "🇮🇸": "Исландия",
  "🇮🇳": "Индия",
  "🇮🇩": "Индонезия",
  "🇮🇷": "Иран",
  "🇮🇶": "Ирак",
  "🇮🇪": "Ирландия",
  "🇮🇱": "Израиль",
  "🇮🇹": "Италия",
  "🇯🇲": "Ямайка",
  "🇯🇵": "Япония",
  "🇯🇴": "Иордания",
  "🇰🇿": "Казахстан",
  "🇰🇪": "Кения",
  "🇰🇮": "Кирибати",
  "🇰🇵": "Северная Корея",
  "🇰🇷": "Южная Корея",
  "🇰🇼": "Кувейт",
  "🇰🇬": "Кыргызстан",
  "🇱🇦": "Лаос",
  "🇱🇻": "Латвия",
  "🇱🇧": "Ливан",
  "🇱🇸": "Лесото",
  "🇱🇷": "Либерия",
  "🇱🇾": "Ливия",
  "🇱🇮": "Лихтенштейн",
  "🇱🇹": "Литва",
  "🇱🇺": "Люксембург",
  "🇲🇴": "Макао",
  "🇲🇬": "Мадагаскар",
  "🇲🇼": "Малави",
  "🇲🇾": "Малайзия",
  "🇲🇻": "Мальдивы",
  "🇲🇱": "Мали",
  "🇲🇹": "Мальта",
  "🇲🇭": "Маршалловы Острова",
  "🇲🇷": "Мавритания",
  "🇲🇺": "Маврикий",
  "🇲🇽": "Мексика",
  "🇫🇲": "Микронезия",
  "🇲🇩": "Молдова",
  "🇲🇨": "Монако",
  "🇲🇳": "Монголия",
  "🇲🇪": "Черногория",
  "🇲🇦": "Марокко",
  "🇲🇿": "Мозамбик",
  "🇲🇲": "Мьянма",
  "🇳🇦": "Намибия",
  "🇳🇷": "Науру",
  "🇳🇵": "Непал",
  "🇳🇱": "Нидерланды",
  "🇳🇿": "Новая Зеландия",
  "🇳🇮": "Никарагуа",
  "🇳🇪": "Нигер",
  "🇳🇬": "Нигерия",
  "🇲🇰": "Северная Македония",
  "🇳🇴": "Норвегия",
  "🇴🇲": "Оман",
  "🇵🇰": "Пакистан",
  "🇵🇼": "Палау",
  "🇵🇸": "Палестина",
  "🇵🇦": "Панама",
  "🇵🇬": "Папуа — Новая Гвинея",
  "🇵🇾": "Парагвай",
  "🇵🇪": "Перу",
  "🇵🇭": "Филиппины",
  "🇵🇱": "Польша",
  "🇵🇹": "Португалия",
  "🇵🇷": "Пуэрто-Рико",
  "🇶🇦": "Катар",
  "🇷🇴": "Румыния",
  "🇷🇺": "Россия",
  "🇷🇼": "Руанда",
  "🇼🇸": "Самоа",
  "🇸🇲": "Сан-Марино",
  "🇸🇦": "Саудовская Аравия",
  "🇸🇳": "Сенегал",
  "🇷🇸": "Сербия",
  "🇸🇨": "Сейшельские Острова",
  "🇸🇱": "Сьерра-Леоне",
  "🇸🇬": "Сингапур",
  "🇸🇰": "Словакия",
  "🇸🇮": "Словения",
  "🇸🇧": "Соломоновы Острова",
  "🇸🇴": "Сомали",
  "🇿🇦": "Южная Африка",
  "🇸🇸": "Южный Судан",
  "🇪🇸": "Испания",
  "🇱🇰": "Шри-Ланка",
  "🇸🇩": "Судан",
  "🇸🇷": "Суринам",
  "🇸🇪": "Швеция",
  "🇨🇭": "Швейцария",
  "🇸🇾": "Сирия",
  "🇹🇼": "Тайвань",
  "🇹🇯": "Таджикистан",
  "🇹🇿": "Танзания",
  "🇹🇭": "Таиланд",
  "🇹🇱": "Восточный Тимор",
  "🇹🇬": "Того",
  "🇹🇴": "Тонга",
  "🇹🇹": "Тринидад и Тобаго",
  "🇹🇳": "Тунис",
  "🇹🇷": "Турция",
  "🇹🇲": "Туркменистан",
  "🇹🇻": "Тувалу",
  "🇺🇬": "Уганда",
  "🇺🇦": "Украина",
  "🇦🇪": "ОАЭ",
  "🇬🇧": "Великобритания",
  "🇺🇸": "США",
  "🇺🇾": "Уругвай",
  "🇺🇿": "Узбекистан",
  "🇻🇺": "Вануату",
  "🇻🇦": "Ватикан",
  "🇻🇪": "Венесуэла",
  "🇻🇳": "Вьетнам",
  "🇾🇪": "Йемен",
  "🇿🇲": "Замбия",
  "🇿🇼": "Зимбабве",
  "🇽🇰": "Косово"
};

const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

function getConfigArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.configs)) return data.configs;
  if (Array.isArray(data?.servers)) return data.servers;
  return [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isProxyOutbound(outbound) {
  if (!outbound || typeof outbound !== "object") return false;

  const protocol = String(outbound.protocol || "").toLowerCase();

  return [
    "vless",
    "vmess",
    "trojan",
    "shadowsocks",
    "socks",
    "http",
    "hysteria",
    "hysteria2",
    "wireguard"
  ].includes(protocol);
}

function isValidProxyOutbound(outbound) {
  if (!isProxyOutbound(outbound)) return false;

  const streamSettings = outbound.streamSettings;

  if (!streamSettings || typeof streamSettings !== "object") {
    return true;
  }

  const grpcSettings = streamSettings.grpcSettings;

  if (
    grpcSettings &&
    typeof grpcSettings === "object" &&
    "serviceName" in grpcSettings &&
    String(grpcSettings.serviceName ?? "").trim() === ""
  ) {
    return false;
  }

  return true;
}

function extractProxyOutbounds(config) {
  if (!config || typeof config !== "object") return [];

  const outbounds = Array.isArray(config.outbounds)
    ? config.outbounds
    : [];

  return outbounds
    .filter(isValidProxyOutbound)
    .map(clone);
}

function getSourceRemark(config, index) {
  return String(
    config?.remarks ??
    config?.remark ??
    config?.name ??
    config?.tag ??
    `Server ${index + 1}`
  ).trim();
}

function isBypassConfig(remark) {
  const text = remark.toLowerCase();

  return [
    "lte",
    "обход",
    "глушил",
    "bypass",
    "censor",
    "anti-block",
    "antiblock"
  ].some(word => text.includes(word));
}

function getFlagFromConfig(config, remark) {
  const candidates = [
    config?.flag,
    config?.countryFlag,
    remark
  ];

  for (const value of candidates) {
    if (typeof value !== "string") continue;

    const match = value.match(FLAG_RE);

    if (match) {
      const flag = match[0];

      if (flag === "🇪🇺" || flag === "🇺🇳") {
        return null;
      }

      return flag;
    }
  }

  return null;
}

function normalizeCountryText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ru")
    .replace(/[’'\u0060]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isIgnoredCountryName(name) {
  const normalized = normalizeCountryText(name);

  return !normalized ||
    normalized === "eu" ||
    normalized === "un" ||
    normalized.includes("european union") ||
    normalized.includes("европейский союз") ||
    normalized.includes("united nations") ||
    normalized.includes("объединенных наций") ||
    normalized.includes("неизвестный регион") ||
    normalized.includes("unknown region");
}

const REGION_NAMES_RU = new Intl.DisplayNames(["ru"], {
  type: "region"
});

const REGION_NAMES_EN = new Intl.DisplayNames(["en"], {
  type: "region"
});

const COUNTRY_CODES = new Set();
const COUNTRY_NAME_TO_CODE = new Map();

function addCountryName(name, code) {
  const normalized = normalizeCountryText(name);

  if (
    normalized &&
    !isIgnoredCountryName(name) &&
    !COUNTRY_NAME_TO_CODE.has(normalized)
  ) {
    COUNTRY_NAME_TO_CODE.set(normalized, code);
  }
}

function countryCodeFromFlag(flag) {
  if (typeof flag !== "string") return null;

  const chars = [...flag];

  if (chars.length !== 2) return null;

  const values = chars.map(char => char.codePointAt(0));

  if (values.some(value => value < 0x1F1E6 || value > 0x1F1FF)) {
    return null;
  }

  const code = values
    .map(value => String.fromCharCode(value - 0x1F1E6 + 65))
    .join("");

  return code === "UK" ? "GB" : code;
}

for (let first = 65; first <= 90; first++) {
  for (let second = 65; second <= 90; second++) {
    const code = String.fromCharCode(first, second);
    const russianName = REGION_NAMES_RU.of(code);
    const englishName = REGION_NAMES_EN.of(code);

    if (
      !russianName ||
      russianName === code ||
      isIgnoredCountryName(russianName) ||
      ["EU", "UN", "ZZ", "XA", "XB"].includes(code)
    ) {
      continue;
    }

    COUNTRY_CODES.add(code);
    addCountryName(russianName, code);
    addCountryName(englishName, code);
  }
}

COUNTRY_CODES.add("XK");
addCountryName("Косово", "XK");
addCountryName("Kosovo", "XK");

for (const [flag, name] of Object.entries(COUNTRY_OVERRIDES)) {
  const code = countryCodeFromFlag(flag);

  if (code) {
    COUNTRY_CODES.add(code);
    addCountryName(name, code);
  }
}

const COUNTRY_NAME_ALIASES = {
  holland: "NL",
  hollande: "NL",
  nederland: "NL",
  netherlands: "NL",
  нидерланды: "NL",
  люксембург: "LU",
  luxembourg: "LU",
  usa: "US",
  "u s a": "US",
  "united states": "US",
  "united states of america": "US",
  сша: "US",
  uk: "GB",
  "great britain": "GB",
  britain: "GB",
  england: "GB",
  великобритания: "GB",
  uae: "AE",
  "united arab emirates": "AE",
  оаэ: "AE",
  "south korea": "KR",
  "north korea": "KP",
  "южная корея": "KR",
  "северная корея": "KP",
  "ivory coast": "CI",
  "czech republic": "CZ",
  turkiye: "TR",
  russia: "RU",
  россия: "RU",
  belarus: "BY",
  беларусь: "BY"
};

for (const [name, code] of Object.entries(COUNTRY_NAME_ALIASES)) {
  if (COUNTRY_CODES.has(code) || code === "XK") {
    addCountryName(name, code);
  }
}

const SORTED_COUNTRY_NAMES = [...COUNTRY_NAME_TO_CODE.keys()]
  .sort((a, b) => b.length - a.length);

function normalizeCountryCode(value) {
  if (typeof value !== "string") return null;

  const valueCode = value.trim().toUpperCase();
  const code = valueCode === "UK" ? "GB" : valueCode;

  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === "XK") return code;

  return COUNTRY_CODES.has(code) && code !== "EU" && code !== "UN"
    ? code
    : null;
}

function getCountryCodeFromConfig(config) {
  const candidates = [
    config?.countryCode,
    config?.country_code,
    config?.isoCountryCode,
    config?.iso_country_code,
    config?.geo?.countryCode,
    config?.geo?.country_code,
    config?.location?.countryCode,
    config?.location?.country_code,
    config?.server?.countryCode,
    config?.server?.country_code,
    config?.node?.countryCode,
    config?.node?.country_code,
    config?.metadata?.countryCode,
    config?.metadata?.country_code,
    config?.meta?.countryCode,
    config?.meta?.country_code
  ];

  for (const value of candidates) {
    const code = normalizeCountryCode(value);

    if (code) return code;
  }

  return null;
}

function getCountryCodeFromRemark(remark) {
  if (typeof remark !== "string") return null;

  const patterns = [
    /\[\s*([A-Z]{2})\s*\]/i,
    /\(\s*([A-Z]{2})\s*\)/i,
    /\bcountry\s*[:=]\s*([A-Z]{2})\b/i
  ];

  for (const pattern of patterns) {
    const match = remark.match(pattern);

    if (!match) continue;

    const code = normalizeCountryCode(match[1]);

    if (code && getCountryNameFromCode(code)) return code;
  }

  return null;
}

function getCountryCodeFromName(value) {
  const normalized = normalizeCountryText(value);

  if (!normalized) return null;

  const code = COUNTRY_NAME_TO_CODE.get(normalized);

  return code ? normalizeCountryCode(code) : null;
}

function getCountryCodeFromText(value) {
  const normalized = normalizeCountryText(value);

  if (!normalized) return null;

  const exact = COUNTRY_NAME_TO_CODE.get(normalized);

  if (exact) return normalizeCountryCode(exact);

  const padded = " " + normalized + " ";

  for (const name of SORTED_COUNTRY_NAMES) {
    if (padded.includes(" " + name + " ")) {
      return normalizeCountryCode(COUNTRY_NAME_TO_CODE.get(name));
    }
  }

  return null;
}

function getCountryCodeFromCountryNameFields(config) {
  const candidates = [
    config?.countryName,
    config?.country_name,
    config?.country,
    config?.server?.countryName,
    config?.server?.country_name,
    config?.server?.country,
    config?.node?.countryName,
    config?.node?.country_name,
    config?.node?.country,
    config?.metadata?.countryName,
    config?.metadata?.country_name,
    config?.metadata?.country,
    config?.meta?.countryName,
    config?.meta?.country_name,
    config?.meta?.country
  ];

  for (const value of candidates) {
    if (typeof value !== "string") continue;

    const code =
      normalizeCountryCode(value) ||
      getCountryCodeFromName(value);

    if (code && getCountryNameFromCode(code)) return code;
  }

  return null;
}

function getCountryNameFromCode(countryCode) {
  const code = normalizeCountryCode(countryCode);

  if (!code) return null;
  if (code === "XK") return "Косово";

  const flag = getFlagFromCountryCode(code);

  if (flag && COUNTRY_OVERRIDES[flag]) {
    return COUNTRY_OVERRIDES[flag];
  }

  const name = REGION_NAMES_RU.of(code);

  return !name || name === code || isIgnoredCountryName(name)
    ? null
    : name;
}

function getFlagFromCountryCode(countryCode) {
  const code = normalizeCountryCode(countryCode);

  if (!code) return null;

  return [...code]
    .map(char =>
      String.fromCodePoint(
        0x1F1E6 + char.charCodeAt(0) - 65
      )
    )
    .join("");
}

function getCountryName(flag) {
  if (!flag || flag === "🇪🇺" || flag === "🇺🇳") {
    return null;
  }

  const code = countryCodeFromFlag(flag);

  return code ? getCountryNameFromCode(code) : null;
}

function resolveCountry(config, remark) {
  const explicitCode = getCountryCodeFromConfig(config);

  if (explicitCode) {
    const country = getCountryNameFromCode(explicitCode);
    const flag = getFlagFromCountryCode(explicitCode);

    if (country && flag) return { country, flag };
  }

  const remarkCode = getCountryCodeFromRemark(remark);

  if (remarkCode) {
    const country = getCountryNameFromCode(remarkCode);
    const flag = getFlagFromCountryCode(remarkCode);

    if (country && flag) return { country, flag };
  }

  const fieldNameCode = getCountryCodeFromCountryNameFields(config);

  if (fieldNameCode) {
    const country = getCountryNameFromCode(fieldNameCode);
    const flag = getFlagFromCountryCode(fieldNameCode);

    if (country && flag) return { country, flag };
  }

  const remarkNameCode = getCountryCodeFromText(remark);

  if (remarkNameCode) {
    const country = getCountryNameFromCode(remarkNameCode);
    const flag = getFlagFromCountryCode(remarkNameCode);

    if (country && flag) return { country, flag };
  }

  const sourceFlag = getFlagFromConfig(config, remark);
  const flagCode = countryCodeFromFlag(sourceFlag);

  if (flagCode) {
    const country = getCountryNameFromCode(flagCode);
    const flag = getFlagFromCountryCode(flagCode);

    if (country && flag) return { country, flag };
  }

  const country = getCountryName(sourceFlag);

  return country && sourceFlag
    ? { country, flag: sourceFlag }
    : null;
}

function makeAutoConfig(entries, remarks) {
  const outbounds = [];

  for (let i = 0; i < entries.length; i++) {
    const proxyOutbounds = extractProxyOutbounds(entries[i].config);

    for (const outbound of proxyOutbounds) {
      const index = outbounds.length;

      outbound.tag = index === 0
        ? "proxy"
        : `proxy-${index + 1}`;

      outbounds.push(outbound);
    }
  }

  const selector = outbounds.map(outbound => outbound.tag);

  return {
    dns: {
      tag: "dns-module",
      servers: [
        {
          address: "77.88.8.8",
          domains: [
            "domain:ozon.com",
            "domain:ozon.ru",
            "domain:wildberries.ru",
            "domain:wb.ru",
            "domain:avito.ru",
            "domain:vk.com",
            "domain:yandex.ru",
            "domain:yandex.net",
            "domain:sber.ru",
            "domain:sberbank.ru",
            "domain:gosuslugi.ru",
            "domain:mail.ru",
            "domain:ok.ru",
            "domain:rutube.ru",
            "domain:tinkoff.ru",
            "domain:raiffeisen.ru",
            "domain:alfa-bank.ru",
            "domain:mvideo.ru",
            "domain:dns-shop.ru",
            "domain:eldorado.ru",
            "domain:citilink.ru",
            "domain:kaspersky.ru",
            "domain:mos.ru",
            "domain:rbc.ru",
            "domain:gazprombank.ru",
            "domain:vtb.ru",
            "domain:sbp.ru",
            "domain:psbank.ru",
            "domain:rosbank.ru",
            "domain:mkb.ru",
            "domain:sovcombank.ru",
            "domain:homecredit.ru",
            "domain:pochtabank.ru",
            "domain:qiwi.com",
            "domain:yoomoney.ru",
            "domain:nalog.ru",
            "domain:cbr.ru",
            "domain:pochta.ru",
            "domain:gibdd.ru",
            "domain:rosreestr.ru",
            "domain:mvd.ru",
            "domain:fns.ru",
            "domain:mts.ru",
            "domain:beeline.ru",
            "domain:megafon.ru",
            "domain:tele2.ru",
            "domain:yota.ru",
            "domain:lamoda.ru",
            "domain:sbermegamarket.ru",
            "domain:samokat.ru",
            "domain:cdek.ru",
            "domain:boxberry.ru",
            "domain:kinopoisk.ru",
            "domain:ivi.ru",
            "domain:okko.tv",
            "domain:more.tv",
            "domain:start.ru",
            "domain:2gis.ru",
            "domain:rzd.ru",
            "domain:aeroflot.ru",
            "domain:s7.ru"
          ]
        },
        "1.1.1.1",
        "1.0.0.1",
        "8.8.8.8"
      ],
      disableCache: false,
      queryStrategy: "UseIPv4"
    },

    log: {
      loglevel: "warning"
    },

    policy: {
      levels: {
        "0": {
          connIdle: 300,
          handshake: 4,
          uplinkOnly: 1,
          downlinkOnly: 1
        }
      },
      system: {
        statsOutboundUplink: false,
        statsOutboundDownlink: false
      }
    },

    routing: {
      rules: [
        {
          ip: [
            "77.88.8.8",
            "77.88.8.1"
          ],
          type: "field",
          inboundTag: ["dns-module"],
          outboundTag: "direct"
        },
        {
          type: "field",
          inboundTag: ["dns-module"],
          balancerTag: "MAIN_BALANCER"
        },
        {
          port: 53,
          type: "field",
          outboundTag: "dns-out"
        },
        {
          type: "field",
          protocol: ["bittorrent"],
          outboundTag: "direct"
        },
        {
          ip: [
            "10.0.0.0/8",
            "100.64.0.0/10",
            "127.0.0.0/8",
            "169.254.0.0/16",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "::1/128",
            "fc00::/7",
            "fe80::/10"
          ],
          type: "field",
          outboundTag: "direct"
        },
        {
          type: "field",
          domain: [
            "domain:ozon.com",
            "domain:ozon.ru",
            "domain:wildberries.ru",
            "domain:wb.ru",
            "domain:avito.ru",
            "domain:vk.com",
            "domain:yandex.ru",
            "domain:yandex.net",
            "domain:sber.ru",
            "domain:sberbank.ru",
            "domain:gosuslugi.ru",
            "domain:mail.ru",
            "domain:ok.ru",
            "domain:rutube.ru",
            "domain:tinkoff.ru",
            "domain:raiffeisen.ru",
            "domain:alfa-bank.ru",
            "domain:mvideo.ru",
            "domain:dns-shop.ru",
            "domain:eldorado.ru",
            "domain:citilink.ru",
            "domain:kaspersky.ru",
            "domain:mos.ru",
            "domain:rbc.ru",
            "domain:gazprombank.ru",
            "domain:vtb.ru",
            "domain:sbp.ru",
            "domain:psbank.ru",
            "domain:rosbank.ru",
            "domain:mkb.ru",
            "domain:homecredit.ru",
            "domain:pochtabank.ru",
            "domain:qiwi.com",
            "domain:yoomoney.ru",
            "domain:nalog.ru",
            "domain:cbr.ru",
            "domain:pochta.ru",
            "domain:gibdd.ru",
            "domain:rosreestr.ru",
            "domain:mvd.ru",
            "domain:fns.ru",
            "domain:mts.ru",
            "domain:beeline.ru",
            "domain:megafon.ru",
            "domain:tele2.ru",
            "domain:yota.ru",
            "domain:lamoda.ru",
            "domain:sbermegamarket.ru",
            "domain:samokat.ru",
            "domain:cdek.ru",
            "domain:boxberry.ru",
            "domain:kinopoisk.ru",
            "domain:ivi.ru",
            "domain:okko.tv",
            "domain:more.tv",
            "domain:start.ru",
            "domain:2gis.ru",
            "domain:rzd.ru",
            "domain:aeroflot.ru",
            "domain:s7.ru"
          ],
          outboundTag: "direct"
        },
        {
          type: "field",
          network: "tcp,udp",
          balancerTag: "MAIN_BALANCER"
        }
      ],

      balancers: [
        {
          tag: "MAIN_BALANCER",
          selector,
          strategy: {
            type: "leastLoad",
            settings: {
              maxRTT: "2s",
              expected: 3
            }
          },
          fallbackTag: "block"
        }
      ],

      domainMatcher: "hybrid",
      domainStrategy: "IPIfNonMatch"
    },

    inbounds: [
      {
        tag: "socks",
        port: 10808,
        listen: "127.0.0.1",
        protocol: "socks",
        settings: {
          udp: true,
          auth: "noauth"
        },
        sniffing: {
          enabled: true,
          routeOnly: true,
          destOverride: ["http", "tls", "quic"]
        }
      },
      {
        tag: "http",
        port: 10809,
        listen: "127.0.0.1",
        protocol: "http",
        settings: {
          allowTransparent: false
        },
        sniffing: {
          enabled: true,
          routeOnly: true,
          destOverride: ["http", "tls", "quic"]
        }
      }
    ],

    outbounds: [
      ...outbounds,
      {
        tag: "block",
        protocol: "blackhole"
      },
      {
        tag: "direct",
        protocol: "freedom"
      },
      {
        tag: "dns-out",
        protocol: "dns"
      }
    ],

    burstObservatory: {
      pingConfig: {
        timeout: "5s",
        interval: "60s",
        sampling: 3,
        httpMethod: "HEAD",
        destination: "https://www.gstatic.com/generate_204"
      },
      subjectSelector: selector
    },

    remarks
  };
}

function makeServer(config, country, flag, number) {
  const server = clone(config);

  server.remarks = `${flag} ${country} №${number}`;

  return server;
}

export function transformSubscription(input) {
  const sourceConfigs = getConfigArray(input);

  const normalEntries = [];
  const bypassEntries = [];
  const countryGroups = new Map();

  for (let index = 0; index < sourceConfigs.length; index++) {
    const config = sourceConfigs[index];
    const remark = getSourceRemark(config, index);

    const resolvedCountry = resolveCountry(config, remark);
    const country = resolvedCountry?.country ?? null;
    const flag = resolvedCountry?.flag ?? null;

    if (!flag || !country) continue;

    if (
      flag === "🇪🇺" ||
      flag === "🇺🇳" ||
      country === "Европейский союз" ||
      country === "ООН" ||
      country === "Организация Объединенных Наций"
    ) {
      continue;
    }

    const entry = {
      config: clone(config),
      country,
      flag,
      remark
    };

    if (isBypassConfig(remark)) {
      bypassEntries.push(entry);
      continue;
    }

    normalEntries.push(entry);

    if (!countryGroups.has(country)) {
      countryGroups.set(country, []);
    }

    countryGroups.get(country).push(entry);
  }

  const result = [];

  if (normalEntries.length > 0) {
    result.push(
      makeAutoConfig(
        normalEntries,
        "🇪🇺 АВТО №1 ⚡"
      )
    );
  }

  if (bypassEntries.length > 0) {
    result.push(
      makeAutoConfig(
        bypassEntries,
        "🇪🇺 АВТО №2 (Обход глушилок)"
      )
    );
  }

  const sortedCountries = [...countryGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ru"));

  for (const [country, entries] of sortedCountries) {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      result.push(
        makeServer(
          entry.config,
          country,
          entry.flag,
          i + 1
        )
      );
    }
  }

  return {
    ...input,
    configs: result,
    servers: result,
    stats: {
      total: result.length,
      countries: countryGroups.size,
      normalOutbounds: normalEntries.length,
      bypassOutbounds: bypassEntries.length
    }
  };
}

if (process.argv[1]?.endsWith("transform.js")) {
  const inputPath = "data/subscription.json";
  const outputPath = "public/subscription.json";

  const input = JSON.parse(
    await fs.readFile(inputPath, "utf8")
  );

  const result = transformSubscription(input);

  await fs.writeFile(
    outputPath,
    JSON.stringify(result, null, 2),
    "utf8"
  );

  console.log(
    `OK: ${result.stats.total} configs | ` +
    `${result.stats.countries} countries | ` +
    `${result.stats.normalOutbounds} normal | ` +
    `${result.stats.bypassOutbounds} bypass`
  );
            }
