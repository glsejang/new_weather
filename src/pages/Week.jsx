import { useSwipeable } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function Week() {
  const navigate = useNavigate();

  const forecastData = useSelector((state)=> state.forecast.data)


  console.log('week페이지:',forecastData)
  const handlers = useSwipeable({
    onSwipedUp: () => {
      navigate('/'); // 위로 스와이프하면 홈으로 이동
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
  });


  return (
    <div {...handlers} className='week'>
      <h1>Week 페이지</h1>

      
      {forecastData && forecastData.length > 0 && (
        <div>
          <h2>주간 날씨 예보</h2>
          {forecastData.map((item, index) => (
            <div key={index} className='weekCard'>

              <div>
                <p>날짜: {item.date}</p>
                <p>최고 기온: {item.maxTemp}°C</p>
                <p>최저 기온: {item.minTemp}°C</p>
              </div>
              <div>
                <p>날씨: {item.condition}</p>
                <p>강수확률: {item.willItRain}°C</p>
                <p>습도: {item.humidity}°C</p>
              </div>
              
              

            </div>
          ))}
        </div>
      )}

    </div>
  );
}