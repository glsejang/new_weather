import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useRef } from "react";

function getWeekMinMax(data) {
  if (!data?.length) return { gmin: 0, gmax: 0 };
  const mins = data.map(d => Number(d.minTemp));
  const maxs = data.map(d => Number(d.maxTemp));
  return { gmin: Math.min(...mins), gmax: Math.max(...maxs) };
}
function condClass(conditionKo = "") {
  const t = conditionKo.toLowerCase();
  if (t.includes("비") || t.includes("소나기")) return "rain";
  if (t.includes("눈")) return "snow";
  if (t.includes("구름") || t.includes("흐림")) return "cloudy";
  return "sunny";
}
function percentOfRange(value, min, max) {
  if (max === min) return 100;
  return ((Number(value) - min) / (max - min)) * 100;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
const VARIANTS = ["va", "vb", "vc", "vd", "ve", "vf"]; // 6가지 변형

export default function Week() {
  const navigate = useNavigate();
  const forecastData = useSelector((state) => state.forecast.data);
  const headerRef = useRef(null);
  const rootRef = useRef(null);

  const handlers = useSwipeable({
    onSwipedUp: () => navigate("/"),
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  useEffect(() => {
    const setHeaderVar = () => {
      if (!headerRef.current || !rootRef.current) return;
      const h = headerRef.current.offsetHeight;
      rootRef.current.style.setProperty("--headerH", `${h}px`);
    };
    setHeaderVar();
    window.addEventListener("resize", setHeaderVar);
    window.addEventListener("orientationchange", setHeaderVar);
    return () => {
      window.removeEventListener("resize", setHeaderVar);
      window.removeEventListener("orientationchange", setHeaderVar);
    };
  }, []);

  const { gmin, gmax } = getWeekMinMax(forecastData);

  return (
    <div {...handlers} className="week" ref={rootRef}>
      <div className="week-chrome" ref={headerRef}>
        <div className="week-title">
          <h1>주간 예보</h1>
          <span className="hint">아래로 스크롤 · 위로 스와이프하면 홈</span>
        </div>
      </div>

      {forecastData && forecastData.length > 0 && (
        <div className="week-grid">
          {forecastData.slice(0, 7).map((item, index) => {
            const tMid = (Number(item.maxTemp) + Number(item.minTemp)) / 2;
            const tPercent = percentOfRange(tMid, gmin, gmax);
            const keySeed = String(item.date ?? index);
            const v = VARIANTS[hashStr(keySeed) % VARIANTS.length];
            const d = new Date(item.date);
            const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
            const weekday = ["일","월","화","수","목","금","토"][d.getDay()];
            return (
              <article
                key={index}
                className={`day-card ${condClass(item.conditionKo)} ${v}`}
              >

                <div className="row">
                  <div className="col-left">
                    <div className="date">
                      <span className="d">{dateLabel}</span>
                      <span className="w">{weekday}</span>
                    </div>
                    <div className="temp-pill" title="최고 / 최저">
                      <span className="max">{item.maxTemp}°</span>
                      <span className="dot" />
                      <span className="min">{item.minTemp}°</span>
                    </div>
                    <div className="temp-range" style={{ ["--t"]: `${tPercent}` }}>
                      <div className="fill" />
                    </div>
                  </div>
                  <div className="col-right">
                    <div className="cond">{item.conditionKo}</div>
                    <div className="badges">
                      <div className="badge">
                        <b>{item.willItRain ?? 0}%</b>
                        강수확률
                      </div>
                      <div className="badge">
                        <b>{item.humidity ?? 0}%</b>
                        습도
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
