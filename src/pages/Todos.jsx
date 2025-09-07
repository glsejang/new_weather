import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { makeWeatherPrompt } from '../apis/makePrompt';
import { askGemini } from '../apis/ask';
import { groupingDate } from '../apis/groupingDate';

function asList(v) { return Array.isArray(v) ? v : v ? [v] : []; }
const iso = (d='') => String(d).slice(0,10);

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

// 변형(va~vf)
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}
const VARIANTS = ["va","vb","vc","vd","ve","vf"];

/* ✅ 오늘(첫 카드) 진행률 요약을 홈에서 쓰도록 저장하기 위한 함수 */
function summarizeProgressForDay(day, doneSet) {
  if (!day?.tasks?.length) return [];
  const byPlant = new Map();

  day.tasks.forEach((task) => {
    const name = task.plantName;
    if (!byPlant.has(name)) byPlant.set(name, { done: 0, total: 0 });

    const acc = byPlant.get(name);
    const todos = asList(task.todos);
    const cautions = asList(task.cautions);

    todos.forEach((_, j) => {
      acc.total += 1;
      const k = `${day.date}-${task.plantName}-todo-${j}`;
      if (doneSet.has(k)) acc.done += 1;
    });
    cautions.forEach((_, j) => {
      acc.total += 1;
      const k = `${day.date}-${task.plantName}-caution-${j}`;
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

  const storageKey = useMemo(() => `todo-done-${city || 'default'}`, [city]);

  // 복원/저장
  useEffect(() => {
    try { const raw = localStorage.getItem(storageKey); if (raw) setDoneSet(new Set(JSON.parse(raw))); } catch {}
  }, [storageKey]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(Array.from(doneSet))); } catch {}
  }, [doneSet, storageKey]);

  const toggleDone = (date, plantName, type, idx) => {
    const key = `${date}-${plantName}-${type}-${idx}`;
    setDoneSet(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // 프롬프트
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

  const getThemeForDate = (dateStr) => {
    const key = iso(dateStr);
    const f = forecastDays.find(d => iso(d?.date) === key || iso(d?.date_epoch ? new Date(d.date_epoch*1000).toISOString() : '') === key);
    const text = f?.day?.condition?.text ?? f?.condition?.text ?? f?.condition ?? '';
    const hi = f?.day?.maxtemp_c ?? f?.maxtemp_c;
    return conditionToTheme(text, hi);
  };

  // 생성
  useEffect(() => {
    if (!prompt) return;
    const controller = new AbortController();
    (async () => {
      try {
        setIsLoading(true); setError('');
        const raw = await askGemini(prompt, { signal: controller.signal });
        const list = raw ?? [];
        setTodos(list);
        const grouped = groupingDate(list) ?? [];
        setDateGroupedTodos(grouped);
      } catch (e) {
        if (e?.name !== 'AbortError') {
          console.error(e); setError('투두리스트 생성 중 오류가 발생했어요.');
        }
      } finally { setIsLoading(false); }
    })();
    return () => controller.abort();
  }, [prompt]);

  /* ✅ 홈 진행 칩용 요약 저장 */
  useEffect(() => {
    if (!city || !dateGroupedTodos?.length) return;
    const todayCard = dateGroupedTodos[0];
    const summary = summarizeProgressForDay(todayCard, doneSet);
    try { localStorage.setItem(`todo-progress-latest-${city}`, JSON.stringify(summary)); } catch {}
  }, [city, dateGroupedTodos, doneSet]);

  if (!city || !plants?.length || !forecast?.length) {
    return <div>필수 정보가 없습니다. 도시/식물/예보를 다시 선택해주세요.</div>;
  }
  if (isLoading) return <div>투두리스트를 생성하는 중...</div>;
  if (error) return <div>{error}</div>;

  // 날짜별 카드(최대 7장)
  const days = dateGroupedTodos.slice(0, 7);

  return (
    <div className="todo-grid compact ultra">{/* compact + ultra: 더 작게 */}
      {days.map((day, index) => {
        const theme = getThemeForDate(day.date);
        const v = VARIANTS[hashStr(String(day.date ?? index)) % VARIANTS.length];

        // 진행도(간단): todos + cautions 합 기준
        let total = 0, done = 0;
        day.tasks?.forEach((task) => {
          const ts = asList(task.todos);
          const cs = asList(task.cautions);
          total += ts.length + cs.length;
          ts.forEach((_, j) => { if (doneSet.has(`${day.date}-${task.plantName}-todo-${j}`)) done += 1; });
          cs.forEach((_, j) => { if (doneSet.has(`${day.date}-${task.plantName}-caution-${j}`)) done += 1; });
        });
        const pct = total ? Math.round((done/total)*100) : 0;

        return (
          <section key={day.date} className={`tcard ${theme} ${v}`}>
            {/* 헤더 영역 */}
            <header className="thead">
              <div className="tdate">{day.date}</div>
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
                    <div key={`${day.date}-${task.plantName}-${i}`} className="task">
                      <div className="plant">{task.plantName}</div>

                      {todos.length > 0 && (
                        <ul className="todos">
                          {todos.map((t, j) => {
                            const key = `${day.date}-${task.plantName}-todo-${j}`;
                            const done = doneSet.has(key);
                            return (
                              <li
                                key={key}
                                className={done ? 'done' : ''}
                                role="checkbox"
                                aria-checked={done}
                                tabIndex={0}
                                onClick={() => toggleDone(day.date, task.plantName, 'todo', j)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault(); toggleDone(day.date, task.plantName, 'todo', j);
                                  }
                                }}
                                title={done ? '완료됨' : '클릭하여 완료 표시'}
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
                            const key = `${day.date}-${task.plantName}-caution-${j}`;
                            const done = doneSet.has(key);
                            return (
                              <li
                                key={key}
                                className={done ? 'done' : ''}
                                role="checkbox"
                                aria-checked={done}
                                tabIndex={0}
                                onClick={() => toggleDone(day.date, task.plantName, 'caution', j)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault(); toggleDone(day.date, task.plantName, 'caution', j);
                                  }
                                }}
                                title={done ? '확인됨' : '클릭하여 확인 표시'}
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
