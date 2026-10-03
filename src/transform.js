import fs from "node:fs/promises";

/*
 * OokVPN subscription transformer
 *
 * Порядок:
 * 1. 🇪🇺 Автовыбор 🔍
 * 2. 🇪🇺 Автовыбор обход глушилок 🔍
 * 3. Страны по алфавиту
 * 4. Серверы внутри страны: #1, #2, #3...
 *
 * Флаг берётся из remark исходного сервера.
 */

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
  "🇦🇽": "Аландские острова",
  "🇪🇺": "Европейский союз",
  "🇺🇳": "ООН"
};

const FLAG_RE =
  /[\u{1F1E6}-\u{1F1FF}]{2}/u;

const FALLBACK_COUNTRY = "Неизвестная страна";

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFlag(text) {
  const match = normalizeText(text).match(FLAG_RE);
  return match?.[0] ?? "";
}

function getCountryName(flag) {
  if (!flag) return FALLBACK_COUNTRY;

  if (COUNTRY_OVERRIDES[flag]) {
    return COUNTRY_OVERRIDES[flag];
  }

  const chars = [...flag];

  if (chars.length !== 2) {
    return FALLBACK_COUNTRY;
  }

  const code = chars
    .map(char =>
      String.fromCodePoint(char.codePointAt(0) - 0x1F1E6 + 65)
    )
    .join("");

  try {
    const names = new Intl.DisplayNames(["ru"], {
      type: "region"
    });

    return names.of(code) || FALLBACK_COUNTRY;
  } catch {
    return FALLBACK_COUNTRY;
  }
}

function getConfigArray(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.configs)) {
    return data.configs;
  }

  if (Array.isArray(data?.servers)) {
    return data.servers;
  }

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
  const outbounds = Array.isArray(config?.outbounds)
    ? config.outbounds
    : [];

  return outbounds
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

function makeAutoConfig(entries) {
  const outbounds = [];

  for (let i = 0; i < entries.length; i++) {
    const outbound = clone(entries[i].outbound);

    outbound.tag = `proxy-${i}`;

    outbounds.push(outbound);
  }

  return {
    remarks: "🇪🇺 АВТО ⚡",

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
      pingConfig: {
        destination: "https://www.gstatic.com/generate_204",
        connectivity: "https://www.gstatic.com/generate_204",
        interval: "30s",
        timeout: 3000
      }
    }
  };
}

function makeBypassAutoConfig(entries) {
  const config = makeAutoConfig(entries);

  config.remarks = "🇪🇺 🏳 АВТО ⚡";

  return config;
}

function makeNormalServer(config, country, flag, number) {
  const result = clone(config);

  result.remarks = `${flag || "🏳️"} ${country} #${number}`;

  return result;
}

function makeBypassServer(config, country, flag, number) {
  const result = clone(config);

  result.remarks = `${flag || "🏳️"} 🛡️ ${country} #${number}`;

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

    const flag = getFlag(
      config?.remarks ??
      config?.remark ??
      config?.name ??
      ""
    );

    const country = getCountryName(flag);

    const outbounds = extractProxyOutbounds(config);

    /*
     * Для AUTO вытаскиваем каждый реальный proxy-outbound.
     */
    for (const outbound of outbounds) {
      const entry = {
        outbound,
        config,
        flag,
        country,
        remark: getSourceRemark(config, index)
      };

      if (isBypassConfig(config)) {
        bypassEntries.push(entry);
      } else {
        normalEntries.push(entry);
      }
    }

    /*
     * Группировка обычных серверов.
     */
    if (!isBypassConfig(config)) {
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
        remark: getSourceRemark(config, index)
      });
    }
  }

  /*
   * AUTO №1.
   *
   * Обычные серверы.
   * Обходные LTE/anti-block сюда не попадают.
   */
  const autoNormal = normalEntries.length
    ? makeAutoConfig(normalEntries)
    : null;

  /*
   * AUTO №2.
   *
   * Только серверы, которые определились как обход глушилок.
   */
  const autoBypass = bypassEntries.length
    ? makeBypassAutoConfig(bypassEntries)
    : null;

  const finalConfigs = [];

  /*
   * 1. Автовыбор.
   */
  if (autoNormal) {
    finalConfigs.push(autoNormal);
  }

  /*
   * 2. Автовыбор обхода глушилок.
   */
  if (autoBypass) {
    finalConfigs.push(autoBypass);
  }

  /*
   * 3. Страны по алфавиту.
   */
  const sortedCountries = [...countries.entries()]
    .sort(([a], [b]) => compareRussian(a, b));

  for (const [country, group] of sortedCountries) {
    const flag = group.flag || "🏳️";

    group.servers.sort((a, b) => {
      return compareRussian(a.remark, b.remark);
    });

    let number = 1;

    for (const server of group.servers) {
      finalConfigs.push(
        makeNormalServer(
          server.config,
          country,
          flag,
          number++
        )
      );
    }
  }

  /*
   * Если встретились серверы без страны —
   * не теряем их.
   */
  const unknownConfigs = sourceConfigs.filter(config => {
    const flag = getFlag(
      config?.remarks ??
      config?.remark ??
      config?.name ??
      ""
    );

    return (
      !flag &&
      !isBypassConfig(config)
    );
  });

  let unknownNumber = 1;

  for (const config of unknownConfigs) {
    finalConfigs.push(
      makeNormalServer(
        config,
        FALLBACK_COUNTRY,
        "🏳️",
        unknownNumber++
      )
    );
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

/*
 * Поддержка запуска напрямую:
 *
 * node src/transform.js
 */
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

  console.log("Subscription transformed.");
  console.log(JSON.stringify(result.stats, null, 2));
}
