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
  "🇧🇶": "Карибские Нидерланды",
  "🇧🇦": "Босния и Герцеговина",
  "🇧🇼": "Ботсвана",
  "🇧🇷": "Бразилия",
  "🇻🇬": "Британские Виргинские острова",
  "🇧🇳": "Бруней",
  "🇧🇬": "Болгария",
  "🇧🇫": "Буркина-Фасо",
  "🇧🇮": "Бурунди",

  "🇨🇻": "Кабо-Верде",
  "🇰🇭": "Камбоджа",
  "🇨🇲": "Камерун",
  "🇨🇦": "Канада",
  "🇰🇾": "Каймановы острова",
  "🇨🇫": "Центральноафриканская Республика",
  "🇹🇩": "Чад",
  "🇨🇱": "Чили",
  "🇨🇳": "Китай",
  "🇨🇽": "Остров Рождества",
  "🇨🇨": "Кокосовые острова",
  "🇨🇴": "Колумбия",
  "🇰🇲": "Коморы",
  "🇨🇬": "Республика Конго",
  "🇨🇩": "Демократическая Республика Конго",
  "🇨🇰": "Острова Кука",
  "🇨🇷": "Коста-Рика",
  "🇨🇮": "Кот-д’Ивуар",
  "🇭🇷": "Хорватия",
  "🇨🇺": "Куба",
  "🇨🇼": "Кюрасао",
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

  "🇫🇰": "Фолклендские острова",
  "🇫🇴": "Фарерские острова",
  "🇫🇯": "Фиджи",
  "🇫🇮": "Финляндия",
  "🇫🇷": "Франция",
  "🇬🇫": "Французская Гвиана",
  "🇵🇫": "Французская Полинезия",
  "🇹🇫": "Французские Южные территории",

  "🇬🇦": "Габон",
  "🇬🇲": "Гамбия",
  "🇬🇪": "Грузия",
  "🇩🇪": "Германия",
  "🇬🇭": "Гана",
  "🇬🇮": "Гибралтар",
  "🇬🇷": "Греция",
  "🇬🇱": "Гренландия",
  "🇬🇩": "Гренада",
  "🇬🇵": "Гваделупа",
  "🇬🇺": "Гуам",
  "🇬🇹": "Гватемала",
  "🇬🇬": "Гернси",
  "🇬🇳": "Гвинея",
  "🇬🇼": "Гвинея-Бисау",
  "🇬🇾": "Гайана",

  "🇭🇹": "Гаити",
  "🇭🇲": "Остров Херд и острова Макдональд",
  "🇻🇦": "Ватикан",
  "🇭🇳": "Гондурас",
  "🇭🇰": "Гонконг",
  "🇭🇺": "Венгрия",

  "🇮🇸": "Исландия",
  "🇮🇳": "Индия",
  "🇮🇩": "Индонезия",
  "🇮🇷": "Иран",
  "🇮🇶": "Ирак",
  "🇮🇪": "Ирландия",
  "🇮🇲": "Остров Мэн",
  "🇮🇱": "Израиль",
  "🇮🇹": "Италия",

  "🇯🇲": "Ямайка",
  "🇯🇵": "Япония",
  "🇯🇪": "Джерси",
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
  "🇲🇶": "Мартиника",
  "🇲🇷": "Мавритания",
  "🇲🇺": "Маврикий",
  "🇾🇹": "Майотта",
  "🇲🇽": "Мексика",
  "🇫🇲": "Микронезия",
  "🇲🇩": "Молдова",
  "🇲🇨": "Монако",
  "🇲🇳": "Монголия",
  "🇲🇪": "Черногория",
  "🇲🇸": "Монтсеррат",
  "🇲🇦": "Марокко",
  "🇲🇿": "Мозамбик",
  "🇲🇲": "Мьянма",

  "🇳🇦": "Намибия",
  "🇳🇷": "Науру",
  "🇳🇵": "Непал",
  "🇳🇱": "Нидерланды",
  "🇳🇨": "Новая Каледония",
  "🇳🇿": "Новая Зеландия",
  "🇳🇮": "Никарагуа",
  "🇳🇪": "Нигер",
  "🇳🇬": "Нигерия",
  "🇳🇺": "Ниуэ",
  "🇳🇫": "Остров Норфолк",
  "🇲🇰": "Северная Македония",
  "🇲🇵": "Северные Марианские острова",
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
  "🇵🇳": "Питкэрн",
  "🇵🇱": "Польша",
  "🇵🇹": "Португалия",
  "🇵🇷": "Пуэрто-Рико",

  "🇶🇦": "Катар",

  "🇷🇪": "Реюньон",
  "🇷🇴": "Румыния",
  "🇷🇺": "Россия",
  "🇷🇼": "Руанда",

  "🇧🇱": "Сен-Бартелеми",
  "🇸🇭": "Остров Святой Елены",
  "🇰🇳": "Сент-Китс и Невис",
  "🇱🇨": "Сент-Люсия",
  "🇲🇫": "Сен-Мартен",
  "🇵🇲": "Сен-Пьер и Микелон",
  "🇻🇨": "Сент-Винсент и Гренадины",
  "🇼🇸": "Самоа",
  "🇸🇲": "Сан-Марино",
  "🇸🇹": "Сан-Томе и Принсипи",
  "🇸🇦": "Саудовская Аравия",
  "🇸🇳": "Сенегал",
  "🇷🇸": "Сербия",
  "🇸🇨": "Сейшельские Острова",
  "🇸🇱": "Сьерра-Леоне",
  "🇸🇬": "Сингапур",
  "🇸🇽": "Синт-Мартен",
  "🇸🇰": "Словакия",
  "🇸🇮": "Словения",
  "🇸🇧": "Соломоновы Острова",
  "🇸🇴": "Сомали",
  "🇿🇦": "Южная Африка",
  "🇬🇸": "Южная Георгия и Южные Сандвичевы острова",
  "🇸🇸": "Южный Судан",
  "🇪🇸": "Испания",
  "🇱🇰": "Шри-Ланка",
  "🇸🇩": "Судан",
  "🇸🇷": "Суринам",
  "🇸🇯": "Шпицберген и Ян-Майен",
  "🇸🇪": "Швеция",
  "🇨🇭": "Швейцария",
  "🇸🇾": "Сирия",

  "🇹🇼": "Тайвань",
  "🇹🇯": "Таджикистан",
  "🇹🇿": "Танзания",
  "🇹🇭": "Таиланд",
  "🇹🇱": "Восточный Тимор",
  "🇹🇬": "Того",
  "🇹🇰": "Токелау",
  "🇹🇴": "Тонга",
  "🇹🇹": "Тринидад и Тобаго",
  "🇹🇳": "Тунис",
  "🇹🇷": "Турция",
  "🇹🇲": "Туркменистан",
  "🇹🇨": "Теркс и Кайкос",
  "🇹🇻": "Тувалу",

  "🇺🇬": "Уганда",
  "🇺🇦": "Украина",
  "🇦🇪": "ОАЭ",
  "🇬🇧": "Великобритания",
  "🇺🇸": "США",
  "🇺🇾": "Уругвай",
  "🇺🇿": "Узбекистан",

  "🇻🇺": "Вануату",
  "🇻🇪": "Венесуэла",
  "🇻🇳": "Вьетнам",
  "🇻🇮": "Американские Виргинские острова",

  "🇼🇫": "Уоллис и Футуна",
  "🇪🇭": "Западная Сахара",
  "🇾🇪": "Йемен",
  "🇿🇲": "Замбия",
  "🇿🇼": "Зимбабве",

  "🇽🇰": "Косово",
  "🇦🇨": "Остров Вознесения",
  "🇦🇽": "Аландские острова"
};

