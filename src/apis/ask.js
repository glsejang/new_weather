import { GoogleGenerativeAI } from "@google/generative-ai";

export async function askGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API 키를 찾을 수 없습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정했는지 확인해주세요.");
  }

  const ai = new GoogleGenerativeAI(apiKey); 
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // 최신 모델로 변경

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt }
          ]
        }
      ]
    });

    const responseText = result.response.text(); // 더 안정적인 .text() 메서드 사용
    console.log("Gemini 응답:", responseText);

    const parsed = parseTodoResponse(responseText);
    console.log("파싱된 데이터:", parsed);

    return parsed; // 파싱된 데이터를 반환
  } catch (error) {
    console.error("Gemini API 호출 중 오류 발생:", error);
    return null;
  }
}

export function parseTodoResponse(responseText) {
  const result = [];
  const plantRegex = /^- (.+?):$/; // "- 식물명:"
  const dateRegex = /^\s+- (\d{4}-\d{2}-\d{2}):$/; // "- YYYY-MM-DD:"
  const taskRegex = /^\s+- (할 일|주의사항): (.+)$/; // "- 할 일: 내용" 또는 "- 주의사항: 내용"

  let currentPlant = null;
  let currentDate = null;

  const lines = responseText.split('\n');

  for (const line of lines) {
    const plantMatch = line.match(plantRegex);
    const dateMatch = line.match(dateRegex);
    const taskMatch = line.match(taskRegex);

    if (plantMatch) {
      const name = plantMatch[1].trim();
      currentPlant = { name, tasks: [] };
      result.push(currentPlant);
      currentDate = null;
    } else if (dateMatch) {
      if (!currentPlant) continue;
      const date = dateMatch[1].trim();
      currentDate = { date, todos: [], cautions: [] };
      currentPlant.tasks.push(currentDate);
    } else if (taskMatch) {
      if (!currentDate) continue;
      const type = taskMatch[1].trim();
      const content = taskMatch[2].trim();
      if (type === '할 일') {
        currentDate.todos.push(content);
      } else if (type === '주의사항') {
        currentDate.cautions.push(content);
      }
    }
  }

  return result;
}

