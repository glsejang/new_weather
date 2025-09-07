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
- 목표: ${city}의 날씨와 식물 목록을 기반으로 현실적이고 전문적인 관리 조언 제공.
- 지시사항:
  1. 답변은 반드시 아래 제시된 '형식'만 사용할 것. 서론·결론·불필요한 문장은 절대 금지.
  2. 각 날짜별로 식물의 생육 특성과 해당 날짜 날씨 조건을 고려한 '할 일'과 '주의사항'을 작성.
  3. 모든 '할 일'과 '주의사항'은 반드시 '- 할 일: [내용]', '- 주의사항: [내용]' 형태로 작성.
  4. 조언은 구체적이고 전문적인 관리 지침으로 15자 내외로 간결하게 작성하되, 물주기 시점·광량·통풍·비료·병해충 점검 등 다양한 측면을 포함.
  5. 필요 시 "없음" 대신 "특별 관리 불필요"라고 명시해 정확성을 높일 것.
  6. 동일한 식물이라도 날짜별 날씨 차이에 따라 서로 다른 지시사항을 제시해야 함.

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
    - 주의사항: 통풍 확보 위해 가지 솎기
- 선인장:
  - 2025-08-18:
    - 할 일: 특별 관리 불필요
    - 주의사항: 고온다습 과습 주의
`.trim();
}