const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]{2}/u;

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function getFlag(text) {
  return normalizeText(text).match(FLAG_RE)?.[0] ?? "";
}

function getCountryName(flag) {
  if (!flag) return null;

  if (COUNTRY_OVERRIDES[flag]) {
    return COUNTRY_OVERRIDES[flag];
  }

  const chars = [...flag];

  if (chars.length !== 2) {
    return null;
  }

  const code = chars
    .map(char =>
      String.fromCodePoint(char.codePointAt(0) - 0x1F1E6 + 65)
    )
    .join("");

  try {
    return new Intl.DisplayNames(["ru"], {
      type: "region"
    }).of(code) || null;
  } catch {
    return null;
  }
}

function getConfigArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.configs)) return data.configs;
  if (Array.isArray(data?.servers)) return data.servers;

  throw new Error("Не найден массив configs/servers.");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isProxyOutbound(outbound) {
  if (!outbound || typeof outbound !== "object") {
    return false;
  }

  const protocol = String(outbound.protocol ?? "").toLowerCase();

  return ![
    "freedom",
    "blackhole",
    "dns",
    "loopback",
    "dokodemo-door"
  ].includes(protocol);
}

function extractProxyOutbounds(config) {
  return (Array.isArray(config?.outbounds) ? config.outbounds : [])
    .filter(isProxyOutbound)
    .map(clone);
}

