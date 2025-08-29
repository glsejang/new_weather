import axios from 'axios'
const KEY = import.meta.env.VITE_API_KEY;
const url = `https://apis.data.go.kr/1360000/LongFcstInfoService/getLongFcstWeek`;

export async function getLongWeather({ tmFc }) {
  try {
    const response = await axios.get(url, {
      params: {
        serviceKey: KEY,
        pageNo: 1,
        numOfRows: 10,
        dataType: 'JSON',
        tmFc // 발표 시각 (예: 202508010600 또는 202508011800)
      }
    });

    console.log('✅ 장기예보 응답:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ 장기예보 API 호출 실패:', error);
    throw error;
  }
}