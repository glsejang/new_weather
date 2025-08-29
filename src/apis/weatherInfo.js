import axios from 'axios'



export async function getWeeklyWeather(city) {
   const WEATHERAPI_KEY = import.meta.env.VITE_WEATHERAPI_KEY;


    const res = await axios.get('https://api.weatherapi.com/v1/forecast.json', {
    params: {
      key: WEATHERAPI_KEY,
      q: city,
      days: 7,
      aqi: 'no',
      alerts: 'no',
    },
  })
  return res.data.forecast.forecastday.map((day) => ({
    date: day.date,
    condition: day.day.condition.text,
    icon: day.day.condition.icon,
    
    // 온도 관련
    avgTemp: day.day.avgtemp_c,
    maxTemp: day.day.maxtemp_c,
    minTemp: day.day.mintemp_c,
    maxFeelsLike: day.day.feelslike_c, // 주간 평균 체감온도 (feelslike_c는 보통 현재 날씨에 있음)

    // 습도/강수/기타
    humidity: day.day.avghumidity,
    rainChance: day.day.daily_chance_of_rain,
    willItRain: day.day.daily_will_it_rain,
    totalPrecip: day.day.totalprecip_mm, // 강수량 mm

    // 바람
    maxWindKph: day.day.maxwind_kph,
    windDir: day.day.maxwind_dir,

    // 해/달 관련
    sunrise: day.astro.sunrise,
    sunset: day.astro.sunset,
    moonPhase: day.astro.moon_phase,
    moonIllumination: day.astro.moon_illumination,
  }))
}

