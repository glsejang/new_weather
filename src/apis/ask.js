import { GoogleGenerativeAI } from "@google/generative-ai";

/* ── 유틸: 코드블록 펜스 제거 ── */
function stripCodeFences(s = "") {
  return String(s)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
    .trim();
}

/* ── 버킷 라벨러(사람이 보기 좋게) ── */
function bucketLabel(modelName = "") {
  if (/flash-8b/i.test(modelName)) return "flash-8b (FreeTier 50/일)";
  if (/flash/i.test(modelName))    return "flash";
  if (/pro/i.test(modelName))      return "pro";
  return "unknown";
}

/* ── 429(쿼터) 판별 ── */
function isQuota(err) {
  const status = err?.status || err?.code;
  const msg = String(err?.message || "");
  return status === 429 || /quota|rate|limit|exceeded/i.test(msg);
}

/* ── 에러 메시지에서 quotaDimensions 추출(있으면) ── */
function extractQuotaInfo(err) {
  const text = String(err?.message || "");
  const i = text.indexOf("[");
  const j = text.lastIndexOf("]");
  if (i === -1 || j === -1 || j <= i) return null;
  try {
    const arr = JSON.parse(text.slice(i, j + 1));
    // 배열 안 객체들에서 quotaDimensions 찾아보기
    for (const obj of arr) {
      if (obj?.["@type"]?.includes("QuotaFailure")) {
        const v = obj?.violations?.[0];
        return {
          metric: v?.quotaMetric,
          id: v?.quotaId,
          model: v?.quotaDimensions?.model,
          location: v?.quotaDimensions?.location,
          value: v?.quotaValue
        };
      }
    }
  } catch {}
  return null;
}

/* ===== 기본 모델(8b 제외) + 429시 pro로 1회 폴백 =====
   .env에서 VITE_GEMINI_MODEL로 덮어쓸 수 있음 (예: gemini-1.5-pro-latest)
*/
const DEFAULT_MODEL = "gemini-1.5-flash-latest"; // 8b 아님
const ENV_MODEL = import.meta.env.VITE_GEMINI_MODEL;
const PRIMARY_MODEL = ENV_MODEL || DEFAULT_MODEL;

export async function askGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API 키를 찾을 수 없습니다. .env에 VITE_GEMINI_API_KEY를 설정하세요.");
  }

  console.log(
    `[Gemini] PRIMARY_MODEL = ${PRIMARY_MODEL}  (bucket: ${bucketLabel(PRIMARY_MODEL)})`
  );

  const ai = new GoogleGenerativeAI(apiKey);

  // 1차: 기본 모델
  try {
    const model = ai.getGenerativeModel({ model: PRIMARY_MODEL });
    console.log(`[Gemini] try model: ${PRIMARY_MODEL}`);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }]}],
    });
    const responseText = stripCodeFences(result.response.text());
    console.log(
      `[Gemini] using model: ${PRIMARY_MODEL}  (bucket: ${bucketLabel(PRIMARY_MODEL)})`
    );
    return parseTodoResponse(responseText);
  } catch (err) {
    // 콘솔에 버킷/쿼터 정보를 직관적으로 찍기
    const qi = extractQuotaInfo(err);
    if (qi) {
      console.warn(
        `[Gemini] quota hit on ${qi.model} @ ${qi.location} (metric=${qi.metric}, id=${qi.id}, value=${qi.value})`
      );
    } else {
      console.warn(
        `[Gemini] ${PRIMARY_MODEL} failed (bucket: ${bucketLabel(PRIMARY_MODEL)}):`,
        err?.message || err
      );
    }

    // 429면 pro로 1회 폴백
    if (isQuota(err) && PRIMARY_MODEL !== "gemini-1.5-pro-latest") {
      const FALLBACK = "gemini-1.5-pro-latest";
      try {
        const pro = ai.getGenerativeModel({ model: FALLBACK });
        console.log(`[Gemini] fallback → model: ${FALLBACK}  (bucket: ${bucketLabel(FALLBACK)})`);
        const result = await pro.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }]}],
        });
        const responseText = stripCodeFences(result.response.text());
        console.log(
          `[Gemini] using model: ${FALLBACK}  (bucket: ${bucketLabel(FALLBACK)})`
        );
        return parseTodoResponse(responseText);
      } catch (e2) {
        const qi2 = extractQuotaInfo(e2);
        if (qi2) {
          console.warn(
            `[Gemini] fallback quota hit on ${qi2.model} @ ${qi2.location} (metric=${qi2.metric}, id=${qi2.id}, value=${qi2.value})`
          );
        } else {
          console.warn(`[Gemini] fallback failed:`, e2?.message || e2);
        }
        return null;
      }
    }

    return null;
  }
}

/* ── 네 기존 라인 파서 (원형 유지, CR/LF 정리만) ── */
export function parseTodoResponse(responseText) {
  const result = [];
  const plantRegex = /^- (.+?):$/; // "- 식물명:"
  const dateRegex = /^\s+- (\d{4}-\d{2}-\d{2}):$/; // "  - YYYY-MM-DD:"
  const taskRegex = /^\s+- (할 일|주의사항): (.+)$/; // "  - 할 일: 내용" 또는 "  - 주의사항: 내용"

  let currentPlant = null;
  let currentDate = null;

  const lines = String(responseText).replace(/\r\n?/g, "\n").split("\n");

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
      if (type === "할 일") {
        currentDate.todos.push(content);
      } else if (type === "주의사항") {
        currentDate.cautions.push(content);
      }
    }
  }

  return result;
}
