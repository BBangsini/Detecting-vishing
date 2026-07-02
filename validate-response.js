// Gemini 응답 파싱/검증 모듈
const { z } = require("zod");

const AnalysisSchema = z.object({
  transcript: z.string().min(1).max(5000),
  risk_score: z.number().int().min(0).max(100),
  risk_level: z.enum(["낮음", "보통", "높음"]),
  flags: z
    .array(
      z.object({
        pattern: z.string().min(1).max(50),
        evidence: z.string().min(1).max(300),
      })
    )
    .max(10),
  explanation: z.string().min(1).max(500),
});

/**
 * Gemini의 원본 텍스트 응답을 파싱하고 검증한다.
 * @param {string} rawText
 * @returns {{ success: true, data: object } | { success: false, error: string }}
 */
function parseAndValidate(rawText) {
  // Gemini가 가끔 ```json ... ``` 코드블록으로 감싸서 응답하는 경우 제거
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    return { success: false, error: "모델 응답이 올바른 JSON 형식이 아닙니다." };
  }

  // risk_score가 문자열("87")로 온 경우 숫자로 보정
  if (typeof parsed.risk_score === "string") {
    const n = Number(parsed.risk_score);
    if (!Number.isNaN(n)) parsed.risk_score = Math.round(n);
  }
  // risk_level 앞뒤 공백 보정
  if (typeof parsed.risk_level === "string") {
    parsed.risk_level = parsed.risk_level.trim();
  }

  const result = AnalysisSchema.safeParse(parsed);
  if (!result.success) {
    console.error("스키마 검증 실패:", result.error.flatten());
    return { success: false, error: "응답 형식이 예상과 다릅니다." };
  }

  const { risk_score, risk_level } = result.data;
  const expectedLevel =
    risk_score >= 70 ? "높음" : risk_score >= 40 ? "보통" : "낮음";
  if (risk_level !== expectedLevel) {
    console.warn(
      `risk_score(${risk_score})와 risk_level(${risk_level}) 불일치 - 자동 보정`
    );
    result.data.risk_level = expectedLevel;
  }

  return { success: true, data: result.data };
}

module.exports = { parseAndValidate, AnalysisSchema };
