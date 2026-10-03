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

function extractProxyOutbounds(config) {
  if (!config || typeof config !== "object") return [];

  const outbounds = Array.isArray(config.outbounds)
    ? config.outbounds
    : [];

  return outbounds
    .filter(isProxyOutbound)
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
      outbound.tag = `proxy-${outbounds.length}`;
      outbounds.push(outbound);
    }
  }

  return {
    remarks,

    dns: {
      servers: [
        "1.1.1.1",
        "8.8.8.8",
        "https+local://1.1.1.1/dns-query",
        "https+local://8.8.8.8/dns-query"
      ]
    },

    inbounds: [
      {
        listen: "127.0.0.1",
        port: 10808,
        protocol: "socks",
        settings: {
          auth: "noauth",
          udp: true
        },
        tag: "socks"
      },
      {
        listen: "127.0.0.1",
        port: 10809,
        protocol: "http",
        settings: {},
        tag: "http"
      }
    ],

    outbounds: [
      ...outbounds,
      {
        protocol: "freedom",
        tag: "direct"
      },
      {
        protocol: "blackhole",
        tag: "block"
      }
    ],

    routing: {
      domainStrategy: "AsIs",

      balancers: [
        {
          tag: "auto-balancer",
          selector: ["proxy-"],
          fallbackTag: "direct",
          strategy: {
            type: "leastPing"
          }
        }
      ],

      rules: [
        {
          type: "field",
          inboundTag: ["socks", "http"],
          balancerTag: "auto-balancer"
        }
      ]
    },

    burstObservatory: {
      subjectSelector: ["proxy-"],
      pingConfig: {
        destination:
          "https://connectivitycheck.gstatic.com/generate_204",
        connectivity:
          "https://connectivitycheck.gstatic.com/generate_204",
        interval: "30s",
        sampling: 5,
        timeout: "10s",
        httpMethod: "HEAD"
      }
    }
  };
}

function makeServer(config, country, flag, number) {
  const server = clone(config);

  server.remarks = `${flag} ${country} #${number}`;

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
    const flag = getFlagFromConfig(config, remark);

    if (!flag) {
      continue;
    }

    const country = getCountryName(flag);

    if (!country) {
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
        "🇪🇺 АВТО #1 ⚡"
      )
    );
  }

  if (bypassEntries.length > 0) {
    result.push(
      makeAutoConfig(
        bypassEntries,
        "🇪🇺 АВТО #2 (Обход глушилок)"
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
