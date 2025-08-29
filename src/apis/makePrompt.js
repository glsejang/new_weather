export function makeWeatherPrompt(city, forecast, plants) {
  const summary = forecast.map((day) => {
    const date = new Date(day.date).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
    return `- ${date}: 평균 ${day.avgTemp}도, ${day.condition}, 습도 ${day.humidity}%, 강수 확률 ${day.rainChance}%`;
  }).join('\n');

  const plantList = plants.join(', ');

  return `
- 역할: 숙련된 식물학자이자 식물 관리 전문가.
- 목표: ${city}의 날씨와 식물 목록을 기반으로 정확하고 전문적인 관리 조언 제공.
- 지시사항:
  1. 답변은 오직 아래 제시된 '형식'만을 사용. 서론, 결론 등 다른 문장은 절대 금지.
  2. 모든 '할 일'과 '주의사항'은 반드시 '- 할 일: [내용]'과 '- 주의사항: [내용]' 형태로 작성.
  3. 조언은 구체적이고 전문적인 내용으로 15자 내외로 간결하게 작성.

- 날씨 정보:
${summary}
- 내 식물:
${plantList}
@형식:
- 식물명:
  - YYYY-MM-DD:
    - 할 일: [내용]
    - 주의사항: [내용]
@예시:
- 장미:
  - 2025-08-18:
    - 할 일: 잎에 물 닿지 않게 오전 관수
    - 주의사항: 통풍을 위한 가지치기
- 선인장:
  - 2025-08-18:
    - 할 일: 없음
    - 주의사항: 고온다습으로 과습 주의
`.trim();
}