function isBypassConfig(config) {
  const remark = normalizeText(
    config?.remarks ??
    config?.remark ??
    config?.name ??
    ""
  ).toLowerCase();

  return (
    /\blte\b/i.test(remark) ||
    /обход/i.test(remark) ||
    /глушил/i.test(remark) ||
    /bypass/i.test(remark) ||
    /censor/i.test(remark) ||
    /anti.?block/i.test(remark)
  );
}

function getSourceRemark(config, index) {
  return normalizeText(
    config?.remarks ??
    config?.remark ??
    config?.name ??
    `Server ${index + 1}`
  );
}

function makeAutoConfig(entries, remarks) {
  const outbounds = entries.map((entry, index) => {
    const outbound = clone(entry.outbound);
    outbound.tag = `proxy-${index}`;
    return outbound;
  });

  return {
    remarks,

    dns: {
      hosts: {
        "domain:googleapis.cn": "googleapis.com",
        "domain:gstatic.com": "gstatic.com"
      },
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
        destination: "https://connectivitycheck.gstatic.com/generate_204",
        connectivity: "",
        interval: "1m",
        sampling: 10,
        timeout: "5s",
        httpMethod: "HEAD"
      }
    }
  };
}

function makeServer(config, country, flag, number) {
  const result = clone(config);
  result.remarks = `${flag} ${country} #${number}`;
  return result;
}

function compareRussian(a, b) {
  return a.localeCompare(b, "ru", {
    sensitivity: "base",
    numeric: true
  });
}

export function transformSubscription(input) {
  const sourceConfigs = getConfigArray(input);

  const normalEntries = [];
  const bypassEntries = [];
  const countries = new Map();

  for (let index = 0; index < sourceConfigs.length; index++) {
    const config = sourceConfigs[index];
    const remark = getSourceRemark(config, index);
    const flag = getFlag(remark);
    const country = getCountryName(flag);

    if (!country || !flag) {
      continue;
    }

    const bypass = isBypassConfig(config);
    const outbounds = extractProxyOutbounds(config);

    for (const outbound of outbounds) {
      const entry = {
        outbound,
        config,
        flag,
        country,
        remark
      };

      if (bypass) {
        bypassEntries.push(entry);
      } else {
        normalEntries.push(entry);
      }
    }

    if (!bypass) {
      if (!countries.has(country)) {
        countries.set(country, {
          flag,
          servers: []
        });
      }

      countries.get(country).servers.push({
        config,
        flag,
        country,
        remark
      });
    }
  }

  const finalConfigs = [];

  if (normalEntries.length) {
    finalConfigs.push(
      makeAutoConfig(
        normalEntries,
        "🇪🇺 АВТО⚡ #1"
      )
    );
  }

  if (bypassEntries.length) {
    finalConfigs.push(
      makeAutoConfig(
        bypassEntries,
        "🇪🇺 АВТО #2 (Обход глушилок)"
      )
    );
  }

  const sortedCountries = [...countries.entries()]
    .sort(([a], [b]) => compareRussian(a, b));

  for (const [country, group] of sortedCountries) {
    group.servers.sort((a, b) =>
      compareRussian(a.remark, b.remark)
    );

    let number = 1;

    for (const server of group.servers) {
      finalConfigs.push(
        makeServer(
          server.config,
          country,
          server.flag,
          number++
        )
      );
    }
  }

  return {
    configs: finalConfigs,
    stats: {
      source: sourceConfigs.length,
      normalOutbounds: normalEntries.length,
      bypassOutbounds: bypassEntries.length,
      countries: sortedCountries.length,
      total: finalConfigs.length
    }
  };
}

if (process.argv[1]?.endsWith("transform.js")) {
  const inputPath = process.argv[2] || "data/subscription.json";
  const outputPath = process.argv[3] || "public/subscription.json";

  const raw = await fs.readFile(inputPath, "utf8");
  const input = JSON.parse(raw);
  const result = transformSubscription(input);

  await fs.mkdir(
    outputPath.substring(0, outputPath.lastIndexOf("/")),
    { recursive: true }
  );

  await fs.writeFile(
    outputPath,
    JSON.stringify(result, null, 2) + "\n",
    "utf8"
  );

  console.log(
    `OK: ${result.stats.total} configs | ` +
    `${result.stats.countries} countries | ` +
    `${result.stats.normalOutbounds} normal | ` +
    `${result.stats.bypassOutbounds} bypass`
  );
}
