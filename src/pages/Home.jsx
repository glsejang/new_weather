import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { cityNameMap } from '../data/cityNameMap';
import { getTime } from '../apis/getTIme';
import { getWeeklyWeather } from '../apis/weatherInfo';
import { getUserData } from '../db';
import { useSwipeable } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';
import { setForecast } from '../features/forecastSlice';
import { getSolarTerm } from '../data/solarTerms';
const DEBUG_WEATHER = true;

const REFRESH_THRESHOLD = 72;
const NAV_THRESHOLD = 64;
const COOLDOWN_MS = 1200;

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const get = (obj, path, d) => path.reduce((a, k) => (a == null ? a : a[k]), obj) ?? d;

function conditionToClass(cond = '') {
  const c = String(cond).toLowerCase();
  if (c.includes('sun') || c.includes('맑음') || c.includes('맑')) return 'sunny';
  if (c.includes('cloud') || c.includes('구름') || c.includes('흐')) return 'cloudy';
  if (c.includes('rain') || c.includes('비') || c.includes('shower') || c.includes('storm') || c.includes('천둥')) return 'rain';
  if (c.includes('snow') || c.includes('눈') || c.includes('sleet')) return 'snow';
  if (c.includes('haze') || c.includes('mist') || c.includes('fog') || c.includes('안개')) return 'haze';
  return 'default';
}

// 한글 라벨
function labelFor(cond = '') {
  const c = conditionToClass(cond);
  if (c === 'sunny')  return '맑음';
  if (c === 'cloudy') return '흐림';
  if (c === 'rain')   return '비';
  if (c === 'snow')   return '눈';
  if (c === 'haze')   return '안개';
  return '맑음';
}
// UV 한글
function uvText(uv) {
  if (uv >= 8) return '높음';
  if (uv >= 3) return '보통';
  return '낮음';
}

