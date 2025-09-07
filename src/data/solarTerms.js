export const SOLAR_TERMS = [
  { month: 2, day: 4, name: "입춘 🌱", desc: "봄의 시작" },
  { month: 2, day: 19, name: "우수 💧", desc: "봄비가 내림" },
  { month: 3, day: 5, name: "경칩 🐸", desc: "개구리가 깨어남" },
  { month: 3, day: 20, name: "춘분 🌸", desc: "밤낮이 같음" },
  { month: 4, day: 5, name: "청명 🌿", desc: "하늘이 맑아짐" },
  { month: 4, day: 20, name: "곡우 🌧", desc: "곡식에 비가 내림" },
  { month: 5, day: 5, name: "입하 🌱", desc: "여름의 시작" },
  { month: 5, day: 21, name: "소만 🌾", desc: "만물이 자람" },
  { month: 6, day: 6, name: "망종 🌾", desc: "보리 수확" },
  { month: 6, day: 21, name: "하지 ☀️", desc: "낮이 가장 김" },
  { month: 7, day: 7, name: "소서 🌞", desc: "더위 시작" },
  { month: 7, day: 22, name: "대서 🔥", desc: "가장 무더움" },
  { month: 8, day: 7, name: "입추 🍂", desc: "가을 시작" },
  { month: 8, day: 23, name: "처서 🍃", desc: "더위 그침" },
  { month: 9, day: 7, name: "백로 🌕", desc: "이슬이 내림" },
  { month: 9, day: 23, name: "추분 🍁", desc: "밤낮이 같음" },
  { month: 10, day: 8, name: "한로 ❄️", desc: "찬 이슬" },
  { month: 10, day: 23, name: "상강 🍂", desc: "서리가 내림" },
  { month: 11, day: 7, name: "입동 ❄️", desc: "겨울 시작" },
  { month: 11, day: 22, name: "소설 🌨", desc: "첫눈" },
  { month: 12, day: 7, name: "대설 🌨", desc: "큰 눈" },
  { month: 12, day: 21, name: "동지 🌓", desc: "밤이 가장 김" },
  { month: 1, day: 5, name: "소한 🥶", desc: "추위 시작" },
  { month: 1, day: 20, name: "대한 🥶", desc: "가장 추움" },
];

export function getSolarTerm(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // 오늘과 가장 가까운 과거 절기를 찾음
  const sorted = [...SOLAR_TERMS].sort(
    (a, b) => new Date(date.getFullYear(), a.month - 1, a.day) - new Date(date.getFullYear(), b.month - 1, b.day)
  );
  let current = sorted[0];
  for (const t of sorted) {
    const termDate = new Date(date.getFullYear(), t.month - 1, t.day);
    if (date >= termDate) current = t;
  }
  return current;
}