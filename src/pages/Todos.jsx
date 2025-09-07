import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { makeWeatherPrompt } from '../apis/makePrompt';
import { askGemini } from '../apis/ask';
import { groupingDate } from '../apis/groupingDate';

function asList(v) { return Array.isArray(v) ? v : v ? [v] : []; }
const iso = (d='') => String(d).slice(0,10);

/* ===== 키 표준화 유틸 ===== */
// 날짜는 항상 YYYY-MM-DD
function toISODateStr(d) {
  if (!d) return '';
  try {
    const dt = new Date(String(d));
    if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
  } catch {}
  return String(d).slice(0, 10);
}
// 저장용 도시 키(표시는 원문 유지)
const canonCityKey = (c) => String(c || 'default').trim().toLowerCase();
// 저장용 식물 키(표시는 원문 유지): 이모지/중복공백 제거 + 소문자
function canonPlant(name='') {
  return String(name)
    .normalize('NFKC')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '') // 이모지 제거
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
// 체크 항목 텍스트 표준화(공백/대소문자/전각 등 정리)
function canonText(s='') {
  return String(s)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
// 텍스트 기반 키(id) 만들기 (순서 변화에도 견고)
function makeItemKey(dateStr, plantName, type/* 'todo'|'caution' */, textOrIdx) {
  const d = toISODateStr(dateStr);
  const p = canonPlant(plantName);
  const id = typeof textOrIdx === 'string' ? hashStr(canonText(textOrIdx)) : String(textOrIdx); // 텍스트 우선
  return `${d}-${p}-${type}-${id}`;
}

function conditionToTheme(text = '', hi) {
  const t = String(text).toLowerCase();
  if (/(thunder|번개|뇌우|폭풍)/.test(t)) return 'thunder';
  if (/(snow|눈|sleet)/.test(t)) return 'snow';
  if (/(rain|비|shower|storm)/.test(t)) return 'rain';
  if (/(haze|mist|fog|안개|박무)/.test(t)) return 'haze';
  if (/(cloud|흐|구름)/.test(t)) return 'cloudy';
  if (Number(hi) >= 30) return 'warm';
  return 'sunny';
}

function buildTodoKey(city, plants, forecastDays, variant = 'v1') {
  const day = new Date().toISOString().slice(0,10);       // 날짜 바뀌면 자연 갱신
  const p = [...(plants||[])].map(String).sort();         // 순서 영향 제거
  // 날씨 스냅샷(너무 민감하지 않게 라운딩)
  const f = (forecastDays||[]).slice(0,7).map(d => {
    const date = (d?.date) || (d?.date_epoch ? new Date(d.date_epoch*1000).toISOString().slice(0,10) : '');
    const text = d?.day?.condition?.text ?? d?.condition?.text ?? d?.condition ?? '';
    const hi = Math.round(d?.day?.maxtemp_c ?? d?.maxtemp_c ?? 0);
    const lo = Math.round(d?.day?.mintemp_c ?? d?.mintemp_c ?? 0);
    const pop = Math.round(((d?.day?.daily_chance_of_rain ?? d?.daily_chance_of_rain ?? 0)/10))*10; // 10% 단위
    return { date, t: conditionToTheme(text, hi), hi, lo, pop };
  });
  const payload = JSON.stringify({ city, p, f, day, variant });
  return String(hashStr(payload));
}

// 간단 캐시 API(localStorage)
const TODO_CACHE_PREFIX = 'todos:';
const todoCache = {
  get(key){
    try{ const raw = localStorage.getItem(TODO_CACHE_PREFIX+key); return raw ? JSON.parse(raw) : null; }catch{ return null; }
  },
  set(key, value){
    try{ localStorage.setItem(TODO_CACHE_PREFIX+key, JSON.stringify(value)); }catch{}
  }
};

// 해시
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
const VARIANTS = ["va","vb","vc","vd","ve","vf"];

/* ✅ 홈 진행 칩 요약: 표시는 원문, 조회키는 텍스트 키 사용 */
function summarizeProgressForDay(day, doneSet) {
  if (!day?.tasks?.length) return [];
  const byPlant = new Map();
  const dnorm = toISODateStr(day.date);

  day.tasks.forEach((task) => {
    const name = task.plantName; // 표시용 그대로
    if (!byPlant.has(name)) byPlant.set(name, { done: 0, total: 0 });
    const acc = byPlant.get(name);

    const todos = asList(task.todos);
    const cautions = asList(task.cautions);

    todos.forEach((t) => {
      acc.total += 1;
      const k = makeItemKey(dnorm, task.plantName, 'todo', t);
      if (doneSet.has(k)) acc.done += 1;
    });
    cautions.forEach((c) => {
      acc.total += 1;
      const k = makeItemKey(dnorm, task.plantName, 'caution', c);
      if (doneSet.has(k)) acc.done += 1;
    });
  });

  return Array.from(byPlant, ([plant, { done, total }]) => ({
    plant,
    pct: total ? Math.round((done / total) * 100) : 0,
  }));
}

export default function Todo() {
  const { state } = useLocation();
  const { city, plants, forecast } = state || {};

  const [todos, setTodos] = useState([]);
  const [dateGroupedTodos, setDateGroupedTodos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [doneSet, setDoneSet] = useState(new Set());
  const [doneHydrated, setDoneHydrated] = useState(false); // 복원 완료 플래그

  const storageKey = useMemo(() => `todo-done-${canonCityKey(city)}`, [city]);

  // 복원(도시 확정 후)
  useEffect(() => {
    if (!city) return; // city 확정 전에는 복원하지 않음(‘default’ 초기화 방지)
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDoneSet(new Set(JSON.parse(raw)));
    } catch {}
    setDoneHydrated(true);
  }, [city, storageKey]);

  // 저장(복원 완료 후에만)
  useEffect(() => {
    if (!doneHydrated) return;
    try { localStorage.setItem(storageKey, JSON.stringify(Array.from(doneSet))); } catch {}
  }, [doneSet, storageKey, doneHydrated]);

  const toggleDone = (date, plantName, type, payload /* 텍스트 또는 인덱스 */) => {
    const key = makeItemKey(date, plantName, type, payload); // 텍스트 기반 키
    setDoneSet(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // 프롬프트(메모)
  const prompt = useMemo(() => {
    if (!city || !plants?.length || !forecast?.length) return '';
    return makeWeatherPrompt(city, forecast, plants);
  }, [city, plants, forecast]);

  // 예보 정규화(날씨 테마용)
  const forecastDays = useMemo(() => {
    if (Array.isArray(forecast)) return forecast;
    if (forecast?.forecastday) return forecast.forecastday;
    return [];
  }, [forecast]);

  // 의존성 키(같은 조건이면 재생성 금지)
  const depsKey = useMemo(() => {
    if (!city || !plants?.length || !forecastDays?.length) return '';
    return buildTodoKey(city, plants, forecastDays, 'v1'); // 프롬프트 수정시 'v2'
  }, [city, plants, forecastDays]);

  const getThemeForDate = (dateStr) => {
    const key = iso(dateStr);
    const f = forecastDays.find(d => iso(d?.date) === key || iso(d?.date_epoch ? new Date(d.date_epoch*1000).toISOString() : '') === key);
    const text = f?.day?.condition?.text ?? f?.condition?.text ?? f?.condition ?? '';
    const hi = f?.day?.maxtemp_c ?? f?.maxtemp_c;
    return conditionToTheme(text, hi);
  };

  // 생성(캐시 우선, depsKey 바뀔 때만)
  useEffect(() => {
    if (!depsKey) return;

    const controller = new AbortController();
    (async () => {
      try {
        setIsLoading(true); setError('');

        // 1) 캐시 체크
        const cached = todoCache.get(depsKey);
        if (cached?.list && Array.isArray(cached.list)) {
          setTodos(cached.list);
          const grouped = groupingDate(cached.list) ?? [];
          setDateGroupedTodos(grouped);
          setIsLoading(false);
          return;
        }

        // 2) 미존재 시에만 프롬프트 생성 & 호출
        const promptStr = makeWeatherPrompt(city, forecast, plants);
        const list = await askGemini(promptStr, { signal: controller.signal }) || [];

        // 3) 상태 & 캐시 저장
        setTodos(list);
        const grouped = groupingDate(list) ?? [];
        setDateGroupedTodos(grouped);

        todoCache.set(depsKey, { list, createdAt: Date.now() });
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error(e);
          setError('투두리스트 생성 중 오류가 발생했어요.');
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [depsKey, city, plants, forecast]); // prompt 대신 depsKey 중심

  /* 1회 마이그레이션: 예전 "인덱스 기반 키" → "텍스트 기반 키"로 변환 */
  const migratedTextRef = useRef(false);
  useEffect(() => {
    if (!doneHydrated || !dateGroupedTodos?.length || migratedTextRef.current) return;

    const next = new Set(doneSet);
    let touched = false;

    dateGroupedTodos.slice(0, 7).forEach(day => {
      const dnorm = toISODateStr(day.date);
      day.tasks?.forEach(task => {
        const ts = asList(task.todos);
        const cs = asList(task.cautions);

        ts.forEach((t, j) => {
          const old1 = `${dnorm}-${task.plantName}-todo-${j}`;             // 예전 키(식물명 원문+인덱스)
          const old2 = `${dnorm}-${canonPlant(task.plantName)}-todo-${j}`; // 예전 키(식물명 표준화+인덱스)
          const neo  = makeItemKey(dnorm, task.plantName, 'todo', t);      // 새 키(텍스트 기반)
          if (next.has(old1) || next.has(old2)) {
            next.delete(old1); next.delete(old2);
            next.add(neo); touched = true;
          }
        });

        cs.forEach((c, j) => {
          const old1 = `${dnorm}-${task.plantName}-caution-${j}`;
          const old2 = `${dnorm}-${canonPlant(task.plantName)}-caution-${j}`;
          const neo  = makeItemKey(dnorm, task.plantName, 'caution', c);
          if (next.has(old1) || next.has(old2)) {
            next.delete(old1); next.delete(old2);
            next.add(neo); touched = true;
          }
        });
      });
    });

    if (touched) setDoneSet(next);
    migratedTextRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneHydrated, dateGroupedTodos]);

  /* ✅ 홈 진행 칩용 요약 (표시는 원문, 키는 텍스트 기반) */
  useEffect(() => {
    if (!doneHydrated) return;
    if (!city || !dateGroupedTodos?.length) return;
    const todayCard = dateGroupedTodos[0];
    const summary = summarizeProgressForDay(todayCard, doneSet);
    try { localStorage.setItem(`todo-progress-latest-${city}`, JSON.stringify(summary)); } catch {}
  }, [city, dateGroupedTodos, doneSet, doneHydrated]);

  if (!city || !plants?.length || !forecast?.length) {
    return <div>필수 정보가 없습니다. 도시/식물/예보를 다시 선택해주세요.</div>;
  }
  if (!doneHydrated) return <div>기록 불러오는 중...</div>;
  if (isLoading) return <div>투두리스트를 생성하는 중...</div>;
  if (error) return <div>{error}</div>;

  // 날짜별 카드(최대 7장)
  const days = dateGroupedTodos.slice(0, 7);

  return (
    <div className="todo-grid compact ultra">{/* compact + ultra: 더 작게 */}
      {days.map((day, index) => {
        const theme = getThemeForDate(day.date);
        const v = VARIANTS[hashStr(String(day.date ?? index)) % VARIANTS.length];

        // 진행도(텍스트 기반 키로 계산)
        let total = 0, done = 0;
        const dnorm = toISODateStr(day.date);
        day.tasks?.forEach((task) => {
          const ts = asList(task.todos);
          const cs = asList(task.cautions);
          total += ts.length + cs.length;
          ts.forEach((t) => { if (doneSet.has(makeItemKey(dnorm, task.plantName, 'todo', t))) done += 1; });
          cs.forEach((c) => { if (doneSet.has(makeItemKey(dnorm, task.plantName, 'caution', c))) done += 1; });
        });
        const pct = total ? Math.round((done/total)*100) : 0;

        return (
          <section key={day.date} className={`tcard ${theme} ${v}`}>
            {/* 헤더 영역 */}
            <header className="thead">
              <div className="tdate">{dnorm}</div>
              <div className="tmeta">
                <span className="tpct">{pct}%</span>
              </div>
            </header>

            {/* 진행 바: --val 은 숫자(0~100)로 전달 */}
            <div className="tmeter"><i style={{'--val': pct}} /></div>

            {/* 전체 경고칩 */}
            {day.overallCautionsText && (
              <div className="tchips">
                <span className="chip glass danger">{day.overallCautionsText}</span>
              </div>
            )}

            {/* 카드 콘텐츠 */}
            <div className="tcontent">
              <div className="tasks">
                {day.tasks?.map((task, i) => {
                  const todos = asList(task.todos);
                  const cautions = asList(task.cautions);
                  return (
                    <div key={`${dnorm}-${task.plantName}-${i}`} className="task">
                      <div className="plant">{task.plantName}</div>

                      {todos.length > 0 && (
                        <ul className="todos">
                          {todos.map((t, j) => {
                            const key = makeItemKey(dnorm, task.plantName, 'todo', t);
                            const checked = doneSet.has(key);
                            return (
                              <li
                                key={key}
                                className={checked ? 'done' : ''}
                                role="checkbox"
                                aria-checked={checked}
                                tabIndex={0}
                                onClick={() => toggleDone(dnorm, task.plantName, 'todo', t)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault(); toggleDone(dnorm, task.plantName, 'todo', t);
                                  }
                                }}
                                title={checked ? '완료됨' : '클릭하여 완료 표시'}
                              >
                                {t}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {cautions.length > 0 && (
                        <ul className="cautions">
                          {cautions.map((c, j) => {
                            const key = makeItemKey(dnorm, task.plantName, 'caution', c);
                            const checked = doneSet.has(key);
                            return (
                              <li
                                key={key}
                                className={checked ? 'done' : ''}
                                role="checkbox"
                                aria-checked={checked}
                                tabIndex={0}
                                onClick={() => toggleDone(dnorm, task.plantName, 'caution', c)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault(); toggleDone(dnorm, task.plantName, 'caution', c);
                                  }
                                }}
                                title={checked ? '확인됨' : '클릭하여 확인 표시'}
                              >
                                {c}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {days.length === 0 && <div className="empty">생성된 항목이 없습니다.</div>}
    </div>
  );
}
