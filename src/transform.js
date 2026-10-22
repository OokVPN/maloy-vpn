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

/**
 * Нормализует ISO-код страны.
 * Например: "nl" -> "NL".
 */
function normalizeCountryCode(value) {
  if (typeof value !== "string") return null;

  const code = value.trim().toUpperCase();

  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/**
 * Получает countryCode непосредственно из конфига сервера.
 * Основной вариант — config.countryCode.
 * Дополнительные варианты нужны для совместимости
 * с разными форматами источника.
 */
function getCountryCodeFromConfig(config) {
  const candidates = [
    config?.countryCode,
    config?.country_code,
    config?.server?.countryCode,
    config?.server?.country_code
  ];

  for (const value of candidates) {
    const code = normalizeCountryCode(value);

    if (code) {
      return code;
    }
  }

  return null;
}

/**
 * Получает русское название страны по ISO-коду.
 * Флаг для определения страны не используется.
 */
function getCountryNameFromCode(countryCode) {
  const code = normalizeCountryCode(countryCode);

  if (!code || code === "EU" || code === "UN") {
    return null;
  }

  if (code === "XK") {
    return "Косово";
  }

  try {
    const name = new Intl.DisplayNames(["ru"], {
      type: "region"
    }).of(code);

    if (
      !name ||
      name === code ||
      name === "Европейский союз" ||
      name === "Организация Объединенных Наций" ||
      name === "ООН"
    ) {
      return null;
    }

    return name;
  } catch {
    return null;
  }
}

/**
 * Формирует флаг по ISO-коду страны.
 * Например: NL -> 🇳🇱, LU -> 🇱🇺.
 */
function getFlagFromCountryCode(countryCode) {
  const code = normalizeCountryCode(countryCode);

  if (!code || code === "EU" || code === "UN") {
    return null;
  }

  // UK иногда приходит вместо официального ISO-кода GB.
  const normalizedCode = code === "UK" ? "GB" : code;

  return [...normalizedCode]
    .map(char =>
      String.fromCodePoint(
        0x1F1E6 + char.charCodeAt(0) - 65
      )
    )
    .join("");
}

/**
 * Старый способ определения страны по флагу.
 * Оставляем его для совместимости с серверами,
 * у которых отсутствует countryCode.
 */
function getCountryName(flag) {
  if (!flag) return null;

  if (flag === "🇪🇺" || flag === "🇺🇳") {
    return null;
  }

  if (COUNTRY_OVERRIDES[flag]) {
    return COUNTRY_OVERRIDES[flag];
  }

  try {
    const code = [...flag]
      .map(char =>
        String.fromCharCode(
          char.codePointAt(0) - 0x1F1E6 + 65
        )
      )
      .join("");

    if (code === "EU" || code === "UN") {
      return null;
    }

    const name = new Intl.DisplayNames(["ru"], {
      type: "region"
    }).of(code);

    if (
      !name ||
      name === "Европейский союз" ||
      name === "Организация Объединенных Наций" ||
      name === "ООН"
    ) {
      return null;
    }

    return name;
  } catch {
    return null;
  }
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
          inboundTag: [
            "dns-module"
          ],
          outboundTag: "direct"
        },
        {
          type: "field",
          inboundTag: [
            "dns-module"
          ],
          balancerTag: "MAIN_BALANCER"
        },
        {
          port: 53,
          type: "field",
          outboundTag: "dns-out"
        },
        {
          type: "field",
          protocol: [
            "bittorrent"
          ],
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
          destOverride: [
            "http",
            "tls",
            "quic"
          ]
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
          destOverride: [
            "http",
            "tls",
            "quic"
          ]
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
    const sourceFlag = getFlagFromConfig(config, remark);
    const countryCode = getCountryCodeFromConfig(config);

    // countryCode имеет приоритет над флагом и названием в remarks.
    const country = countryCode
      ? getCountryNameFromCode(countryCode)
      : getCountryName(sourceFlag);

    // Если countryCode присутствует, используем соответствующий флаг.
    const flag = countryCode
      ? getFlagFromCountryCode(countryCode)
      : sourceFlag;

    if (!flag || !country) {
      continue;
    }

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
