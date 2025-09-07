import axios from 'axios'
import { koConditionText, seasonFromDate, themeFromCondition } from "../data/weatherKr";



export async function getWeeklyWeather(city) {
  const WEATHERAPI_KEY = import.meta.env.VITE_WEATHERAPI_KEY;

  const res = await axios.get("https://api.weatherapi.com/v1/forecast.json", {
    params: {
      key: WEATHERAPI_KEY,
      q: city,
      days: 7,
      aqi: "no",
      alerts: "no",
      lang: "en"  // condition.text는 영어로 받고, 우리가 한글 변환
    },
  });

  const days = res.data.forecast.forecastday.map((day) => {
    const date = day.date; // "YYYY-MM-DD"
    const season = seasonFromDate(date);
    const code = day.day?.condition?.code;     // WeatherAPI가 함께 주는 코드(있으면 더 안정)
    const text = day.day?.condition?.text || ""; // 영어 문구
    const theme = themeFromCondition({ code, text, season });

    return {
      date,
      season,                 // "spring/summer/autumn/winter"
      conditionEn: text,      // 원문 보관
      conditionKo: koConditionText(text, { isDay: 1 }),
      conditionCode: code ?? null,
      icon: day.day.condition.icon,

      // 온도
      avgTemp: day.day.avgtemp_c,
      maxTemp: day.day.maxtemp_c,
      minTemp: day.day.mintemp_c,
      // maxFeelsLike: day.day.feelslike_c, // forecast.day에는 없음(원하면 hourly로 계산)

      // 습도/강수/기타
      humidity: day.day.avghumidity,
      rainChance: day.day.daily_chance_of_rain,
      willItRain: day.day.daily_will_it_rain,
      totalPrecip: day.day.totalprecip_mm,

      // 바람
      maxWindKph: day.day.maxwind_kph,
      windDir: day.day.maxwind_dir,

      // 해/달
      sunrise: day.astro.sunrise,
      sunset: day.astro.sunset,
      moonPhase: day.astro.moon_phase,
      moonIllumination: day.astro.moon_illumination,

      // UI 테마(그라데이션/패턴/아이콘키/포인트컬러)
      theme,
    };
  });

  return days;
}


