// condition-ko.js ─ 영어 날씨문구 → 한글 간단 번역기
export function koConditionText(text, { isDay = 1 } = {}) {
  if (!text) return "";
  const INTENSITY = {
    light: "약한", moderate: "보통", heavy: "강한",
    severe: "심한", slight: "약한", gentle: "약한", intense: "강한",
  };
  const QUALIFIERS = {
    patchy: "곳곳에", scattered: "산발적인", isolated: "국지적",
    occasional: "때때로", intermittent: "간헐적", nearby: "주변",
  };
  const SKY = {
    clear: "맑음", sunny: "맑음",
    cloudy: "구름 많음", overcast: "흐림",
  };
  const NOUNS = {
    rainy: "비", rain: "비", drizzle: "이슬비",
    shower: "소나기", showers: "소나기",
    snowy: "눈", snow: "눈", sleet: "진눈깨비",
    hail: "우박", thunder: "천둥", thunderstorm: "뇌우", thunderstorms: "뇌우",
    fog: "안개", mist: "엷은 안개", haze: "연무", windy: "바람",
  };
  const RULES = [
    { re: /^(clear|sunny)$/i, fn: (_, { isDay }) => (isDay ? "맑음" : "맑은 밤") },
    { re: /overcast/i, ko: "흐림" },
    { re: /partly\s*cloudy|scattered\s*clouds|intermittent\s*clouds/i, ko: "구름 조금" },
    { re: /mostly\s*cloudy/i, ko: "대체로 흐림" },
    { re: /patchy\s*rain(?:.*nearby)?/i, ko: "곳곳에 비" },
    { re: /(light|moderate|heavy)\s+(drizzle|rain|snow|sleet)/i,
      fn: (m) => `${INTENSITY[m[1].toLowerCase()]} ${NOUNS[m[2]]}` },
    { re: /(light|moderate|heavy)?\s*\w*\s*showers?/i,
      fn: (m) => `${m[1] ? INTENSITY[m[1].toLowerCase()] + " " : ""}소나기` },
    { re: /thunderstorms?|thunder\s*showers?/i, ko: "천둥번개" },
    { re: /mist/i, ko: "엷은 안개" },
    { re: /fog/i, ko: "안개" },
    { re: /haze/i, ko: "연무" },
    { re: /windy|breezy|gusty/i, ko: "바람" },
  ];

  const src = String(text).trim();
  for (const r of RULES) {
    const m = src.match(r.re);
    if (m) return r.fn ? r.fn(m, { isDay }) : r.ko;
  }
  const s = src.toLowerCase();
  if (SKY[s]) return s === "clear" ? (isDay ? "맑음" : "맑은 밤") : SKY[s];
  if (NOUNS[s]) return NOUNS[s];

  const tokens = s.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  const INT = (t) => INTENSITY[t] || QUALIFIERS[t] || "";
  const SKYN = (t) => SKY[t] || NOUNS[t] || "";
  const pieces = tokens.map((t) => SKY[t] || NOUNS[t] || INTENSITY[t] || QUALIFIERS[t] || t);
  const out = pieces.join(" ").trim();
  return out === s ? src : out;
}

// 간단 시즌 판별(절기 디테일 대신 우선 월 기준)
export function seasonFromDate(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const m = new Date(dateStr + "T12:00:00").getMonth() + 1;
  if ([3,4,5].includes(m)) return "spring";
  if ([6,7,8].includes(m)) return "summer";
  if ([9,10,11].includes(m)) return "autumn";
  return "winter";
}

// 날씨/계절별 배경테마 (그라데이션/톤/아이콘키 등)
// Tailwind 쓰면 bg 클래스에 매핑, 아니면 style에 쓰세요.
export function themeFromCondition({ code, text, season }) {
  // 넓은 카테고리 키
  let key = "clear";
  const t = (text || "").toLowerCase();

  if (code) {
    if ([1000].includes(code)) key = "clear";
    else if ([1003,1006,1009].includes(code)) key = "cloudy";
    else if ([1063,1150,1153,1180,1183,1186,1189,1192,1195,1240,1243,1246].includes(code)) key = "rain";
    else if ([1210,1213,1216,1219,1222,1225,1255,1258].includes(code)) key = "snow";
    else if ([1087,1273,1276,1279,1282].includes(code)) key = "thunder";
    else if ([1030,1135,1147].includes(code)) key = "fog";
  } else {
    if (/rain|drizzle|shower/i.test(t)) key = "rain";
    else if (/snow|sleet|hail/i.test(t)) key = "snow";
    else if (/thunder/i.test(t)) key = "thunder";
    else if (/fog|mist|haze/i.test(t)) key = "fog";
    else if (/cloud|overcast/i.test(t)) key = "cloudy";
    else if (/clear|sunny/i.test(t)) key = "clear";
  }

  // 시즌별 톤 보정
  const seasonTone = {
    spring: { accent: "#79d2a6" },
    summer: { accent: "#5bbefc" },
    autumn: { accent: "#f0a35b" },
    winter: { accent: "#7bb0d6" },
  }[season] || { accent: "#7bb0d6" };

  const themes = {
    clear:   { gradient: ["#8ec5fc","#e0c3fc"], iconKey:"sun",    pattern:"dots-soft" },
    cloudy:  { gradient: ["#cfd9df","#e2ebf0"], iconKey:"cloud",  pattern:"cloudy-soft" },
    rain:    { gradient: ["#6a85b6","#bac8e0"], iconKey:"rain",   pattern:"raindrops" },
    snow:    { gradient: ["#dfe9f3","#ffffff"], iconKey:"snow",   pattern:"snowflakes" },
    thunder: { gradient: ["#3a3d40","#181719"], iconKey:"storm",  pattern:"zigzag" },
    fog:     { gradient: ["#d7d2cc","#304352"], iconKey:"fog",    pattern:"mesh" },
  };

  const base = themes[key] || themes.clear;
  return {
    key,                              // "clear" | "cloudy" | "rain" ...
    gradient: base.gradient,          // ["#from","#to"]
    pattern: base.pattern,            // 패턴 이름(디자인 시스템에서 매핑)
    iconKey: base.iconKey,            // 아이콘 선택 키
    accent: seasonTone.accent,        // 시즌별 포인트 컬러
  };
}