function pickDominantClass(days = []) {
  const counts = { sunny: 0, cloudy: 0, rain: 0, snow: 0, haze: 0, default: 0 };
  for (const d of days) {
    const t = d?.day?.condition?.text ?? d?.condition?.text ?? d?.condition ?? '';
    counts[conditionToClass(t)]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'sunny';
}

// 추천 식물 간단 매핑
const plantMap = {
  sunny: ['제라늄', '선인장', '라벤더'],
  cloudy: ['스파티필름', '아글라오네마'],
  rain: ['아이비', '몬스테라'],
  snow: ['칼랑코에', '호야'],
  haze: ['스투키', '행운목'],
  default: ['제라늄'],
};

export default function Home() {
  const [settings, setSettings] = useState(null);
  const selectedCity = useSelector((s) => s.city.selectedCity);
  const { data: forecastData, lastUpdated } = useSelector((s) => s.forecast);
  const [isLoading, setIsLoading] = useState(false);
  const [city, setCity] = useState('');

  const [progress, setProgress] = useState([]);

  const { yyyymmdd, hour } = getTime();
  const hourInt = parseInt(String(hour).slice(0, 2), 10);
  const isNight = Number.isFinite(hourInt) ? hourInt >= 19 || hourInt < 7 : false;

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [pullOffset, setPullOffset] = useState(0);
  const [gestureLocked, setGestureLocked] = useState(null);
  const lastTriggerRef = useRef(0);
  const canTrigger = () => {
    const now = Date.now();
    if (now - lastTriggerRef.current < COOLDOWN_MS) return false;
    lastTriggerRef.current = now;
    return true;
  };

  // 예보 배열 정규화
  const days = useMemo(() => {
    if (Array.isArray(forecastData)) return forecastData;
    if (forecastData?.forecastday) return forecastData.forecastday;
    return [];
  }, [forecastData]);
  const today = days[0] || null;

  // 수치
  const maxTemp = num(today?.maxTemp ?? get(today, ['day', 'maxtemp_c']) ?? today?.maxtemp_c);
  const minTemp = num(today?.minTemp ?? get(today, ['day', 'mintemp_c']) ?? today?.mintemp_c);
  const avgHumidity = num(today?.humidity ?? get(today, ['day', 'avghumidity']));
  const uv = num(today?.uv ?? get(today, ['day', 'uv']));
  const windKph = num(
    today?.maxWindKph ??              // ← 너의 응답 구조(camelCase)
    today?.maxwind_kph ??             // 혹시 다른 스키마
    get(today, ['day', 'maxwind_kph']),
    NaN
  );

  const windMsSrc =
    today?.maxWind ??                 // m/s로 오는 경우
    today?.maxwind_m_s ??
    get(today, ['day', 'maxwind_m_s']);

  const windMs = Number.isFinite(windMsSrc)
    ? windMsSrc
    : (Number.isFinite(windKph) ? windKph / 3.6 : NaN); 

  function windLabel(ms) {
    if (!Number.isFinite(ms)) return '--';
    if (ms < 0.3)   return '잔잔';       // Beaufort 0
    if (ms < 3.4)   return '약함';       // 0.3–3.3 m/s
    if (ms < 8.0)   return '보통';       // 3.4–7.9
    if (ms < 13.9)  return '강함';       // 8.0–13.8
    return '매우 강함';                  // ≥13.9
  }



  const rainProb = num(today?.rainProb ?? today?.willItRain ?? get(today, ['day', 'daily_chance_of_rain']));
  const condTextRaw =
    today?.conditionKo ??
    today?.conditionEn ??
    today?.day?.condition?.text ??
    today?.condition?.text ??
    today?.condition ?? '';
  const condText = String(condTextRaw).trim();
  const dominantClass = pickDominantClass(days);
  const themeLabel = labelFor(condText);
  const solarTerm = getSolarTerm();

  // 추천 식물
  const weatherKey = conditionToClass(condText) || dominantClass || 'default';
  const recoPlant = (plantMap[weatherKey] || plantMap.default)[0];

  // 데이터 fetch
const fetchAndSetForecast = async () => {
  if (!city) return;
  setIsLoading(true);
  try {
    const apiCity = cityNameMap[city];
    const newForecastData = await getWeeklyWeather(apiCity);

    if (DEBUG_WEATHER) {
      console.groupCollapsed(
        `[weather] raw response for "${city}" → "${apiCity}"`
      );
      console.log('raw:', newForecastData);

      // 배열/객체 둘 다 대응
      const days = Array.isArray(newForecastData)
        ? newForecastData
        : (newForecastData?.forecastday ?? []);

      console.log('days length:', days.length);

      // 핵심 필드만 추려서 보기 쉽게 출력
      const peek = days.map((d, i) => ({
        idx: i,
        date: d?.date ?? (d?.date_epoch ? new Date(d.date_epoch * 1000).toISOString().slice(0, 10) : ''),
        condition: d?.day?.condition?.text ?? d?.condition?.text ?? d?.condition ?? '',
        maxtemp_c: d?.day?.maxtemp_c ?? d?.maxtemp_c ?? null,
        mintemp_c: d?.day?.mintemp_c ?? d?.mintemp_c ?? null,
        avghumidity: d?.day?.avghumidity ?? d?.humidity ?? null,
        uv: d?.day?.uv ?? d?.uv ?? null,
        // 바람: 단위가 다를 수 있으니 둘 다 확인
        maxwind_kph: d?.day?.maxwind_kph ?? d?.maxwind_kph ?? null,
        maxwind_m_s: d?.day?.maxwind_m_s ?? d?.maxWind ?? null,
        // 강수확률
        pop: d?.day?.daily_chance_of_rain ?? d?.daily_chance_of_rain ?? null,
      }));
      console.table(peek);
      console.groupEnd();
    }

    dispatch(setForecast(newForecastData));
  } catch (e) {
    console.error('날씨 정보를 불러오는 데 실패했습니다.', e);
  } finally {
    setIsLoading(false);
  }
};

  // 제스처
  const handlers = useSwipeable({
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: true,
    onSwiping: ({ deltaX, deltaY }) => {
      if (!gestureLocked) {
        if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) setGestureLocked('vertical');
        else if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) setGestureLocked('horizontal');
      }
      if (gestureLocked === 'vertical' && deltaY > 0) {
        const damp = isLoading ? 0.4 : 0.7;
        setPullOffset(Math.min(deltaY * damp, 140));
      }
    },
    onSwipedDown: async ({ deltaY }) => {
      setPullOffset(0);
      setGestureLocked(null);
      if (deltaY < REFRESH_THRESHOLD) return;
      if (isLoading) return;
      if (!canTrigger()) return;
      try { navigator?.vibrate?.(20); } catch {}
      await fetchAndSetForecast();
    },
    onSwipedUp: ({ deltaY }) => {
      setPullOffset(0);
      setGestureLocked(null);
      if (Math.abs(deltaY) < NAV_THRESHOLD) return;
      if (!canTrigger()) return;
      navigate('/week');
    },
    onSwipedLeft: ({ deltaX, event }) => {
      setPullOffset(0);
      setGestureLocked(null);
      if (Math.abs(deltaX) < NAV_THRESHOLD) return;
      if (isLoading) return;
      if (!canTrigger()) return;
      if (event?.target?.closest?.('.seasonbar, .chips, .pchips')) return;
      const cityToUse = selectedCity || settings?.city || city;
      navigate('/todos', { state: { city: cityToUse, plants: settings?.plants, forecast: forecastData } });
    },
    onTouchEndOrOnMouseUp: () => {
      setPullOffset(0);
      setGestureLocked(null);
    },
  });

  // 사용자 데이터
  useEffect(() => {
    (async () => {
      const data = await getUserData();
      if (data?.city) {
        setCity(data.city);
        setSettings(data);
      } else {
        setSettings({ plants: [] });
      }
    })();
  }, []);

  // 자동 새로고침
  useEffect(() => {
    if (!city) return;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const isOutdated = !lastUpdated || (now - lastUpdated) > oneHour;
    if (isOutdated) fetchAndSetForecast();
  }, [city, dispatch, lastUpdated]);

  // 진행칩 로드
  useEffect(() => {
    const keyCity = selectedCity || city;
    if (!keyCity) return;
    try {
      const raw = localStorage.getItem(`todo-progress-latest-${keyCity}`);
      if (raw) setProgress(JSON.parse(raw));
    } catch {}
  }, [city, selectedCity, lastUpdated]);

  if (!settings) return <div>로딩 중...</div>;

  const goTodos = () => {
    const cityToUse = selectedCity || settings?.city || city;
    navigate('/todos', { state: { city: cityToUse, plants: settings?.plants, forecast: forecastData } });
  };

  return (
    <div className="app" {...handlers}>
      {/* Pull-to-Refresh */}
      <div
        className="pull-indicator"
        style={{
          height: pullOffset,
          opacity: pullOffset > 0 ? 1 : 0,
          display: pullOffset > 0 ? 'flex' : 'none',
          transition: 'height .15s ease',
          color: '#52555a',
          fontSize: 12,
        }}
      >
        {pullOffset >= REFRESH_THRESHOLD ? '놓으면 새로고침' : '아래로 당겨서 새로고침'}
      </div>

      {/* 상단(네비 + 히어로) */}
      <div className={`home ${dominantClass} ${isNight ? 'night' : 'day'}`}>
        <div className="nav">
          <div className="nav-meta">
            <h3 onClick={() => navigate('/setting')} title="설정">⚙️</h3>
            <h3>{yyyymmdd}</h3>
            <h3>{String(hour).slice(0, 2)}:{String(hour).slice(2, 4) || '00'}</h3>
            <h3>{selectedCity || settings.city}</h3>
          </div>

          {/* HERO */}
          <div className={`hero-slab ${isNight ? 'night' : 'day'}`}>
            <div className="tempBig">
              {Number.isFinite(maxTemp) ? Math.round((maxTemp + minTemp) / 2) : '--'}
              <span>°C</span>
            </div>

            <div className="vlabel">{themeLabel}</div>

            <div className="orb" aria-hidden="true">
              <i className="glow" />
              <i className="horizon" />
            </div>

            <div className="cityline">
              <div className="city">{selectedCity || settings.city}</div>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="k">자외선</div>
                <div className="v">{uvText(uv)}</div>
              </div>
              <div className="metric">
                <div className="k">바람</div>
                <div className="v">{windLabel(windMs)}</div>
              </div>
              <div className="metric">
                <div className="k">습도</div>
                <div className="v">{Number.isFinite(avgHumidity) ? `${Math.round(avgHumidity)}%` : '--'}</div>
              </div>
            </div>

            {/* 히어로 하단 도크: 절기 + 서브칩 */}
            <div className="hero-dock">
              <div className="seasonbar in-hero">
                <span className="s-badge">{solarTerm?.name || '절기'}</span>
                <span className="s-text">{solarTerm?.desc || ''}</span>
              </div>

              <div className="chips subtle">
                <span className="chip">{condText || '—'}</span>
                <span className="chip">비 {Number.isFinite(rainProb) ? `${Math.round(rainProb)}%` : '0%'}</span>
                <span className="chip">최고 {Number.isFinite(maxTemp) ? `${Math.round(maxTemp)}°` : '--'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 추천 식물 (슬림) */}
      <section className="card detail mellow plant-card ad-split">
        <div className="section-title">오늘의 추천 식물</div>

        {/* 왼쪽: 추천 식물 */}
        <div className="plant-reco">
          <div className="plant-thumb">🌿</div>
          <div className="plant-info">
            <div className="plant-name">{recoPlant}</div>
            <div className="plant-desc">오늘 날씨에 잘 맞아요.</div>
          </div>
        </div>

        {/* 오른쪽: 광고 슬롯 (지금은 자리만, 나중에 SDK 붙이면 됨) */}
        <aside
          className="ad-slot"
          id="ad-home-rect"
          role="complementary"
          aria-label="광고 영역"
          title="광고 영역"
        />
      </section>

      {/* 진행도 칩 */}
      {progress?.length > 0 && (
        <section className="progress-band compact-gap">
          <div
            className="pchips"
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {progress.slice(0, 7).map((p) => (
              <button
                key={p.plant}
                type="button"
                className="pchip"
                title={`${p.plant} · ${p.pct}%`}
                onClick={goTodos}
                style={{ '--pct': `${p.pct}%` }}
              >
                <span className="pname">{p.plant}</span>
                <span className="ppct">{p.pct}%</span>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 오늘 상세 (2열 타일) */}
      <section className="card detail mellow today-compact">
        <div className="section-title">오늘 상세</div>
        <div className="microgrid">
          <div className="cell"><b>최고/최저</b><span>{Number.isFinite(maxTemp) ? Math.round(maxTemp) : '--'}° / {Number.isFinite(minTemp) ? Math.round(minTemp) : '--'}°</span></div>
          <div className="cell"><b>강수확률</b><span>{Number.isFinite(rainProb) ? Math.round(rainProb) : 0}%</span></div>
          <div className="cell"><b>습도</b><span>{Number.isFinite(avgHumidity) ? Math.round(avgHumidity) : '--'}%</span></div>
          <div className="cell"><b>자외선</b><span>{uv || 0}</span></div>
          <div className="cell"><b>바람</b><span>{windMs ? `${windMs.toFixed(1)} m/s` : '--'}</span></div>
          <div className="cell"><b>날씨</b><span>{condText || '--'}</span></div>
        </div>
      </section>

      <div className="status" style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
        {isLoading ? '새로고침 중...' : '↓ 당겨서 새로고침 · ↑ 주간 · ← 투두'}
      </div>
    </div>
  );
}
