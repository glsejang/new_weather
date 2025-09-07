export function Today({ forecast }) {
  if (!forecast) return <div>날씨 정보 로딩 중...</div>;
  return (
    <div className="today">
      <div>
        <h2 className="todayTitle">오늘!</h2>
        <h3>평균 온도: {forecast.avgTemp}</h3>
        <h3>{forecast.conditionKo}</h3>

      </div>

      
      <img src={forecast.icon} alt="" />
      <h3>{forecast.condition}</h3>
      <h3>습도: {forecast.humidity}</h3>
      <h3>강수: {forecast.rainChance}</h3>
      <h3>최고: {forecast.maxTemp}° / 최저: {forecast.minTemp}°</h3>
      <h3>바람: {forecast.maxWindKph} kph {forecast.windDir}</h3>
      <h3>일출: {forecast.sunrise} / 일몰: {forecast.sunset}</h3>
    </div>
  );
}