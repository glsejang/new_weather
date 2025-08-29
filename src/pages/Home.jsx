import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { cityNameMap } from '../data/cityNameMap';  
import { getTime } from '../apis/getTIme';
import { getWeeklyWeather} from '../apis/weatherInfo'
import { getUserData } from '../db';
import { Today } from '../components/Today';
import { useSwipeable } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';
import { setForecast } from '../features/forecastSlice';

export default function Home(){
  const [settings, setSettings] = useState(null);
  const selectedCity = useSelector((state) => state.city.selectedCity);
  const { data: forecastData, lastUpdated } = useSelector((state) => state.forecast);
  const [isLoading, setIsLoading] = useState(false); // ⭐️ isLoading 상태 추가

  const { yyyymmdd, hour } = getTime();
  const [city, setCity] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 날씨 데이터를 가져와 Redux에 저장하는 단일 함수
  const fetchAndSetForecast = async () => {
    if (!city) return;
    setIsLoading(true); // ⭐️ API 호출 시작 시 로딩 상태를 true로 변경
    try {
      console.log('날씨 정보를 불러옵니다.');
      const newForecastData = await getWeeklyWeather(cityNameMap[city]);
      dispatch(setForecast(newForecastData));
    } catch (error) {
      console.error('날씨 정보를 불러오는 데 실패했습니다.', error);
    } finally {
      setIsLoading(false); // ⭐️ API 호출이 끝나면 로딩 상태를 false로 변경
    }
  };

  const handlers = useSwipeable({
    // 아래로 스와이프 시 날씨 정보 새로고침
    onSwipedDown: fetchAndSetForecast,
    // 위로 스와이프 시 Week 페이지로 이동
    onSwipedUp: () => {
      navigate('/week');
    },
    // 왼쪽으로 스와이프 시 Todos 페이지로 이동
    onSwipedLeft: () => {
      navigate('/todos', { state: { city, plants: settings?.plants, forecast: forecastData } });
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  // useEffect: 사용자 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      const data = await getUserData();
      if (data?.city) {
        setCity(data.city);
        setSettings(data);
      }
    };
    fetchData();
  }, []);

  // useEffect: 날씨 정보 자동 새로고침
  useEffect(() => {
    if (!city) return;

    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;
    const isOutdated = !lastUpdated || (now - lastUpdated) > oneHour;

    console.log('영문 도시명:', cityNameMap[city]);
    if (isOutdated) {
      fetchAndSetForecast();
    } else {
      console.log('날씨 정보가 최신입니다. API를 호출하지 않습니다.');
    }
  }, [city, dispatch, lastUpdated]);

  if (!settings) return <div>로딩 중...</div>;

  const todayForecast = forecastData[0] || null;

  return (
    <div className="app" {...handlers}>
      <div className='bgLayer'>
        배경용
      </div>
      <div className='home'>
        <div className='nav'>
          <h3>{yyyymmdd}</h3>
          <h3>시각: {hour}</h3>
          <h3>도시: {selectedCity || settings.city}</h3>
        </div>
        <p className='date'>관찰 식물: {settings?.plants?.join(', ') || '없음'}</p>
      </div>
      
      <div>
        <Today forecast={todayForecast} />
      </div>

      {/* ⭐️ 로딩 상태에 따라 다른 메시지 표시 */}
      {isLoading ? <div>새로고침 중...</div> : <div>밑으로 밀기</div>}
    </div>
  );
}